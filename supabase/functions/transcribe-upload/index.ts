import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let deck_id: string | null = null
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY') ?? ''

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!openRouterApiKey) {
      throw new Error("Missing OPENROUTER_API_KEY environment variable")
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let body;
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    deck_id = body.deck_id
    if (!deck_id) {
      return new Response(JSON.stringify({ error: 'Missing deck_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: deck, error: deckError } = await supabaseClient
      .from('decks')
      .select('id, owner_id, source_url')
      .eq('id', deck_id)
      .single()

    if (deckError || !deck) {
      return new Response(JSON.stringify({ error: 'Deck not found or access denied' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (deck.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!deck.source_url) {
      throw new Error("Missing source_url in deck")
    }

    await supabaseAdmin
      .from('decks')
      .update({ status: 'transcribing', error: null })
      .eq('id', deck_id)

    let path = deck.source_url
    if (path.startsWith('uploads/')) {
      path = path.substring('uploads/'.length)
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('uploads')
      .download(path)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download audio file: ${downloadError?.message || 'Unknown error'}`)
    }

    const formData = new FormData()
    formData.append('file', fileData, 'audio.mp3')
    formData.append('model', 'openai/whisper-large-v3')

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterApiKey}`,
        "HTTP-Referer": "https://slidecrux.com",
        "X-Title": "SlideCrux"
      },
      body: formData
    })

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text()
      throw new Error(`OpenRouter transcription failed: ${openRouterResponse.status} ${errorText}`)
    }

    const transcriptionResult = await openRouterResponse.json()
    const transcriptText = transcriptionResult.text

    if (!transcriptText || transcriptText.trim() === '') {
      throw new Error("Transcription resulted in empty text")
    }

    await supabaseAdmin
      .from('decks')
      .update({ transcript: transcriptText, status: 'pending' })
      .eq('id', deck_id)

    const duration = transcriptionResult.duration || 0
    await supabaseAdmin
      .from('usage_log')
      .insert({
        user_id: user.id,
        deck_id: deck_id,
        transcript_seconds: Math.round(duration),
        cost_usd_micros: 0
      })

    return new Response(JSON.stringify({ success: true, transcript_length: transcriptText.length }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('transcribe-upload error:', err)
    if (deck_id) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
      await supabaseAdmin
        .from('decks')
        .update({ status: 'failed', error: err.message || 'Transcription error' })
        .eq('id', deck_id)
    }
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
