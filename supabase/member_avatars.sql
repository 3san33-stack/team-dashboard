-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Per-member profile photo, replacing the initial-letter circle when set.
-- Reuses the existing public `sample-request-images` storage bucket for the
-- actual image file (no new bucket/policy needed) — lib/image-upload.ts
-- compresses to ≤1600px JPEG before upload. Same open-access convention as
-- the rest of this app (anon key, no auth).

create table member_avatars (
  member text primary key,
  avatar_url text not null,
  updated_at timestamptz not null default now()
);

alter table member_avatars enable row level security;

create policy "public read" on member_avatars
  for select using (true);

create policy "public insert" on member_avatars
  for insert with check (true);

create policy "public update" on member_avatars
  for update using (true);
