# Contrato de Schema — FitPro / 9FIT

**Projeto Supabase:** `mfrydtrzjxscbkaiwfnw` (FitPro). HealthFlix vive em projeto separado (`kixjiwsfogqztlgiiztp`) — não confundir os dois.

**Repositório de Origem:** ronicomercial19-eng/ninefitpro (estado atual em produção)
**Documentação Sincronizada:** 2026-07-06

**Regra de uso obrigatória:** nenhuma sessão de IA (Lovable, Claude, qualquer agente) escreve SQL, cria tabela ou assume RPC sem antes rodar a query de auditoria no fim deste documento. Isso não é burocracia — é o que teria evitado as 5 causas-raiz mapeadas nesta sessão.

---

## 1. Tabelas confirmadas e ativas (pode usar direto)

| Tabela | Chave | Função | Status | Linhas |
|---|---|---|---|---|
| `athletes` | `id` (PK), `user_id` → auth.users | Perfil central do atleta | ✅ Realtime | 34 |
| `athlete_auth_link` | `athlete_id`, `user_id` | Resolução canônica de identidade | ✅ | 30 |
| `athlete_activation` | `athlete_id` (UNIQUE) | Motor de ativação/gamificação | ✅ Realtime | 31 |
| `athlete_credits` | `athlete_id` | Créditos/fichas para IA e Premium | ✅ Realtime | 31 |
| `athlete_periodizations` | `athlete_id` | Periodização ativa do atleta | ✅ Realtime | 24 |
| `workout_executions` | `athlete_id` | Registro de treino completado | ✅ Realtime | — |
| `daily_workouts` | `athlete_id` | Plano de treino do dia | ✅ Realtime | — |
| `workout_exercises` | `daily_workout_id` | Exercícios prescritos (sets/reps/rest) | ✅ Realtime | — |
| `exercises` | `id` | Catálogo de exercícios | ✅ | 601 |
| `avaliacoes_unificadas` | `athlete_id` | Fonte do Radar 5D | ⚠️ RLS DISABLED | 1 |
| `sync_score_logs` | `user_id` / `athlete_id` | Check-in qualitativo diário | ✅ Realtime | 62 |
| `ninefit_checkins` | `athlete_id` | Check-in diário: sono, energia, alimentação, dor | ✅ Realtime | — |
| `user_plans` | `athlete_id` (nullable) | Planos/assinaturas, incluindo Prime trial | ✅ Realtime | — |
| `social_share_templates` | `id` | 11 templates ativos prontos | ✅ | 11 |
| `share_events` | `user_id` + `athlete_id` | Registro de compartilhamento | ✅ Realtime | — |
| `strength_records` | `user_id` | Fonte única de carga/força | ✅ Realtime | — |

## 2. Tabelas confirmadas NÃO existentes (nunca assumir)

`daily_protocol_blocks`, `user_parameters`, `daily_tasks`, `skill_activations`, `smart_treino_protocols`, `smart_treino_macro_rules`, `personal_records`, `health_metrics`, `periodization_annual_plans`, `bio_sleep_logs`, `bio_recovery_state`, `nutrition_logs`, `library_items`.

**⚠️ NOTA:** `athlete_pdi_history` — **AUDITORIA PENDENTE** (aparecia em ambas as listas simultaneamente). Remover até confirmar no banco.

Se um prompt (de qualquer origem) citar uma dessas, **parar e auditar antes de implementar.**

## 3. `athlete_activation` — colunas reais confirmadas (auditoria 31 linhas)

```sql
id (UUID)
athlete_id (UUID, UNIQUE)
days_active (INT4) — Dias consecutivos ativos
consistency_score (INT4) — 0-100%
missions_completed (INT4) — Total de missões
weekly_missions_completed (INT4) — Esta semana
monthly_missions_completed (INT4) — Este mês
last_active_at (TIMESTAMPTZ)
last_streak_broken_at (TIMESTAMPTZ)
activation_events (JSONB) — Array de eventos
milestone_reached (TEXT)
activated_at (TIMESTAMPTZ)
created_at (TIMESTAMPTZ)
updated_at (TIMESTAMPTZ)
```

**Realtime:** ✅ ENABLED  
**RLS:** ✅ ENABLED  
**Índices:** ✅ 2 índices confirmados

## 4. Vocabulário de status — onde já houve conflito

| Campo | Valores em uso real | Observação |
|---|---|---|
| `athlete_periodizations.status` | `active`, `in_progress`, `archived` | SmartPeriodizer grava `in_progress`; sistemas antigos gravam `active`. Qualquer RPC nova **deve** aceitar ambos. |
| `workout_executions.status` | `in_progress`, `completed` | — |
| `user_plans.plan_type` | `prime` (confirmado em uso) | — |
| `athletes.activated` | `true`, `false` | Gate de acesso ao app |

## 5. Decisões de arquitetura pendentes (NÃO resolver sozinho, perguntar)

### 🟡 **SYNC SCORE — DUAS FONTES CONFLITANTES**

```
athletes.sync_score (número único, atualizado por fn_get_athlete_scores)
VS
sync_score_logs (tabela de histórico, 62 linhas, Realtime)
```

**Status:** 🟡 Ambas existem, ambas sendo lidas  
**Problema:** Telas diferentes leem de fontes diferentes → divergência nos números pro mesmo atleta  
**Decisão necessária:** Qual é a "fonte da verdade" para `sync_score`?

- Opção A: `athletes.sync_score` atualizado por função atômica
- Opção B: `sync_score_logs` lido com últimas 7 dias agregadas
- Opção C: Depreciar uma delas

**IMPORTANTE:** Nenhuma nova tela ou RPC deve usar sync_score sem resolver isso primeiro.

## 6. RPCs já criadas, testadas e em uso

✅ **Confirmadas no código:**
- `fn_get_athlete_scores(p_athlete_id uuid)` — Retorna sync_score + Radar 5D (treino, nutri, sono, mob, hidr)
- `fn_complete_mission(p_athlete_id uuid, p_mission_type text)` — Incrementar missões
- `fn_increment_streak(p_athlete_id uuid)` — Incrementar dias ativos
- `fn_consume_credit(p_athlete_id uuid, p_amount int4, p_reason text)` — **ATÔMICA** — Debita créditos com guard (se saldo < amount, retorna erro)
- `fn_add_credits(p_athlete_id uuid, p_amount int4, p_reason text)` — Recarregar créditos
- `get_healthflix_feed(p_athlete_id uuid)` — Catálogo HealthFlix priorizado
- `fn_award_xp(p_athlete_id uuid, p_xp int4)` — Dar XP
- `fn_activate_prime_reward(p_athlete_id uuid)` — Ativar Prime após 7 dias
- `fn_check_onboarding_progress(p_athlete_id uuid)` — Status do onboarding

⚠️ **Assumidas mas não auditadas:**
- `fn_treino_rapido`
- `fn_get_week_workouts`
- `fn_ajustar_treino_dia`

## 7. Query de auditoria obrigatória — rodar antes de qualquer SQL novo

```sql
-- Existe mesmo?
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('NOME_DA_TABELA_1', 'NOME_DA_TABELA_2');

-- Estrutura real de colunas
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('NOME_DA_TABELA_1')
ORDER BY ordinal_position;

-- Tem volume real ou é tabela vazia/fantasma?
SELECT count(*), max(created_at) FROM NOME_DA_TABELA;

-- Algum trigger vivo nela?
SELECT tgname, pg_get_triggerdef(oid)
FROM pg_trigger WHERE tgrelid = 'public.NOME_DA_TABELA'::regclass AND NOT tgisinternal;

-- Verificar RPC
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'fn_get_athlete_scores';

-- Auditar tabelas fantasma (aparece em múltiplas listas)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name ILIKE '%pdi%';
```

---

*Atualizar este documento a cada rodada que confirmar, criar ou depreciar algo no schema. Ele só tem valor se for consultado antes, não revisado depois.*
