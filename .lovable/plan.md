#   
**Você é um engenheiro full-stack sênior. Não altere nenhum layout, CSS ou design. Implemente apenas lógica, handlers e chamadas Supabase. Execute em ordem. Reporte o que foi feito ao final de cada bloco.**  
  
Fluxo Único de Ativação / Conexao frontend + back end /  atualizações funcionais do app — 9FIT (versão final, schema real confirmado)

## Status do Backend

O backend já está pronto no Supabase. As 3 migrations desta rodada já rodaram com sucesso:

- `athlete_activation` criada e corrigida (colunas de streak, missões, XP)
- Trigger morto removido (`tg_interceptar_treino_lovable` — travava toda gravação em `workout_executions`)
- `activation_advance()` e `activation_finish()` já existem como RPCs no banco

**Não crie migration nova. Este build é 100% frontend — consumindo RPCs que já existem.**

---

## Objetivos descritos abaixos logo apos o fluxo de ativaçao. 

Substituir todas as trilhas de ativação atuais por um único fluxo guiado (4 passos → tela final) integrado às RPCs já criadas no Supabase. Ao terminar, o usuário está oficialmente configurado no app.

---

## Correção crítica em relação ao plano original

O plano original confundia dois conceitos e isso travaria o usuário por 7 dias fora do app:


| Campo                                | O que significa                                      | Quando vira true                 |
| ------------------------------------ | ---------------------------------------------------- | -------------------------------- |
| `athlete_activation.finished_at`     | Usuário terminou o fluxo guiado de 4 passos          | Imediatamente, na tela Finished  |
| `athlete_activation.fully_activated` | Selo de consistência (coluna gerada automaticamente) | Só depois de 7 dias de atividade |


O guard de rota verifica `finished_at`, **nunca** `fully_activated`. `fully_activated` é só um badge visual para mostrar em algum lugar da Tela 8/Performance — não bloqueia acesso a nada.

---

## Fluxo (rota /9fit/ativacao)

Estados: `not_started → assessment → generation → execute → consistency → finished`

Toda transição de estado chama uma única RPC, sem escrever direto em tabela nenhuma pelo frontend:

```typescript
// src/hooks/useActivationFlow.ts

async function advanceStep(step: 'assessment' | 'generation' | 'execute' | 'consistency', payload: object = {}) {
  const { data, error } = await supabase.rpc('activation_advance', {
    p_athlete_id: athleteId,
    p_step: step,
    p_payload: payload
  });
  if (error) {
    // não travar a tela — logar e seguir com fallback local se necessário
    console.error(error);
    return null;
  }
  return data; // [{ step, ok, activation_row }]
}

async function finishActivation() {
  const { data, error } = await supabase.rpc('activation_finish', {
    p_athlete_id: athleteId
  });
  if (error) { console.error(error); return null; }
  return data; // [{ fully_activated, finished_at }]
}

```

---

## Passo 1 — Assessment

UI: nível, objetivo principal, frequência, restrições.

```typescript
await advanceStep('assessment', {
  goal: selectedGoal,
  experience_level: selectedLevel,
  weekly_frequency: selectedFrequency,
  restrictions: restrictionsText
});

```

A RPC já grava em `athletes.primary_goal` / `objetivo` / `experience_level` / `nivel` / `weekly_frequency` / `sessions_per_week` / `injuries_limitations` (colunas duplicadas legado+novo, ambas atualizadas para não quebrar leitura de tela antiga).

---

## Passo 2 — Generation

UI: logs sequenciais animados (mantém a estética do essence).

**A RPC oficial confirmada no banco é** `fn_treino_rapido`**. Ignorar qualquer referência a** `prescrever_treino_rapido` **— essa função não existe no schema atual.** Use o fallback hardcoded do essence como comportamento padrão e grave o resultado via RPC:

```typescript
const workoutPlan = generateFallbackPlan(); // lógica local do essence
await advanceStep('generation', {
  day_number: 1,
  day_name: workoutPlan.name,
  focus_muscles: workoutPlan.muscles, // array de strings
  workout_type: 'quick'
});

```

Isso grava em `daily_workouts` (não `daily_protocol_blocks` — essa tabela não existe) e marca a missão `first_plan`.

---

## Passo 3 — Execute

UI: timer + checklist de exercícios.

```typescript
await advanceStep('execute', {
  amount: 100,
  source: 'first_workout'
});

```

A RPC já faz, na ordem: cria `workout_executions` (completed), marca `first_workout_at`, chama `fn_award_xp` com a assinatura real do banco — e isso dispara automaticamente o trigger de ativação (`trg_xp_awarded_activation`) que já existe.

---

## Passo 4 — Consistency (D1–D7)

UI: tracker visual de 7 dias.

```typescript
// Chamar 1x por dia que o usuário abrir o app durante a semana de ativação
await advanceStep('consistency');

```

Isso incrementa `consistency_days` (máximo 1x por dia, já tratado na RPC). Para ler o histórico de eventos, use a própria linha:

```typescript
const { data } = await supabase
  .from('athlete_activation')
  .select('activation_events')
  .eq('athlete_id', athleteId)
  .single();
// activation_events é JSONB (array de eventos), não uma tabela separada

```

---

## Passo 5 — Finished

```typescript
const result = await finishActivation();
// result[0].finished_at agora preenchido → guard libera o app
// result[0].fully_activated só vira true depois de 7 dias (isso é normal, não é bug)
router.push('/9fit/os');

```

---

## Guard central (NineFitLayout.tsx)

```typescript
const { data: activation } = await supabase
  .from('athlete_activation')
  .select('finished_at')
  .eq('athlete_id', athleteId)
  .single();

if (!activation?.finished_at && !['/9fit/ativacao', '/9fit/first-access', '/9fit/login'].includes(pathname)) {
  redirect('/9fit/ativacao');
}

// Guard reverso: usuário que já completou o fluxo não acessa /9fit/ativacao novamente
if (activation?.finished_at && pathname === '/9fit/ativacao') {
  redirect('/9fit/os');
}

```

**Nunca checar** `fully_activated` **aqui — isso é o bug que travaria o usuário 7 dias fora do app.**

---

## Rotas/telas a excluir

- `src/pages/9fit/Ativacao.tsx` — substituído pelo novo fluxo unificado (mesma rota).
- `src/pages/9fit/AvaliacaoGuiada.tsx` — removido do router; qualquer link passa a apontar `/9fit/ativacao`.
- `src/pages/9fit/Onboarding.tsx` — mantido apenas como stub que redireciona para `/9fit/ativacao`.
- `src/components/9fit/ActivationMissionCard.tsx` e `HubMissionsCard.tsx` — reescritos para apenas mostrar CTA "Continuar ativação →" enquanto `finished_at IS NULL`.
- Remover imports/rotas mortas: `EmojiCalibrationQuiz`, `CompleteProfileFlow`, `OnboardingStepper` do fluxo do aluno.

---

## Arquivos a criar/editar

**Criar:**

- `src/pages/9fit/Ativacao.tsx` — porte do essence App.tsx, tokens do design system atual (`--primary`, `--card`, `--foreground`), sem hex hardcoded.
- `src/components/9fit/activation/StepAssessment.tsx`
- `src/components/9fit/activation/StepGeneration.tsx`
- `src/components/9fit/activation/StepExecute.tsx`
- `src/components/9fit/activation/StepConsistency.tsx`
- `src/components/9fit/activation/StepFinished.tsx`
- `src/hooks/useActivationFlow.ts` — state machine chamando só `activation_advance` / `activation_finish` (ver código acima)

**NÃO criar: nenhum arquivo de migration. Backend já está pronto.**

**Editar:**

- `src/App.tsx` — remover rota `AvaliacaoGuiada`, manter só `/9fit/ativacao`.
- `src/components/9fit/NineFitLayout.tsx` — guard usando `finished_at` (não `fully_activated`), incluindo guard reverso.
- `src/components/9fit/ActivationMissionCard.tsx` — vira CTA único.
- `src/hooks/useActivationProgress.ts` — passa a ler `athlete_activation` via RPCs, não escrita direta em tabela.
- `src/pages/9fit/Onboarding.tsx` — redirect stub.

---

## REGRA FINAL — resolução de athleteId

Não crie um helper novo por email. O projeto já tem o padrão canônico em `useAthleteId.ts` (resolve via `athlete_auth_link WHERE user_id = auth.uid()`, com fallback em 3 níveis). Reutilize esse hook em todos os blocos abaixo. Email não é chave confiável — `athletes.email` pode ser nulo.

---

## BLOCO A — Treino Rápido

```typescript
const { data } = await supabase.rpc('fn_treino_rapido', {
  p_athlete_id: athleteId,
  p_objetivo: objetivoSelecionado,
  p_tempo_min: tempoSelecionado,
  p_equipamento: equipamentoSelecionado
});

```

Resposta: `data.exercises[]` (id, name, video_url, gif_url, target_muscles, difficulty_level), `data.sets_default` / `data.reps_default` / `data.rest_default_seconds` — o catálogo de exercícios é real, mas séries/reps do treino rápido são convenção fixa (3x10-12, 60s), porque a tabela `exercises` não guarda prescrição, só o exercício em si.

Ao iniciar:

```typescript
await supabase.from('workout_executions').insert({
  athlete_id: athleteId, workout_date: today, phase_name: 'quick', status: 'in_progress'
});

```

Ao concluir:

```typescript
await supabase.from('workout_executions')
  .update({ status: 'completed', completed_at: new Date() })
  .eq('athlete_id', athleteId)
  .eq('status', 'in_progress')
  .eq('phase_name', 'quick');

await supabase.rpc('fn_award_xp', {
  p_athlete_id: athleteId, p_amount: 50, p_source: 'quick_workout', p_metadata: {}
});

```

Isso já dispara sozinho o trigger de ativação (`trg_xp_awarded_activation`) e o cálculo real de sync score.

Fluxo da tela: mantém igual ao original (criativo → 3 perguntas → prescrição → execução guiada).

---

## BLOCO B — Navegação Hub

Sem mudança. Puro roteamento de frontend, não toca banco.

- STAFF → mantém fluxo atual
- PLANEJAMENTO → aponta para Perfil → Planejamento
- AJUSTE DE TREINO → aponta para Perfil → Ajuste de Treino
- PROGRESS → aponta para Perfil → Histórico (substitui tela antiga)

---

## BLOCO C — Treinos da Semana

```typescript
const { data } = await supabase.rpc('fn_get_week_workouts', { p_athlete_id: athleteId });

```

Resposta: `data.phase_status`, `data.periodization_model_id`, `data.match_percentage`, `data.week[]` (cada dia com `exercises[]` já com sets/reps/rest reais, vindos de `workout_exercises`).

**Nota:** `rpe_cap` e `phase_category` do plano original não existem no schema — não renderizar esses dois campos por enquanto. Se forem essenciais para o design, é uma coluna nova a criar em rodada própria, não algo para inventar no frontend.

Grid D1-D7 igual ao original. Ao concluir o treino do dia:

```typescript
await supabase.from('workout_executions').insert({
  athlete_id: athleteId,
  workout_date: today,
  phase_name: data.phase_status,
  status: 'completed',
  completed_at: new Date()
});

await supabase.rpc('fn_award_xp', {
  p_athlete_id: athleteId, p_amount: 100, p_source: 'workout_completed', p_metadata: {}
});

```

---

## BLOCO D — Ajuste de Treino

```typescript
const { data } = await supabase.rpc('fn_ajustar_treino_dia', {
  p_athlete_id: athleteId,
  p_data: new Date().toISOString().split('T')[0],
  p_changes: arrayDeAlteracoes
});

```

`arrayDeAlteracoes`: `[{ exercise_id, sets, reps_range, rest_seconds }]`

Retorna `{ success, daily_workout_id, exercises[] }`. Exibir treino atualizado imediatamente. Nunca tocar em `planos_de_treino_gerados` ou `weekly_structures`.

---

## BLOCO E — Sync Score + Radar 5D

```typescript
const { data: scores } = await supabase.rpc('fn_get_athlete_scores', { p_athlete_id: athleteId });

```

Resposta: `scores.sync_score`, `scores.total_xp`, `scores.level`, `scores.radar.{forca, resistencia, core, cardio, mobilidade, global}`.

**Contexto importante:** até esta rodada, `sync_score` estava travado (motor de cálculo existia mas nunca rodava — trigger bloqueado). Isso foi corrigido; o valor agora deve variar de verdade conforme o atleta treina. Se ainda aparecer estático depois de testar um treino completo, é sinal para investigar de novo, não para normalizar.

Anel circular e Radar 5D: lógica visual igual ao plano original (`conic-gradient` por `sync_score`, glow proporcional por eixo).  
SYNC SCORE ENGINE — MOTOR CENTRAL DO APP

O Sync Score não é um número estático. Ele é o gatilho de tudo.

Cada resposta do Daily Protocol recalcula o Sync Score em tempo real. O app inteiro reage a esse número — carga sugerida, volume do treino, intensidade, sugestões do FitCopilot, insights do RON. Se o Sync cai, o app alivia. Se sobe, o app exige mais.

**Gatilho de atualização — chamar imediatamente após cada resposta do Daily Protocol:**

typescript

```typescript
await supabase.rpc('fn_get_athlete_scores', { p_athlete_id: athleteId });
// Retorna sync_score atualizado → propagar para todo o estado global do app
```

**O que alimenta o Sync Score (inputs do dia):**


| Input                        | Quando capturado                  |
| ---------------------------- | --------------------------------- |
| Qualidade do sono (1–5)      | Pergunta 1 do Daily Protocol      |
| Nível de energia subjetivo   | Pergunta 2 do Daily Protocol      |
| Dor muscular / tensão        | Pergunta 3 do Daily Protocol      |
| Humor / disposição mental    | Pergunta 4 do Daily Protocol      |
| Treinos realizados na semana | Automático — `workout_executions` |
| Streak de consistência       | Automático — `streaks_aluno`      |
| XP acumulado                 | Automático — `fn_award_xp`        |


**O que o Sync Score controla (outputs reativos):**


| Módulo          | Reação                                                     |
| --------------- | ---------------------------------------------------------- |
| SmartTreino     | Peso sugerido sobe ou cai conforme o score                 |
| FitCopilot      | Sugestão muda de "adicione carga" para "reduza volume"     |
| SmartPeriodizer | Score baixo por 3+ dias → próximo meso com volume reduzido |
| Insights RON    | Bullets gerados com base no score do dia                   |
| Radar 5D        | Eixos atualizam visualmente em tempo real                  |


**Regra de propagação — obrigatória:**

Após qualquer resposta do Daily Protocol, o Sync Score recalculado deve ser gravado no estado global e propagado para todos os hooks que dependem dele antes de renderizar qualquer tela. Nenhum componente lê Sync Score diretamente do banco — todos consomem do estado global atualizado pelo hook central.

typescript

```typescript
// useAthleteScores.ts — hook central, único ponto de leitura
const { syncScore, radar, xp, level } = useAthleteScores();
// Todos os blocos (A, C, D, E) consomem daqui — nunca fazem RPC própria para scores
```

**Sync Score = 0 não é erro.** É um atleta que não respondeu o Daily Protocol hoje. O app exibe estado neutro e convida a responder — não trava, não bloqueia, não exibe zero na tela.

---

## BLOCO F — HealthFlix Streaming — INCLUÍDO NESTA RODADA

A API HealthFlix já está validada e conectada. A implementação retoma apenas a exibição do conteúdo de livre acesso já disponível pela própria API para o FitPro. Nenhuma migration necessária. O dev conecta a API existente e renderiza o streaming diretamente na tela.

- Conexão: API HealthFlix já validada
- Escopo: conteúdo de livre acesso disponível pela API
- Entrega: exibição em streaming funcionando na tela
- Migration: não necessária

---

## BLOCO G — Completar Perfil + Recompensas

```typescript
const { data: progresso } = await supabase.rpc('fn_check_onboarding_progress', { p_athlete_id: athleteId });

```

Retorna: `perfil_completo`, `tem_foto`, `primeiro_treino`, `tres_dias`, `sete_dias`, `tem_plano`, `prime_ativo`.

Fluxo de etapas igual ao original. Na etapa 5 (`sete_dias` vira true):

```typescript
await supabase.rpc('fn_activate_prime_reward', { p_athlete_id: athleteId });

```

Isso já grava `user_plans` (trial 30 dias) e `athletes.metadata.id_card_tier = 'gold'` num único lugar.

**Gap de dado real, não é bug de código:** a recompensa usa o email do atleta; se ele nunca cadastrou email, o sistema usa um email interno de fallback (`athlete-{id}@9fit.internal`). Isso funciona tecnicamente, mas indica que capturar email no onboarding deveria virar obrigatório — decisão sua, não do código.

O card compartilhável (`social_share_templates`, `content_type='streak_7'`) faz parte do Bloco H.

---

## BLOCO H — Compartilhamento Viral — INCLUÍDO NESTA RODADA

Dentro do FitPro: criar seção **9FIT Collections**.

**Funcionalidade:**

- Registra benchmarks do usuário: aumento de carga, meta batida, consistência, treino concluído
- Base de mockups fixos que se ajustam à foto de perfil e aos dados reais do usuário
- O aluno clica e compartilha screenshot/benchmark personalizado com marca d'água **"9FIT PRO"**

**Migration necessária:**

```sql
-- social_share_templates: mockups base por tipo de benchmark
-- share_events: registro de cada compartilhamento realizado

```

**Tipos de benchmark:**

- Aumento de carga (ex: "Supino +9kg este mês")
- Meta batida (ex: "Meta de gordura atingida")
- Consistência (ex: "7 dias consecutivos")
- Treino concluído (ex: "Push A • 78 min • concluído")

---

## Resumo do que sai desta rodada: ARQUITETURA FULL STACK CONSOLIDADA

### 1. CAMADA DE DOMÍNIO (SUPABASE)

**Fonte da verdade:**

- `athlete_activation`
- `workout_executions`
- `daily_workouts`
- `athletes`
- `workout_exercises`
- `user_plans`
- `social_share_templates` *(novo — Bloco H)*
- `share_events` *(novo — Bloco H)*

**RPCs oficiais:**

- `activation_advance`
- `activation_finish`
- `fn_treino_rapido`
- `fn_award_xp`
- `fn_get_week_workouts`
- `fn_ajustar_treino_dia`
- `fn_get_athlete_scores`
- `fn_check_onboarding_progress`
- `fn_activate_prime_reward`

**Triggers ativos:**

- `trg_xp_awarded_activation`
- Motor real de Sync Score
- Sistema automático de XP

---

### 2. CAMADA DE APLICAÇÃO (HOOKS)

**Hook canônico obrigatório:**

```
useAthleteId()
    ↓
auth.uid()
    ↓
athlete_auth_link
    ↓
fallbacks existentes
    ↓
athleteId resolvido

```

**Proibido:**

- Resolver por email
- Criar helper paralelo
- Usar `athletes.email` como chave

**Hooks arquitetados:**

`useActivationFlow.ts` → UI State Machine → `activation_advance()` → `activation_finish()`

`useActivationProgress.ts` → RPCs → `athlete_activation` → estado visual

---

### 3. CAMADA DE APRESENTAÇÃO

**Fluxo único** `/9fit/ativacao`**:**

```
not_started → assessment → generation → execute → consistency → finished

```

Cada tela: UI → Hook → RPC → Supabase. Sem acesso direto ao banco.

---

### 4. GUARD CENTRAL

**Responsabilidade única:** `finished_at`

**Nunca:** `fully_activated`

**Separação arquitetural:**

- `finished_at` = liberação do sistema (imediato)
- `fully_activated` = badge de consistência (7 dias)

**Guard direto:** sem `finished_at` → redirect para `/9fit/ativacao`

**Guard reverso:** com `finished_at` + pathname `/9fit/ativacao` → redirect para `/9fit/os`

---

### 5. ENTREGAS FUNCIONAIS 


| Bloco                | Status     | Arquitetura                                                               |
| -------------------- | ---------- | ------------------------------------------------------------------------- |
| A — Treino Rápido    | ✅ Incluído | `fn_treino_rapido()` → `workout_executions` → `fn_award_xp()` → trigger   |
| B — Hub              | ✅ Incluído | Frontend routing layer, sem banco                                         |
| C — Semana           | ✅ Incluído | `fn_get_week_workouts()` → D1-D7 → `workout_executions` → `fn_award_xp()` |
| D — Ajustes          | ✅ Incluído | `fn_ajustar_treino_dia()` → refresh imediato                              |
| E — Sync Score       | ✅ Incluído | `fn_get_athlete_scores()` → sync_score → radar 5D → UI                    |
| F — HealthFlix       | ✅ Incluído | API validada → retomar streaming → exibir conteúdo livre                  |
| G — Recompensas      | ✅ Incluído | `fn_check_onboarding_progress()` → 7 dias → `fn_activate_prime_reward()`  |
| H — Compartilhamento | ✅ Incluído | 9FIT Collections → benchmarks → mockups → marca d'água → share            |


---

### ORGANIZAÇÃO DE CAMADAS

```
src/
  pages/
  └── 9fit/
      ├── Ativacao.tsx
      └── Onboarding.tsx

  components/
  └── 9fit/
      ├── NineFitLayout.tsx
      ├── ActivationMissionCard.tsx
      └── activation/
          ├── StepAssessment.tsx
          ├── StepGeneration.tsx
          ├── StepExecute.tsx
          ├── StepConsistency.tsx
          └── StepFinished.tsx

  hooks/
  ├── useAthleteId.ts
  ├── useActivationFlow.ts
  └── useActivationProgress.ts

```

### RESPONSABILIDADES


| Camada      | Responsabilidade   |
| ----------- | ------------------ |
| UI          | Renderização       |
| Hooks       | State Machine      |
| RPCs        | Regras de negócio  |
| Triggers    | Automações         |
| Supabase    | Persistência       |
| Guards      | Controle de acesso |
| XP Engine   | Gamificação        |
| Sync Engine | Performance        |


---

## Design

Tokens dark/neon existentes (`--primary`, `--card`, `--foreground`) — sem alterar cores/tipografia globais. Layout dos 4 passos com fidelidade ao essence, usando shadcn + Tailwind do projeto.

---

## Validação

**Playwright:** login → visita `/9fit/hub` → confirma redirect para `/9fit/ativacao` → passa pelos 4 passos → confirma redirect final para `/9fit/os` com `finished_at` preenchido no banco (não checar `fully_activated`, que só fecha em 7 dias).

**PASSO 1 — Assessment**

- `advanceStep('assessment', {...})` → sem erro
- `athletes.primary_goal` / `experience_level` / `weekly_frequency` preenchidos

**PASSO 2 — Generation**

- `advanceStep('generation', {...})` → sem erro
- `daily_workouts` criado para o `athlete_id`

**PASSO 3 — Execute**

- `advanceStep('execute', {...})` → sem erro
- `workout_executions` status=`completed`
- `athletes.total_xp` subiu +100

**PASSO 4 — Consistency**

- `advanceStep('consistency')` → `athlete_activation.consistency_days` +1
- Chamar 2x no mesmo dia → não duplica (continua +1, não +2)

**PASSO 5 — Finished**

- `finishActivation()` → `athlete_activation.finished_at` preenchido
- `fully_activated` continua false (não é bug, só fecha em 7 dias)

**GUARD — fluxo direto**

- Usuário sem `finished_at` → qualquer rota redireciona para `/9fit/ativacao`

**GUARD — fluxo reverso**

- Usuário com `finished_at` → acessa `/9fit/os` normalmente
- Usuário com `finished_at` tenta acessar `/9fit/ativacao` diretamente → redirecionado para `/9fit/os`