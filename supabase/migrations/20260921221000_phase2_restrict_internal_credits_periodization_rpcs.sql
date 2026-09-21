-- Restrict internal credits, periodization and administration RPCs.
revoke execute on function public.fn_add_class_credits(uuid, integer, text) from public, anon;
grant execute on function public.fn_add_class_credits(uuid, integer, text) to authenticated;

revoke execute on function public.fn_advance_wave(uuid) from public, anon;
grant execute on function public.fn_advance_wave(uuid) to authenticated;

revoke execute on function public.deliver_periodization_to_athlete(uuid, uuid, uuid, text, integer, text) from public, anon;
grant execute on function public.deliver_periodization_to_athlete(uuid, uuid, uuid, text, integer, text) to authenticated;

revoke execute on function public.fn_archive_previous_annual_plan() from public, anon;
grant execute on function public.fn_archive_previous_annual_plan() to authenticated;

revoke execute on function public.fn_assert_is_staff() from public, anon;
grant execute on function public.fn_assert_is_staff() to authenticated;
