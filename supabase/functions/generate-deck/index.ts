import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callOpenRouter } from '../_shared/openrouter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonSchema = {
  "type": "object",
  "properties": {
    "title": { "type": "string", "description": "A compelling title for the presentation" },
    "subtitle": { "type": "string", "description": "A brief subtitle or tagline" },
    "slides": {
      "type": "array",
      "maxItems": 10,
      "items": {
        "type": "object",
        "properties": {
          "heading": { "type": "string" },
          "bullets": { "type": "array", "items": { "type": "string" } },
          "image_prompt": { "type": "string", "description": "A descriptive prompt for generating an accompanying visual" },
          "speaker_notes": { "type": "string", "description": "Additional context or talking points for the presenter" },
          "layout": { "type": "string", "enum": ["title", "bullets", "quote", "image_right", "section"] }
        },
        "required": ["heading", "bullets", "layout"]
      }
    }
  },
  "required": ["title", "slides"]
}

// --- Plan limits ---
const PLAN_DECK_LIMITS: Record<string, number> = {
  free: 1,
  pro: 30,
  team: 200,
};

// --- Cost estimation (gpt-4o-mini via OpenRouter) ---
// $0.15 per 1M input tokens, $0.60 per 1M output tokens
const COST_PER_INPUT_TOKEN_MICROS = 0.15;  // micros per token
const COST_PER_OUTPUT_TOKEN_MICROS = 0.60;

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function extractYoutubeVideoId(url: string): string | null {
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    return watchMatch[1];
  }
  const cleanStr = url.trim();
  if (cleanStr.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(cleanStr)) {
    return cleanStr;
  }
  return null;
}

function extractLoomVideoId(url: string): string | null {
  const loomMatch = url.match(/(?:loom\.com\/share\/|loom\.com\/embed\/)([a-f0-9]{32})/i);
  if (loomMatch) {
    return loomMatch[1];
  }
  const cleanStr = url.trim();
  if (cleanStr.length === 32 && /^[a-f0-9]{32}$/i.test(cleanStr)) {
    return cleanStr;
  }
  return null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractYtInitialPlayerResponse(html: string): any {
  const patterns = [
    /ytInitialPlayerResponse\s*=\s*({.+?});/s,
    /ytInitialPlayerResponse\s*=\s*({.+?})\s*;/s,
    /ytInitialPlayerResponse\s*=\s*({.+?})\s*\n/s,
    /["']ytInitialPlayerResponse["']\s*:\s*({.+?})\s*(?:,|})/s
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (_e) {
        // ignore
      }
    }
  }
  const index = html.indexOf("ytInitialPlayerResponse");
  if (index !== -1) {
    const start = html.indexOf("{", index);
    if (start !== -1) {
      let braceCount = 0;
      let end = start;
      let inString = false;
      let escape = false;
      while (end < html.length) {
        const char = html[end];
        if (inString) {
          if (escape) {
            escape = false;
          } else if (char === '\\') {
            escape = true;
          } else if (char === '"') {
            inString = false;
          }
        } else {
          if (char === '"') {
            inString = true;
          } else if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              break;
            }
          }
        }
        end++;
      }
      if (braceCount === 0) {
        const jsonStr = html.substring(start, end + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (_e) {
          // ignore
        }
      }
    }
  }
  return null;
}

async function fetchYoutubeTranscript(videoId: string): Promise<string> {
  // Strategy 1: Try youtube-transcript.ai API first (robust, handles PO token)
  try {
    const url = `https://youtube-transcript.ai/transcript/${videoId}.txt`;
    console.log(`Attempting to fetch transcript from: ${url}`);
    const response = await fetch(url);
    if (response.ok) {
      const rawText = await response.text();
      const index = rawText.indexOf("## Transcript");
      let content = index !== -1 ? rawText.slice(index + 13) : rawText;
      content = content.replace(/\[\d+(?::\d+){0,2}\]/g, "");
      const cleaned = content.replace(/\s+/g, ' ').trim();
      if (cleaned.length > 0) {
        console.log("Successfully retrieved transcript from youtube-transcript.ai");
        return cleaned;
      }
    } else {
      console.warn(`youtube-transcript.ai returned HTTP ${response.status}`);
    }
  } catch (err: any) {
    console.warn(`youtube-transcript.ai failed: ${err.message}`);
  }

  // Strategy 2: Fall back to native scraper with consent bypass cookies
  console.log("Falling back to native scraper...");
  const url = `https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999&has_verified=1&hl=en`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9",
      "Cookie": "SOCS=CAESEwgDEgk0ODE3NzkzOTQaAnBsIAEaBgiA_5mYBg; CONSENT=YES+cb.20210328-17-p0.en+FX+999"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch YouTube page: HTTP ${response.status}`);
  }
  const html = await response.text();
  const playerResponse = extractYtInitialPlayerResponse(html);
  if (!playerResponse) {
    throw new Error("Could not parse ytInitialPlayerResponse. The video might be private, age-restricted, or YouTube changed its page format.");
  }

  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No captions/subtitles available for this video");
  }

  let track = tracks.find((t: any) => t.languageCode === 'en' && t.kind !== 'asr');
  if (!track) {
    track = tracks.find((t: any) => t.languageCode === 'en');
  }
  if (!track) {
    track = tracks[0];
  }

  const baseUrl = track.baseUrl;
  if (!baseUrl) {
    throw new Error("Caption track has no base URL");
  }

  if (!/^https:\/\/(?:[a-zA-Z0-9-]+\.)*(?:youtube\.com|google\.com|ggpht\.com)\//.test(baseUrl)) {
    throw new Error("Invalid caption track domain (potential SSRF)");
  }

  const xmlRes = await fetch(baseUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      "Cookie": "SOCS=CAESEwgDEgk0ODE3NzkzOTQaAnBsIAEaBgiA_5mYBg; CONSENT=YES+cb.20210328-17-p0.en+FX+999"
    }
  });
  if (!xmlRes.ok) {
    throw new Error(`Failed to fetch XML captions: HTTP ${xmlRes.status}`);
  }
  const xmlText = await xmlRes.text();

  const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/gi;
  const segments: string[] = [];
  let match;
  while ((match = textRegex.exec(xmlText)) !== null) {
    segments.push(match[1]);
  }

  if (segments.length === 0) {
    throw new Error("No text segments found in caption track XML");
  }

  return segments
    .map(seg => decodeHtmlEntities(seg))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchLoomTranscript(videoId: string): Promise<string> {
  const url = `https://www.loom.com/api/v1/videos/${videoId}/transcript`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch Loom transcript: HTTP ${res.status}`);
  }
  const data = await res.json();
  
  if (Array.isArray(data)) {
    return data.map(seg => seg.text || "").join(" ").trim();
  }
  
  if (data && typeof data === "object") {
    const list = data.transcript || data.segments || data.paragraphs || data.data?.segments || data.data?.paragraphs;
    if (Array.isArray(list)) {
      return list.map((seg: any) => {
        if (typeof seg === "string") return seg;
        return seg.text || seg.transcript || seg.body || "";
      }).join(" ").trim();
    }
    
    if (typeof data.transcript === "string") {
      return data.transcript;
    }
    if (typeof data.text === "string") {
      return data.text;
    }
  }
  
  throw new Error("Invalid or unsupported Loom transcript format");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let deck_id: string | null = null
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase Client with user's Auth Header
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    let body;
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    deck_id = body.deck_id
    if (!deck_id) {
      return new Response(
        JSON.stringify({ error: 'Missing deck_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase Admin Client (bypasses RLS & triggers)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    // --- QUOTA CHECK ---
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('plan, decks_this_month')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const currentCount = profile.decks_this_month ?? 0;
    const planLimit = PLAN_DECK_LIMITS[profile.plan] ?? 1;

    if (currentCount >= planLimit) {
      return new Response(
        JSON.stringify({
          error: `Monthly deck limit reached (${currentCount}/${planLimit}). Upgrade your plan for more decks.`,
          code: 'QUOTA_EXCEEDED'
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch deck to verify ownership and get transcript details
    const { data: deck, error: deckError } = await supabaseClient
      .from('decks')
      .select('id, transcript, owner_id, title, source_type, source_url')
      .eq('id', deck_id)
      .single()

    if (deckError || !deck) {
      return new Response(
        JSON.stringify({ error: 'Deck not found or access denied' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (deck.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not own this deck' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let transcript = deck.transcript;

    if (!transcript || transcript.trim() === '') {
      if (!deck.source_url || deck.source_url.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Cannot generate deck: Transcript and video URL are both empty' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const url = deck.source_url.trim();
      let detectedType = deck.source_type;
      
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        detectedType = 'youtube';
      } else if (url.includes('loom.com')) {
        detectedType = 'loom';
      }

      // Update status to 'transcribing'
      const { error: transcribingError } = await supabaseAdmin
        .from('decks')
        .update({ status: 'transcribing', error: null, source_type: detectedType })
        .eq('id', deck_id)

      if (transcribingError) {
        throw new Error(`Failed to update deck status to transcribing: ${transcribingError.message}`)
      }

      try {
        if (detectedType === 'youtube') {
          const videoId = extractYoutubeVideoId(url);
          if (!videoId) throw new Error("Could not extract YouTube video ID from URL");
          transcript = await fetchYoutubeTranscript(videoId);
        } else if (detectedType === 'loom') {
          const videoId = extractLoomVideoId(url);
          if (!videoId) throw new Error("Could not extract Loom video ID from URL");
          transcript = await fetchLoomTranscript(videoId);
        } else {
          throw new Error(`Unsupported source type for transcription: ${detectedType}`);
        }

        if (!transcript || transcript.trim() === '') {
          throw new Error("Extracted transcript is empty");
        }

        // Update database with fetched transcript and set status to 'generating'
        const { error: updateTranscriptError } = await supabaseAdmin
          .from('decks')
          .update({ transcript, status: 'generating' })
          .eq('id', deck_id)

        if (updateTranscriptError) {
          throw new Error(`Failed to update transcript in database: ${updateTranscriptError.message}`);
        }
      } catch (transcribeErr: any) {
        // Mark deck as failed in db
        await supabaseAdmin
          .from('decks')
          .update({ status: 'failed', error: `Transcription failed: ${transcribeErr.message}` })
          .eq('id', deck_id)
        
        throw transcribeErr;
      }
    } else {
      // Update status to 'generating'
      const { error: startGenError } = await supabaseAdmin
        .from('decks')
        .update({ status: 'generating', error: null })
        .eq('id', deck_id)

      if (startGenError) {
        throw new Error(`Failed to update deck status to generating: ${startGenError.message}`)
      }
    }

    // Structure prompt for the presentation
    const prompt = `Summarize and structure the following transcript into a compelling slide presentation.
Create exactly 10 slides (or fewer if the content is very short) that cover the key topics, details, and lessons from the transcript. Make the slides engaging, clear, and informative.

Rules:
- The FIRST slide MUST use layout "title" with the presentation title and subtitle.
- For each remaining slide, choose the most appropriate layout:
  - 'bullets': for lists of key points (most common).
  - 'quote': for highlighting a significant quote or key takeaway.
  - 'image_right': for slides that present information on the left and would benefit from an accompanying visual (provide a descriptive 'image_prompt').
  - 'section': for dividing major sections of the presentation.
- Provide engaging speaker_notes for each slide with additional context the presenter can reference.
- Keep bullet points concise (max 6 per slide, max 15 words each).
- Make headings action-oriented and specific.

Transcript:
"""
${transcript}
"""`

    let aiResult;
    try {
      aiResult = await callOpenRouter(prompt, jsonSchema)
    } catch (apiError: any) {
      // Mark deck as failed in db
      await supabaseAdmin
        .from('decks')
        .update({ status: 'failed', error: `AI generation failed: ${apiError.message}` })
        .eq('id', deck_id)

      throw apiError
    }

    const result = aiResult.data;
    const usage = aiResult.usage;

    if (!result || !result.slides || !Array.isArray(result.slides)) {
      const errorMsg = 'AI generation returned invalid format (missing slides array)'
      await supabaseAdmin
        .from('decks')
        .update({ status: 'failed', error: errorMsg })
        .eq('id', deck_id)
      throw new Error(errorMsg)
    }

    // Cap slides at 10
    const cappedSlides = result.slides.slice(0, 10);

    // Delete existing slides (if any) to prevent duplicates on regeneration
    const { error: deleteError } = await supabaseAdmin
      .from('slides')
      .delete()
      .eq('deck_id', deck_id)

    if (deleteError) {
      throw new Error(`Failed to clear existing slides: ${deleteError.message}`)
    }

    // Prepare slide rows for insertion
    const slideRows = cappedSlides.map((slide: any, index: number) => ({
      deck_id: deck_id,
      sort_order: index,
      heading: slide.heading || `Slide ${index + 1}`,
      bullets: slide.bullets || [],
      image_prompt: slide.image_prompt || null,
      speaker_notes: slide.speaker_notes || null,
      layout: slide.layout || 'bullets',
    }))

    // Insert new slides
    const { error: insertError } = await supabaseAdmin
      .from('slides')
      .insert(slideRows)

    if (insertError) {
      throw new Error(`Failed to insert generated slides: ${insertError.message}`)
    }

    // Update deck title, status, and slide count
    const { error: updateDeckError } = await supabaseAdmin
      .from('decks')
      .update({
        title: result.title || deck.title || 'Untitled Deck',
        status: 'ready',
        slide_count: slideRows.length,
        error: null
      })
      .eq('id', deck_id)

    if (updateDeckError) {
      throw new Error(`Failed to update deck status to ready: ${updateDeckError.message}`)
    }

    // --- INCREMENT MONTHLY QUOTA ---
    const { error: quotaError } = await supabaseAdmin
      .from('profiles')
      .update({ decks_this_month: currentCount + 1 })
      .eq('id', user.id)

    if (quotaError) {
      console.error('Failed to increment monthly deck quota:', quotaError.message)
      // Non-fatal: deck is already generated, don't fail the response
    }

    // --- LOG USAGE ---
    const costMicros = Math.round(
      (usage.prompt_tokens * COST_PER_INPUT_TOKEN_MICROS) +
      (usage.completion_tokens * COST_PER_OUTPUT_TOKEN_MICROS)
    );

    const { error: logError } = await supabaseAdmin
      .from('usage_log')
      .insert({
        user_id: user.id,
        deck_id: deck_id,
        transcript_seconds: 0, // Will be populated by transcribe-upload for audio uploads
        llm_tokens_in: usage.prompt_tokens,
        llm_tokens_out: usage.completion_tokens,
        cost_usd_micros: costMicros,
      })

    if (logError) {
      console.error('Failed to log usage:', logError.message)
      // Non-fatal: deck is already generated
    }

    return new Response(
      JSON.stringify({
        success: true,
        deck_id: deck_id,
        slide_count: slideRows.length,
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          cost_usd_micros: costMicros,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (err: any) {
    console.error('generate-deck error:', err)

    if (deck_id) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        })
        await supabaseAdmin
          .from('decks')
          .update({
            status: 'failed',
            error: err.message || 'Internal server error'
          })
          .eq('id', deck_id)
      } catch (dbErr) {
        console.error('Failed to update status to failed:', dbErr)
      }
    }

    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
