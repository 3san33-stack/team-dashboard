-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Public storage bucket for sample-request reference images. Images are
-- resized/compressed client-side (max 1600px, JPEG q0.8) before upload, so
-- this stays well within the free plan's 1GB storage even with heavy use.
-- Same open-access convention as the rest of this app (anon key, no auth).

insert into storage.buckets (id, name, public)
values ('sample-request-images', 'sample-request-images', true);

create policy "public upload sample-request-images" on storage.objects
  for insert
  with check (bucket_id = 'sample-request-images');

create policy "public delete sample-request-images" on storage.objects
  for delete
  using (bucket_id = 'sample-request-images');
