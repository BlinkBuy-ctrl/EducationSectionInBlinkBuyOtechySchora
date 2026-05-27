-- ══════════════════════════════════════════════════════════════════
-- OtechySchora v3 — Run AFTER v1 + v2 schemas
-- Adds: rich scholarships, tutor directory, realtime notifications
-- ══════════════════════════════════════════════════════════════════

-- ── 1. SCHOLARSHIPS — rich/interactive (replaces minimal v1 table) ─
-- Drop old table if it has no data, otherwise ALTER
alter table if exists public.otechy_scholarships
  add column if not exists image_url       text,
  add column if not exists posted_by       uuid references public.profiles(id) on delete set null,
  add column if not exists tags            text[]      default '{}',
  add column if not exists likes_count     int         not null default 0,
  add column if not exists comments_count  int         not null default 0,
  add column if not exists views_count     int         not null default 0,
  add column if not exists eligibility     text,
  add column if not exists study_level     text        check (study_level in ('Any','Undergraduate','Postgraduate','PhD','Diploma','Certificate')),
  add column if not exists country         text        default 'Malawi',
  add column if not exists updated_at      timestamptz not null default now();

-- If the table doesn't exist yet (fresh install), create it fully
create table if not exists public.otechy_scholarships (
  id             uuid        primary key default uuid_generate_v4(),
  title          text        not null,
  provider       text        not null,
  description    text,
  image_url      text,
  link           text,
  amount         text,
  deadline       date,
  eligibility    text,
  study_level    text        check (study_level in ('Any','Undergraduate','Postgraduate','PhD','Diploma','Certificate')),
  country        text        default 'Malawi',
  tags           text[]      default '{}',
  is_active      boolean     not null default true,
  posted_by      uuid        references public.profiles(id) on delete set null,
  likes_count    int         not null default 0,
  comments_count int         not null default 0,
  views_count    int         not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── 2. SCHOLARSHIP LIKES ──────────────────────────────────────────
create table if not exists public.otechy_scholarship_likes (
  id             uuid        primary key default uuid_generate_v4(),
  scholarship_id uuid        not null references public.otechy_scholarships(id) on delete cascade,
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (scholarship_id, user_id)
);

-- Auto-update likes_count
create or replace function public.update_scholarship_likes()
returns trigger language plpgsql security definer as $$
declare sid uuid;
begin
  sid := coalesce(new.scholarship_id, old.scholarship_id);
  update public.otechy_scholarships
    set likes_count = (select count(*) from public.otechy_scholarship_likes where scholarship_id = sid)
    where id = sid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_scholarship_likes on public.otechy_scholarship_likes;
create trigger trg_scholarship_likes
  after insert or delete on public.otechy_scholarship_likes
  for each row execute function public.update_scholarship_likes();

-- ── 3. SCHOLARSHIP COMMENTS ───────────────────────────────────────
create table if not exists public.otechy_scholarship_comments (
  id             uuid        primary key default uuid_generate_v4(),
  scholarship_id uuid        not null references public.otechy_scholarships(id) on delete cascade,
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  body           text        not null,
  created_at     timestamptz not null default now()
);

create or replace function public.update_scholarship_comments()
returns trigger language plpgsql security definer as $$
declare sid uuid;
begin
  sid := coalesce(new.scholarship_id, old.scholarship_id);
  update public.otechy_scholarships
    set comments_count = (select count(*) from public.otechy_scholarship_comments where scholarship_id = sid)
    where id = sid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_scholarship_comments on public.otechy_scholarship_comments;
create trigger trg_scholarship_comments
  after insert or delete on public.otechy_scholarship_comments
  for each row execute function public.update_scholarship_comments();

-- ── 4. TUTOR DIRECTORY ────────────────────────────────────────────
create table if not exists public.otechy_tutors (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        references public.profiles(id) on delete set null,
  name         text        not null,
  tagline      text,
  bio          text        not null,
  subjects     text[]      not null default '{}',
  contact      text        not null,
  whatsapp     text,
  email        text,
  location     text,
  avatar_url   text,
  banner_url   text,
  price_range  text,
  is_online    boolean     not null default true,
  is_active    boolean     not null default true,
  likes_count  int         not null default 0,
  views_count  int         not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_tutors_updated_at
  before update on public.otechy_tutors
  for each row execute procedure public.set_updated_at();

-- ── 5. TUTOR LIKES ────────────────────────────────────────────────
create table if not exists public.otechy_tutor_likes (
  id         uuid        primary key default uuid_generate_v4(),
  tutor_id   uuid        not null references public.otechy_tutors(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tutor_id, user_id)
);

create or replace function public.update_tutor_likes()
returns trigger language plpgsql security definer as $$
declare tid uuid;
begin
  tid := coalesce(new.tutor_id, old.tutor_id);
  update public.otechy_tutors
    set likes_count = (select count(*) from public.otechy_tutor_likes where tutor_id = tid)
    where id = tid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_tutor_likes on public.otechy_tutor_likes;
create trigger trg_tutor_likes
  after insert or delete on public.otechy_tutor_likes
  for each row execute function public.update_tutor_likes();

-- ── 6. EXTEND notification types ─────────────────────────────────
alter table public.otechy_notifications
  drop constraint if exists otechy_notifications_type_check;

alter table public.otechy_notifications
  add constraint otechy_notifications_type_check
  check (type in ('info','purchase','download','scholarship','welcome','upload','tutor','comment'));

-- ── 7. REALTIME — enable on key tables ───────────────────────────
-- Supabase Realtime publication (run once; idempotent via IF NOT EXISTS)
alter publication supabase_realtime add table public.otechy_notifications;
alter publication supabase_realtime add table public.otechy_scholarships;
alter publication supabase_realtime add table public.otechy_tutors;
alter publication supabase_realtime add table public.otechy_scholarship_comments;

-- ── 8. TRIGGER — notify all users on new scholarship ─────────────
create or replace function public.handle_new_scholarship_notification()
returns trigger language plpgsql security definer as $$
begin
  -- notify all users about new scholarship (fan-out to all profiles)
  insert into public.otechy_notifications (user_id, type, title, body)
  select id, 'scholarship',
    '🏆 New Scholarship: ' || new.title,
    'Posted by ' || new.provider || coalesce('. Deadline: ' || new.deadline::text, '')
  from public.profiles;
  return new;
end;
$$;

drop trigger if exists on_new_scholarship on public.otechy_scholarships;
create trigger on_new_scholarship
  after insert on public.otechy_scholarships
  for each row execute function public.handle_new_scholarship_notification();

-- ── 9. TRIGGER — notify all users on new tutor ───────────────────
create or replace function public.handle_new_tutor_notification()
returns trigger language plpgsql security definer as $$
begin
  insert into public.otechy_notifications (user_id, type, title, body)
  select id, 'tutor',
    '👨‍🏫 New Tutor: ' || new.name,
    coalesce(new.tagline, 'Offering: ' || array_to_string(new.subjects, ', '))
  from public.profiles;
  return new;
end;
$$;

drop trigger if exists on_new_tutor on public.otechy_tutors;
create trigger on_new_tutor
  after insert on public.otechy_tutors
  for each row execute function public.handle_new_tutor_notification();

-- ── 10. STORAGE — scholarship & tutor images bucket ──────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'otechy-images', 'otechy-images', true,
  10485760,  -- 10 MB
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

create policy "images_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'otechy-images');
create policy "images_select" on storage.objects for select to anon, authenticated
  using (bucket_id = 'otechy-images');
create policy "images_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'otechy-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── 11. RLS ───────────────────────────────────────────────────────
alter table public.otechy_scholarships enable row level security;
drop policy if exists "scholarships_select" on public.otechy_scholarships;
create policy "scholarships_select"  on public.otechy_scholarships for select using (true);
create policy "scholarships_insert"  on public.otechy_scholarships for insert to authenticated with check (true);
create policy "scholarships_update"  on public.otechy_scholarships for update using (auth.uid() = posted_by);
create policy "scholarships_delete"  on public.otechy_scholarships for delete using (auth.uid() = posted_by);

alter table public.otechy_scholarship_likes    enable row level security;
create policy "s_likes_select"  on public.otechy_scholarship_likes for select using (true);
create policy "s_likes_insert"  on public.otechy_scholarship_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "s_likes_delete"  on public.otechy_scholarship_likes for delete using (auth.uid() = user_id);

alter table public.otechy_scholarship_comments enable row level security;
create policy "s_comments_select" on public.otechy_scholarship_comments for select using (true);
create policy "s_comments_insert" on public.otechy_scholarship_comments for insert to authenticated with check (auth.uid() = user_id);
create policy "s_comments_delete" on public.otechy_scholarship_comments for delete using (auth.uid() = user_id);

alter table public.otechy_tutors enable row level security;
create policy "tutors_select" on public.otechy_tutors for select using (true);
create policy "tutors_insert" on public.otechy_tutors for insert to authenticated with check (true);
create policy "tutors_update" on public.otechy_tutors for update using (auth.uid() = user_id);
create policy "tutors_delete" on public.otechy_tutors for delete using (auth.uid() = user_id);

alter table public.otechy_tutor_likes enable row level security;
create policy "t_likes_select" on public.otechy_tutor_likes for select using (true);
create policy "t_likes_insert" on public.otechy_tutor_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "t_likes_delete" on public.otechy_tutor_likes for delete using (auth.uid() = user_id);

-- ── 12. RPC: increment scholarship views ─────────────────────────
create or replace function public.increment_scholarship_view(p_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.otechy_scholarships set views_count = views_count + 1 where id = p_id;
end;
$$;

create or replace function public.increment_tutor_view(p_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.otechy_tutors set views_count = views_count + 1 where id = p_id;
end;
$$;

-- ══════════════════════════════════════════════════════════════════
-- DONE — v3 migration complete
-- ══════════════════════════════════════════════════════════════════
