# SlideCrux AI Deck Generation Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the AI deck generation pipeline, including the Deno Edge Function using OpenRouter `gpt-4o-mini`, and the React frontend SlideRenderer, DeckEditor, and NewDeck creation interfaces.

**Architecture:** A Supabase Edge Function (`generate-deck`) extracts slide data from transcripts by calling OpenRouter with a structured JSON output schema. The React frontend polls the status of the deck and renders the generated slides dynamically in a customizable, editable 16:9 layout.

**Tech Stack:** Deno (Edge Functions), Supabase Client, OpenRouter API (model: `openai/gpt-4o-mini`), React.

---

### Task 1: Deno Helper and Edge Function

**Files:**
- Create: `supabase/functions/_shared/openrouter.ts`
- Create: `supabase/functions/generate-deck/index.ts`

**Step 1: OpenRouter Deno Client Helper**
Create `supabase/functions/_shared/openrouter.ts` using the Deno fetch client and Deno environment variables:
```typescript
export async function callOpenRouter(prompt: string, jsonSchema: object) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://slidecrux.com",
      "X-Title": "SlideCrux"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert presentation designer. Parse the transcript and structure it into a compelling slide presentation."
        },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_object",
        schema: jsonSchema
      }
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.choices[0].message.content);
}
```

**Step 2: Create generate-deck Edge Function**
Write `/supabase/functions/generate-deck/index.ts` to:
1. Accept `deck_id` via POST request.
2. Verify requesting user owns the deck using auth header verification.
3. Fetch the `transcript` from `public.decks`.
4. Call OpenRouter with the structured JSON schema:
   ```json
   {
     "type": "object",
     "properties": {
       "title": { "type": "string" },
       "subtitle": { "type": "string" },
       "slides": {
         "type": "array",
         "items": {
           "type": "object",
           "properties": {
             "heading": { "type": "string" },
             "bullets": { "type": "array", "items": { "type": "string" } },
             "image_prompt": { "type": "string" },
             "layout": { "type": "string", "enum": ["title", "bullets", "quote", "image_right", "section"] }
           },
           "required": ["heading", "bullets", "layout"]
         }
       }
     },
     "required": ["title", "slides"]
   }
   ```
5. Insert slides into `public.slides` linked to `deck_id`.
6. Update `public.decks` status to `'ready'`.

---

### Task 2: Slide Renderer Component

**Files:**
- Create: `apps/web/src/components/SlideRenderer.jsx`

**Step 1: Write SlideRenderer Component**
Implement `apps/web/src/components/SlideRenderer.jsx` to render a 16:9 aspect ratio presentation slide. 
Support the following layouts using CSS:
- `title`: Main centered presentation header and subtitle.
- `bullets`: Left-aligned header with a list of bullet points.
- `quote`: Stylized blockquote centered on the slide.
- `image_right`: Splits the slide 50/50, text on the left, visual placeholder on the right.
- `section`: Big bold text dividing presentation sections.

Use active color styles dynamically from the user's active brand kit (defaulting to css variables if no brand kit is selected).

---

### Task 3: Deck Editor Page

**Files:**
- Create: `apps/web/src/pages/DeckEditor.jsx`

**Step 1: Write DeckEditor Page**
Implement `/apps/web/src/pages/DeckEditor.jsx` to:
1. Fetch all slides for a specific `deck_id`.
2. Map slides in a scrollable page layout.
3. Allow inline editing of slide heading and bullets.
4. Save updates to `public.slides` in real-time or via a Save button.

---

### Task 4: New Deck Creator Page

**Files:**
- Create: `apps/web/src/pages/NewDeck.jsx`

**Step 1: Write NewDeck Page**
Implement `/apps/web/src/pages/NewDeck.jsx` to:
1. Provide a text input for video URLs (YouTube/Loom).
2. Insert a new deck into `public.decks` with status `'pending'`.
3. Call `generate-deck` Edge Function.
4. Show a sleek loading/processing state.
5. Poll deck status until it becomes `'ready'`, then navigate to `/deck/:id`.
