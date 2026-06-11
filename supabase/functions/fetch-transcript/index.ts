// Deploy trigger: 2026-06-11
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { YoutubeTranscript } from 'https://esm.sh/youtube-transcript@1.2.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let deck_id: string | undefined;
  let supabaseClient: any;

  try {
    const body = await req.json()
    deck_id = body.deck_id
    if (!deck_id) {
      throw new Error("deck_id is required")
    }

    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Fetch deck
    const { data: deck, error: deckError } = await supabaseClient
      .from('decks')
      .select('source_url, source_type')
      .eq('id', deck_id)
      .single()

    if (deckError || !deck) {
      throw new Error("Deck not found")
    }

    const { source_url, source_type } = deck

    if (!source_url || (source_type !== 'youtube' && source_type !== 'loom')) {
      throw new Error("Invalid source_url or source_type for transcript extraction")
    }

    // Set status to transcribing
    await supabaseClient
      .from('decks')
      .update({ status: 'transcribing' })
      .eq('id', deck_id)

    let transcript = ""

    if (source_type === 'youtube') {
      const videoIdMatch = source_url.match(/(?:v=|youtu\.be\/|youtube\.com\/shorts\/)([^&/?]+)/)
      if (!videoIdMatch || !videoIdMatch[1]) {
        throw new Error("Could not extract YouTube video ID")
      }
      const videoId = videoIdMatch[1]
      
      try {
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        transcript = transcriptItems.map((item: any) => item.text).join(" ");
      } catch (err: any) {
        console.error("YoutubeTranscript Error:", err);
        throw new Error("No captions found for this video: " + err.message);
      }
      
      if (!transcript || transcript.trim().length === 0) {
        throw new Error("No captions found for this video")
      }
    } else if (source_type === 'loom') {
      const loomIdMatch = source_url.match(/share\/([^/?]+)/)
      if (!loomIdMatch || !loomIdMatch[1]) {
        throw new Error("Could not extract Loom video ID")
      }
      const videoId = loomIdMatch[1]

      const response = await fetch(`https://www.loom.com/v1/videos/${videoId}/transcripts`)
      if (!response.ok) {
        throw new Error("Failed to fetch Loom transcript")
      }
      
      const data = await response.json()
      if (data && data.length > 0 && data[0].transcript_segments) {
         transcript = data[0].transcript_segments.map((seg: any) => seg.text).join(" ")
      } else {
         throw new Error("No transcript found for this Loom video")
      }
    }

    if (!transcript) {
      throw new Error("Extracted transcript is empty")
    }

    // Update deck with transcript
    const { error: updateError } = await supabaseClient
      .from('decks')
      .update({ 
        transcript,
        status: 'pending' // Ready for generate-deck
      })
      .eq('id', deck_id)

    if (updateError) {
      throw updateError
    }

    return new Response(JSON.stringify({ success: true, transcript_length: transcript.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("Error:", error.message)
    if (deck_id && supabaseClient) {
       await supabaseClient
        .from('decks')
        .update({ status: 'failed', error: error.message })
        .eq('id', deck_id)
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
