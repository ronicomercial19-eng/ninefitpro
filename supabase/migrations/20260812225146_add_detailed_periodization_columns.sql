alter table periodization_models
  add column if not exists detailed_macrocycles jsonb,
  add column if not exists detailed_mesocycles jsonb,
  add column if not exists weekly_split jsonb,
  add column if not exists detailed_microcycle jsonb,
  add column if not exists load_progression_rules jsonb,
  add column if not exists workout_generation_rules jsonb,
  add column if not exists scientific_references jsonb,
  add column if not exists scientific_rationale jsonb,
  add column if not exists legal_notice text,
  add column if not exists nivel text;;
