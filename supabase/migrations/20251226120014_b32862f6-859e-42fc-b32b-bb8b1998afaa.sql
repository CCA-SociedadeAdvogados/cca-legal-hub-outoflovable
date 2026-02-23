-- Create storage bucket for legal documents
insert into storage.buckets (id, name, public)
values ('legal-mirror', 'legal-mirror', true)
on conflict (id) do nothing;

-- Storage policies for legal-mirror bucket
create policy "Public read legal mirror files"
on storage.objects for select
using (bucket_id = 'legal-mirror');

create policy "Service role can upload legal mirror files"
on storage.objects for insert
with check (bucket_id = 'legal-mirror');

create policy "Service role can update legal mirror files"
on storage.objects for update
using (bucket_id = 'legal-mirror');

create policy "Service role can delete legal mirror files"
on storage.objects for delete
using (bucket_id = 'legal-mirror');