# SlideCrux Project Memory

## Last Session
- **Date:** June 11, 2026
- **Status:** Resolved YouTube transcript fetching issue and brand kits creation error. Fixed a bug where `youtube-transcript.ai` returned HTTP 200 with a dummy HTML page for videos without captions, forcing a validation check (`rawText.indexOf("## Transcript") === -1`). Fixed a column mismatch error in `brand_kits` table by renaming `color_primary`, `color_secondary`, and `color_accent` to match the React app fields (`primary_color`, `secondary_color`, `accent_color`) via a new migration `004_rename_brand_kit_colors.sql`. Added `generate-deck` to GitHub Actions deployment workflow.

## Accomplishments (Phase 5)
1. **Google OAuth & User Settings (Task 1 & Task 4)**:
   - Implemented Google Sign-In button on the Login and Register pages.
   - Built a comprehensive `Settings.jsx` page allowing users to update their profile name, manage active sessions, view plan/billing info, and permanently delete their account.

2. **Umami Analytics Integration (Task 2)**:
   - Added `umami` to `index.html`.
   - Built a custom `analytics.js` wrapper (`trackEvent`, `trackPageview`).
   - Integrated custom events (`signup_completed`, `plan_upgrade_clicked`, `deck_generated`, `deck_exported`, `share_link_created`) across the app.

3. **Legal Pages & Exit Docs (Task 5 & Task 6)**:
   - Generated standard Terms of Service (`Terms.jsx`) and Privacy Policy (`Privacy.jsx`).
   - Drafted `OPERATIONS.md` outlining maintenance, cron jobs, and credentials.
   - Drafted `COSTS.md` outlining the $1 fixed costs and variable margins for acquisition buyers.

4. **SEO Blog Shell (Task 7)**:
   - Created static blog architecture with `Blog.jsx` (index page) and `BlogPost.jsx` (post renderer).
   - Added `apps/web/src/data/blog-posts.js` containing 3 starter SEO articles (e.g., "YouTube to Deck in 90s").
   - Wrote a dependency-free markdown parser inside `BlogPost.jsx` to keep the bundle small.

5. **Production Hardening (Task 8)**:
   - Implemented a global `ErrorBoundary.jsx` catching all unhandled React exceptions.
   - Created a dedicated `NotFound.jsx` (404) page for unknown routes.
   - Replaced basic spinners with premium, responsive skeleton shimmer animations across `Dashboard.jsx`, `BrandKits.jsx`, and `DeckEditor.jsx` using purely CSS gradients.

## Active Context & Schema
- Profiles: plan tier (free/pro/team), decks_this_month, monthly_reset_at.
- Usage log: per-deck token + cost tracking.
- OpenRouter: nvidia/nemotron-3-ultra-550b-a55b:free with structured JSON output + retry + timeout.
- Authentication: Magic Link + Google OAuth (Supabase Auth).
- Subscriptions: Lemon Squeezy Webhooks managed by Supabase Edge Functions.
- Tech Stack: Vite + React 19, Supabase (PostgreSQL + Edge Functions), Vercel.

## Next Steps
- The MVP is fully built, polished, and documented.
- Deploy the frontend to Vercel via GitHub, following `08-Deployment_Guide.md`.
- List the project on Acquire.com using the newly generated operational and cost documents.
