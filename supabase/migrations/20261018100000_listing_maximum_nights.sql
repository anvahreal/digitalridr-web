-- Hosts may set a maximum length of stay per listing. NULL means no cap.
alter table public.listings
  add column if not exists maximum_nights integer;

alter table public.listings
  drop constraint if exists listings_maximum_nights_positive;

alter table public.listings
  add constraint listings_maximum_nights_positive
  check (maximum_nights is null or maximum_nights >= 1);

create or replace function public.enforce_listing_stay_limits()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  maximum_stay integer;
begin
  if new.check_out <= new.check_in then
    raise exception 'Check-out must be after check-in';
  end if;

  select maximum_nights into maximum_stay
  from public.listings
  where id = new.listing_id;

  if not found then
    raise exception 'Listing not found';
  end if;

  if maximum_stay is not null and (new.check_out - new.check_in) > maximum_stay then
    raise exception 'This property permits stays of up to % nights', maximum_stay
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_listing_stay_limits() from public, anon, authenticated;

drop trigger if exists enforce_listing_stay_limits_on_bookings on public.bookings;
create trigger enforce_listing_stay_limits_on_bookings
  before insert or update of listing_id, check_in, check_out on public.bookings
  for each row execute function public.enforce_listing_stay_limits();

drop trigger if exists enforce_listing_stay_limits_on_sessions on public.booking_sessions;
create trigger enforce_listing_stay_limits_on_sessions
  before insert or update of listing_id, check_in, check_out on public.booking_sessions
  for each row execute function public.enforce_listing_stay_limits();
