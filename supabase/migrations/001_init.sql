-- 1. Profiles Table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  plan text not null default 'free' constraint profiles_plan_check check (plan in ('free','pro','team')),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Profile Plan Escalation Protection
create or replace function public.check_profile_plan_update()
returns trigger
language plpgsql
as $$
begin
  if new.plan is distinct from old.plan and auth.role() = 'authenticated' then
    raise exception 'Direct updating of the plan column is not allowed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger check_profile_plan_before_update
  before update on public.profiles
  for each row
  execute function public.check_profile_plan_update();


-- 2. Brand Kits Table
create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default',
  logo_url text,
  color_primary text not null default '#0F172A' constraint brand_kits_color_primary_check check (color_primary ~ '^#[0-9a-fA-F]{3,8}$'),
  color_secondary text not null default '#3B82F6' constraint brand_kits_color_secondary_check check (color_secondary ~ '^#[0-9a-fA-F]{3,8}$'),
  color_accent text not null default '#F59E0B' constraint brand_kits_color_accent_check check (color_accent ~ '^#[0-9a-fA-F]{3,8}$'),
  font_family text not null default 'Inter',
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.brand_kits enable row level security;

-- Brand Kits Policies
create policy "Users can select their own brand kits"
  on public.brand_kits for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own brand kits"
  on public.brand_kits for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own brand kits"
  on public.brand_kits for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own brand kits"
  on public.brand_kits for delete
  using (auth.uid() = owner_id);


-- 3. Decks Table
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  brand_kit_id uuid references public.brand_kits(id) on delete set null,
  title text,
  source_type text not null constraint decks_source_type_check check (source_type in ('youtube','loom','upload','paste','meet')),
  source_url text,
  transcript text,
  status text not null default 'pending' constraint decks_status_check check (status in ('pending','transcribing','generating','ready','failed')),
  slide_count int not null default 0,
  public_slug text unique,
  watermark boolean not null default true,
  error text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.decks enable row level security;

-- Decks Policies
create policy "Users can select their own or public decks"
  on public.decks for select
  using (auth.uid() = owner_id or public_slug is not null);

create policy "Users can insert their own decks"
  on public.decks for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own decks"
  on public.decks for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own decks"
  on public.decks for delete
  using (auth.uid() = owner_id);

-- Deck status & count protection
create or replace function public.check_deck_client_updates()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' then
    if (new.status is distinct from old.status) or
       (new.slide_count is distinct from old.slide_count) or
       (new.error is distinct from old.error) then
      raise exception 'Direct updates of status, slide_count, or error are not allowed.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger check_deck_client_updates_before_update
  before update on public.decks
  for each row
  execute function public.check_deck_client_updates();


-- 4. Slides Table
create table public.slides (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  sort_order int not null,
  heading text not null,
  bullets jsonb not null default '[]',
  image_prompt text,
  image_url text,
  speaker_notes text,
  layout text not null default 'bullets' constraint slides_layout_check check (layout in ('title','bullets','quote','image_right','section')),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.slides enable row level security;

-- Slides Policies
create policy "Users can select slides of own or public decks"
  on public.slides for select
  using (
    exists (
      select 1 from public.decks
      where public.decks.id = slides.deck_id
        and (public.decks.owner_id = auth.uid() or public.decks.public_slug is not null)
    )
  );

create policy "Users can insert slides into their own decks"
  on public.slides for insert
  with check (
    exists (
      select 1 from public.decks
      where public.decks.id = slides.deck_id
        and public.decks.owner_id = auth.uid()
    )
  );

create policy "Users can update slides of their own decks"
  on public.slides for update
  using (
    exists (
      select 1 from public.decks
      where public.slides.deck_id = public.decks.id
        and public.decks.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.decks
      where public.slides.deck_id = public.decks.id
        and public.decks.owner_id = auth.uid()
    )
  );

create policy "Users can delete slides from their own decks"
  on public.slides for delete
  using (
    exists (
      select 1 from public.decks
      where public.slides.deck_id = public.decks.id
        and public.decks.owner_id = auth.uid()
    )
  );


-- 5. Trigger for auto-profile creation on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 6. Performance Indexes
create index if not exists brand_kits_owner_id_idx on public.brand_kits(owner_id);
create index if not exists decks_owner_id_idx on public.decks(owner_id);
create index if not exists decks_brand_kit_id_idx on public.decks(brand_kit_id);
create index if not exists slides_deck_id_idx on public.slides(deck_id);
create index if not exists slides_deck_id_sort_order_idx on public.slides(deck_id, sort_order);
