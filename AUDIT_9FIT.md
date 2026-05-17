# 9FIT — Auditoria de Consolidação (Maio 2026)

Status pós-Ondas 1 → 6 (limpeza + realtime + IA + biblioteca + mission control + refino visual base).

## Legenda
✅ Funcionando · ⚠️ Parcial · ❌ Quebrado · 🔌 Aguardando API · 🧠 Estrutural · 🗑 Legado removido

---

## ONDA 1 — Limpeza ✅
Arquivos removidos: `EcosystemFrame.tsx`, `AppGrid.tsx`, `Login.tsx` (duplicata), `Store.tsx`, `Place.tsx`.
Dados mock do radar semanal substituídos por leitura real de `master_registry`.

## ONDA 2 — Realtime ✅
Hook universal: `src/hooks/useRealtimeTable.ts`

| Tabela | Componente | Status |
|---|---|---|
| `ai_chat_messages` | `Ron.tsx` | ✅ |
| `student_training_assignments` | `Train.tsx` | ✅ |
| `workout_executions` | `Train.tsx`, `WeeklyProgressChart`, `Dashboard` | ✅ |
| `nutrition_logs` | `WeeklyProgressChart`, `Dieta` | ✅ |
| `master_registry` | `WeeklyProgressChart`, `Dashboard` | ✅ |
| `student_diet_assignments` | `Dieta.tsx` | ✅ |
| `library_items` | `ExercisesPage` | ✅ |
| `notifications` | `NineFitTopBar` (badge contagem) | ✅ |
| `athletes` | `Dashboard` | ✅ |
| `appointments` | publicação realtime ativada | ✅ (consumidor pendente) |
| `student_credits` | publicação realtime ativada | ✅ (consumidor pendente) |
| `student_library_assignments` | publicação realtime ativada | ✅ (consumidor pendente) |

## ONDA 3 — IA Treino ✅
`supabase/functions/ai-coach/index.ts` — modo `generate_training` agora:
- Consulta `library_items` (type='exercise') para montar **catálogo dinâmico** (até 120 exercícios com vídeo/thumb).
- Injeta o catálogo no prompt do sistema obrigando a IA a prescrever apenas itens reais com mídia.
- Mantém modelo `google/gemini-3-flash-preview` via Lovable AI Gateway.

## ONDA 4 — Biblioteca + Progress ✅
- `sync-library-full`: removida iteração por item → agora **batched upsert (500/chunk)**, sem limite total de rows; suporta `thumbnailUrl/coverUrl/image` e `playerUrl/videoUrl/detailUrl/url`.
- Nova edge function `supabase/functions/progress-sync/index.ts` (`{ kind, payload }`):
  - Aceita: `set_log`, `workout_complete`, `habit_check`, `mission_done`, `hydration_log`, `sleep_log`, `mobility_log`, `nutrition_log`.
  - Grava em `master_registry` (dispara realtime no Hub/OS).
  - Side-effects: upsert em `workout_exercise_sets` + fechamento de `workout_executions`.

## ONDA 5 — Staff + Mission Control ✅
- View `public.dashboard_students_overview` (SECURITY INVOKER): coach vê por aluno → treinos completos, último treino, treinos/dietas ativas, churn risk, score_normalized.
- `Dashboard.tsx` agora reage em realtime a `athletes`, `workout_executions`, `master_registry` (sem refresh manual).
- Tabelas existentes confirmadas em uso: `appointments`, `student_credits` (não precisaram de `_v2`).

## ONDA 6 — Refinamento visual ⚠️
Concluído nas ondas anteriores:
- Densidade reduzida no Hub (carrossel + remoção do grid).
- `glass-mission` padronizado.
- TopBar com badge realtime de notificações.
Pendente (cosmético, não bloqueia produto):
- Motion system unificado (`transition-spring` token).
- Adaptive glow contextual em `/train`, `/staff`.

---

## API-ready (🔌 aguardam chaves)
SmartPeriodizer · FitCopilot · PosturaPro · HealthFlix sync · NEXUS — todos com `ApiConnectorCard` instalado.

## Próximas (fora do escopo das Ondas 1-6)
- Consumir `dashboard_students_overview` em uma página Mission Control dedicada.
- Wire-up de `appointments` no OS HUD (já em realtime, falta UI).
- Motion polish global.
