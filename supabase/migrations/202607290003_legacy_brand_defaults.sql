-- Legacy Hotshot Command Center
-- Align saved company defaults with the approved Legacy Hotshot branding.

alter table public.company_settings
  alter column primary_color set default '#bd1f31';

update public.company_settings
set primary_color = '#bd1f31'
where primary_color is null
   or lower(primary_color) in ('#b98542', '#b98642', '#47657d', '#5f7f99');

update public.company_settings
set owner_name = 'Jared Guinn'
where trim(owner_name) = 'Jared';

update public.profiles
set full_name = 'Jared Guinn'
where trim(full_name) = 'Jared'
  and role = 'owner'::public.user_role;
