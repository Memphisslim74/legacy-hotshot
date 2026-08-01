alter table public.quotes
  add column if not exists sent_at timestamptz,
  add column if not exists accepted_by_name text,
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_quote_amount numeric(12,2),
  add column if not exists accepted_quote_version integer,
  add column if not exists quote_version integer not null default 1,
  add column if not exists acceptance_ip text,
  add column if not exists acceptance_user_agent text;

create unique index if not exists quotes_public_token_unique_idx
  on public.quotes (public_token);

comment on column public.quotes.accepted_by_name is 'Name typed by the customer when accepting the quote.';
comment on column public.quotes.accepted_at is 'Server-recorded time the public quote was accepted.';
comment on column public.quotes.accepted_quote_amount is 'Snapshot of the accepted quote total.';
comment on column public.quotes.accepted_quote_version is 'Snapshot of the accepted quote version.';
