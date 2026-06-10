# SlideCrux Foundation & Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the foundation of SlideCrux by scaffolding the Vite+React app, setting up Supabase, and implementing email/password authentication with email verification.

**Architecture:** A Vite-based React SPA hosted on Vercel connecting to a Supabase backend. Row-Level Security (RLS) is enabled on all tables, and a database trigger automatically synchronizes newly registered verified users to the public profile table.

**Tech Stack:** React, React Router, Supabase JS SDK, TailwindCSS (for styling reset and custom utilities).

---

### Task 1: Project Initialization

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.jsx`
- Create: `apps/web/src/App.jsx`
- Create: `apps/web/src/index.css`

**Step 1: Scaffold Vite + React App**
Run:
```bash
npx -y create-vite@latest apps/web --template react
```
Verify the output structure exists in `apps/web/`.

**Step 2: Install Dependencies**
Navigate to `apps/web` and run:
```bash
npm install @supabase/supabase-js react-router-dom
```

**Step 3: Add Basic CSS Reset**
Write a simple modern design system tokens in `apps/web/src/index.css`:
```css
@import "tailwindcss";

:root {
  --color-bg-primary: #0b0f19;
  --color-bg-secondary: #111827;
  --color-text-primary: #f3f4f6;
  --color-text-secondary: #9ca3af;
  --color-brand: #3b82f6;
  --color-brand-hover: #2563eb;
  --color-accent: #f59e0b;
}

body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: 'Inter', sans-serif;
  margin: 0;
}
```

---

### Task 2: Supabase Schema Setup

**Files:**
- Create: `supabase/migrations/001_init.sql`

**Step 1: Write SQL Schema**
Write the base RLS profiles table, trigger function, and initial tables structure in `supabase/migrations/001_init.sql`:
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  plan text not null default 'free' check (plan in ('free','pro','team')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "self profile read" on public.profiles for select using (auth.uid() = id);
create policy "self profile update" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

### Task 3: Supabase Client & Auth Pages

**Files:**
- Create: `apps/web/src/lib/supabase.js`
- Create: `apps/web/src/pages/Login.jsx`
- Create: `apps/web/src/pages/Register.jsx`
- Create: `apps/web/src/pages/VerifyEmail.jsx`

**Step 1: Configure Supabase Client**
Create `apps/web/src/lib/supabase.js` using local environment variables:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 2: Create Register Page with Email Verification Flow**
Implement the sign up form in `apps/web/src/pages/Register.jsx` using `supabase.auth.signUp`. Redirect user to `/verify-email` upon successful registration.

**Step 3: Create Login Page**
Implement sign in in `apps/web/src/pages/Login.jsx` using `supabase.auth.signInWithPassword`. Redirect to `/dashboard` on success.

**Step 4: Create Verify Email Notification Page**
Create a simple UI page `/verify-email` notifying the user to check their email inbox to confirm their registration.
