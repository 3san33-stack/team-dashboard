-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Same open-access convention as the existing `tasks` table (anon key, public RLS) —
-- intentional trade-off for this internal small-team tool.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "public read" on push_subscriptions
  for select using (true);

create policy "public insert" on push_subscriptions
  for insert with check (true);

create policy "public delete" on push_subscriptions
  for delete using (true);
