-- ══════════════════════════════════════════════════════════════════
-- OtechySchora — Education Hub Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ── 1. RESOURCES ──────────────────────────────────────────────────
create table if not exists public.otechy_resources (
  id             uuid         primary key default uuid_generate_v4(),
  uploader_id    uuid         not null references public.profiles(id) on delete cascade,
  title          text         not null,
  description    text,
  category       text         not null default 'Other'
                               check (category in ('Past Papers','Textbooks','Notes','Research','Other')),
  price          numeric(10,2) not null default 0,
  file_url       text         not null,   -- Supabase Storage path (not signed URL)
  file_name      text         not null,
  file_size      bigint,
  download_count int          not null default 0,
  is_approved    boolean      not null default true,
  created_at     timestamptz  not null default now()
);

-- ── 2. SCHOLARSHIPS ───────────────────────────────────────────────
create table if not exists public.otechy_scholarships (
  id          uuid        primary key default uuid_generate_v4(),
  title       text        not null,
  provider    text        not null,
  description text,
  amount      text,                       -- e.g. "MK 500,000/year"
  deadline    date,
  link        text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- ── 3. PURCHASES ──────────────────────────────────────────────────
create table if not exists public.otechy_purchases (
  id          uuid        primary key default uuid_generate_v4(),
  buyer_id    uuid        not null references public.profiles(id) on delete cascade,
  resource_id uuid        not null references public.otechy_resources(id) on delete cascade,
  amount_paid numeric(10,2) not null default 0,
  created_at  timestamptz not null default now(),
  unique (buyer_id, resource_id)          -- prevents duplicate purchases
);

-- ── 4. INCREMENT DOWNLOAD RPC ─────────────────────────────────────
create or replace function public.increment_download(resource_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.otechy_resources
  set download_count = download_count + 1
  where id = resource_id;
end;
$$;

-- ── 5. ROW LEVEL SECURITY ─────────────────────────────────────────
alter table public.otechy_resources   enable row level security;
alter table public.otechy_scholarships enable row level security;
alter table public.otechy_purchases   enable row level security;

-- Resources: anyone authenticated can read; uploaders manage own
create policy "read_resources"   on public.otechy_resources   for select using (auth.role() = 'authenticated');
create policy "insert_resources" on public.otechy_resources   for insert with check (auth.uid() = uploader_id);
create policy "delete_resources" on public.otechy_resources   for delete using (auth.uid() = uploader_id);

-- Scholarships: authenticated read only (admin inserts via dashboard)
create policy "read_scholarships" on public.otechy_scholarships for select using (auth.role() = 'authenticated');

-- Purchases: users see only their own
create policy "read_purchases"   on public.otechy_purchases for select using (auth.uid() = buyer_id);
create policy "insert_purchases" on public.otechy_purchases for insert with check (auth.uid() = buyer_id);

-- ── 6. STORAGE BUCKET ─────────────────────────────────────────────
-- Run in Supabase Dashboard → Storage → New bucket
-- Bucket name: otechy-docs
-- Public: NO (files served via signed URLs only)
--
-- Storage policies to add:
--   INSERT: (auth.role() = 'authenticated')
--   SELECT: (auth.role() = 'authenticated')
