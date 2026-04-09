

# Plano: Finalizar Pendencias Criticas

## Problemas Identificados

### 1. Sync Biblioteca - 2 bugs criticos
- **`getClaims()` nao existe** no Supabase JS SDK. A edge function usa `authClient.auth.getClaims(token)` que falha com erro, retornando 401. Fix: usar `authClient.auth.getUser()` que e o metodo correto.
- **Sem UNIQUE index em `exercises.name`**: O upsert usa `onConflict: "name"` mas nao ha unique constraint. Fix: criar migration adicionando unique index.

### 2. Appointments RLS - Funcional mas professor precisa de INSERT
As policies atuais estao corretas para o aluno. Porem o `teacher_id` no INSERT e populado com `coach_id` do athlete, nao com `auth.uid()` do professor. A policy "Teachers can manage" usa `teacher_id = auth.uid()`, entao quando o aluno insere com `teacher_id = coach_id`, funciona. MAS: preciso verificar se o INSERT do aluno esta falhando porque o `teacher_id` precisa ser UUID valido de `auth.users`. Se coach_id nao for um auth.uid(), o INSERT funciona mas o professor nao ve. **Correcao**: Garantir que o INSERT do aluno na AulasCreditos use corretamente o `coach_id` como `teacher_id`.

### 3. Criar Treino pelo Professor - Componente nao existe
`CreateWorkoutForm` nao existe no projeto. Precisa ser criado e integrado em `StudentTraining.tsx`.

### 4. Train View - Sem exercise cards
`WorkoutOverview` e `WorkoutExecution` nao renderizam exercicios estruturados do `training_data`. Mostram apenas texto generico.

---

## Execucao

### Fase 1: Migration SQL
```sql
-- Unique index para upsert funcionar
CREATE UNIQUE INDEX IF NOT EXISTS exercises_name_unique ON public.exercises (name);
```

### Fase 2: Fix Edge Function `sync-exercise-library`
- Substituir `authClient.auth.getClaims(token)` por `authClient.auth.getUser()` 
- `userId = userData.user.id`
- Adicionar fallback: se API `bibliteoca9fit.lovable.app` retornar HTML, tentar fetch direto no frontend e enviar no body

### Fase 3: Fix `ExercisesPage.tsx` - Fallback frontend
- Antes de chamar a edge function, fazer fetch direto de `https://bibliteoca9fit.lovable.app/api/exercises.json`
- Se obtiver JSON valido, enviar no body da chamada da edge function como `{ exercises: [...] }`
- Isso garante que mesmo se a edge function nao conseguir buscar, os dados chegam

### Fase 4: Criar `CreateWorkoutForm.tsx`
Componente multi-step para professor:
1. Metadados (nome, descricao, dias da semana, duracao)
2. Selecao de exercicios da tabela `exercises` com busca/filtro
3. Prescricao (series, reps, descanso, cadencia) por exercicio
4. Salvar como `student_training_assignments` com `training_type: 'structured'` e `training_data` JSONB contendo array de exercicios

Integrar botao "Criar Treino" ao lado de "Atribuir Treino" em `StudentTraining.tsx`.

### Fase 5: Renderizar exercicios no app do aluno
- **WorkoutOverview**: Se `training_data.exercises` existe, renderizar lista de exercicios com nome, series, reps, thumbnail do YouTube
- **WorkoutExecution**: Se `training_data.exercises` existe, renderizar cards interativos por exercicio (em vez de iframe HTML vazio) com video embed, campos de carga, e botao proximo exercicio

### Fase 6: Deploy edge function

---

## Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Unique index em exercises.name |
| `supabase/functions/sync-exercise-library/index.ts` | Fix getClaims -> getUser |
| `src/pages/ExercisesPage.tsx` | Fallback fetch frontend |
| `src/components/students/CreateWorkoutForm.tsx` | NOVO - formulario multi-step |
| `src/components/students/tabs/StudentTraining.tsx` | Integrar botao Criar Treino |
| `src/components/9fit/WorkoutOverview.tsx` | Renderizar exercise cards |
| `src/components/9fit/WorkoutExecution.tsx` | Renderizar exercise cards interativos |

