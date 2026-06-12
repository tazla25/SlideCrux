# SlideCrux Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete visual and structural redesign of SlideCrux with a deep dark mode glassmorphism theme, sidebar layout, and split-screen deck editor.

**Architecture:** We will replace the existing layouts with a global app shell containing a sidebar. The CSS will be heavily extended with custom Tailwind utilities in `index.css` for glassmorphism and neon glows. The Deck Editor will be split into a left-side form panel and a right-side sticky preview canvas.

**Tech Stack:** React, Vite, TailwindCSS.

---

### Task 1: Global CSS Theme & Tailwind Configuration

**Files:**
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/tailwind.config.js` (if exists, or add custom classes in index.css)

- [ ] **Step 1: Define CSS Variables and Utilities in `index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg-app: #050505;
    --bg-panel: rgba(15, 15, 20, 0.6);
    --border-glow: rgba(255, 255, 255, 0.08);
    --accent-neon: #3b82f6;
  }
  body {
    @apply bg-[#050505] text-gray-100 font-sans antialiased;
  }
}

@layer utilities {
  .glass-panel {
    @apply bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl;
  }
  .neon-glow {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
  }
  .input-field {
    @apply w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-300;
  }
  .btn-primary {
    @apply bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-6 rounded-xl transition-all duration-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)];
  }
}
```

---

### Task 2: Global Sidebar App Shell (`AppShell.jsx`)

**Files:**
- Create: `apps/web/src/components/Sidebar.jsx`
- Create: `apps/web/src/components/AppShell.jsx`
- Modify: `apps/web/src/App.jsx`

- [ ] **Step 1: Create Sidebar component**

```jsx
import React from 'react';

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen fixed left-0 top-0 glass-panel border-l-0 border-y-0 rounded-none p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-8 h-8 rounded-lg bg-blue-600 neon-glow"></div>
        <h1 className="text-xl font-bold tracking-tight text-white">SlideCrux</h1>
      </div>
      
      <nav className="flex-1 space-y-2">
        <a href="/dashboard" className="flex items-center px-4 py-3 rounded-xl bg-white/5 text-blue-400 border border-white/5">Dashboard</a>
        <a href="/new-deck" className="flex items-center px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors">New Deck</a>
        <a href="/brand-kits" className="flex items-center px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors">Brand Kits</a>
      </nav>
      
      <div className="mt-auto">
        <a href="/settings" className="flex items-center px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors">Settings</a>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create AppShell wrapper**

```jsx
import React from 'react';
import Sidebar from './Sidebar';

export default function AppShell({ children }) {
  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Update `App.jsx` to wrap protected routes in `AppShell`**
Wrap the routes `/dashboard`, `/new-deck`, `/brand-kits`, `/settings` with `<AppShell>`.

---

### Task 3: Dashboard Redesign (`Dashboard.jsx`)

**Files:**
- Modify: `apps/web/src/pages/Dashboard.jsx`

- [ ] **Step 1: Rewrite Dashboard.jsx with Grid and Glassmorphism Cards**

```jsx
import React from 'react';

export default function Dashboard() {
  // Placeholder data for design
  const decks = [
    { id: 1, title: 'Q3 Earnings Call', date: 'Oct 12, 2026', slides: 12 },
    { id: 2, title: 'Product Launch v2', date: 'Oct 10, 2026', slides: 8 }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-white tracking-tight">Recent Decks</h2>
        <button className="btn-primary">+ Create New</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map(deck => (
          <div key={deck.id} className="glass-panel p-6 group hover:-translate-y-1 transition-transform duration-300 cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h3 className="text-lg font-medium text-white mb-2">{deck.title}</h3>
            <div className="flex justify-between text-sm text-gray-400">
              <span>{deck.slides} Slides</span>
              <span>{deck.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Task 4: Split-Screen Deck Editor (`DeckEditor.jsx`)

**Files:**
- Modify: `apps/web/src/pages/DeckEditor.jsx`

- [ ] **Step 1: Rewrite DeckEditor layout**

```jsx
import React, { useState } from 'react';

export default function DeckEditor() {
  const [slides, setSlides] = useState([
    { id: 1, heading: 'Slide 1', bullets: ['Point A', 'Point B'] }
  ]);
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8 overflow-hidden">
      {/* Left Panel: Editor */}
      <div className="w-1/3 glass-panel rounded-none border-y-0 border-l-0 border-r-white/10 flex flex-col relative z-10 bg-black/60">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="font-medium text-white">Edit Slide</h3>
          <button className="text-xs bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-600/40 transition-colors">Export PDF</button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Heading</label>
            <input type="text" className="input-field text-lg" value={slides[0].heading} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Bullets</label>
            <textarea className="input-field h-32 resize-none leading-relaxed" value={slides[0].bullets.join('\n')} readOnly />
          </div>
        </div>
      </div>
      
      {/* Right Panel: Live Preview Canvas */}
      <div className="w-2/3 bg-[#0a0a0a] relative flex items-center justify-center p-12 custom-pattern-bg">
        <div className="w-full aspect-video bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col p-12 transform transition-all duration-500 hover:scale-[1.02]">
          {/* Simulated slide rendering */}
          <h1 className="text-4xl font-bold text-gray-900 mb-8">{slides[0].heading}</h1>
          <ul className="list-disc pl-8 space-y-4 text-2xl text-gray-700">
            {slides[0].bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 5: Commit and Verify

**Files:**
- N/A

- [ ] **Step 2: Commit changes**
```bash
git add apps/web/src/
git commit -m "feat: implement advanced dark mode redesign with split-screen editor"
```
