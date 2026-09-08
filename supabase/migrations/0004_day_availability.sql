-- One round trip for a whole date range. The booking UI needs availability for
-- ~2 weeks at once (to disable full days and show "next available" chips); doing
-- that as N separate calls made the date/time steps feel slow.

create or replace function get_day_availability(
  p_service_id uuid,
  p_staff_id   uuid,
  p_from       date,
  p_days       int
)
returns table (starts_at timestamptz, staff_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare
  v_day date;
begin
  for i in 0..greatest(coalesce(p_days, 1) - 1, 0) loop
    v_day := p_from + i;
    return query
      select s.starts_at, s.staff_id
      from get_available_slots(p_service_id, p_staff_id, v_day) s;
  end loop;
end;
$$;

grant execute on function get_day_availability(uuid, uuid, date, int) to anon;
