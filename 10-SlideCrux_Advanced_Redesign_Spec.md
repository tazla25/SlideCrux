# SlideCrux Advanced Redesign Spec

## 1. Overview
A complete visual and structural redesign of the SlideCrux web application to transform it into a premium, advanced, and bug-free SaaS platform.

## 2. Visual System & Aesthetics
- **Theme:** Deep Dark Mode.
- **Style:** Glassmorphism with deep black/dark-gray backgrounds, subtle glowing neon accents (e.g., brand colors or electric blue/purple), and blurred translucent panels.
- **Typography:** Modern sans-serif (Inter or Outfit) with high contrast for readability.
- **Micro-interactions:** Smooth hover states, glowing borders on focus, and seamless page transitions.

## 3. Layout Architecture
- **Global Layout:** 
  - Fixed left sidebar navigation for all authenticated routes (`/dashboard`, `/decks`, `/brand-kits`, `/settings`).
  - Mobile responsive: Sidebar collapses into a hamburger menu.
  - Main content area to the right of the sidebar.
- **Top Bar (in specific contexts):** Context-specific actions (e.g., "Export", "Share" in the Deck Editor).

## 4. Core Workflows & UI Components
- **Dashboard (`Dashboard.jsx`):** Grid layout of recent decks with skeleton loading animations and hover effects on deck cards.
- **New Deck Creator (`NewDeck.jsx`):** Minimalist card-based form with a clear drag-and-drop zone for media and sleek inputs for URLs.
- **Deck Editor (`DeckEditor.jsx`):**
  - **Split-Screen Layout:**
    - **Left Panel:** Scrollable list of slides with inline inputs/textareas to edit headers and bullets.
    - **Right Panel:** Sticky, large live preview of the current slide.
  - Ensures the user never loses context while editing.
- **Settings & Brand Kits:** Clean forms with clear separation of sections.

## 5. Technical Improvements
- **CSS Framework:** TailwindCSS with heavy use of custom utility classes in `index.css` to manage gradients, blurs, and animations.
- **Bug Fixes:** Address overall UI/UX inconsistencies, overflow issues on smaller screens, and ensure robustness across all interactive elements.

## 6. Out of Scope
- Modifying Supabase database schemas or edge functions (unless explicitly required by a UI change).
- Adding completely new AI features not already present.
