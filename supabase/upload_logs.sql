-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- One row per upload-count button click (신규/수정/동일), so weekly/monthly
-- totals are just a date-range count — no read-modify-write races between
-- 구민석/안도현 tapping at the same time. Same open-access convention as the
-- rest of this app (anon key, no auth). No update policy — corrections are
-- done by deleting a row (되돌리기), not editing one.

create table upload_logs (
  id uuid primary key default gen_random_uuid(),
  member text not null,
  category text not null,
  created_at timestamptz not null default now()
);

alter table upload_logs enable row level security;

create policy "public read" on upload_logs
  for select using (true);

create policy "public insert" on upload_logs
  for insert with check (true);

create policy "public delete" on upload_logs
  for delete using (true);
