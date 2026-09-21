-- Restrict high-impact workout RPCs to signed-in users.
revoke execute on function public.fn_award_workout_xp(uuid, integer) from public, anon;
grant execute on function public.fn_award_workout_xp(uuid, integer) to authenticated;

revoke execute on function public.fn_award_xp_on_workout_completion() from public, anon;
grant execute on function public.fn_award_xp_on_workout_completion() to authenticated;

revoke execute on function public.fn_complete_mission(uuid, text) from public, anon;
grant execute on function public.fn_complete_mission(uuid, text) to authenticated;

revoke execute on function public.fn_atualizar_perfil_completo(uuid, text, integer, numeric, numeric, text) from public, anon;
grant execute on function public.fn_atualizar_perfil_completo(uuid, text, integer, numeric, numeric, text) to authenticated;

revoke execute on function public.fn_consume_class_credit(uuid, integer, text) from public, anon;
grant execute on function public.fn_consume_class_credit(uuid, integer, text) to authenticated;
