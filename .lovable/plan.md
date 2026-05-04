# Plano: Finalizar Pendências + Alinhamento Spec 9FIT V2.1

## Contexto

O PDF `9fit-complete-spec.pdf` define 22 telas, 60+ estados e 25 componentes em 5 abas (OS/Train/Social/Data/ID) + Biblioteca de Vídeos. A implementação atual já cobre boa parte da estrutura. Este plano fecha as **6 pendências** restantes e alinha pontos do spec.

---

## Bloco 1 — Atribuir Periodização (StudentTraining)

**Onde:** `src/components/students/tabs/StudentTraining.tsx`

- Adicionar botão **"Atribuir Periodização"** ao lado dos botões existentes (Criar Treino, HTML, etc).
- Novo componente `PeriodizationAssignDialog.tsx` com:
  - Tabs: **Upload PDF** | **Colar HTML** | **Modelo da Biblioteca**
  - Upload PDF → bucket `plans-pdfs` → grava `periodization_file_url`
  - Colar HTML → grava `periodization_html`
  - Modelo → seleciona de `periodization_models` e usa `assignPeriodization()` de `periodization.service.ts`
- Insert em `student_training_assignments` com `training_type='periodization'`, `content_type` apropriado.
- Lista de periodizações ativas em card separado (top da aba), com botão "Arquivar".

## Bloco 2 — Tabs por Dia da Semana (WorkoutOverview / WorkoutExecution)

**Onde:** `src/components/9fit/WorkoutOverview.tsx`, `WorkoutExecution.tsx`

- Em `WorkoutOverview`: agrupar `training_data.exercises` por `training_day` (seg…dom).
- Tabs horizontais Seg-Dom (radix `Tabs`); dia atual (`new Date().getDay()`) destacado em laranja conforme spec.
- Cada tab lista `ExercicioCard` com sets/reps/carga/descanso + ícone de vídeo (estado `[vídeo_disp]` se `external_video_id` existir).
- `WorkoutExecution` filtra exercícios pelo `training_day` selecionado e executa em fila.
- Estado `[dia_concluído] [dia_pendente] [dia_rest]` via badge na tab.

## Bloco 3 — Bloco "Protocol" no CreateWorkoutForm

**Onde:** `src/components/students/CreateWorkoutForm.tsx`

- Novo step inicial (ou seção colapsável no topo) **"Protocolo"** com campos:
  - Objetivo (select: hipertrofia, força, resistência, performance, reabilitação)
  - Método (select: linear, ondulatório, conjugado, blocos, livre)
  - Observações estruturadas (textarea)
  - Frequência semanal (number)
- Salvos em `training_data.protocol = { objective, method, observations, weekly_frequency }`.
- Renderizado em `WorkoutOverview` como header card antes das tabs de dia.

## Bloco 4 — Upload de Avaliações (StudentMeasurements)

**Onde:** `src/components/students/tabs/StudentMeasurements.tsx`

- Nova seção **"Documentos / Avaliações"** com:
  - Botão "Anexar Avaliação" (PDF/imagem) → bucket `assessments`
  - Insert em `user_assessments` (`user_id`, `file_url`, `file_type`, `notes`, `assessment_date`)
  - Lista os anexos com download e delete
- Categorias: `bioimpedancia`, `dexa`, `exame_sangue`, `outros` (select).

## Bloco 5 — HomeFeed Dinâmico no Hub

**Onde:** `src/pages/9fit/Hub.tsx`, novo `src/components/9fit/HomeFeed.tsx`

Usar `getCurrentContext()` de `apiService.ts` para retornar `manha | treino | noite` e renderizar cards dinâmicos:

- **manhã** (5h-12h): Card "Pré-treino" (kcal alvo, água, sono da noite via wearable) + missão diária
- **treino** (12h-20h): Card "Treino do Dia" expandido com CTA "INICIAR" + `WeekDaySelector` + recovery status
- **noite** (20h-5h): Card "Resumo do dia" (treinos, kcal, XP) + "Preparar amanhã" + sono recomendado

Outros cards reordenam dinamicamente: Comunidade preview, Notificações, Pagamentos/Créditos, Premium upsell.

`useTrackInteraction` chamado em cada click para popular `user_interactions`.

## Bloco 6 — Sovereign Override UI (Professor)

**Onde:** novo `src/components/students/SovereignOverridePanel.tsx`, integrado em `StudentTraining.tsx`

- Tabela de exercícios atribuídos com switch **"Bloquear ajuste IA"** (`override_locked`).
- Quando `override_locked=true`, IA não pode alterar carga/séries/reps daquele exercício.
- Update em `workout_exercises.override_locked`.
- Badge no `ExercicioCard` do aluno: 🔒 "Bloqueado pelo Prof." quando `override_locked`.
- Toggle global "Bloquear treino inteiro" → batch update.

---

## Arquivos a alterar/criar


| Arquivo                                                 | Ação                            |
| ------------------------------------------------------- | ------------------------------- |
| `src/components/students/PeriodizationAssignDialog.tsx` | NOVO                            |
| `src/components/students/SovereignOverridePanel.tsx`    | NOVO                            |
| `src/components/9fit/HomeFeed.tsx`                      | NOVO                            |
| `src/components/students/tabs/StudentTraining.tsx`      | + botão Periodização + Override |
| `src/components/students/tabs/StudentMeasurements.tsx`  | + seção Documentos              |
| `src/components/students/CreateWorkoutForm.tsx`         | + bloco Protocol                |
| `src/components/9fit/WorkoutOverview.tsx`               | tabs Seg-Dom                    |
| `src/components/9fit/WorkoutExecution.tsx`              | filtro por training_day         |
| `src/pages/9fit/Hub.tsx`                                | integrar HomeFeed dinâmico      |


## Banco de Dados

Sem migration nova — todas as colunas necessárias já existem:

- `student_training_assignments.periodization_html`, `periodization_file_url`, `content_type`
- `workout_exercises.training_day`, `override_locked`, `observations`
- `user_assessments` (já criada na Fase 1)
- `user_interactions` (já criada)

## Storage

Buckets já existem: `assessments`, `plans-pdfs`, `training-html-files`. RLS já aplicada.  
Plano de Implementação — 9FIT V2.1 (Alinhamento Completo + Pendências)

## CONTEXTO GLOBAL

O sistema deve seguir EXATAMENTE a especificação do arquivo **9fit-complete-spec.pdf**, que define:

- 5 abas principais: OS (Home), TRAIN, SOCIAL, DATA, ID
- 22 telas
- 60+ estados e micro-estados
- 25 componentes
- 1 sistema de Biblioteca de Vídeos integrado por `exercicio_id`

A implementação atual já cobre parte da estrutura. Este plano tem dois objetivos:

1. Finalizar pendências críticas (6 blocos abaixo)
2. Alinhar 100% com a lógica da spec (fluxos, estados e comportamento)

---

# 🔴 REGRAS GLOBAIS (OBRIGATÓRIO)

- NÃO criar estruturas fora da spec
- TODOS os estados do PDF devem ser respeitados
- TODOS os componentes devem refletir comportamento descrito
- Video Library deve funcionar via:
  - `exercicio_id → lookup → video_url`
- Estados como:
  - `loading`, `sem_dado`, `ativo`, `concluído`, `vídeo_disp`  
  devem ser tratados explicitamente

---

# 🧠 BLOCO 1 — PERIODIZAÇÃO (ATRIBUIÇÃO COMPLETA)

## Local

src/components/students/tabs/StudentTraining.tsx

## Implementação

Adicionar botão:

- "Atribuir Periodização"

Criar:  
src/components/students/PeriodizationAssignDialog.tsx

## Funcionalidades

Tabs:

1. Upload PDF
2. Colar HTML
3. Modelo da Biblioteca

### Upload PDF

- Upload → bucket: `plans-pdfs`
- Salvar:
  - `periodization_file_url`
  - `content_type = pdf`

### HTML

- Salvar:
  - `periodization_html`
  - `content_type = html`

### Modelo

- Fonte: `periodization_models`
- Ação:
  - usar `assignPeriodization()`

### Persistência

Tabela:  
`student_training_assignments`

Campos:

- user_id
- training_type = 'periodization'
- content_type
- html ou file_url

---

## UI (OBRIGATÓRIO conforme spec)

- Lista de periodizações ativas
- Estado:
  - ativo
  - sem_periodização
  - aguardando_prof
- Card com:
  - semana atual
  - progresso
- Botão:
  - "Arquivar"

---

# 🧠 BLOCO 2 — TREINO POR DIA (CORE DO SISTEMA)

## Arquivos

- WorkoutOverview.tsx
- WorkoutExecution.tsx

## Regra central da spec

Treino é organizado por:

- SEG → DOM
- Estados:
  - dia_concluído
  - dia_pendente
  - dia_rest

---

## WorkoutOverview

- Agrupar por:  
`training_data.exercises.training_day`

### UI obrigatória

- WeekDaySelector (scroll horizontal)
- Dia atual destacado em LARANJA
- Cada dia:
  - lista de ExercicioCard

### ExercicioCard deve conter:

- nome
- sets
- reps
- carga
- descanso
- grupo muscular
- VideoButton (se houver)

Estado vídeo:

- `vídeo_disp` se `external_video_id`

---

## WorkoutExecution

- Filtrar exercícios por dia selecionado
- Executar em fila

### Componentes obrigatórios (spec):

- ActiveExerciseCard
- SetLogger
- RestTimer
- WorkoutProgressBar
- ExerciseQueue

### Estados:

- exercício_ativo
- descanso
- pausado
- concluído

---

# 🧠 BLOCO 3 — PROTOCOL (INTELIGÊNCIA DE TREINO)

## Local

CreateWorkoutForm.tsx

## Adicionar

Seção topo:  
"Protocolo"

Campos:

- objective:
  - hipertrofia
  - força
  - resistência
  - performance
  - reabilitação
- method:
  - linear
  - ondulatório
  - conjugado
  - blocos
  - livre
- observations (textarea)
- weekly_frequency (number)

---

## Persistência

Salvar em:

training_data.protocol = {  
objective,  
method,  
observations,  
weekly_frequency  
}

---

## Renderização

No WorkoutOverview:

- Card no topo
- Antes das tabs de dia

---

# 🧠 BLOCO 4 — AVALIAÇÕES (DATA TAB)

## Local

StudentMeasurements.tsx

## Nova seção:

"Documentos / Avaliações"

---

## Upload

- Aceita:
  - PDF
  - imagem
- Bucket:  
`assessments`

---

## Persistência

Tabela:  
`user_assessments`

Campos:

- user_id
- file_url
- file_type
- notes
- assessment_date
- category:
  - bioimpedancia
  - dexa
  - exame_sangue
  - outros

---

## UI

- Lista de arquivos
- Download
- Delete
- Estado:
  - sem_avaliação
  - com_avaliação
  - evolução

---

# 🧠 BLOCO 5 — HOME INTELIGENTE (CORE UX)

## Arquivos

- src/pages/9fit/Hub.tsx
- src/components/9fit/HomeFeed.tsx (NOVO)

---

## Lógica central

Usar:  
getCurrentContext()

Retorna:

- manha (5–12)
- treino (12–20)
- noite (20–5)

---

## Render dinâmico

### MANHÃ

- Card:
  - Pré-treino
  - kcal alvo
  - água
  - sono (wearable)
- Missão diária

---

### TREINO

- Card:
  - Treino do dia (expandido)
  - CTA "INICIAR"
- WeekDaySelector
- Recovery status

---

### NOITE

- Resumo:
  - treinos
  - kcal
  - XP
- CTA:
  - "Preparar amanhã"

---

## Outros cards (dinâmicos)

- Comunidade preview
- Notificações
- Pagamentos
- Premium upsell

---

## Tracking

Toda interação:

useTrackInteraction()

Tabela:  
user_interactions

---

# 🧠 BLOCO 6 — SOVEREIGN OVERRIDE (CONTROLE DO PROFESSOR)

## Novo arquivo

src/components/students/SovereignOverridePanel.tsx

---

## Funcionalidade

Tabela de exercícios com:

- Switch:  
"Bloquear ajuste IA"

---

## Persistência

Tabela:  
workout_exercises

Campo:  
override_locked (boolean)

---

## Regras

Se:  
override_locked = true

→ IA NÃO pode alterar:

- carga
- reps
- séries

---

## UI aluno

No ExercicioCard:

- Badge:  
🔒 "Bloqueado pelo Prof."

---

## Controle global

- "Bloquear treino inteiro"  
→ update em batch

---

# 🎥 INTEGRAÇÃO VIDEO LIB (CRÍTICO)

Fluxo obrigatório:

exercicio_id →  
lookup →  
video_url →  
render player

---

## Estados obrigatórios:

- loading
- playing
- paused
- completed
- sem_vídeo

---

## Pontos de acesso:

- ExercicioCard
- Execução
- Preview treino

---

# 🧱 BANCO DE DADOS

NÃO criar migrations novas

Usar:

- student_training_assignments
- workout_exercises
- user_assessments
- user_interactions

---

# 📦 STORAGE

Buckets:

- assessments
- plans-pdfs
- training-html-files

---

# ✅ VALIDAÇÃO FINAL (E2E)

Fluxo obrigatório:

1. Professor:
  - cria treino com protocol
  - define dias
  - atribui periodização (PDF)
  - bloqueia exercícios
2. Aluno:
  - entra no Hub (contextual)
  - vê treino por dia
  - executa treino
  - vê vídeo
  - respeita bloqueios 🔒
3. Professor:
  - anexa avaliação

---

# ❗ RESULTADO ESPERADO

Sistema 100% alinhado com spec:

- comportamento
- estados
- UI
- fluxos
- dados

Sem divergências.

## Validação Final

Após implementar, vou testar fluxo end-to-end:

1. Professor cria treino com Protocol + exercícios em dias da semana → atribui periodização PDF → bloqueia 2 exercícios via override.
2. Aluno entra no Hub (HomeFeed contextual) → Train mostra tabs Seg-Dom → executa dia atual → exercícios bloqueados aparecem com 🔒.
3. Professor anexa PDF de bioimpedância em Medidas.