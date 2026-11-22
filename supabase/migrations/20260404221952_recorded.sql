
ALTER TABLE public.smart_treino_protocols
ADD COLUMN IF NOT EXISTS goal_tags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_smart_treino_protocols_goal_tags
ON public.smart_treino_protocols USING GIN(goal_tags);
;
