
insert into storage.buckets (id, name, public) values ('decks', 'decks', true)
on conflict (id) do nothing;

create policy "Decks are publicly viewable"
on storage.objects for select
using (bucket_id = 'decks');

create policy "Users can upload own decks"
on storage.objects for insert
with check (bucket_id = 'decks' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own decks"
on storage.objects for update
using (bucket_id = 'decks' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own decks"
on storage.objects for delete
using (bucket_id = 'decks' and auth.uid()::text = (storage.foldername(name))[1]);
