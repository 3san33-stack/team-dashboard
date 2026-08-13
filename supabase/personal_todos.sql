-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Moves 개인 할 일 from per-browser localStorage to a shared table so it syncs
-- across phone/desktop for the same member. Same open-access convention as
-- `tasks` and `push_subscriptions` (anon key, public RLS).

create table personal_todos (
  id uuid primary key default gen_random_uuid(),
  member text not null,
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table personal_todos enable row level security;

create policy "public read" on personal_todos
  for select using (true);

create policy "public insert" on personal_todos
  for insert with check (true);

create policy "public update" on personal_todos
  for update using (true);

create policy "public delete" on personal_todos
  for delete using (true);
