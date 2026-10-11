-- Publica o catálogo de periodização revisado pelo responsável (06/10/2026) e completa o que faltava:
--  * workout_generation_rules (nulo em 42 de 44 modelos) = passos padrão já usados em m22/m24
--  * nivel (nulo em 42 de 44) = deduzido do título; sem sinal no título => 'geral'
--  * generated_note substitui "pendente de revisão"
UPDATE public.periodization_models pm
SET
  workout_generation_rules = coalesce(pm.workout_generation_rules, (SELECT workout_generation_rules FROM public.periodization_models WHERE id = 'm22')),
  nivel = coalesce(pm.nivel, CASE
    WHEN pm.title ~* 'iniciante/intermedi' THEN 'iniciante/intermediário'
    WHEN pm.title ~* 'intermedi[aá]rio/avan' THEN 'intermediário/avançado'
    WHEN pm.title ~* 'iniciante' THEN 'iniciante'
    WHEN pm.title ~* 'avan[cç]ado' THEN 'avançado'
    WHEN pm.title ~* 'intermedi' THEN 'intermediário'
    WHEN pm.title ~* 'especial' THEN 'especial'
    ELSE 'geral' END),
  generated_note = 'Revisado e aprovado pelo responsável em 2026-10-06.',
  catalog_status = 'published',
  updated_at = now()
WHERE pm.catalog_status = 'draft';
