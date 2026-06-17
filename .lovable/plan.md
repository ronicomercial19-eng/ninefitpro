## Status pré-requisito

Blocos 1–7, 9, 10 ✅ implementados (conforme `.lovable/plan.md`). Bloco 5 descartado por decisão anterior. Pronto para Bloco 8.

## 1. Bloco 8 — Motor Paramétrico de Decisão (PDI)

**Migração SQL:**

- `public.user_parameters` (1:1 com `athletes.user_id`): `recovery_rate enum('fast','medium','slow')`, `volume_tolerance int 1-10`, `peak_window enum`, `injury_zones text[]`, `consistency_30d numeric`, `stress_sensitivity int 1-10`, `goal enum('performance','aesthetics','longevity','recomposition')`, `time_horizon int`, `discomfort_tolerance enum`, `base_location_sp text`, `dietary_restrictions text[]`, `created_at/updated_at`.
- GRANTs (authenticated + service_role) + RLS `user_id = auth.uid()` + trigger `updated_at`.
- Função `public.fn_compute_user_thresholds(p_user_id)` retorna `jsonb { low, mid, high }` calculado a partir de **percentis 33/66** dos últimos 30 `sync_score_logs` do próprio usuário. Sem valores absolutos.
- Trigger `fn_refresh_consistency_30d()` após insert em `ninefit_checkins` recalcula `user_parameters.consistency_30d`.

**Edge Function:** novo módulo compartilhado `_shared/pdi.ts` com `loadUserParameters(userId)` + `classifyScore(userId, score)` retornando `'recovery'|'light'|'normal'|'intense'` baseado nos thresholds relativos do próprio usuário. Refatorar `ai-coach`, `training-ai-adjust`, `smart-notifications` para chamar `classifyScore()` antes de gerar protocolo — eliminar todo `if (score < 50)` fixo.

**Frontend:** tela `PDIWizard` (acessível em Onboarding e Perfil → "Calibrar IA") com 11 perguntas mapeando os campos. Hook `useUserParameters()` para leitura/escrita.

## 2. Correção crítica — Treino com IA

`src/pages/AITrainingPage.tsx` linha 34: substituir `supabase.functions.invoke('ai-coach', { body: { type:'generate_training', data }})` pela mesma chamada usada pelo SmartTreino para geração automática (reutilizar serviço existente — sem nova lógica). Logar erro real (`error.message`) em vez de `'Erro ao gerar treino'` genérico.

> ⚠️ Preciso confirmação: hoje `SmartTreinoPage.tsx` é apenas tela de conector API. **Qual é a "rota de criação automática do SmartTreino"** que deve ser reutilizada? Opções no código: (a) `supabase.functions.invoke('smartperiodizer-sync')`, (b) `training-ai-adjust`, (c) outra rota interna de geração. Sem essa confirmação posso assumir a edge function `smartperiodizer-sync` como padrão.

## 3. Hub → Grid Nativo → rotas

Verificação atual (`ModuleGrid.tsx`):

- STAFF → mantém ✓
- PLANEJAMENTO → `/9fit/planejamento` ✓ (mesma de Perfil)
- AJUSTE → `/9fit/ajuste-treino` ✓ (mesma de Perfil)
- PROGRESS → `/9fit/progresso` ✓ (Profile→Histórico aponta para o mesmo)

**Ação:** rota está OK, mas `Progresso.tsx` precisa **substituir** o conteúdo antigo pelo layout de "Histórico" (relatórios + evolução de treinos realizados, alimentado por `historico_treinos_realizados` + `treinos_realizados` + `workout_executions`). Remover a tela antiga de Progresso.

## 4. Treino Rápido → Oferta → Treino do dia

`QuickTrainModal`: após questionário (objetivo), antes de iniciar, exibir tela de **oferta de infoproduto alinhado ao objetivo** (consultando `monetization_offers` filtrado por `goal`). Botões: **"Quero conhecer"** (CTA Stripe) | **"Agora não"**. Ao fechar → libera execução normal do treino do dia. Oferta **nunca bloqueia** — é gate de conversão, não paywall.

## 5. Sync Score — luz neon + calibração

Componente `SyncScoreRing.tsx` (já existe): refatorar para `conic-gradient(from 0deg, var(--neon-orange) 0%, var(--surface-2) X%)` onde `X = sync_score`.

- Estado **calibrando** (sem `sync_score` ainda): anel pulsa neon laranja (animação `pulse-neon`) → texto "Calibrando…".
- Após `sync_score` inserido: preenche proporcionalmente, cor escala laranja→amarelo→verde conforme % (`< 33` laranja, `33-66` amarelo, `> 66` verde).
- Radar 5D (`WeeklyRadar.tsx`): cada eixo (treino, sono, HRV, nutrição, mood) ilumina com intensidade proporcional ao score diário daquele eixo via `filter: drop-shadow(0 0 Xpx var(--neon))`.

## 6. Completar Perfil — fluxo pós-onboarding

Hoje "Completar Perfil" não executa configuração. Criar wizard `CompleteProfileFlow.tsx` com 5 telas sequenciais:

1. **Dados completos + foto** (nome, idade, altura, peso, foto via `storage/avatars`).
2. **Plano gerado pelo sistema** (treino diário derivado do `goal` do onboarding — chama rota corrigida do Treino com IA).
3. **Incentivo ao primeiro treino** (CTA "Registrar agora" + share automático ao concluir).
4. **Oferta de consultoria** — exibida **apenas após 3 dias consecutivos** de acesso + treinos (checar `ninefit_checkins` + `workout_executions`).
5. **Recompensa 7 dias consistência** — PrimePass 1 mês grátis + upgrade ID Card para Gold (chama `fn_award_xp` + cria `user_achievements` + atualiza `athletes.id_card_tier`).

Hook `useCompleteProfileProgress()` controla qual tela exibir conforme estado real do usuário.

## Ordem de execução

1. Migração SQL (Bloco 8 — `user_parameters`, função thresholds, trigger consistency).
2. Edge functions refatoradas (PDI helper + classifyScore).
3. Correção Treino com IA (aguardando confirmação da rota).
4. Frontend: `PDIWizard`, `CompleteProfileFlow`, refator `SyncScoreRing`/`WeeklyRadar`, oferta no `QuickTrainModal`, substituição do conteúdo de `Progresso.tsx` pelo de Histórico.
5. Hub Grid — verificar rotas (já estão corretas, apenas confirmar).

**Não incluso nesta rodada:** documento `fitpro_viralizacao_prompt.html` (motor de viralização — mecanismos 1/2/3) — escopo separado, requer aprovação.

## Pergunta bloqueante

Qual edge function/rota o SmartTreino usa hoje para geração automática?  
**Com periodização:** SmartTreino gera treino baseado no plano do SmartPeriodizer → entrega via `fitpro-deliver-workout`

**Sem periodização:** SmartTreino gera treino ad-hoc direto pelo catálogo 9x9x9 → entrega via `fitpro-deliver-workout`   
  
[https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1/fitpro-deliver-workout](https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1/fitpro-deliver-workout)