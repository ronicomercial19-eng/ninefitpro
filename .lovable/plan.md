

# Plano de Implementacao - Fix RLS + Workout Elite + UI/UX Update

## Problema Critico: RLS no Appointments

A policy atual verifica `student_id = auth.uid()` mas `student_id` e um `athletes.id` (UUID diferente de `auth.uid()`). O aluno nunca consegue inserir porque nao ha policy de INSERT, e o SELECT tambem falha pela mesma razao.

**Fix:** Criar policies que fazem JOIN com `athletes.user_id`:
```sql
-- DROP policies existentes
-- CREATE: Students can view own appointments
-- USING (student_id IN (SELECT id FROM athletes WHERE user_id = auth.uid()))
-- CREATE: Students can insert own appointments
-- WITH CHECK (student_id IN (SELECT id FROM athletes WHERE user_id = auth.uid()))
```

---

## Implementacao do Workout Elite (3 componentes novos)

### WorkoutHome.tsx
- Dashboard "Meu Protocolo" com:
  - Progress tracking (data inicio, treinos realizados)
  - Nivel de suporte (slider)
  - Cards dos proximos treinos
  - Botao "Iniciar Treino" em destaque

### WorkoutOverview.tsx
- Lista tecnica dos exercicios antes de iniciar
- Cada exercicio com codigo alfanumerico, series, reps, preview de midia
- Botao "INICIAR TREINO" no final

### WorkoutExecution.tsx
- Interface de execucao com:
  - Area de video/GIF do exercicio (usa ExerciseVideoPlayer existente)
  - Smart Timer com play/pause/reset
  - Controle de carga (+/-) por serie
  - Metricas: series, reps, descanso, cadencia
  - Navegacao entre exercicios
  - Modal de conclusao com XP + tempo + PSE (integra PostWorkoutModal)

### Integracao no Train.tsx
- Refatorar Train.tsx para usar fluxo: `HOME → OVERVIEW → EXECUTION`
- Tab "Meu Protocolo" vs "Explorar"
- Quando aluno tem assignments, mostra WorkoutHome
- Ao clicar em treino, mostra WorkoutOverview
- Ao iniciar, entra em WorkoutExecution

---

## UI/UX Update Global

### BottomNavigation
- 5 tabs: OS (Hub) | Train | Social | Data (Stats) | ID (Perfil)
- Icones atualizados, labels em uppercase

### Hub.tsx
- Treino do Dia com destaque visual (border neon, botao grande)
- Cards reorganizados com hierarquia clara
- Social feed compacto horizontal (Gym Rats style)

### Dieta.tsx
- Barra de calorias no topo
- Lista de refeicoes do dia
- FAB "+" para registrar

### Train.tsx (completo refactor)
- Cards de treino inteiros clicaveis
- Badges: tempo estimado, nivel, status
- Transicao para WorkoutHome/Overview/Execution

### Profile.tsx
- Manter funcionalidades atuais
- Melhorar cards visuais

---

## Atualizacao Painel Admin

### Dashboard.tsx
- Card "Alertas RPE" (ja parcialmente implementado)
- Card de treinos executados com detalhes de carga/RPE

### StudentDetailedView.tsx
- Visualizar workout_executions do aluno
- Ver historico de cargas e RPE

---

## Ordem de Execucao

| # | Tarefa | Tipo |
|---|--------|------|
| 1 | Fix RLS appointments | Migration SQL |
| 2 | Criar WorkoutHome + WorkoutOverview + WorkoutExecution | 3 componentes novos |
| 3 | Refatorar Train.tsx com fluxo elite | Edit |
| 4 | Atualizar BottomNavigation (5 tabs) | Edit |
| 5 | Atualizar Hub.tsx UI/UX | Edit |
| 6 | Atualizar Dieta.tsx UI/UX | Edit |

**Total:** 1 migration, 3 componentes novos, 4 arquivos editados

