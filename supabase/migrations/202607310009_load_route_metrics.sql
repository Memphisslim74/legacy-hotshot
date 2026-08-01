-- Store one authoritative route estimate with each load so every workspace displays the same mileage and drive time.
alter table public.loads
  add column if not exists route_distance_meters bigint,
  add column if not exists route_duration_seconds integer,
  add column if not exists route_calculated_at timestamptz,
  add column if not exists route_provider text;

comment on column public.loads.route_distance_meters is 'Calculated pickup-to-delivery route distance in meters.';
comment on column public.loads.route_duration_seconds is 'Calculated pickup-to-delivery driving duration in seconds.';
comment on column public.loads.route_calculated_at is 'Time the stored route estimate was calculated.';
comment on column public.loads.route_provider is 'Routing provider used for the stored estimate.';
