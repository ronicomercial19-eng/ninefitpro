-- A retry or concurrent sender cannot create two delivery receipts for one day.
create unique index if not exists fitpro_events_one_confirmed_workout_receipt
  on public.fitpro_events (entity_id)
  where event_type = 'workout_delivered' and entity_type = 'daily_workout';

-- A student/coach session must not forge or reserve a service-confirmed receipt.
alter policy "Authenticated insert fitpro events" on public.fitpro_events
  with check (auth.uid() is not null and event_type <> 'workout_delivered');
