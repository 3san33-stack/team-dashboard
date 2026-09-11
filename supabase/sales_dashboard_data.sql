-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Single shared row holding the sales-dashboard dataset (families/bands/records)
-- as jsonb, so the whole team sees the same numbers after someone uploads a
-- new 엑셀 판매량 file. Same open-access convention as the rest of this app
-- (anon key, no auth). "update" (not insert-per-upload) because there is only
-- ever one current dataset — a new upload replaces row id=1 in place.

create table sales_dashboard_data (
  id int primary key,
  payload jsonb not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table sales_dashboard_data enable row level security;

create policy "public read" on sales_dashboard_data
  for select using (true);

create policy "public insert" on sales_dashboard_data
  for insert with check (true);

create policy "public update" on sales_dashboard_data
  for update using (true);
