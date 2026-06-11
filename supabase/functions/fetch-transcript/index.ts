import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getYouTubeTranscript(videoId: string): Promise<string> {
  const pageResponse = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }
  )

  if (!pageResponse.ok) {
    throw new Error("Could not fetch YouTube page")
  }

  const html = await pageResponse.text()

  const playerResponseMatch = html.match(
    /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;[\s\n]*(?:var|const|let|\w)/
  )

  if (!playerResponseMatch) {
    throw new Error("Could not parse YouTube player response")
  }

  let playerResponse: any
  try {
    playerResponse = JSON.parse(playerResponseMatch[1])
  } catch {
    throw new Error("Failed to parse YouTube player response JSON")
  }

  const captionTracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No captions found for this video")
  }

  const englishTrack =
    captionTracks.find((t: any) =>
      t.languageCode === 'en' ||
      t.languageCode === 'en-US' ||
      t.languageCode === 'en-GB'
    ) || captionTracks[0]

  const captionUrl = englishTrack.baseUrl
  if (!captionUrl) {
    throw new Error("No caption URL found")
  }

  const captionResponse = await fetch(captionUrl)
  if (!captionResponse.ok) {
    throw new Error("Failed to fetch caption data")
  }

  const captionXml = await captionResponse.text()

  const transcript = captionXml
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

  if (!transcript) {
    throw new Error("Transcript is empty after parsing")
  }

  return transcript
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let deck_id: string | undefined
  let supabaseClient: any

  try {
    const body = await req.json()
    deck_id = body.deck_id
    if (!deck_id) throw new Error("deck_id is required")

    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: deck, error: deckError } = await supabaseClient
      .from('decks')
      .select('source_url, source_type')
      .eq('id', deck_id)
      .single()

    if (deckError || !deck) throw new Error("Deck not found")

    const { source_url, source_type } = deck

    if (!source_url || (source_type !== 'youtube' && source_type !== 'loom')) {
      throw new Error("Invalid source_url or source_type")
    }

    await supabaseClient
      .from('decks')
      .update({ status: 'transcribing' })
      .eq('id', deck_id)

    let transcript = ""

    if (source_type === 'youtube') {
      const videoIdMatch = source_url.match(
        /(?:v=|youtu\.be\/|youtube\.com\/shorts\/)([^&/?]+)/
      )
      if (!videoIdMatch?.[1]) throw new Error("Could not extract YouTube video ID")

      transcript = await getYouTubeTranscript(videoIdMatch[1])

    } else if (source_type === 'loom') {
      const loomIdMatch = source_url.match(/share\/([^/?]+)/)
      if (!loomIdMatch?.[1]) throw new Error("Could not extract Loom video ID")

      const response = await fetch(
        `https://www.loom.com/v1/videos/${loomIdMatch[1]}/transcripts`
      )
      if (!response.ok) throw new Error("Failed to fetch Loom transcript")

      const data = await response.json()
      if (data?.[0]?.transcript_segments) {
        transcript = data[0].transcript_segments
          .map((seg: any) => seg.text)
          .join(" ")
      } else {
        throw new Error("No transcript found for this Loom video")
      }
    }

    if (!transcript) throw new Error("Extracted transcript is empty")

    const { error: updateError } = await supabaseClient
      .from('decks')
      .update({ transcript, status: 'pending' })
      .eq('id', deck_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, transcript_length: transcript.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Error:", error.message)
    if (deck_id && supabaseClient) {
      await supabaseClient
        .from('decks')
        .update({ status: 'failed', error: error.message })
        .eq('id', deck_id)
    }
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
