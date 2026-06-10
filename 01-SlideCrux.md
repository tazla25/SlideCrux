# SlideCrux — Paste a Video URL → Get a Sales-Ready Slide Deck

> *"Drop a YouTube/Loom/Meet recording link. Get a 10-slide investor or sales deck in your brand colors, ready in 90 seconds. Export as PDF, PPTX, or Google Slides."*

**Target exit: $20K–$50K on Acquire.com after 90 days at $800–$1,500 MRR.**

---

## 1. Why this exits well

- **Niche but universal pain**: every founder/AE/marketer records demos, town-halls, customer calls, and webinars they want to *repurpose into decks*. Existing tools (Tome, Gamma, Beautiful.ai) generate decks from *text prompts*, not from *existing recordings*. The wedge = "use what you already recorded."
- **High perceived value per use**: a sales rep saves 3 hours per deck. Pays $19/mo without thinking.
- **Predictable AI costs**: transcript (Whisper or Deepgram) + structured-output LLM call → can be capped to ~$0.08 per deck.
- **Acquirer profile**: small portfolio operators who own 3-5 sales-tools (e.g., people running pitch-tools, sales-enablement micro-tools) — they bolt SlideCrux onto an existing audience and 5x MRR overnight. This makes the exit narrative very tight.
- **Comparable exits**: Tome raised at $300M post; Beautiful.ai acquired by Vista. Indie comps: GammaGPT clones have sold on Acquire for $15K–$40K at $400–$900 MRR.

## 2. Core problem

A founder records a 30-min demo on Loom. Marketing needs:
- A 10-slide investor deck of the same demo
- A 5-slide sales one-pager
- A LinkedIn carousel
- A Google Slides version their team can edit

Today this takes 4–6 hours of manual work. SlideCrux makes it **1 paste + 90 seconds**.

## 3. Product flow (the demo you'll record for ProductHunt)

1. User signs up with Google (Supabase Auth).
2. Onboarding: paste brand colors (or upload logo → extract palette via `node-vibrant`), pick deck style (Minimal / Bold / Investor / Sales).
3. Dashboard → **"New deck"** → paste any of:
   - YouTube URL (use `youtube-transcript` lib — free, no API key)
   - Loom URL (Loom exposes transcript via their public JSON endpoint)
   - Direct MP4/MP3 upload (≤25 MB → Whisper via OpenRouter)
   - Paste raw transcript (escape hatch)
4. SlideCrux pipeline:
   - Get transcript (free if YT/Loom, $0.006/min if Whisper)
   - LLM call with **strict JSON schema** asking for `{title, subtitle, slides: [{heading, bullets[], imagePrompt, speakerNotes}]}` — uses OpenRouter `openai/gpt-4o-mini` ($0.15/M input)
   - Render slides as React components → html2canvas → jspdf for PDF; PptxGenJS for .pptx; Google Slides API for direct push
5. User previews deck, edits any slide inline, exports.
6. Free tier: 1 deck/mo, watermark "Made with SlideCrux" on every slide.
7. Pro tier ($19/mo): 30 decks/mo, no watermark, brand colors, PPTX export.
8. Team tier ($49/mo): 200 decks/mo, Google Slides direct export, Notion/Slack integrations, 3 brand kits.

## 4. Viral loop (necessary because cold acquisition is expensive for sellable SaaS)

- **PDF metadata watermark**: every free-tier PDF has "Created with SlideCrux — slidecrux.com" in the *PDF footer* (not visible enough to embarrass user, visible enough that recipients notice).
- **Public deck share link**: free users *must* use public share URL `slidecrux.com/d/abc123` — every viewer of a free deck sees the SlideCrux brand bar at top with "Make your own deck →" CTA.
- **"Powered by SlideCrux"** badge on the share page is removable only on Pro.
- Estimated K = 0.5–0.8 (lower than B2C widgets but acceptable for B2B). Combined with SEO content, this gives organic growth that buyers love (signals "doesn't need paid ads to grow").

## 5. Complete tech stack

### Repo structure (single repo)
```
slidecrux/
├── apps/
│   └── web/                      # Vite + React SPA
│       ├── src/
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   ├── pages/
│       │   │   ├── Landing.jsx
│       │   │   ├── Dashboard.jsx
│       │   │   ├── NewDeck.jsx
│       │   │   ├── DeckEditor.jsx
│       │   │   ├── PublicDeck.jsx          # /d/:id
│       │   │   ├── Pricing.jsx
│       │   │   └── Settings.jsx
│       │   ├── components/
│       │   │   ├── SlideRenderer.jsx       # React → looks-like-slide
│       │   │   ├── ThemePicker.jsx
│       │   │   ├── BrandKitForm.jsx
│       │   │   └── ExportMenu.jsx          # PDF / PPTX / GSlides
│       │   ├── lib/
│       │   │   ├── supabase.js
│       │   │   ├── youtube.js              # extract videoId, fetch transcript
│       │   │   ├── loom.js
│       │   │   ├── exportPdf.js            # html2canvas + jspdf
│       │   │   ├── exportPptx.js           # PptxGenJS
│       │   │   └── gslides.js              # Google Slides API client
│       │   └── styles/
│       └── package.json
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql
│   └── functions/
│       ├── generate-deck/
│       │   ├── index.ts                    # main pipeline
│       │   ├── prompts.ts
│       │   └── schemas.ts                  # JSON schemas for LLM
│       ├── transcribe-upload/
│       │   └── index.ts                    # Whisper for uploads
│       ├── stripe-webhook/
│       │   └── index.ts                    # or lemon-squeezy-webhook
│       └── _shared/
│           └── openrouter.ts
├── vercel.json
└── README.md
```

### Supabase tables
- `profiles` (1:1 with auth.users — plan, stripe_customer_id)
- `brand_kits` (logo_url, colors[], font, user_id)
- `decks` (id, owner_id, source_type, source_url, status, slide_count, theme, brand_kit_id, public_slug, watermark, created_at)
- `slides` (deck_id, sort_order, heading, bullets jsonb, image_prompt, image_url, speaker_notes)
- `usage_log` (user_id, deck_id, transcript_minutes, llm_tokens_in, llm_tokens_out, cost_usd_cents, created_at)
- `subscriptions` (user_id, lemon_subscription_id, plan, status, period_end)

### External services
| Service | What it does | Cost at 100 paying users |
|---|---|---|
| Supabase | DB + Auth + Edge Functions + Storage | $0 (free tier) |
| Vercel | SPA hosting + DNS | $0 |
| OpenRouter | LLM + Whisper | ~$25/mo (with caching) |
| Lemon Squeezy | Payments (MoR — India-friendly) | 5% + $0.50/txn |
| Resend | Transactional email | $0 |
| Porkbun | Domain `slidecrux.com` | $11/yr |

## 6. 30-day build plan — 4 Jules-friendly tasks

### Task 1 (Days 1–8): Auth, brand kit, transcript pipeline (no AI yet)
**Jules super-prompt:**
> Create a Vite + React + Supabase app called slidecrux. Implement Google OAuth via Supabase. Build Onboarding flow: user enters brand colors (3 swatches) and uploads optional logo to Supabase Storage. Use node-vibrant to auto-extract palette from logo. Build "New Deck" page with a single input that accepts YouTube/Loom URLs. Implement getYouTubeTranscript(url) using the youtube-transcript npm package called from a Supabase Edge Function. Store results in a `decks` table with `transcript` column. Show transcript to user before generation.

Deliverables:
- App live at slidecrux.com
- Google auth working
- Brand kit creation
- YouTube + Loom transcript extraction working
- Termux-buildable: `npm run build` works on Android

### Task 2 (Days 9–16): The AI deck generation pipeline
**Jules super-prompt:**
> In Supabase Edge Function `generate-deck`, take a `deck_id`, fetch transcript, call OpenRouter `openai/gpt-4o-mini` with strict JSON schema response (use response_format with json_schema). Schema: `{title: str, subtitle: str, slides: [{heading: str, bullets: [str], imagePrompt: str, speakerNotes: str}]}`. Cap at 10 slides. After response, insert into `slides` table, update deck.status='ready'. Add a SlideRenderer.jsx React component that renders a single slide as a 16:9 div with brand colors applied. Implement DeckEditor.jsx that shows all slides with inline editing of heading/bullets.

Deliverables:
- AI generation works end-to-end in <90s
- Deck editor is usable
- Cost per deck logged in `usage_log`

### Task 3 (Days 17–23): Exports (PDF/PPTX/Google Slides) + public share + watermark
**Jules super-prompt:**
> Implement three export paths: (1) PDF via html2canvas + jspdf — render each SlideRenderer to canvas, page-per-slide. (2) PPTX via PptxGenJS — map slide JSON to pptx slides with native text/shapes (not images), so the buyer can edit. (3) Google Slides via Google's Slides API — user authorizes once, app creates a new presentation in their Drive. Add public deck route `/d/:slug` that renders a slideshow with prev/next nav and a top bar "Made with SlideCrux — Make yours →". On free tier, embed visible "SlideCrux" text in the bottom-right of every slide and in PDF metadata.

Deliverables:
- 3 export paths working
- Public share URLs live
- Watermarking + branding bar enforced for free tier

### Task 4 (Days 24–30): Lemon Squeezy + analytics + landing + launch
**Jules super-prompt:**
> Integrate Lemon Squeezy via their Checkout JS for 3 products (Free signal-only, Pro $19/mo, Team $49/mo). Build webhook handler in Supabase Edge Function that updates `subscriptions` table on subscription_created, subscription_updated, subscription_cancelled. Build a Pricing.jsx page. Add Umami analytics. Build Landing.jsx with hero ("Paste a video URL. Get a sales deck in 90 seconds."), 3-step animation, 6 testimonials placeholders, FAQ. Implement plan-gating: free user blocked from PPTX/Google Slides export, watermark always shown.

Deliverables:
- Lemon Squeezy live, test purchases work
- Plan gates enforced server-side (Edge Functions check `subscriptions.plan`)
- Landing page ready
- Soft launch in 5 communities (see Section 10)

## 7. Exact SQL schema

```sql
-- 001_init.sql
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  lemon_customer_id text,
  plan text not null default 'free' check (plan in ('free','pro','team')),
  plan_renews_at timestamptz,
  decks_this_month int not null default 0,
  monthly_reset_at timestamptz not null default date_trunc('month', now()) + interval '1 month',
  created_at timestamptz not null default now()
);

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default',
  logo_url text,
  color_primary text not null default '#0F172A',
  color_secondary text not null default '#3B82F6',
  color_accent text not null default '#F59E0B',
  font_family text not null default 'Inter',
  created_at timestamptz not null default now()
);

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  brand_kit_id uuid references public.brand_kits(id) on delete set null,
  title text,
  source_type text not null check (source_type in ('youtube','loom','upload','paste','meet')),
  source_url text,
  transcript text,
  theme text not null default 'minimal',
  status text not null default 'pending' check (status in ('pending','transcribing','generating','ready','failed')),
  slide_count int not null default 0,
  public_slug text unique,
  watermark boolean not null default true,
  error text,
  created_at timestamptz not null default now()
);

create index decks_owner_created_idx on public.decks (owner_id, created_at desc);
create index decks_public_slug_idx on public.decks (public_slug) where public_slug is not null;

create table public.slides (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  sort_order int not null,
  heading text not null,
  bullets jsonb not null default '[]',
  image_prompt text,
  image_url text,
  speaker_notes text,
  layout text not null default 'bullets' check (layout in ('title','bullets','quote','image_right','section')),
  created_at timestamptz not null default now()
);

create unique index slides_deck_order_idx on public.slides (deck_id, sort_order);

create table public.usage_log (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  deck_id uuid references public.decks(id) on delete set null,
  transcript_seconds int default 0,
  llm_tokens_in int default 0,
  llm_tokens_out int default 0,
  cost_usd_micros bigint default 0,           -- store as micros for precision
  created_at timestamptz not null default now()
);

create index usage_user_created_idx on public.usage_log (user_id, created_at desc);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lemon_subscription_id text unique not null,
  plan text not null,
  status text not null,
  current_period_end timestamptz not null,
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.brand_kits enable row level security;
alter table public.decks enable row level security;
alter table public.slides enable row level security;
alter table public.usage_log enable row level security;

create policy "self profile read" on public.profiles for select using (auth.uid() = id);
create policy "self profile update" on public.profiles for update using (auth.uid() = id);

create policy "owner brand_kits" on public.brand_kits for all using (auth.uid() = owner_id);

create policy "owner decks" on public.decks for all using (auth.uid() = owner_id);
-- Public can read decks via slug (for /d/:slug)
create policy "public deck read" on public.decks for select using (public_slug is not null);

create policy "owner slides" on public.slides for all using (
  exists (select 1 from public.decks d where d.id = slides.deck_id and d.owner_id = auth.uid())
);
create policy "public slides via slug" on public.slides for select using (
  exists (select 1 from public.decks d where d.id = slides.deck_id and d.public_slug is not null)
);

create policy "owner usage read" on public.usage_log for select using (auth.uid() = user_id);

-- Monthly quota enforcer
create or replace function public.can_create_deck(p_user uuid) returns boolean language plpgsql stable as $$
declare
  v_plan text;
  v_count int;
  v_limit int;
begin
  select plan, decks_this_month into v_plan, v_count from public.profiles where id = p_user;
  v_limit := case v_plan when 'free' then 1 when 'pro' then 30 when 'team' then 200 else 0 end;
  return v_count < v_limit;
end $$;

-- Trigger: on new auth user → create profile row
create or replace function public.handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Monthly reset (run via pg_cron, daily at 00:10 UTC)
create extension if not exists pg_cron;
create or replace function public.reset_monthly_quotas() returns void language sql as $$
  update public.profiles
  set decks_this_month = 0,
      monthly_reset_at = date_trunc('month', now()) + interval '1 month'
  where monthly_reset_at <= now();
$$;
select cron.schedule('reset-quotas', '10 0 * * *', $$select public.reset_monthly_quotas()$$);
```

## 8. Pricing (USD — global SaaS)

| Tier | Price | Limits | Branding |
|---|---|---|---|
| **Free** | $0 | 1 deck/mo, PDF export only, watermark on slides, public share required | ❌ |
| **Pro** | **$19/mo** or **$190/yr** | 30 decks/mo, PDF + PPTX, brand colors, no watermark, private share | ✅ |
| **Team** | **$49/mo** or **$490/yr** | 200 decks/mo, +Google Slides export, 3 brand kits, Notion/Slack publish, priority generation queue | ✅ |

Annual = 17% discount, captures upfront cash that buyers love to see ("$2,280 ARR with 6 months prepay = lower churn risk").

## 9. How to get first 50 paying users (the path to $800 MRR)

This is the part most blueprints lie about. Here's the real plan:

1. **ProductHunt launch (Day 32)** — coordinate with a hunter who's launched a sales tool before (DM 5 from PH's "Sales tools" history). Target #1 in "Productivity" or top 3 overall = ~150 signups, ~8 paid conversions ($150 MRR). [PH launch playbook in `/launch-checklist.md` — to be written by you]
2. **r/sales (1.4M members), r/salestechniques, r/startups** — 3 posts over 3 weeks, each framed as "I built X because I was tired of Y". Never sell. 4 paid.
3. **Indie Hackers + Hacker News "Show HN"** — Show HN converts ~2% of comments to signups. Aim 200 upvotes = 4–6 paid.
4. **LinkedIn cold outreach** — search "Sales Enablement Manager" + 1-50 employees. Send 30 personalized DMs/day with 30-sec Loom demo. 1.5% reply, 0.5% buy = 5 paid over 20 days.
5. **YouTube SEO content** — record 5 videos: "Turn a Loom into a sales deck", "Demo recording → investor deck in 90s". Long-tail SEO compounds. 3 paid from YouTube by Day 90.
6. **Affiliate-launch in 2 Slack/Discord communities** — Bravado (sales community, 50K members), RevGenius (35K) — DM the admin, offer 30% lifetime commission. 6 paid.
7. **Twitter build-in-public** — daily updates, 90-day journey. Tag `@levelsio @marc_louvion @arvidkahl`. Aim 3 viral threads = 8 paid via inbound.
8. **Cold email to YC W25/S25 founders** — they record demo videos constantly and need pitch decks. Public YC directory. 2 paid.

Sum: ~38 paid signups over 60 days × $19 avg = **$722 MRR by Day 90**. Add 3 Team-tier conversions (likely from agencies) = **+$147 MRR = $869 total**.

## 10. Realistic MRR projection + exit math

| Day | MRR | Paying customers | Notes |
|---|---|---|---|
| 30 | $40–$80 | 2–4 (friends, early discount) | Launch day, no revenue verification yet |
| 60 | $300–$500 | 16–26 | After PH + 2 Reddit hits + 1st YouTube video |
| 90 | $700–$1,000 | 35–50 | Compounding from SEO + affiliates |
| 120 (post-listing) | $1,000–$1,500 | continued growth during listing | Most growth happens *during* the listing because buyers see traction |

### Exit valuation at Day 90 listing

- MRR $850 × 12 = **$10,200 ARR**
- Costs: $30 fixed + $80 AI = $110/mo → **SDE ~$740/mo = $8,880/yr**
- Multiple: 3.0x (small but verified, niche, AI-defensible) = **$26,640 exit**
- After Acquire's 6% fee = **$25,041 USD ≈ ₹21.3 lakh**

### Exit valuation at Day 180 if you wait 3 more months

- MRR $1,800 × 12 = $21,600 ARR
- SDE ~$1,500/mo = $18,000/yr
- Multiple 3.8x = **$68,400 exit ≈ ₹58 lakh**

The math is clear: **every extra month of revenue stability adds disproportionate exit value**. Don't rush the listing.

## 11. Pre-exit checklist (Days 80–90)

Buyers will pay 20-30% more if you have:

- [ ] **Loom video walkthrough** of the entire codebase + Supabase + Vercel + Lemon Squeezy (15-min handover video)
- [ ] **`OPERATIONS.md`** in repo: every credential, every cron, every monthly task
- [ ] **`COSTS.md`**: actual monthly cost breakdown with screenshots
- [ ] **`CUSTOMERS.md`**: anonymized customer list with industry breakdown
- [ ] **Stripe/Lemon connected** to Acquire.com or TrustMRR for verified MRR badge
- [ ] **Google Analytics or Plausible** with 90 days of data
- [ ] **Zero open critical bugs** in GitHub Issues
- [ ] **Privacy Policy + Terms** (use TermsFeed generator, $0)
- [ ] **1-page financial summary**: revenue, costs, churn, top 5 customers (anonymized)
