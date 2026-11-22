ALTER TABLE public.user_stats_agg
  ADD CONSTRAINT user_stats_agg_athlete_id_unique UNIQUE (athlete_id);;
