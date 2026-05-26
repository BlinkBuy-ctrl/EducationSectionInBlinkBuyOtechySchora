-- ══════════════════════════════════════════════════════════════════
-- OtechySchora v2 — Migration (run AFTER original schema)
-- Adds: ratings, bookmarks, verified badge, download_history view
-- ══════════════════════════════════════════════════════════════════

-- ── 1. RATINGS & REVIEWS ─────────────────────────────────────────
create table if not exists public.otechy_ratings (
  id          uuid        primary key default uuid_generate_v4(),
  resource_id uuid        not null references public.otechy_resources(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  rating      smallint    not null check (rating between 1 and 5),
  review      text,
  created_at  timestamptz not null default now(),
  unique (resource_id, user_id)
);

alter table public.otechy_ratings enable row level security;
create policy "ratings_select" on public.otechy_ratings for select using (true);
create policy "ratings_insert" on public.otechy_ratings for insert with check (auth.uid() = user_id);
create policy "ratings_update" on public.otechy_ratings for update using (auth.uid() = user_id);
create policy "ratings_delete" on public.otechy_ratings for delete using (auth.uid() = user_id);

-- ── 2. BOOKMARKS ─────────────────────────────────────────────────
create table if not exists public.otechy_bookmarks (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  resource_id uuid        not null references public.otechy_resources(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, resource_id)
);

alter table public.otechy_bookmarks enable row level security;
create policy "bookmarks_select" on public.otechy_bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert" on public.otechy_bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_delete" on public.otechy_bookmarks for delete using (auth.uid() = user_id);

-- ── 3. VERIFIED BADGE on profiles ────────────────────────────────
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists total_earnings numeric(10,2) not null default 0;

-- ── 4. avg_rating + review_count on resources ────────────────────
alter table public.otechy_resources add column if not exists avg_rating numeric(3,2) default 0;
alter table public.otechy_resources add column if not exists review_count int not null default 0;

-- Auto-update avg_rating when a rating is inserted/updated/deleted
create or replace function public.update_resource_rating()
returns trigger language plpgsql security definer as $$
begin
  update public.otechy_resources
  set
    avg_rating   = (select round(avg(rating)::numeric, 2) from public.otechy_ratings where resource_id = coalesce(new.resource_id, old.resource_id)),
    review_count = (select count(*) from public.otechy_ratings where resource_id = coalesce(new.resource_id, old.resource_id))
  where id = coalesce(new.resource_id, old.resource_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_rating_update on public.otechy_ratings;
create trigger trg_rating_update
  after insert or update or delete on public.otechy_ratings
  for each row execute function public.update_resource_rating();

-- ── 5. resources now readable by anon (public browse) ─────────────
drop policy if exists "resources_select" on public.otechy_resources;
create policy "resources_select" on public.otechy_resources for select using (true);

drop policy if exists "scholarships_select" on public.otechy_scholarships;
create policy "scholarships_select" on public.otechy_scholarships for select using (true);

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);

-- ── 6. Notify uploader when they get a review ────────────────────
create or replace function public.handle_review_notification()
returns trigger language plpgsql security definer as $$
declare res_title text; v_uploader_id uuid; reviewer_name text;
begin
  select r.title, r.uploader_id, p.name
    into res_title, v_uploader_id, reviewer_name
    from public.otechy_resources r
    join public.profiles p on p.id = new.user_id
    where r.id = new.resource_id;

  insert into public.otechy_notifications (user_id, type, title, body)
  values (
    v_uploader_id, 'info',
    '⭐ New review on your resource',
    reviewer_name || ' left a ' || new.rating || '-star review on "' || res_title || '"'
  );
  return new;
end;
$$;

drop trigger if exists trg_review_notify on public.otechy_ratings;
create trigger trg_review_notify
  after insert on public.otechy_ratings
  for each row execute function public.handle_review_notification();

-- ── 7. RPC: get seller dashboard stats ───────────────────────────
create or replace function public.get_seller_stats(p_user_id uuid)
returns json language plpgsql security definer as $$
declare result json;
begin
  select json_build_object(
    'total_resources',  (select count(*) from otechy_resources where uploader_id = p_user_id),
    'total_downloads',  (select coalesce(sum(download_count),0) from otechy_resources where uploader_id = p_user_id),
    'total_earnings',   (select coalesce(sum(amount_paid),0) from otechy_purchases p join otechy_resources r on r.id = p.resource_id where r.uploader_id = p_user_id),
    'total_reviews',    (select count(*) from otechy_ratings rt join otechy_resources r on r.id = rt.resource_id where r.uploader_id = p_user_id),
    'avg_rating',       (select round(coalesce(avg(rt.rating),0)::numeric,2) from otechy_ratings rt join otechy_resources r on r.id = rt.resource_id where r.uploader_id = p_user_id)
  ) into result;
  return result;
end;
$$;

-- ══════════════════════════════════════════════════════════════════
-- DONE — v2 migration complete
-- ══════════════════════════════════════════════════════════════════
