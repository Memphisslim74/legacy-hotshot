-- Link accepted quotes to the booked loads they create and prevent duplicate conversion.
alter table public.loads
  add column if not exists quote_id uuid references public.quotes(id) on delete set null,
  add column if not exists load_request_id uuid references public.load_requests(id) on delete set null;

alter table public.quotes
  add column if not exists converted_load_id uuid references public.loads(id) on delete set null,
  add column if not exists approval_notification_sent_at timestamptz;

create unique index if not exists loads_quote_id_unique_idx
  on public.loads (quote_id)
  where quote_id is not null;

create index if not exists loads_load_request_id_idx
  on public.loads (load_request_id)
  where load_request_id is not null;

create index if not exists quotes_converted_load_id_idx
  on public.quotes (converted_load_id)
  where converted_load_id is not null;

comment on column public.loads.quote_id is
  'Accepted quote that created this booked load.';

comment on column public.loads.load_request_id is
  'Original customer load request associated with this load.';

comment on column public.quotes.converted_load_id is
  'Booked load automatically created after customer approval.';

comment on column public.quotes.approval_notification_sent_at is
  'Time the internal quote approval notification was sent.';
