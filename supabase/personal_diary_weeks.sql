-- Name-separated team diaries; this matches the existing name-selection app.
-- These policies allow public read/write, not private authenticated diaries.
begin;
create table if not exists public.personal_diary_weeks (
  member text not null check (member in ('이은혜','김혜진','양세현','구민석','안도현')),
  week_start date not null check (extract(isodow from week_start) = 1),
  content jsonb not null default '{"notes":"","days":["","","","","","",""]}'::jsonb,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (member, week_start),
  check (jsonb_typeof(content) = 'object'
    and content ? 'notes' and content ? 'days'
    and jsonb_typeof(content->'notes') = 'string'
    and jsonb_typeof(content->'days') = 'array'
    and jsonb_array_length(content->'days') = 7)
);
alter table public.personal_diary_weeks enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='personal_diary_weeks' and policyname='diary_read') then
    create policy diary_read on public.personal_diary_weeks for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='personal_diary_weeks' and policyname='diary_insert') then
    create policy diary_insert on public.personal_diary_weeks for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='personal_diary_weeks' and policyname='diary_update') then
    create policy diary_update on public.personal_diary_weeks for update to anon, authenticated using (true) with check (true);
  end if;
end $$;
grant select, insert, update on public.personal_diary_weeks to anon, authenticated;
commit;
