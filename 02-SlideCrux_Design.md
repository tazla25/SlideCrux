# 02-SlideCrux_Design — Technical Design Specification

> **Project:** SlideCrux  
> **Target Stack:** Vite + React + TailwindCSS (Vanilla CSS favored where possible, but UI aesthetics must be premium) + Supabase (Auth, DB, Edge Functions) + Vercel  
> **Auth Type:** Email + Password Auth with Email Verification enabled.

---

## 1. Directory & File Structure

We will scaffold the React app inside the `apps/web/` folder under `SlideCrux`.

```
slidecrux/
├── apps/
│   └── web/
│       ├── index.html
│       ├── package.json
│       ├── src/
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   ├── index.css
│       │   ├── lib/
│       │   │   └── supabase.js
│       │   ├── pages/
│       │   │   ├── Login.jsx
│       │   │   ├── Register.jsx
│       │   │   ├── VerifyEmail.jsx
│       │   │   ├── Dashboard.jsx
│       │   │   ├── NewDeck.jsx
│       │   │   ├── DeckEditor.jsx
│       │   │   ├── PublicDeck.jsx
│       │   │   ├── Pricing.jsx
│       │   │   └── Settings.jsx
│       │   └── components/
│       │       └── Navbar.jsx
│       └── vite.config.js
├── supabase/
│   └── migrations/
│       └── 001_init.sql
├── vercel.json
└── README.md
```

---

## 2. Supabase Database Schema

### Profiles Table (`public.profiles`)
Every authenticated user will have a profile created automatically via database triggers.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  plan text not null default 'free' check (plan in ('free','pro','team')),
  created_at timestamptz not null default now()
);
```

### Brand Kits Table (`public.brand_kits`)
Stores brand assets for personalization of slides.

```sql
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
```

### Decks Table (`public.decks`)
```sql
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  brand_kit_id uuid references public.brand_kits(id) on delete set null,
  title text,
  source_type text not null check (source_type in ('youtube','loom','upload','paste','meet')),
  source_url text,
  transcript text,
  status text not null default 'pending' check (status in ('pending','transcribing','generating','ready','failed')),
  slide_count int not null default 0,
  public_slug text unique,
  watermark boolean not null default true,
  error text,
  created_at timestamptz not null default now()
);
```

### Slides Table (`public.slides`)
```sql
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
```

---

## 3. User Authentication Flow

1. **Sign Up (Registration):**
   - User inputs email and password on `/register`.
   - Client calls `supabase.auth.signUp({ email, password })`.
   - Supabase triggers verification email.
   - User redirected to `/verify-email`.

2. **Sign In (Login):**
   - User inputs email and password on `/login`.
   - Client calls `supabase.auth.signInWithPassword({ email, password })`.
   - On success, redirect to `/dashboard`.
   - If email is not verified, Supabase returns an error, which we display to the user.

3. **Trigger profile creation:**
   - Database trigger on `auth.users` inserts user data into `public.profiles` upon signup.

---

## 4. Protected Routes

- `/dashboard`, `/new-deck`, `/settings` are protected.
- If a user tries to access them without an active session, they are redirected to `/login`.
- `/d/:slug` (public share link) is accessible to everyone.
