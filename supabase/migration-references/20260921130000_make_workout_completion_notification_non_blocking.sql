-- Notification delivery is a side effect and must not abort workout completion.
create or replace function public.fn_notify_workout_completed()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_coach_id uuid;
  v_athlete_name text;
begin
  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and new.status = 'completed' then
    select coach_id, name into v_coach_id, v_athlete_name
    from public.athletes where id = new.athlete_id;

    if v_coach_id is not null then
      begin
        insert into public.notifications
          (user_id, type, event_type, title, message, related_table, related_id)
        values
          (v_coach_id,
           'success'::public.notification_type,
           'workout_completed',
           'Treino concluído',
           coalesce(v_athlete_name, 'Aluno') || ' concluiu o treino de hoje',
           'workout_executions',
           new.id);
      exception when others then
        raise warning 'workout completion notification skipped: %', sqlerrm;
      end;
    end if;
  end if;
  return new;
end;
$function$;