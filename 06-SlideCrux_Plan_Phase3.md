# SlideCrux Exports & Free Watermarking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement client-side PDF export, editable client-side PPTX export, Google Slides API integration, public share slideshow with watermarking, and plan gates.

**Architecture:** Expose export buttons inside the Deck Editor page that trigger clean client-side utilities using html2canvas/jsPDF, PptxGenJS, and Google Slides REST API. Watermarks are dynamically shown/hidden in SlideRenderer and export outputs depending on the deck's watermark field or the profile's tier.

**Tech Stack:** React, Supabase, jsPDF, html2canvas, PptxGenJS, Google Slides REST API.

---

### Task 1: Package Dependencies
**Files:**
- Modify: `apps/web/package.json`

**Step 1: Add PDF and PPTX libraries to package.json**
Add dependencies:
- `"html2canvas": "^1.4.1"`
- `"jspdf": "^2.5.1"`
- `"pptxgenjs": "^3.12.0"`

**Step 2: Rebuild & Sync lockfile**
Ensure dependencies are properly added.

---

### Task 2: PDF Export Helper
**Files:**
- Create: `apps/web/src/lib/exportPdf.js`

**Step 1: Implement PDF renderer**
Write a utility using `createRoot`, `html2canvas` and `jsPDF` that:
1. Temporarily renders each slide offscreen inside a 16:9 box (1280px x 720px).
2. Waits for styles and SVGs/images to settle.
3. Captures using html2canvas with `scale: 2` (for higher resolution PDF).
4. Generates a landscape PDF of the deck.

---

### Task 3: PPTX Export Helper
**Files:**
- Create: `apps/web/src/lib/exportPptx.js`

**Step 1: Implement Native shapes mapping to PPTX**
Write a utility using `PptxGenJS` that maps slide data JSON:
- Matches slide backgrounds using `brandKit?.color_primary`.
- Creates native editable text objects for titles, subtitles, bullets, and citations.
- Maps `image_right` split layout using `slide.image_url` or a native rectangle placeholder for image prompt.
- Incorporates the SlideCrux watermark on the free tier.

---

### Task 4: Google Slides Export Helper
**Files:**
- Create: `apps/web/src/lib/gslides.js`

**Step 1: Implement OAuth redirect & token extractor**
Provide functions to:
- Generate OAuth redirect URL for Implicit Flow with scopes `presentations` and `drive.file`.
- Extract and store `access_token` from location hash.

**Step 2: Implement slides creator REST wrapper**
Provide a function `exportDeckToGoogleSlides(deckTitle, slides, brandKit)` that calls Google API:
1. `POST https://slides.googleapis.com/v1/presentations` to create a blank deck.
2. `POST https://slides.googleapis.com/v1/presentations/{id}:batchUpdate` with creation requests for slides, background color configurations, shape positions, text insertions, and text styling matching slide layouts.

---

### Task 5: Public Share Page
**Files:**
- Create: `apps/web/src/pages/PublicDeck.jsx`
- Modify: `apps/web/src/App.jsx`
- Modify: `apps/web/src/pages/DeckEditor.jsx`

**Step 1: Implement PublicDeck.jsx component**
Create a public deck previewer page `/d/:slug` that:
- Fetches the public deck & slides by slug using a public select query.
- Renders a clean slides presentation with Next/Prev navigation.
- Shows a top bar branding banner: "Made with SlideCrux — Make yours →" links to homepage.
- Always shows watermark on the slides if the deck watermark is active.

**Step 2: Add Route to App.jsx**
Register `/d/:slug` as a public un-protected route.

**Step 3: Add share link toggle to DeckEditor.jsx**
Add a "Share Presentation" option in `DeckEditor` that:
- Toggles generating/removing `public_slug` on the database.
- Displays the public URL `slidecrux.com/d/slug` with copy button.

---

### Task 6: Plan Gates & Watermarking Enforcement
**Files:**
- Modify: `apps/web/src/pages/DeckEditor.jsx`
- Modify: `apps/web/src/components/Navbar.jsx`
- Create: `apps/web/src/pages/Pricing.jsx`
- Modify: `apps/web/src/App.jsx`

**Step 1: Add Plan tier check**
Fetch profile `plan` tier in `DeckEditor` and:
- Force `watermark = true` in DB and visual states if the plan is `'free'`. Prevent user from toggling watermark off (disable checkmark and alert "Watermark removal is a Pro feature").
- Block PPTX export if plan is `'free'` (show upgrade modal/alert).
- Block Google Slides export if plan is not `'team'` (show upgrade modal/alert).

**Step 2: Build simple Pricing.jsx page**
Create a pricing card screen showing Free ($0), Pro ($19/mo), and Team ($49/mo) with active benefits. Link "Upgrade" buttons to simulated plan update actions in the database (to simulate purchase success for testing).

**Step 3: Register /pricing route**
Add `/pricing` route in `App.jsx`.

---

### Task 7: Build & Validation
**Files:**
- None

**Step 1: Copy workspace & compile production build**
Copy `apps/web` to internal `~/build_temp`, install all dependencies, build Vite production target, and sync results back to `/sdcard`.
