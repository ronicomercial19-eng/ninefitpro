# 9FIT PRO - Plano de Padronização Arquitetural

## Status: Fase 2 Completa ✅

### Prioridade 1 — FK Migration ✅
- `athlete_id` com FK constraints em: `workout_progress`, `avaliacoes_unificadas`, `student_measurements`, `student_photos`, `student_anamnesis`, `student_activity_history`
- Backfill executado, índices criados, colunas legacy marcadas DEPRECATED

### Prioridade 2 — Service Layer ✅
- 7 serviços em `src/services/`: athletes, training, assessments, scheduling, auth, periodization, analytics
- Barrel export com `services` namespace e `queryKeys`
- Tipos canônicos em `src/types/domains.ts`

### Prioridade 3 — Edge Functions Padronizadas ✅
- Todas as 8 edge functions com contrato `ApiResponse<T>` (`apiResponse()`/`apiError()`)

### Próximos Passos (Fase 3)
- [ ] Migrar componentes para usar Service Layer
- [ ] Consolidar tabelas duplicadas de exercícios
- [ ] Resolver Security Definer Views warnings
- [ ] Unificar enum `app_role` vs `user_role`
