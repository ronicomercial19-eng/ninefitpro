# 9FIT — Auditoria de Consolidação (Maio 2026)

Status pós-Onda 1+2 (limpeza estrutural + realtime parcial).

## Legenda
✅ Funcionando · ⚠️ Parcial · ❌ Quebrado · 🔌 Aguardando API · 🧠 Estrutural · 🗑 Legado removido · 🔥 Crítico

---

## ONDA 1 — Limpeza (concluída)

| Item | Status |
|---|---|
| `src/components/9fit/EcosystemFrame.tsx` | 🗑 removido |
| `src/components/9fit/AppGrid.tsx` | 🗑 removido (substituído por `HubSequentialCarousel`) |
| `src/pages/9fit/Store.tsx` + rota `/9fit/store` | 🗑 removido |
| `src/pages/9fit/Place.tsx` + rota `/9fit/place` | 🗑 removido |
| `src/pages/Login.tsx` (duplicata) | 🗑 removido |
| Dados fake do radar de progresso semanal (Nutrição 70 / Sono 78 / Mobilidade 62 / Hidratação 84 hardcoded) | ✅ substituídos por leitura real de `master_registry` |

## ONDA 2 — Realtime (aplicado nos consumidores-chave)

Hook universal criado: `src/hooks/useRealtimeTable.ts`

| Tabela | Componente | Status |
|---|---|---|
| `ai_chat_messages` | `Ron.tsx` | ✅ persistência + subscribe INSERT |
| `student_training_assignments` | `Train.tsx` | ✅ subscribe `*` por `student_id` |
| `workout_executions` | `Train.tsx`, `WeeklyProgressChart` | ✅ |
| `nutrition_logs` | `WeeklyProgressChart` | ✅ |
| `master_registry` | `WeeklyProgressChart` | ✅ |
| `student_diet_assignments` | `Dieta.tsx` | ⚠️ pendente — wire-up |
| `student_library_assignments` | `Train.tsx` (Protocol) | ⚠️ pendente |
| `library_items` | `ExercisesPage`, admin Biblioteca | ⚠️ pendente |
| `notifications` | `NineFitTopBar` | ⚠️ pendente |
| `appointments_v2` | OS, Aulas | ❌ tabela inexistente — pendente migration |
| `staff_credits` | OS HUD | ❌ tabela inexistente — pendente migration |

## ONDA 3 — IA Treino + SmartTreino

⚠️ Edge function `ai-coach` modo `train` existe mas **não consulta** `periodization_models` nem faz `LEFT JOIN` com `exercises` para anexar vídeo/thumbnail. Pendente refactor completo do pipeline.

## ONDA 4 — Biblioteca + Progress

⚠️ `sync-library-full` ainda com paginação limitada. `progress-sync` edge function ainda não existe (treino fecha apenas via update direto em `workout_exercise_sets`).

## ONDA 5 — Staff + Mission Control

❌ `appointments_v2` e `staff_credits` não existem.
❌ `dashboard_students_overview` não existe — Mission Control ainda usa queries diretas em `Dashboard.tsx`.

## ONDA 6 — Refinamento visual frontend aluno

⚠️ Parcial — densidade já reduzida no Hub via carrossel + remoção do grid, glass-mission padronizado nos cards. Pendente:
- Motion system unificado (`transition-spring` token)
- Adaptive glow (reduzir intensidade em /train, /staff)
- Espaço negativo em /community e /primepass

---

## Banco — tabelas faltantes detectadas

Necessárias para concluir o plano:
- `ai_chat_messages` ✅ criada nesta onda
- `appointments_v2` ❌
- `staff_credits` ❌
- `dashboard_students_overview` (view) ❌

## API-ready (mantidos como 🔌)
SmartPeriodizer · FitCopilot · PosturaPro · HealthFlix sync · NEXUS — todos com `ApiConnectorCard` aguardando chaves do operador.

---

_Próximas execuções devem priorizar:_
1. Migration `appointments_v2` + `staff_credits` + view `dashboard_students_overview`
2. Refactor `ai-coach` modo `train` com pipeline SmartTreino
3. Edge function `progress-sync` ({kind:"set_log"})
4. Realtime nos consumidores ⚠️ restantes (5 tabelas)
5. Reescrever `Dashboard.tsx` para Mission Control real
