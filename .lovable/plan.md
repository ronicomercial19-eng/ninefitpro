

# Auditoria Arquitetural Completa - Ecossistema 9FIT PRO

---

## ETAPA 1 - AUDITORIA DO ESTADO ATUAL

### 1.1 Estrutura do Frontend

```text
src/
  pages/
    9fit/         -- App do Aluno (Hub, Train, Stats, Profile, Dieta, AulasCreditos, Mensagens, Social)
    *.tsx          -- App do Coach/Admin (Dashboard, Students, Exercises, AI, Reports, Settings)
  components/
    9fit/          -- Componentes exclusivos do aluno
    students/      -- Gestao de alunos (coach side)
    ai-training/   -- IA de treino
    assessment/    -- Avaliacoes
    layout/        -- Sidebar, AppLayout
    auth/          -- PrivateRoute
    ui/            -- shadcn/ui
  contexts/        -- AuthContext (unico)
  hooks/           -- 4 hooks
  services/        -- 1 servico (exerciseVideoService)
  integrations/    -- Supabase client + types
```

**Problema estrutural:** Sem camada de servicos. Queries Supabase espalhadas diretamente em 42+ componentes/paginas. Zero abstraction layer.

### 1.2 Inventario Completo de Tabelas (62 tabelas)

Organizadas por dominio:

**USERS (identidade/auth):**
- `profiles` -- Perfil do usuario autenticado (coach/admin)
- `user_roles` -- Roles (app_role enum)
- `athlete_auth_link` -- Link athlete <-> auth.users
- `user_profiles` -- Perfil fitness do usuario (questionario)
- `student_profiles` -- Perfil do aluno (legacy, referencia students)
- `user_plans` -- Planos de assinatura
- `user_credits` -- Creditos do usuario
- `user_achievements` -- Conquistas/gamificacao

**ATHLETES (entidade canonica do aluno):**
- `athletes` -- **CANONICO** - Tabela principal do aluno
- `alunos` -- **LEGACY/DEPRECATED** - Duplica athletes, ainda referenciada por FK
- `students` -- **LEGACY** - Outra tabela de alunos, referenciada por student_measurements, student_photos, etc
- `estudantes` -- **LEGACY** - Mais uma tabela de alunos (pt-BR)
- `student_invitations` -- Convites para alunos
- `student_credits` -- Creditos de aula (referencia athletes)

**TRAINING (treino):**
- `student_training_assignments` -- **CANONICO** - Atribuicao de treino (referencia athletes)
- `exercises` -- Biblioteca de exercicios
- `exercise_library` -- Outra biblioteca de exercicios (legacy)
- `exercicios_novos` -- Mais uma (legacy pt-BR)
- `workout_templates` -- Templates de treino
- `workouts` -- Workouts vinculados a periodizacao (referencia students)
- `workouts_new` -- Novos workouts (template-based)
- `workout_assignments_new` -- Atribuicoes novas
- `workout_exercises` -- Exercicios do workout
- `workout_exercises_new` -- Exercicios novos
- `workout_program_exercises` -- Exercicios de programa
- `training_programs` -- Programas de treino
- `programs` -- Programas (Base44 sync)
- `program_workouts` -- Link programa-workout
- `workout_progress` -- **CANONICO** - Progresso do treino (referencia alunos!)
- `workout_executions` -- Execucoes detalhadas (referencia athletes)
- `workout_exercise_sets` -- Sets de execucao
- `workout_schedules` -- Agendamento de treinos
- `daily_workouts` -- Workouts diarios
- `workout_program_models` -- Modelos de programa
- `historico_treinos_realizados` -- Historico (legacy, referencia alunos)
- `exercise_logs` -- Logs de exercicio
- `user_workout_logs` -- Logs de workout do usuario
- `user_program_progress` -- Progresso em programas
- `strength_records` -- Records de forca
- `super_sets` / `supersets` -- Super series (2 tabelas!)
- `reference_series` -- Series referencia
- `estruturas_de_treinamento` -- Estruturas de treino (legacy)
- `modelos_de_treino` -- Modelos de treino (legacy)

**PERIODIZATION:**
- `periodization_models` -- **CANONICO** - Modelos de periodizacao
- `periodizations` -- Periodizacoes criadas
- `periodization_plans` -- Planos de periodizacao
- `periodization_variations` -- Variacoes
- `periodization_history` -- Historico de mudancas
- `athlete_periodizations` -- Atribuicao athlete-periodizacao
- `aluno_periodizacao` -- Atribuicao (legacy, referencia athletes)
- `saved_periodizations` -- Periodizacoes salvas (referencia alunos!)
- `periodizacoes_novas` -- Legacy
- `training_phases` -- Fases de treino
- `weekly_structures` -- Estruturas semanais
- `training_structures` -- Estruturas de treino
- `uploads_periodizacao` -- Uploads (referencia estudantes)
- `planos_de_treino_gerados` -- Planos gerados (referencia estudantes)
- `planos_treino_aluno` -- Planos do aluno (referencia alunos)
- `generated_workout_plans` -- Planos gerados (EN)
- `profile_periodization_matches` -- Match perfil-periodizacao

**ASSESSMENTS:**
- `avaliacoes_unificadas` -- **CANONICO** - Avaliacoes (referencia alunos)
- `avaliacoes` -- Legacy
- `avaliacoes_fisicas` -- Legacy
- `historico_avaliacoes` -- Legacy historico
- `physical_assessments` -- Avaliacoes fisicas (EN)
- `student_measurements` -- Medidas (referencia students)
- `student_photos` -- Fotos (referencia students)
- `student_pdf_assessments` -- PDFs
- `student_anamnesis` -- Anamnese (referencia students)
- `user_metrics` -- Metricas do usuario

**CLASSES/SCHEDULING:**
- `gym_classes` -- Aulas
- `class_bookings` -- Reservas
- `class_schedules` -- Grade de horarios
- `appointments` -- Agendamentos
- `vacation_requests` -- Ferias (referencia athletes)
- `vacation_freeze_requests` -- Congelamento

**DIET:**
- `student_diet_assignments` -- Dietas (referencia athletes)

**COMMERCE:**
- `payments` -- Pagamentos
- `products` -- Produtos
- `planos` -- Planos de assinatura

**SOCIAL/ENGAGEMENT:**
- `posts` -- Posts
- `ninefit_checkins` -- Check-ins
- `ninefit_reports` -- Relatorios
- `notifications` -- Notificacoes
- `questionnaires` -- Questionarios
- `questionnaire_responses` -- Respostas

**SYSTEM:**
- `system_events` -- Eventos do sistema
- `system_health` -- Saude do sistema
- `audit_log` -- Log de auditoria
- `logs_sincronizacao` -- Logs de sync
- `ambiente_config` -- Config do ambiente
- `real_time_analytics` -- Analytics
- `student_activity_history` -- Historico de atividades (referencia students)
- `link_de_video` -- Links de video

**VIEWS:**
- `v_students_canonical` -- View canonica de alunos
- `v_assessments_canonical` -- View canonica de avaliacoes
- `v_assignments_canonical` -- View canonica de atribuicoes
- `v_periodizations_canonical` -- View canonica de periodizacoes
- `v_periodizations_catalog` -- Catalogo de periodizacoes
- `v_system_health` -- Saude do sistema
- `v_workout_progression` -- Progressao de treinos

### 1.3 Edge Functions (8)
- `ai-coach` -- Coach IA
- `create-athlete-user` -- Criar usuario do atleta
- `get-base44-nutrition-plans` -- Sync nutricao Base44
- `get-base44-training-plans` -- Sync treino Base44
- `send-student-welcome` -- Email de boas-vindas
- `sync-classes` -- Sync aulas
- `sync-exercises` -- Sync exercicios
- `sync-workout-programs` -- Sync programas

### 1.4 Storage Buckets (5)
- `exercicios` (privado), `plans-pdfs` (privado), `assessments` (publico), `training-html-files` (publico), `diet-html-files` (publico)

---

## ETAPA 2 - PROBLEMAS CRITICOS IDENTIFICADOS

### 2.1 Fragmentacao de Entidades (RISCO ALTO)

O dominio "aluno" esta espalhado em **4 tabelas separadas**:

| Tabela | FK ativas | Situacao |
|--------|-----------|----------|
| `athletes` | student_training_assignments, student_credits, student_diet_assignments, vacation_requests, workout_executions, athlete_periodizations, aluno_periodizacao | **CANONICO** |
| `alunos` | workout_progress, progresso_aluno, avaliacoes_unificadas, planos_treino_aluno, saved_periodizations, historico_treinos_realizados | **LEGACY - AINDA COM FKs ATIVAS** |
| `students` | student_measurements, student_photos, student_anamnesis, student_activity_history, workouts | **LEGACY - AINDA COM FKs ATIVAS** |
| `estudantes` | planos_de_treino_gerados, uploads_periodizacao | **LEGACY** |

**Risco:** `workout_progress.aluno_id` referencia `alunos.id`, nao `athletes.id`. O Hub/Stats usam `workout_progress` com o `athleteId` do contexto, mas a FK aponta para `alunos`. Isso funciona apenas se os IDs coincidirem entre tabelas.

### 2.2 Duplicacao de Exercicios (3 tabelas)
- `exercises` -- Tabela principal com dados do Base44
- `exercise_library` -- Segunda biblioteca
- `exercicios_novos` -- Terceira (pt-BR)

### 2.3 Duplicacao de Super Series (2 tabelas)
- `super_sets` e `supersets` -- Mesma funcao, schemas diferentes

### 2.4 Inconsistencia de Idioma
- Tabelas misturam PT-BR (`alunos`, `exercicios_novos`, `planos_treino_aluno`) com EN (`athletes`, `exercises`, `workout_progress`)
- Colunas misturam (`aluno_id` em tabela EN, `coach_id` em tabela PT)

### 2.5 Ausencia de Service Layer
- 42+ arquivos fazem queries diretas ao Supabase
- Zero reutilizacao de logica de acesso a dados
- Impossivel trocar backend sem reescrever cada componente

### 2.6 Edge Functions sem Versionamento de API
- Todas as functions usam paths diretos sem `/v1/`
- Sem contrato de API padronizado

---

## ETAPA 3 - ESTRUTURA DE DADOS RECOMENDADA

### Dominios Canonicos

```text
DOMAIN: users
  Canonical: profiles, user_roles
  Support: athlete_auth_link

DOMAIN: athletes  
  Canonical: athletes
  Deprecated: alunos, students, estudantes
  
DOMAIN: training
  Canonical: exercises, student_training_assignments, workout_executions, workout_exercise_sets
  Templates: workout_templates, training_programs
  Deprecated: exercise_library, exercicios_novos, workouts, workouts_new, workout_exercises, workout_exercises_new, estruturas_de_treinamento, modelos_de_treino

DOMAIN: progress
  Canonical: workout_progress (NEEDS FK MIGRATION to athletes)
  Deprecated: progresso_aluno, historico_treinos_realizados, user_workout_logs, user_program_progress

DOMAIN: assessments
  Canonical: avaliacoes_unificadas (NEEDS FK MIGRATION to athletes)
  Support: student_measurements (NEEDS FK MIGRATION), student_photos (NEEDS FK MIGRATION)
  Deprecated: avaliacoes, avaliacoes_fisicas, historico_avaliacoes, physical_assessments

DOMAIN: periodization
  Canonical: periodization_models, athlete_periodizations, training_phases, weekly_structures
  Deprecated: periodizacoes_novas, aluno_periodizacao, planos_treino_aluno, planos_de_treino_gerados

DOMAIN: scheduling
  Canonical: appointments, gym_classes, class_bookings, student_credits
  Support: vacation_requests
  Deprecated: class_schedules (removed from app), vacation_freeze_requests

DOMAIN: content
  Canonical: student_diet_assignments, posts, notifications
  Support: questionnaires, questionnaire_responses

DOMAIN: commerce
  Canonical: payments, products
  Deprecated: planos (sem uso ativo)

DOMAIN: analytics
  Canonical: system_events, audit_log, ninefit_checkins, ninefit_reports
  Deprecated: real_time_analytics, logs_sincronizacao
```

---

## ETAPA 4 - AJUSTES NECESSARIOS (Priorizados)

### PRIORIDADE 1 - FK Migration (Sem quebrar dados)

Estas alteracoes criam NOVAS FKs apontando para `athletes` mantendo as antigas:

1. **`workout_progress.aluno_id`** -- Atualmente FK para `alunos`. Adicionar nova coluna `athlete_id` referenciando `athletes`, popular com dados existentes, criar view de compatibilidade.

2. **`avaliacoes_unificadas.aluno_id`** -- Mesma situacao. Adicionar `athlete_id`.

3. **`student_measurements.student_id`** -- FK para `students`. Adicionar `athlete_id` referenciando `athletes`.

4. **`student_photos.student_id`** -- FK para `students`. Adicionar `athlete_id`.

5. **`student_anamnesis.student_id`** -- FK para `students`. Adicionar `athlete_id`.

6. **`student_activity_history.student_id`** -- FK para `students`. Adicionar `athlete_id`.

### PRIORIDADE 2 - Service Layer

Criar camada de servicos para centralizar acesso a dados:

```text
src/services/
  athletes.service.ts      -- CRUD athletes, busca por coach
  training.service.ts      -- Assignments, progress, executions
  assessments.service.ts   -- Avaliacoes, medidas, fotos
  scheduling.service.ts    -- Aulas, bookings, credits
  auth.service.ts          -- Login, roles, profile
  periodization.service.ts -- Models, assignments, phases
  analytics.service.ts     -- Events, checkins, reports
```

Cada servico expoe funcoes tipadas que encapsulam queries Supabase. Componentes importam do servico, nunca do client diretamente.

### PRIORIDADE 3 - Padronizacao de Edge Functions

Adicionar prefixo de versao e contrato consistente:

```text
Atual:                          Proposto:
/sync-workout-programs    ->    /api/v1/sync/workout-programs
/sync-exercises           ->    /api/v1/sync/exercises
/sync-classes             ->    /api/v1/sync/classes
/create-athlete-user      ->    /api/v1/athletes/create-user
/send-student-welcome     ->    /api/v1/notifications/welcome
/ai-coach                 ->    /api/v1/ai/coach
/get-base44-*             ->    /api/v1/integrations/base44/*
```

Resposta padronizada:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  metadata?: { timestamp: string; version: string };
}
```

### PRIORIDADE 4 - Limpeza de Duplicacoes

| Acao | Tabela a Deprecar | Canonica |
|------|-------------------|----------|
| Merge | `exercise_library` + `exercicios_novos` | `exercises` |
| Merge | `super_sets` | `supersets` |
| Deprecar | `progresso_aluno` | `workout_progress` |
| Deprecar | `historico_treinos_realizados` | `workout_executions` |
| Deprecar | `avaliacoes` + `avaliacoes_fisicas` + `historico_avaliacoes` | `avaliacoes_unificadas` |

---

## ETAPA 5 - APIs PADRONIZADAS

### Edge Functions (Contrato v1)

| Endpoint | Metodo | Descricao | Auth |
|----------|--------|-----------|------|
| `/api/v1/athletes` | GET | Listar atletas do coach | trainer+ |
| `/api/v1/athletes/create-user` | POST | Criar auth para atleta | trainer+ |
| `/api/v1/sync/exercises` | POST | Sync exercicios Base44 | trainer+ |
| `/api/v1/sync/classes` | POST | Sync aulas Base44 | trainer+ |
| `/api/v1/sync/programs` | POST | Sync programas Base44 | trainer+ |
| `/api/v1/integrations/base44/training` | GET | Buscar treinos Base44 | trainer+ |
| `/api/v1/integrations/base44/nutrition` | GET | Buscar nutricao Base44 | trainer+ |
| `/api/v1/notifications/welcome` | POST | Enviar email boas-vindas | trainer+ |
| `/api/v1/ai/coach` | POST | Consulta ao coach IA | authenticated |

### Client-Side Service API (TypeScript)

```typescript
// Exemplo de contrato padronizado
interface AthleteService {
  list(coachId: string): Promise<Athlete[]>;
  getById(id: string): Promise<Athlete>;
  create(data: CreateAthleteDTO): Promise<Athlete>;
  update(id: string, data: UpdateAthleteDTO): Promise<Athlete>;
  getProgress(athleteId: string, dateRange?: DateRange): Promise<WorkoutProgress[]>;
  getAssignments(athleteId: string, active?: boolean): Promise<TrainingAssignment[]>;
}
```

---

## ETAPA 6 - MELHORIAS ARQUITETURAIS

1. **Service Layer Pattern** -- Abstraction entre componentes e Supabase
2. **React Query Integration** -- Ja instalado, mas sub-utilizado. Servicos devem retornar query keys padronizados
3. **Modular Route Config** -- Extrair rotas de App.tsx para config separada por modulo
4. **Shared Types Package** -- Centralizar DTOs e interfaces em `src/types/` por dominio
5. **Event-Driven Communication** -- Usar `system_events` + Supabase Realtime para comunicacao entre modulos
6. **Feature Flags** -- Usar `ambiente_config` como feature flag store para habilitar/desabilitar modulos por tenant

---

## ETAPA 7 - RISCOS TECNICOS

| # | Risco | Severidade | Mitigacao |
|---|-------|------------|-----------|
| 1 | FKs de `workout_progress` apontam para `alunos` (deprecated), nao `athletes` | CRITICO | Migration com coluna dual + view |
| 2 | 4 tabelas de aluno com IDs potencialmente divergentes | CRITICO | Auditoria de IDs + migration |
| 3 | 42+ arquivos com queries diretas -- impossivel trocar backend | ALTO | Service layer |
| 4 | Edge functions sem versionamento -- breaking changes afetam todos | ALTO | Prefixo /api/v1/ |
| 5 | `student_measurements/photos/anamnesis` referenciam `students`, nao `athletes` | ALTO | FK migration |
| 6 | 3 tabelas de exercicios -- dados possivelmente desincronizados | MEDIO | Consolidar em `exercises` |
| 7 | Enum `app_role` com 7 valores, `user_role` com 3 -- sobreposicao confusa | MEDIO | Unificar em `app_role` |
| 8 | Idioma misto PT/EN nas tabelas e colunas | BAIXO | Padronizar novos em EN, manter legacy |
| 9 | `profiles.role` (user_role enum) vs `user_roles.role` (app_role enum) -- dual role system | MEDIO | Canonical = user_roles |
| 10 | 48 migrations -- schema complexo, risco de conflitos futuros | BAIXO | Squash migrations periodicamente |

---

## RESUMO EXECUTIVO

O sistema 9FIT PRO possui infraestrutura funcional com Supabase, auth compartilhada, e event system operacional. Os principais bloqueios para integracao com o ecossistema sao:

1. **Fragmentacao de dados** -- 4 tabelas de aluno com FKs cruzadas impedem queries consistentes
2. **Acoplamento direto** -- Queries Supabase espalhadas em 42+ arquivos impossibilitam modularizacao
3. **Ausencia de API contract** -- Edge functions sem versionamento ou resposta padronizada

A estrategia recomendada e incremental: (1) Service layer primeiro, (2) FK migration com compatibilidade retroativa, (3) padronizacao de APIs. Nenhuma tabela sera removida -- apenas novas colunas e views de compatibilidade.

