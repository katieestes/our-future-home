-- Reference copy of the database setup (already applied to the Supabase project).
-- Run in the Supabase SQL editor only if you ever need to rebuild from scratch.

create table public.household_members (
  email text primary key,
  added_at timestamptz not null default now()
);

-- true when the signed-in user's email is in household_members
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- First person to sign in claims the household; afterwards only members can add people.
create or replace function public.claim_household()
returns boolean language plpgsql security definer set search_path = public as $$
declare v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_email = '' then return false; end if;
  if exists (select 1 from household_members where lower(email) = v_email) then return true; end if;
  if not exists (select 1 from household_members) then
    insert into household_members(email) values (v_email);
    return true;
  end if;
  return false;
end; $$;

revoke all on function public.claim_household() from public, anon;
grant execute on function public.claim_household() to authenticated;
revoke all on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

create table public.settings (
  id int primary key default 1 check (id = 1),
  intro text not null default 'Our running library of ideas, plans, and costs — collect now, decide together, build when we''re ready.',
  target_build text not null default '3–4 years',
  status_label text not null default 'Planning now',
  current_stage int not null default 1 check (current_stage between 1 and 4),
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

create table public.finishes (
  id uuid primary key default gen_random_uuid(),
  category text not null, name text not null, note text, source_url text,
  swatch_color text, image_url text,
  sort_order int not null default 0, created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null, details text,
  tag text not null default 'idea' check (tag in ('favorite','revisit','idea')),
  link_url text, image_url text, notes text,
  sort_order int not null default 0, created_at timestamptz not null default now()
);

create table public.dos_donts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('do','dont')), text text not null,
  sort_order int not null default 0, created_at timestamptz not null default now()
);

create table public.inspiration (
  id uuid primary key default gen_random_uuid(),
  title text not null, room text, image_url text, source_url text, notes text,
  sort_order int not null default 0, created_at timestamptz not null default now()
);

create table public.canva_designs (
  id uuid primary key default gen_random_uuid(),
  title text not null, url text, thumbnail_url text, notes text,
  sort_order int not null default 0, created_at timestamptz not null default now()
);

create table public.costs (
  id uuid primary key default gen_random_uuid(),
  category text not null, estimate numeric(12,2), source text, notes text,
  is_diy boolean not null default false,
  sort_order int not null default 0, created_at timestamptz not null default now()
);

create table public.builders (
  id uuid primary key default gen_random_uuid(),
  name text not null, service_area text, strengths text, questions text,
  est_pricing text, website text, notes text,
  sort_order int not null default 0, created_at timestamptz not null default now()
);

-- Row Level Security: only household members can read/write
do $$
declare t text;
begin
  foreach t in array array['finishes','plans','dos_donts','inspiration','canva_designs','costs','builders'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_member())', t);
    execute format('create policy "members insert" on public.%I for insert to authenticated with check (public.is_member())', t);
    execute format('create policy "members update" on public.%I for update to authenticated using (public.is_member()) with check (public.is_member())', t);
    execute format('create policy "members delete" on public.%I for delete to authenticated using (public.is_member())', t);
  end loop;
end $$;

alter table public.settings enable row level security;
create policy "members read" on public.settings for select to authenticated using (public.is_member());
create policy "members update" on public.settings for update to authenticated using (public.is_member()) with check (public.is_member());

alter table public.household_members enable row level security;
create policy "members read" on public.household_members for select to authenticated using (public.is_member());
create policy "members insert" on public.household_members for insert to authenticated with check (public.is_member());
create policy "members delete" on public.household_members for delete to authenticated using (public.is_member());

-- Photos: public-read bucket (files get random, unguessable names); only members can upload/change.
insert into storage.buckets (id, name, public) values ('images', 'images', true)
on conflict (id) do nothing;
create policy "members upload images" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and public.is_member());
create policy "members update images" on storage.objects for update to authenticated
  using (bucket_id = 'images' and public.is_member());
create policy "members delete images" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and public.is_member());

-- ===== Added: House Plans view (plan images + drawings) =====
alter table public.plans
  add column if not exists source text,
  add column if not exists likes text,
  add column if not exists changes text;

create table public.plan_images (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  image_url text not null,
  caption text,
  markup jsonb not null default '[]'::jsonb,  -- drawing strokes (see Stroke in src/app/models.ts)
  markup_updated_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index plan_images_plan_id_idx on public.plan_images(plan_id);
alter table public.plan_images enable row level security;
create policy "members read" on public.plan_images for select to authenticated using (public.is_member());
create policy "members insert" on public.plan_images for insert to authenticated with check (public.is_member());
create policy "members update" on public.plan_images for update to authenticated using (public.is_member()) with check (public.is_member());
create policy "members delete" on public.plan_images for delete to authenticated using (public.is_member());

-- ===== Added: keep-alive ping + storage meter =====
create or replace function public.keep_alive()
returns timestamptz language sql stable set search_path = '' as $$ select now(); $$;
revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;

create or replace function public.storage_usage()
returns table(bytes bigint, files bigint) language sql stable security definer set search_path = '' as $$
  select coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint, count(*)::bigint
  from storage.objects o
  where o.bucket_id = 'images' and public.is_member();
$$;
revoke all on function public.storage_usage() from public, anon;
grant execute on function public.storage_usage() to authenticated;
