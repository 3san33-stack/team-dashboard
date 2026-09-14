-- Shared daily upload notes. Counts in upload_logs remain unchanged.
begin;
create table if not exists public.upload_day_notes (
  date date primary key,
  note text not null default '' check (char_length(note) <= 500),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.upload_day_notes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='upload_day_notes' and policyname='upload_note_read') then
    create policy upload_note_read on public.upload_day_notes for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='upload_day_notes' and policyname='upload_note_insert') then
    create policy upload_note_insert on public.upload_day_notes for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='upload_day_notes' and policyname='upload_note_update') then
    create policy upload_note_update on public.upload_day_notes for update to anon, authenticated using (true) with check (true);
  end if;
end $$;
grant select, insert, update on public.upload_day_notes to anon, authenticated;
commit;
