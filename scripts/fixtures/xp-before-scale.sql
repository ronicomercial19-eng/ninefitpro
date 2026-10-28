CREATE OR REPLACE FUNCTION public.fn_award_xp(p_athlete_id uuid, p_amount integer, p_source text DEFAULT 'unknown'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(new_total_xp integer, new_level integer, leveled_up boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_prev_xp int;
  v_prev_level int;
  v_new_xp int;
  v_new_level int;
  v_event text; v_inserted boolean; v_execution uuid;
begin
  -- Shared content can award only from the receipt trigger, never from browser RPC.
  if coalesce(p_source,'') like 'share%' and pg_trigger_depth()=0 then
    raise exception 'share_event_required' using errcode='42501';
  end if;
  if p_athlete_id is null or p_amount is null or p_amount = 0 then
    return;
  end if;

  if not exists (
    select 1
    from public.athletes a
    where a.id = p_athlete_id
      and (
        a.user_id = (select auth.uid())
        or a.coach_id = (select auth.uid())
        or exists (select 1 from public.athlete_auth_link l where l.athlete_id=a.id and l.user_id=(select auth.uid()))
        or public.is_admin((select auth.uid()))
        or public.is_trainer((select auth.uid()))
      )
  ) then
    raise exception 'athlete_access_denied' using errcode = '42501';
  end if;

  IF p_source='workout_completed' THEN
    v_execution := nullif(p_metadata->>'execution_id','')::uuid;
    IF v_execution IS NULL OR NOT EXISTS(SELECT 1 FROM public.workout_executions WHERE id=v_execution AND athlete_id=p_athlete_id AND status='completed' AND completion_valid)
      OR NOT EXISTS(SELECT 1 FROM public.workout_exercise_sets WHERE execution_id=v_execution AND completed) THEN RAISE EXCEPTION 'confirmed_execution_required'; END IF;
    v_event := v_execution::text; p_amount := 200;
  ELSIF p_source='protocol_completed' THEN
    v_event := nullif(p_metadata->>'protocol_id','');
    IF v_event IS NULL OR NOT EXISTS(SELECT 1 FROM private.student_protocol_completions WHERE athlete_id=p_athlete_id AND protocol_id::text=v_event AND completion_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date) THEN RAISE EXCEPTION 'confirmed_protocol_required'; END IF;
    v_event := v_event||':'||(now() AT TIME ZONE 'America/Sao_Paulo')::date::text; p_amount := 150;
  END IF;
  IF v_event IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text||p_source||v_event,0));
    INSERT INTO private.student_reward_receipts(athlete_id,event_type,event_id,xp)
    VALUES(p_athlete_id,p_source,v_event,p_amount) ON CONFLICT DO NOTHING RETURNING true INTO v_inserted;
    IF NOT coalesce(v_inserted,false) THEN
      RETURN QUERY SELECT coalesce(a.total_xp,0),coalesce(a.level,1),false FROM public.athletes a WHERE a.id=p_athlete_id;
      RETURN;
    END IF;
  END IF;

  select coalesce(total_xp,0), coalesce(level,1)
    into v_prev_xp, v_prev_level
  from public.athletes where id = p_athlete_id for update;

  if not found then
    raise exception 'athlete % not found', p_athlete_id;
  end if;

  v_new_xp := greatest(0, v_prev_xp + p_amount);
  v_new_level := greatest(1, floor(v_new_xp::numeric / 1000)::int + 1);

  update public.athletes
     set total_xp = v_new_xp, level = v_new_level, updated_at = now()
   where id = p_athlete_id;

  perform public.log_event(
    'created'::event_type, 'athlete_xp', p_athlete_id, null,
    jsonb_build_object('amount', p_amount, 'source', p_source, 'meta', p_metadata,
                       'new_total_xp', v_new_xp, 'new_level', v_new_level, 'event_key', 'xp_awarded')
  );

  return query select v_new_xp, v_new_level, (v_new_level > v_prev_level);
end;
$function$

