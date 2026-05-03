## Plano de Implementação — FitPro Dossiê (Fase 1 Pragmática)

O dossiê é amplo (Rede Neural, Banco Supra, APIs Vercel, Agentes). Vou priorizar o que é **executável dentro do Lovable + Supabase atual**, deixando a camada de Agentes externa como integração futura via `apiService` (mock → fetch).

### Escopo desta entrega

#### 1. Correções críticas pendentes

- **Constraint `training_type**`: validar valores aceitos no banco (`workout`, `diet`, `periodization`, `structured`, `ai_generated`). Migration para normalizar CHECK.
- **Appointments do aluno → professor**: garantir que `teacher_id` seja preenchido com o `coach_id` do athlete (auth.uid do professor) no `AulasCreditos.tsx`, e que o professor veja os agendamentos criados.
- **Créditos de aula**: implementar débito automático ao confirmar agendamento + bloqueio se `class_credits = 0`.

#### 2. Biblioteca de Exercícios — uso pelo Professor

- Já sincronizada, permitir apresentar e atribuir toda biblioteca . Adicionar em `CreateWorkoutForm.tsx`:
  - Filtros por `category` / `muscle_group` / busca por nome.
  - Preview de vídeo (YouTube embed) ao selecionar.
  - Suporte a "infoprodutos/ebooks/apps" da biblioteca como `content_type` extra (campo já existe no JSON).

#### 3. Módulo Treino — Estrutura Protocol + Training

Refatorar `WorkoutOverview.tsx` e `CreateWorkoutForm.tsx` para os dois blocos do dossiê:

- **A. Protocol**: objetivo do bloco, método aplicado, observações estruturadas (tipo: `intensificar | reduzir | variar | metodo`).
- **B. Training Semanal**: tabs por dia (Seg–Dom), exercícios com `training_day` + `order_index`.
- Adicionar coluna `training_day` em `workout_exercises` (se não existir) e `observations` JSONB estruturado.

#### 4. Atribuir Periodização (substituir "atribuir dieta" duplicado)

- Botão "Atribuir Periodização" em `StudentTraining.tsx`.
- Aceitar HTML colado **ou** upload de arquivo (PDF/DOC) → bucket `plans-pdfs`.
- Campos novos em `student_training_assignments`: `periodization_html TEXT`, `periodization_file_url TEXT`.
- Renderização fixa para o aluno em uma aba "Periodização" dentro de Train.

#### 5. Medidas → Upload Estruturado

- Nova tabela `user_assessments` (id, user_id, file_url, type, created_at).
- UI em `StudentMeasurements.tsx`: upload de arquivo de avaliação + histórico versionado.

#### 6. Camada API (`apiService.ts`)

Criar `src/services/apiService.ts` com as funções do dossiê (`getUserProfile`, `getTrainingActive`, `getNutritionDaily`, `getSchedule`, `getCommerceOffers`, `getReportsEvolution`).

- Implementação interna: chama Supabase real (não mock).
- Assinatura compatível com futura migração para `fetch(BASE_URL)` quando os Agentes da Vercel estiverem prontos.
- Bind nos containers: HeaderBio, HomeFeed, WorkoutCard, NutritionHAD, AgendaSlot, StoreContextual, EvolutionReport.

#### 7. HomeFeed Contextual

Refatorar `Hub.tsx` para usar `currentContext` derivado da hora local:

- `manha` (5h–11h) → card NutritionHAD destacado + bom dia.
- `treino` (horário do treino agendado ou 16h–20h padrão) → WorkoutCard expandido.
- `noite` (20h+) → StoreContextual + recuperação.

#### 8. Inteligência de Aprendizado (base mínima)

- Tabela `user_interactions` (id, user_id, type, payload JSONB, created_at).
- Hook `useTrackInteraction()` registrando cliques em exercícios, dúvidas, treinos iniciados.
- Tabela `templates` (id, type, content, usage_count) — incrementar `usage_count` quando professor reutiliza um treino.

### Migrations

```sql

-- 1. training_type CHECK (corrigido)
ALTER TABLE student_training_assignments 
DROP CONSTRAINT IF EXISTS student_training_assignments_training_type_check;

ALTER TABLE student_training_assignments 
ADD COLUMN IF NOT EXISTS content_type TEXT;

ALTER TABLE student_training_assignments 
ADD CONSTRAINT student_training_assignments_training_type_check
CHECK (training_type IN ('workout','diet','periodization')); 
-- content_type (novo campo)
-- valores esperados:
-- 'structured','ai_generated','html','file','link'
-- 2. Periodização
ALTER TABLE student_training_assignments
  ADD COLUMN IF NOT EXISTS periodization_html TEXT,
  ADD COLUMN IF NOT EXISTS periodization_file_url TEXT;
. -- 3. workout_exercises.training_day + observations (corrigido)
ALTER TABLE workout_exercises
  ADD COLUMN IF NOT EXISTS training_day SMALLINT,
  ADD COLUMN IF NOT EXISTS observations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS override_locked BOOLEAN DEFAULT FALSE;

-- 4. user_assessments
CREATE TABLE IF NOT EXISTS user_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own assessments" ON user_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own assessments" ON user_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. user_interactions-- index para performance futura
CREATE INDEX IF NOT EXISTS idx_user_interactions_user 
ON user_interactions(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  type TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own interactions" ON user_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  content JSONB,
  usage_count INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

&nbsp;

&nbsp;

&nbsp;

### Arquivos modificados


| Arquivo                                                | Ação                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| Migration SQL                                          | 6 alterações acima                                           |
| `src/services/apiService.ts`                           | NOVO — camada unificada                                      |
| `src/pages/9fit/Hub.tsx`                               | HomeFeed contextual                                          |
| `src/pages/9fit/AulasCreditos.tsx`                     | Fix teacher_id + débito de créditos                          |
| `src/components/students/CreateWorkoutForm.tsx`        | Filtros + Protocol/Training tabs + observations estruturadas |
| `src/components/students/tabs/StudentTraining.tsx`     | Botão "Atribuir Periodização"                                |
| `src/components/students/tabs/StudentMeasurements.tsx` | Upload + histórico                                           |
| `src/components/9fit/WorkoutOverview.tsx`              | Render Protocol + tabs por dia                               |
| `src/hooks/useTrackInteraction.ts`                     | NOVO                                                         |


### Fora do escopo desta fase (fica para integração futura)

- Banco Supra separado (Vercel)
- Agentes Epsilon/Zeta/Iota (IA externa)
- Endpoints `api.9fit.com/v1/*` reais (manter como `apiService` interno até existir backend)
- Health Score baseado em wearables reais (mock por enquanto)
- Sovereign Override completo (apenas flag `override_locked` por exercício nesta fase)

### Pergunta antes de executar

Confirma esse escopo? Posso começar pela **Fase A** (correções críticas: constraint, appointments, créditos) e depois **Fase B** (apiService + HomeFeed + Protocol/Training), ou prefere outra ordem?  
Garantir integridade: teacher_id deve referenciar o id do professor (FK consistente com tabela de usuários/profiles).