-- One daily quick report per category, and one confirmation per planned meal.
CREATE UNIQUE INDEX IF NOT EXISTS fitpro_hub_quick_daily_unique
ON public.master_registry (
  user_id,
  (payload->>'athlete_id'),
  (payload->>'date'),
  (payload->>'category'),
  (CASE WHEN payload->>'category' = 'Nutrição' THEN payload->>'label' ELSE '' END)
)
WHERE source = 'fitpro_hub_quick';
