-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Sample-weaving request board: designers request a sample from a weaver
-- (구민석/안도현) and track it through 요청됨 → 확인함 → 제직중 → 완료.
-- Same open-access convention as `tasks` and `personal_todos` (anon key,
-- public RLS).

create table sample_requests (
  id uuid primary key default gen_random_uuid(),
  requester text not null,
  weaver text not null,
  title text not null,
  spec_note text,
  reference_link text,
  desired_date date,
  status text not null default '요청됨',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sample_requests enable row level security;

create policy "public read" on sample_requests
  for select using (true);

create policy "public insert" on sample_requests
  for insert with check (true);

create policy "public update" on sample_requests
  for update using (true);

create policy "public delete" on sample_requests
  for delete using (true);
