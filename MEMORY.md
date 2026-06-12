# SlideCrux Project Memory

## Last Session
- **Date:** June 12, 2026
- **Status:** Completed a massive visual and structural redesign. Converted the entire UI into an advanced "Deep Dark Mode" glassmorphism aesthetic. Implemented a new `AppShell.jsx` with a global Sidebar, redesigned the Dashboard to feature a glass-panel grid layout, and completely rewrote `DeckEditor.jsx` into a Split-Screen Editor (left panel for text edits, right panel for live canvas preview). Replaced Tailwind configurations with pure Vanilla CSS utility equivalents in `index.css`. Code successfully staged for git push.

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

## Accomplishments (Redesign Phase)
1. **Advanced Web App Aesthetic**:
   - Transitioned to a deep dark mode with glassmorphism panels, subtle neon glow effects, and modern CSS gradients using pure Vanilla CSS.
2. **Global Sidebar Layout**:
   - Replaced the top-navbar layout with a fixed left `Sidebar.jsx` and wrapped all protected routes inside an `AppShell.jsx`.
3. **Split-Screen Deck Editor**:
   - Re-architected `DeckEditor.jsx` to feature a 1/3-width left form panel for slide text edits and a 2/3-width sticky right canvas panel for live slide previews. Integrated existing complex state without breaking functionality.
4. **Dashboard Overhaul**:
   - Remapped the `Dashboard.jsx` interface to use an interactive glass-panel grid layout for recent decks.

## Active Context & Schema
- Profiles: plan tier (free/pro/team), decks_this_month, monthly_reset_at.
- Usage log: per-deck token + cost tracking.
- OpenRouter: nvidia/nemotron-3-ultra-550b-a55b:free with structured JSON output + retry + timeout.
- Authentication: Magic Link + Google OAuth (Supabase Auth).
- Subscriptions: Lemon Squeezy Webhooks managed by Supabase Edge Functions.
- Tech Stack: Vite + React 19, Supabase (PostgreSQL + Edge Functions), Vercel.

## Next Steps
- Suman to monitor the GitHub Actions run for Edge Functions deployment.
- Import the SlideCrux repository into Vercel Dashboard for live production hosting.
- Configure Lemon Squeezy webhook URL pointing to the deployed `lemon-webhook` Edge Function.
- Start marketing / Launch checklist prep or proceed to next product **ChangelogPilot**.
