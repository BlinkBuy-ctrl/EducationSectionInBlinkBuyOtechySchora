-- ══════════════════════════════════════════════════════════════════
-- OtechySchora — Complete Standalone Schema + Storage
-- Run this ONCE in: Supabase Dashboard → SQL Editor
-- Everything is created automatically — no manual steps needed
-- ══════════════════════════════════════════════════════════════════

-- ── EXTENSIONS ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ══════════════════════════════════════════════════════════════════
-- 1. PROFILES
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  name       text        not null default '',
  email      text,
  phone      text,
  role       text        not null default 'student'
                           check (role in ('student','admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin NEW.updated_at = now(); return NEW; end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ══════════════════════════════════════════════════════════════════
-- 2. RESOURCES
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.otechy_resources (
  id             uuid          primary key default uuid_generate_v4(),
  uploader_id    uuid          not null references public.profiles(id) on delete cascade,
  title          text          not null,
  description    text,
  category       text          not null default 'Other'
                                 check (category in ('Past Papers','Textbooks','Notes','Research','Other')),
  price          numeric(10,2) not null default 0,
  file_url       text          not null,
  file_name      text          not null,
  file_size      bigint,
  download_count int           not null default 0,
  is_approved    boolean       not null default true,
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

create trigger trg_resources_updated_at
  before update on public.otechy_resources
  for each row execute procedure public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════
-- 3. SCHOLARSHIPS
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.otechy_scholarships (
  id          uuid        primary key default uuid_generate_v4(),
  title       text        not null,
  provider    text        not null,
  description text,
  amount      text,
  deadline    date,
  link        text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- ══════════════════════════════════════════════════════════════════
-- 4. PURCHASES
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.otechy_purchases (
  id          uuid          primary key default uuid_generate_v4(),
  buyer_id    uuid          not null references public.profiles(id) on delete cascade,
  resource_id uuid          not null references public.otechy_resources(id) on delete cascade,
  amount_paid numeric(10,2) not null default 0,
  created_at  timestamptz   not null default now(),
  unique (buyer_id, resource_id)
);

-- ══════════════════════════════════════════════════════════════════
-- 5. DOWNLOAD LOGS
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.otechy_download_logs (
  id            uuid        primary key default uuid_generate_v4(),
  resource_id   uuid        not null references public.otechy_resources(id) on delete cascade,
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

-- ══════════════════════════════════════════════════════════════════
-- 6. NOTIFICATIONS
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.otechy_notifications (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  type       text        not null default 'info'
                           check (type in ('info','purchase','download','scholarship','welcome','upload')),
  title      text        not null,
  body       text,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

-- ══════════════════════════════════════════════════════════════════
-- 7. RPCs + TRIGGERS
-- ══════════════════════════════════════════════════════════════════

-- Increment download + log + notify uploader
create or replace function public.increment_download(resource_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.otechy_resources
    set download_count = download_count + 1
    where id = resource_id;

  insert into public.otechy_download_logs (resource_id, user_id)
    values (resource_id, auth.uid());

  insert into public.otechy_notifications (user_id, type, title, body)
    select uploader_id, 'download',
      '📥 Someone downloaded your resource',
      'Your resource "' || title || '" was just downloaded.'
    from public.otechy_resources
    where id = resource_id;
end;
$$;

-- Welcome notification on signup
create or replace function public.handle_new_user_notification()
returns trigger language plpgsql security definer as $$
begin
  insert into public.otechy_notifications (user_id, type, title, body)
  values (
    new.id, 'welcome',
    '👋 Welcome to OtechySchora!',
    'Access past papers, textbooks, notes, and scholarships — all in one place.'
  );
  return new;
end;
$$;

drop trigger if exists on_new_user_notify on public.profiles;
create trigger on_new_user_notify
  after insert on public.profiles
  for each row execute function public.handle_new_user_notification();

-- Notify buyer on purchase
create or replace function public.handle_purchase_notification()
returns trigger language plpgsql security definer as $$
declare res_title text;
begin
  select title into res_title from public.otechy_resources where id = new.resource_id;
  insert into public.otechy_notifications (user_id, type, title, body)
  values (
    new.buyer_id, 'purchase',
    '✅ Purchase successful!',
    'You now have full access to "' || res_title || '". Tap to download.'
  );
  return new;
end;
$$;

drop trigger if exists on_purchase_notify on public.otechy_purchases;
create trigger on_purchase_notify
  after insert on public.otechy_purchases
  for each row execute function public.handle_purchase_notification();

-- Notify uploader on sale
create or replace function public.handle_sale_notification()
returns trigger language plpgsql security definer as $$
declare
  res_title    text;
  v_uploader_id uuid;
  buyer_name   text;
begin
  select r.title, r.uploader_id, p.name
    into res_title, v_uploader_id, buyer_name
    from public.otechy_resources r
    join public.profiles p on p.id = new.buyer_id
    where r.id = new.resource_id;

  if new.amount_paid > 0 then
    insert into public.otechy_notifications (user_id, type, title, body)
    values (
      v_uploader_id, 'purchase',
      '💰 You made a sale!',
      buyer_name || ' purchased "' || res_title || '" for MK ' || new.amount_paid::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_sale_notify on public.otechy_purchases;
create trigger on_sale_notify
  after insert on public.otechy_purchases
  for each row execute function public.handle_sale_notification();

-- ══════════════════════════════════════════════════════════════════
-- 8. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════

alter table public.profiles               enable row level security;
alter table public.otechy_resources       enable row level security;
alter table public.otechy_scholarships    enable row level security;
alter table public.otechy_purchases       enable row level security;
alter table public.otechy_download_logs   enable row level security;
alter table public.otechy_notifications   enable row level security;

-- Profiles
create policy "profiles_select" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Resources
create policy "resources_select" on public.otechy_resources for select using (auth.role() = 'authenticated');
create policy "resources_insert" on public.otechy_resources for insert with check (auth.uid() = uploader_id);
create policy "resources_delete" on public.otechy_resources for delete using (auth.uid() = uploader_id);

-- Scholarships
create policy "scholarships_select" on public.otechy_scholarships for select using (auth.role() = 'authenticated');

-- Purchases
create policy "purchases_select" on public.otechy_purchases for select using (auth.uid() = buyer_id);
create policy "purchases_insert" on public.otechy_purchases for insert with check (auth.uid() = buyer_id);

-- Download logs
create policy "dlogs_select" on public.otechy_download_logs for select using (auth.uid() = user_id);
create policy "dlogs_insert" on public.otechy_download_logs for insert with check (auth.uid() = user_id);

-- Notifications
create policy "notifs_select" on public.otechy_notifications for select using (auth.uid() = user_id);
create policy "notifs_update" on public.otechy_notifications for update using (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════
-- 9. STORAGE BUCKET + POLICIES (all done via SQL)
-- ══════════════════════════════════════════════════════════════════

-- Create the bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'otechy-docs',
  'otechy-docs',
  false,                          -- private: files only via signed URLs
  52428800,                       -- 50 MB max file size
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do nothing;

-- Storage policy: authenticated users can upload
create policy "storage_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'otechy-docs');

-- Storage policy: authenticated users can download
create policy "storage_download"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'otechy-docs');

-- Storage policy: uploaders can delete their own files
create policy "storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'otechy-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ══════════════════════════════════════════════════════════════════
-- DONE — all tables, triggers, RLS, storage bucket and policies
-- are fully set up. No manual steps needed.
-- ══════════════════════════════════════════════════════════════════
