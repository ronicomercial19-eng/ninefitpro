

# Plano: Perfil do Aluno, Agendamento Completo, Biblioteca de Exercicios, Templates HTML e Onboarding

## Resumo das Mudancas

Este plano cobre 7 areas: alterar senha no perfil do aluno, ativar/inativar aluno, agendamento multi-dia no admin, biblioteca de exercicios com imagens/videos, renderizador de templates HTML, e onboarding contextual.

---

## FASE 1: Perfil do Aluno - Alterar Senha e Ativo/Inativo

### `src/pages/9fit/Profile.tsx`
- Adicionar botao "Alterar Senha" que abre dialog com campos: senha atual (opcional), nova senha, confirmar senha
- Usar `supabase.auth.updateUser({ password })` para alterar
- Adicionar toggle "Ativo/Inativo" visivel ao admin no `StudentDetailedView.tsx`:
  - Botao que chama `supabase.from('athletes').update({ ativo: !currentStudent.ativo })` 
  - Ja existe badge ativo/inativo no header, adicionar botao de toggle ao lado

### `src/components/students/StudentDetailedView.tsx`
- Adicionar botao "Ativar/Desativar" ao lado dos botoes existentes (Resetar Senha, Excluir)
- Toggle entre ativo e inativo com confirmacao

---

## FASE 2: Agendamento Multi-Dia no Admin

### `src/pages/AgendaPage.tsx`
- No modal "Novo Agendamento", ao selecionar tipo "Aula", mostrar seletor de multiplos dias da semana (Seg, Ter, Qua...) + horario
- Ao salvar, criar N registros de appointments (um por dia selecionado) com recorrencia semanal para o mes atual
- Gerar automaticamente datas baseadas nos dias selecionados (ex: se Seg+Qua, gerar todas as segundas e quartas do mes)
- Adicionar campo `recurrence_pattern` (jsonb) no appointment para referencia futura

### Migracao SQL
- Adicionar coluna `recurrence_pattern` (jsonb, nullable) na tabela `appointments`

---

## FASE 3: Agendamento Completo no App do Aluno

### `src/pages/9fit/AulasCreditos.tsx`
- A secao "Meus Agendamentos" ja existe. Melhorar:
  - Permitir aluno solicitar novo agendamento (insert em `appointments` com status "scheduled")
  - Botao "Solicitar Agendamento" que abre dialog com tipo (avaliacao/aula/consultoria) + data preferida + observacao
  - Status do agendamento visivel: Agendado, Confirmado, Concluido, Cancelado

---

## FASE 4: Biblioteca de Exercicios com Supabase

### `src/pages/ExercisesPage.tsx`
- **Problema atual**: Array hardcoded com 8 exercicios. Sem fetch do Supabase.
- Substituir por fetch real: `supabase.from('exercises').select('*').order('name')`
- A tabela `exercises` ja tem campos: `name`, `image_url`, `video_url`, `gif_url`, `target_muscles`, `equipment`, `difficulty_level`, `phase`, `goal`
- Manter filtros existentes mas conectar aos dados reais
- Upload de imagem: salvar no bucket `exercicios` (ja existe, privado)
- Upload de video: salvar URL externa (YouTube/Vimeo) no campo `video_url`

### Resposta sobre Videos
O sistema **suporta videos via URL externa** (YouTube, Vimeo, links diretos). Nao ha upload direto de arquivo de video no storage (seria pesado). Recomenda-se ate **50-100 exercicios com video** sem impacto de performance, ja que sao apenas URLs. O `ExerciseVideoPlayer` existente ja suporta renderizacao.

### `src/components/exercises/AddExerciseForm.tsx`
- Adicionar campo de upload de imagem (input file -> upload para bucket `exercicios` -> salvar URL em `image_url`)
- Campo video_url ja existe no form

---

## FASE 5: Renderizador de Templates HTML

### Novo componente `src/components/students/HTMLTemplateManager.tsx`
- Listar todos os `student_training_assignments` com `html_file_url` preenchido
- Card para cada template com preview thumbnail
- Ao clicar: abrir preview em iframe (ja existe logica similar em `StudentTraining`)
- Botao "Editar" que abre o HTML em um editor de texto simples (textarea)
- Ao salvar: re-upload do HTML editado para o storage, atualiza `html_file_url`
- Permitir selecionar template e atribuir a outro aluno (insert novo `student_training_assignments`)

### Integracao
- Adicionar tab ou botao "Templates HTML" no `StudentTraining.tsx`
- Admin pode ver todos os templates carregados, editar e re-atribuir

---

## FASE 6: Onboarding Contextual por Feature

### Novo componente `src/components/onboarding/FeatureOnboarding.tsx`
- Componente generico que recebe `featureKey` (ex: "agenda", "exercises", "training")
- Verifica `localStorage` se usuario ja viu onboarding daquela feature: `onboarding_${featureKey}_seen`
- Se nao viu: mostra tooltip/card flutuante com 1-3 passos explicando a feature
- Cada feature tem seus proprios passos definidos em um mapa estatico

### Onboarding inicial (educativo)
- Atualizar `src/components/onboarding/OnboardingTour.tsx` existente para ser mais pratico:
  - Menos texto, mais icones
  - Cada passo com animacao de destaque na area relevante
  - Botao "Entendi" em vez de "Proximo"

### Integracao nas paginas
- Adicionar `<FeatureOnboarding featureKey="hub" />` no Hub.tsx
- `<FeatureOnboarding featureKey="aulas" />` no AulasCreditos.tsx
- `<FeatureOnboarding featureKey="exercises" />` no ExercisesPage.tsx
- Etc. para cada pagina principal

---

## Secao Tecnica

### Migracao SQL
```sql
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS recurrence_pattern jsonb DEFAULT NULL;
```

### Geracao de Datas Recorrentes (Admin)
```typescript
// Ao selecionar Seg+Qua para marco 2026:
const selectedDays = [1, 3]; // 0=Dom, 1=Seg, 3=Qua
const dates = eachDayOfInterval({ start: monthStart, end: monthEnd })
  .filter(d => selectedDays.includes(d.getDay()));
// Cria um appointment para cada data
```

### Alterar Senha no Perfil do Aluno
```typescript
const { error } = await supabase.auth.updateUser({ password: newPassword });
```

### Upload de Imagem de Exercicio
```typescript
const { data } = await supabase.storage
  .from('exercicios')
  .upload(`images/${exerciseId}.jpg`, file);
```

### Arquivos a Modificar/Criar

1. `src/pages/9fit/Profile.tsx` - Botao alterar senha + dialog
2. `src/components/students/StudentDetailedView.tsx` - Toggle ativo/inativo
3. `src/pages/AgendaPage.tsx` - Multi-dia no modal de agendamento
4. `src/pages/9fit/AulasCreditos.tsx` - Solicitar agendamento pelo aluno
5. `src/pages/ExercisesPage.tsx` - Fetch real do Supabase + upload imagem
6. `src/components/exercises/AddExerciseForm.tsx` - Upload de imagem
7. `src/components/students/HTMLTemplateManager.tsx` - NOVO
8. `src/components/students/tabs/StudentTraining.tsx` - Integrar template manager
9. `src/components/onboarding/FeatureOnboarding.tsx` - NOVO
10. `src/components/onboarding/OnboardingTour.tsx` - Atualizar
11. Paginas principais - Integrar FeatureOnboarding
12. Migracao SQL - `recurrence_pattern` em appointments
13. `src/pages/RoadmapPage.tsx` - Atualizar status

