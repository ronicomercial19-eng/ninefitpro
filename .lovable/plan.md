## Estratégia geral

Executo **um bloco por rodada**. Blocos 0, 1, 2 e 3 concluídos. Próximos: 4, 6, 7, 8, 9, 10 (Bloco 5 descartado).

---

## BLOCO 0 — HealthFlix (próximo a executar)

**Diagnóstico em ordem:**

1. `SELECT type, count(*) FROM library_items GROUP BY type` — descobrir estado real.
2. `curl https://kixjiwsfogqztlgiiztp.supabase.co/functions/v1/fitpro-health` — confirmar deploy.
3. Conferir RLS de `library_items` para role `authenticated`.
4. Conferir registro em `fitpro_connections` com `status='connected'`.

**Ações (condicionais ao diagnóstico):**

- **sync-library-full**: normalizar `type` mapeando `video|streaming|aula|class|treino-video` → `videos` (lowercase, trim, fallback por presença de `playerUrl`/`videoUrl`).
- Disparar sync se `library_items` vazia.
- **RLS**: migração garantindo `GRANT SELECT ON public.library_items TO authenticated` + policy `USING (true)` para SELECT (catálogo é público para alunos logados).
- **Painel admin HealthFlix**: substituir/ajustar o componente que chama `fitpro-connect`/`fitpro-admin` para usar a URL correta do projeto FitPro hospedeiro (`kixjiwsfogqztlgiiztp`) com header `x-api-key` lido de `fitpro_connections`. Botões: Validar (→ `fitpro-health`), Sincronizar (→ `sync-library-full` + `fitpro-content`), Rotacionar Key (→ `fitpro-admin?action=create-key`).
- **Tela aluno** (`src/pages/9fit/HealthFlix.tsx`): manter leitura de `library_items` como fallback, mas priorizar `healthflix-proxy?action=content` quando disponível.

**Pronto quando:** `library_items.type='videos' > 0`, grid do aluno renderiza com thumbnail+player, botão Validar do admin retorna 200.

---

## BLOCO 1 — Engine XP/Progresso unificada

**Migração SQL única:**

- `UPDATE athletes SET total_xp = COALESCE(total_xp,0) + COALESCE(xp_total,0) WHERE xp_total IS NOT NULL`; deprecar `xp_total` (comentário + parar de escrever no código).
- `UPDATE workout_progress SET athlete_id = a.id FROM athletes a, athlete_auth_link l WHERE workout_progress.athlete_id IS NULL AND workout_progress.aluno_id IS NOT NULL AND (...)` — de-para via `athlete_auth_link`/email/user_id; log de não-matches em tabela `migration_unmatched`.
- `user_credits`/`user_plans`/`user_achievements`: adicionar coluna `athlete_id uuid` + backfill por `user_email = athletes.email`.
- Função `fn_award_xp(p_athlete_id uuid, p_amount int, p_source text)` SECURITY DEFINER → atualiza `total_xp`, recalcula `level = floor(total_xp/1000)+1`, insere em `system_events`.
- View `vw_athlete_status` (SECURITY INVOKER): `athletes` + `user_plans.is_active` + saldo `user_credits` + xp/level.

**Refactor de código:**

- Substituir toda escrita direta em `athletes.total_xp` por chamada à RPC `fn_award_xp` (ShareButton, gamificationEngine, WorkoutExecution, calibrationEngine).
- Remover qualquer referência a `xp_total` no frontend (somente leitura via `total_xp`).
- Frontend lê status via `vw_athlete_status` em vez de joinar manualmente.

**Pronto quando:** completar treino → +XP único, refletido em `vw_athlete_status` sem duplicar.  
no Bloco 1, item 4 (`fn_award_xp` como `SECURITY DEFINER`) — confirme que a função tem `search_path` fixado explicitamente (`SET search_path = public`), senão `SECURITY DEFINER` vira vetor de escalada de privilégio.

---

## BLOCO 2 — Integração 4 módulos

- View `vw_athlete_legacy_map` (athletes ↔ estudantes/alunos/students via email/user_id).
- Migração: `ALTER TABLE modelos_de_treino ADD COLUMN athlete_id uuid REFERENCES athletes(id)`; idem `planos_de_treino_gerados`, `periodizacoes_novas`, `progresso_aluno`. Backfill via `vw_athlete_legacy_map`.
- Atualizar queries de SmartTreino/ProgressTracker para filtrar por `athlete_id` (manter coluna legada nullable como fallback).
- View `vw_athlete_full_profile`: athletes + periodização ativa + plano de treino ativo + último progresso.
- Trigger `AFTER INSERT ON athletes` → cria esqueleto em `athlete_periodizations` (status='pending') e `planos_de_treino_gerados` (status='pending').

**Pronto quando:** novo aluno no FitPro aparece em SmartPeriodizer/SmartTreino/ProgressTracker sem ação manual.

---

## BLOCO 3 — Settings → Planejamento Realtime

- Teste real: atribuir periodização via SmartPeriodizer → conferir em qual tabela aterrissa (`athlete_periodizations` vs `periodization_plans`).
- View `vw_athlete_periodizacao_ativa` unificando `athlete_periodizations` + `periodization_models` + `periodization_plans_remote`, filtrando `status='active'`.
- Refactor `src/pages/9fit/Planejamento.tsx` para consultar a view por `athlete_id`.
- `supabase.channel('athlete-periodization').on('postgres_changes', { table: 'athlete_periodizations', filter: 'athlete_id=eq.<id>' }, refetch)`.

**Pronto quando:** SmartPeriodizer atribui → Planejamento atualiza sem reload, testado com 2 alunos.

---

## Blocos 4–10 (fora desta sequência, a pedido)

Plano separado depois do Bloco 3 concluído: 4 (dia vs semana), 6 (templates sociais), 7 (audiência R$49), 8 (MVP prof/aluno), 9 (loop onboarding→venda), 10 (design system global). Bloco 5 (paywall) descartado.

---

## Detalhes técnicos resumidos

- Todas as views: `SECURITY INVOKER`.
- Todas as RLS: padrão `(select auth.uid())`.
- Toda nova tabela/coluna pública: `GRANT` explícito para `authenticated`/`service_role`.
- Edge functions: `verify_jwt=false` + `auth.getClaims()` quando aplicável; `x-api-key` para conectores admin.
- Sem mock data — tudo lê de tabelas/views reais.
- `fn_award_xp` é a única porta de entrada de XP daqui pra frente.

Começo pelo Bloco 0 assim que aprovar.