# 9FIT — Plano de Consolidação Total (Stabilization Mode)

Objetivo: parar expansão e transformar o app em um sistema vivo (realtime, persistente, sem mocks). Trabalho dividido em **6 ondas sequenciais**, cada uma com critério de "DONE" verificável.

---

## ONDA 0 — Auditoria & Mapa de Verdade (read-only)

Entrega: arquivo `AUDIT_9FIT.md` na raiz com tabela classificada (✅ ⚠️ ❌ 🔌 🧠 🗑 🔥) cobrindo: todas que aparecer pendentes, inconcluidas devem ser finalizadas imeadiamentes.

- **Frontend:** todas as páginas em `src/pages/**`, componentes em `src/components/9fit/**`, hooks (`useAthleteId`, `usePredictiveContext`, `useFirstAccess`), rotas em `App.tsx`.
- **Backend:** tabelas críticas (`athletes`, `student_training_assignments`, `student_diet_assignments`, `student_library_assignments`, `library_items`, `appointments_v2`, `staff_credits`, `ai_chat_messages`, `master_registry`, `dashboard_students_overview`), RLS, edge functions (`ai-coach`, `sync-library-full`, `intelligence-hub-sync`, `smart-notifications`).
- **Mocks/legado:** localizar todos `Math.random`, `mockData`, `EcosystemFrame`, iframes externos, queries sem `auth.uid()`.

Saída obrigatória: lista numerada de débitos com `path:linha` para cada item ⚠️/❌/🔥.

---

## ONDA 1 — Limpeza Estrutural

Remover/desativar:

- `EcosystemFrame.tsx` e qualquer iframe externo restante no Hub/OS.
- Páginas órfãs identificadas na Onda 0 (`Place.tsx`, `Store.tsx` se não usadas, duplicações `Login` x `Auth`).
- Componentes mortos (`AppGrid` se substituído por `HubSequentialCarousel`).
- Dados fake em `WeeklyProgressChart`, `EcosystemStatusCards`, `Dashboard.tsx`, `Stats.tsx`.

Padronizar:

- Loading: criar `<MissionLoader/>` único e substituir spinners avulsos.
- Glass: garantir `glass-mission` em todos os cards de OS/Hub/Staff/Train.
- Rotas: tudo aluno em `/9fit/*`, tudo admin em `/app/*`. Remover rotas legadas.

---

## ONDA 2 — Realtime Total

Criar hook genérico `useRealtimeTable(table, filter, onChange)` e aplicar em:


| Tabela                         | Componente consumidor                                       |
| ------------------------------ | ----------------------------------------------------------- |
| `student_training_assignments` | `Train.tsx`, `StudentTraining.tsx`                          |
| `student_diet_assignments`     | `Dieta.tsx`                                                 |
| `student_library_assignments`  | `Train.tsx` (Protocol tab), `LibraryAssignDialog`           |
| `library_items`                | `ExercisesPage.tsx`, admin Biblioteca                       |
| `appointments_v2`              | `Aulas.tsx`, `AgendaPage.tsx`, OS                           |
| `staff_credits`                | `AulasCreditos.tsx`, OS HUD                                 |
| `master_registry`              | `OS.tsx`, `Hub.tsx`, `DailyProtocol`, `WeeklyProgressChart` |
| `ai_chat_messages`             | `Ron.tsx`                                                   |
| `notifications`                | `NineFitTopBar`                                             |
| `dashboard_students_overview`  | `/app` Mission Control                                      |


Critério DONE: alterar registro no SQL Editor → UI atualiza < 2s sem refresh.

---

## ONDA 3 — IA Treino + SmartTreino pipeline

Refatorar edge function `ai-coach` modo `train`:

1. Recebe `athlete_id` → busca `avaliacoes_unificadas` + objetivo + restrições.
2. Consulta `periodization_models` (SmartTreino) e escolhe protocolo via score.
3. Para cada exercício gerado, faz `LEFT JOIN` com `exercises` (biblioteca) para obter `video_url`, `thumbnail_url`, `biomechanics`.
4. Persiste em `student_training_assignments` com payload completo `{ product, thumbnailUrl, accessUrl, exercises:[{video,thumb,bio}] }`.
5. Dispara evento `master_registry` (`training_generated`).

Frontend: `Train.tsx` consome assignment renderizado direto, sem fallback manual. Remover componentes de "associação manual de vídeo".

---

## ONDA 4 — Biblioteca + Assignments + Progress

- `sync-library-full`: paginação infinita (cursor) até 100% upsert. Logar `synced_count` em `system_events`. Removendo limite 2000 atual.
- Adicionar colunas (migration): `library_items.thumbnail_url`, `library_items.access_url`, `library_items.product_type` se não existirem.
- `LibraryAssignDialog`: salvar `{ product, thumbnailUrl, accessUrl }` em `student_library_assignments`.
- Criar edge function `progress-sync` aceitando `{ kind: "set_log", athleteId, exerciseId, sets[] }` que grava em `workout_exercise_sets` + atualiza `master_registry`.
- Frontend `WorkoutExecution.tsx`: cada set marcado chama `progress-sync` (debounced).

---

## ONDA 5 — Staff + Agendamento + Chat IA + Mission Control

**Staff/Agenda:**

- Garantir `appointments_v2` com colunas `athlete_id, professional_id, service_id, scheduled_at, status, credit_consumed`.
- Fluxo: Staff (`Staff.tsx`) → Serviço → Agenda → cria `appointments_v2` → trigger debita `staff_credits` no check-in → emite evento `master_registry` → OS aluno mostra cartão "Próxima Sessão" realtime.

**Chat IA (`Ron.tsx`):**

- Persistir todas as msgs em `ai_chat_messages (user_id, role, content, created_at)` com RLS `auth.uid() = user_id`.
- Realtime subscribe + scroll automático + memória (últimas 20 msgs enviadas como contexto ao gateway Gemini).

**Mission Control (`/app`):**

- Reescrever `Dashboard.tsx` consumindo `dashboard_students_overview` (view) — zero mock.
- HUD: 4 cards (Alunos Ativos, Aderência 7d, Sessões Hoje, Churn Risk) + lista realtime de eventos do `master_registry` (últimos 20).
- Aplicar `glass-mission`, spacing 24px, tipografia display.  
  
  
ONDA 6 - DESIGN / FRONT END / ALUNO E PROFESSOR   
REFORÇO — FRONT-END CONSOLIDATION & VISUAL REFINEMENT
  A consolidação NÃO deve focar apenas backend/realtime.
  É obrigatório REFINAR COMPLETAMENTE o front-end do aluno.
  # ==================================================  
  OBJETIVO VISUAL
  Transformar o app do aluno em um:
  # AI HUMAN PERFORMANCE OPERATING SYSTEM
  A experiência deve parecer:
  - viva
  - inteligente
  - contínua
  - premium
  - cinematográfica
  - operacional
  NÃO parecer:
  - dashboard comum
  - app fitness genérico
  - coleção de cards
  - telas independentes
  # ==================================================  
  REFINAR PRINCIPALMENTE
  - /9fit/os
  - /9fit/train
  - /9fit/hub
  - /9fit/staff
  - /9fit/community
  - /9fit/ron
  - /9fit/primepass
  # ==================================================  
  REFINAMENTO OBRIGATÓRIO
  REDUZIR:
  - grids exagerados
  - glow excessivo
  - excesso de informação
  - blocos gigantes
  - ruído visual
  - densidade inconsistente
  AUMENTAR:
  - espaço negativo
  - hierarquia visual
  - contraste
  - legibilidade
  - fluidez
  - continuidade
  - sensação de profundidade
  - UX neuroadaptive
  # ==================================================  
  MOTION SYSTEM
  Implementar motion system REAL.
  O sistema deve:
  - responder ao toque
  - reagir ao scroll
  - possuir microinterações
  - possuir transições suaves
  - parecer vivo
  - possuir pulse states
  - possuir adaptive glow
  - possuir feedback instantâneo
  Evitar:
  - animações exageradas
  - excesso de efeitos
  - motion gratuito
  # ==================================================  
  HUD OPERACIONAL
  O app deve transmitir:
  # sistema operacional vivo.
  Adicionar:
  - feedback contextual
  - estados dinâmicos
  - indicators
  - realtime feel
  - AI presence layer
  - contextual transitions
  # ==================================================  
  COESÃO VISUAL
  Todo o ecossistema deve compartilhar:
  - mesma linguagem visual
  - mesma física
  - mesma hierarquia
  - mesma densidade
  - mesmo motion system
  - mesma lógica de spacing
  # ==================================================  
  OBJETIVO FINAL
  Ao abrir o app do aluno, a sensação deve ser:
  “isso não parece um app fitness.”
  Deve parecer:
  # uma infraestrutura premium de performance humana movida por IA.

---

## Critérios globais de "DONE"

Para cada onda só fechar quando:

- ✅ Sem `Math.random`/`mock` no path afetado.
- ✅ Subscribe Supabase ativo e testado.
- ✅ RLS validada com `auth.uid()`.
- ✅ Sem refresh manual necessário.
- ✅ Registrado em `AUDIT_9FIT.md` como ✅.

---

## Fora de escopo (mantido como 🔌 API-ready)

SmartPeriodizer, FitCopilot, PosturaPro, HealthFlix sync externo, NEXUS — permanecem com `ApiConnectorCard` aguardando chaves do usuário. Não serão "completados" nesta consolidação.

---

## Pergunta única antes de implementar

Confirma que posso **deletar** os seguintes arquivos identificados como legado/duplicado (lista preliminar, será refinada na Onda 0):

- `src/components/9fit/EcosystemFrame.tsx`
- `src/components/9fit/AppGrid.tsx` (substituído por `HubSequentialCarousel`)
- `src/pages/9fit/Place.tsx` e `src/pages/9fit/Store.tsx` (se não houver rota ativa)
- `src/pages/Login.tsx` (duplicata de `Auth.tsx` + `9fit/Login.tsx`)

Ou prefere que eu apenas marque como deprecated e mantenha por 1 sprint? DELETAR POREM SEGUE ISSO: REFORÇO — FRONT-END CONSOLIDATION & VISUAL REFINEMENT

A consolidação NÃO deve focar apenas backend/realtime.

É obrigatório REFINAR COMPLETAMENTE o front-end do aluno.

# ==================================================  
OBJETIVO VISUAL

Transformar o app do aluno em um:

# AI HUMAN PERFORMANCE OPERATING SYSTEM

A experiência deve parecer:

- viva
- inteligente
- contínua
- premium
- cinematográfica
- operacional

NÃO parecer:

- dashboard comum
- app fitness genérico
- coleção de cards
- telas independentes

# ==================================================  
REFINAR PRINCIPALMENTE

- /9fit/os
- /9fit/train
- /9fit/hub
- /9fit/staff
- /9fit/community
- /9fit/ron
- /9fit/primepass

# ==================================================  
REFINAMENTO OBRIGATÓRIO

REDUZIR:

- grids exagerados
- glow excessivo
- excesso de informação
- blocos gigantes
- ruído visual
- densidade inconsistente

AUMENTAR:

- espaço negativo
- hierarquia visual
- contraste
- legibilidade
- fluidez
- continuidade
- sensação de profundidade
- UX neuroadaptive

# ==================================================  
MOTION SYSTEM

Implementar motion system REAL.

O sistema deve:

- responder ao toque
- reagir ao scroll
- possuir microinterações
- possuir transições suaves
- parecer vivo
- possuir pulse states
- possuir adaptive glow
- possuir feedback instantâneo

Evitar:

- animações exageradas
- excesso de efeitos
- motion gratuito

# ==================================================  
HUD OPERACIONAL

O app deve transmitir:

# sistema operacional vivo.

Adicionar:

- feedback contextual
- estados dinâmicos
- indicators
- realtime feel
- AI presence layer
- contextual transitions

# ==================================================  
COESÃO VISUAL

Todo o ecossistema deve compartilhar:

- mesma linguagem visual
- mesma física
- mesma hierarquia
- mesma densidade
- mesmo motion system
- mesma lógica de spacing

# ==================================================  
OBJETIVO FINAL

Ao abrir o app do aluno, a sensação deve ser:

“isso não parece um app fitness.”

Deve parecer:

# uma infraestrutura premium de performance humana movida por IA.