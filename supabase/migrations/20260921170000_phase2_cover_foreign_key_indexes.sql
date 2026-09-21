-- Phase 2: cover foreign keys reported by Supabase performance advisor.
create index if not exists ai_training_generations_athlete_id_idx
  on public.ai_training_generations (athlete_id);
create index if not exists ai_training_generations_coach_id_idx
  on public.ai_training_generations (coach_id);
create index if not exists diet_meal_items_food_id_idx
  on public.diet_meal_items (food_id);
create index if not exists ninefit_template_versions_created_by_idx
  on public.ninefit_template_versions (created_by);
create index if not exists training_adjustment_deliveries_athlete_id_idx
  on public.training_adjustment_deliveries (athlete_id);
create index if not exists training_adjustment_feedback_athlete_id_idx
  on public.training_adjustment_feedback (athlete_id);
create index if not exists training_feedback_signals_execution_id_idx
  on public.training_feedback_signals (execution_id);
create index if not exists user_stats_agg_aluno_id_idx
  on public.user_stats_agg (aluno_id);