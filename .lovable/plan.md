# 9FIT PRO - Plano de Padronização Arquitetural

## Status: COMPLETO ✅

### Prioridade 1 — FK Migration ✅
- `athlete_id` com FK constraints em: `workout_progress`, `avaliacoes_unificadas`, `student_measurements`, `student_photos`, `student_anamnesis`, `student_activity_history`
- Backfill executado, índices criados, colunas legacy marcadas DEPRECATED

### Prioridade 2 — Service Layer ✅
- 7 serviços em `src/services/`: athletes, training, assessments, scheduling, auth, periodization, analytics
- Barrel export com `services` namespace e `queryKeys`
- Tipos canônicos em `src/types/domains.ts`

### Prioridade 3 — Edge Functions Padronizadas ✅
- Todas as 8 edge functions com contrato `ApiResponse<T>` (`apiResponse()`/`apiError()`)

### Prioridade 4 — Migração de Componentes para Service Layer ✅
- [x] `StudentsList.tsx` — usa `listAthletesByCoach`, `updateAthlete` (tabela `athletes`)
- [x] `AdicionarAlunoForm.tsx` — usa `createAthlete` (tabela `athletes`)
- [x] `Dashboard.tsx` — usa `listAthletesByCoach` para stats
- [x] `AuthContext.tsx` — usa `getAthleteByUserId`, `getAthleteByEmail`, `getUserRole` (eliminou dependência da tabela `students`)
- [x] `Stats.tsx` (9fit) — usa `getAthleteStats`, `getWorkoutProgress`
- [x] `ExercisesPage.tsx` — usa tabela canônica `exercises` (consolidada)

### Prioridade 5 — Segurança ✅
- Views com SECURITY INVOKER (já aplicado em migration anterior)
- RLS otimizado com pattern `(select auth.uid())`
- Roles verificados via `user_roles` table (nunca client-side)

### Arquitetura Final
```
src/services/          ← Camada de abstração (7 serviços)
src/types/domains.ts   ← Tipos canônicos
src/contexts/          ← AuthContext usando service layer
src/pages/             ← Componentes consumindo services
supabase/functions/    ← Edge functions com ApiResponse<T>
```
