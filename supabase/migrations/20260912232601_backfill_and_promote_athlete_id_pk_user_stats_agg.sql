-- Backfill da única linha existente (Fernanda), depois promove athlete_id a PK.
UPDATE public.user_stats_agg
SET athlete_id = '18fabf10-6ab7-4c09-8c5c-7169516043e2'
WHERE aluno_id = '9e4f43d7-4a60-41c6-ae42-e9c65ce3f8f9' AND athlete_id IS NULL;

ALTER TABLE public.user_stats_agg DROP CONSTRAINT user_stats_agg_pkey;
ALTER TABLE public.user_stats_agg ALTER COLUMN aluno_id DROP NOT NULL;
ALTER TABLE public.user_stats_agg ALTER COLUMN athlete_id SET NOT NULL;
ALTER TABLE public.user_stats_agg DROP CONSTRAINT user_stats_agg_athlete_id_unique;
ALTER TABLE public.user_stats_agg ADD PRIMARY KEY (athlete_id);;
