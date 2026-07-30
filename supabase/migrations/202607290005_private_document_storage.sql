-- Private storage for Legacy Hotshot operational documents.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'legacy-documents',
  'legacy-documents',
  false,
  26214400,
  array['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Company members upload Legacy documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'legacy-documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
);

create policy "Company members read Legacy documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'legacy-documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
);

create policy "Owners and dispatch delete Legacy documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'legacy-documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.current_user_role() in ('owner','dispatcher')
);
