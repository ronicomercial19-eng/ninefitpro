# Plano de Implementação — Próxima Rodada Completa

Consolida todas as pendências dos anexos (RON v9, NeuroCore Adaptive, Core Loop Intelligence, Plano de Ativação FitPro, Dossiê Monetização 9.0) + pendências passadas (RON proactive, first-access fix, empty states com peso, onboarding obrigatório).

## Wave 13 — Fix First-Access + Empty States com Peso

- **First-Access loop fix:** `useFirstAccess` + `NineFitLayout` já chamam `complete_first_access` RPC. Adicionar `refreshSession()` + invalidar cache local no `FirstAccess.tsx` após submit, forçar `navigate('/9fit/hub', { replace: true })` e setar `localStorage['9fit_first_access_completed']='true'` antes do redirect para impedir loop em race condition.
- **Onboarding obrigatório:** já guardado em `NineFitLayout` via `athletes.onboarding_completed_at`. Bloquear botão "Pular" no `Onboarding.tsx` (forçar conclusão de campos mínimos: objetivo, frequência semanal, experiência).
- **EmptyState copy com peso:** revisar `EmptyState.tsx` + todos os usos (Hub/Train/Aulas/Stats) substituindo placeholders genéricos por copy observacional + CTA single-action (ex.: "Seu radar ainda não tem leitura. Faça o primeiro Daily Protocol e o sistema começa a te ler.").

## Wave 14 — RON v9: Memória + Contexto + Adaptive State

### 14.1 Database (migration única)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.ron_long_term_memories (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN
    ('fact','preference','injury','goal','insight','adaptation','session_summary','limitation')),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  importance_score FLOAT DEFAULT 0.7,
  last_accessed TIMESTAMPTZ DEFAULT now(),
  source TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ron_mem_user_idx ON public.ron_long_term_memories(user_id, importance_score DESC);
CREATE INDEX ron_mem_embed_idx ON public.ron_long_term_memories
  USING hnsw (embedding vector_cosine_ops);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ron_long_term_memories TO authenticated;
GRANT ALL ON public.ron_long_term_memories TO service_role;
ALTER TABLE public.ron_long_term_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_memories" ON public.ron_long_term_memories
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Sync Score histórico para inferência de tendência
CREATE TABLE public.sync_score_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  score NUMERIC(4,2) NOT NULL,
  feedback_text TEXT,
  inferred_state TEXT CHECK (inferred_state IN ('power','low','balanced')),
  consistency_pct NUMERIC,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- GRANTs + RLS análogos (user_id = auth.uid())
```

### 14.2 Adaptive State Engine (frontend util)

`src/services/adaptiveState.ts` — função `inferUserState({ syncScore, trend, recentConsistency, feedbackText }) → 'power'|'low'|'balanced'` aplicando as regras do anexo NeuroCore v2 (Power >7.5 + consistência boa; Low <5.5 ou queda 3 dias; Balanced senão). Retorna também `reasoning` (string curta) para debug e display.

Hook `useUserState()` busca últimos 5 `sync_score_logs` + chama engine + cacheia 5min.

### 14.3 Context Builder + RON Edge Function refactor

Refatorar `supabase/functions/ai-coach/index.ts` (modo `chat`):

- Buscar contexto: profile, atleta, programa ativo, últimos treinos (`treinos_realizados`), última avaliação, últimos 5 sync_scores, top-8 memórias relevantes (busca híbrida: similaridade vetorial 70% + recência 20% + importância 10%).
- Embedding via Lovable AI Gateway (text-embedding-3-small por custo).
- Montar prompt com seções `<PERFIL>`, `<CONTEXTO_ATUAL>`, `<ESTADO_INFERIDO>`, `<MEMÓRIAS>`, `<INSTRUÇÕES_RON>` — instruções variam por estado (Power = direto/desafiador, Low = curto/empático, Balanced = equilibrado).
- Pós-resposta: chamar LLM em modo extração para identificar novas memórias (fact/preference/injury/goal) e inserir em `ron_long_term_memories` com embedding.

### 14.4 RON Proactive Trigger

`useProactiveRon` já existe; estender:

- Trigger automático ao concluir Daily Protocol (event `protocol_completed`).
- Buscar estado via `useUserState`, abrir `RonBubble` em modo expandido com mensagem inicial pré-gerada referenciando o estado e o último feedback.
- Persistir o feedback do RON em `ai_insights` para influenciar Hub do dia seguinte.

### 14.5 UI RON adaptive

`RonBubble.tsx` + `Ron.tsx`:

- Badge de estado (`Power`/`Low`/`Balanced`) com cor (verde/âmbar/neutro).
- Waveform reage à amplitude do estado (Power = mais ampla, Low = comprimida).
- Suggestion chips dinâmicas por estado.

## Wave 15 — Core Loop Fechado

- **Hub adaptativo:** `HeroSyncSection` + `HubFloatingMetrics` leem `useUserState`. Insight headline muda por estado (3 variantes por estado).
- **Daily Protocol adaptativo:** em Low Mode, exibir versão reduzida (subset de cards + chip "Versão leve recomendada hoje"); em Power Mode, exibir desafio extra opcional.
- **"Como você se sente?":** input quick-emoji (5 níveis) no Hub topo → grava em `sync_score_logs` com `source='hub_mood'` → re-infere estado imediatamente → atualiza RON insight inline.
- **Loop closing:** ao terminar Daily Protocol → grava sync_score_log com média dos checks → abre RonBubble com feedback contextual → salva insight em `ai_insights` → próximo render do Hub puxa esse insight como headline.

## Wave 16 — Ativação FitPro (Onboarding Wizard 9.0)

Refatorar `Onboarding.tsx` em wizard de 5-6 passos com `react-hook-form` + barra de progresso:

1. Boas-vindas + objetivo principal (Performance/Longevidade/Composição/Força)
2. Dados essenciais (idade, peso, altura, freq. semanal) com tooltip "porquê"
3. Avaliação rápida 3-5min OU "Pular com smart defaults" + flag p/ recovery mission
4. **Preview instantâneo do plano da semana 1** (gerado via ai-coach mode `train` usando dados do wizard)
5. Primeira ação concreta (CTA "Iniciar Treino de Ativação" ou agendar)
6. Tour rápido (TRAIN/HUB/Progress) + ativa streak/XP

### Activation Tracking

```sql
CREATE TABLE public.activation_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_key TEXT NOT NULL,  -- profile_complete | first_assessment | first_plan | first_workout | hub_engagement | streak_7d
  completed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
-- unique(user_id, event_key); GRANTs + RLS auth.uid()
```

`useActivationProgress()` hook → retorna `{ completed: N, total: 6, percent, nextMission }`. Card de progresso visível no Hub durante 14 dias após signup.

### Missões/Badges de Ativação

Componente `ActivationMissionCard` visível no Hub. Ao completar → toast XP + check verde.

## Wave 17 — Monetização 9.0

### 17.1 Tabela de planos

```sql
CREATE TABLE public.subscription_plans (
  id TEXT PRIMARY KEY,  -- starter | pro | prime
  name TEXT NOT NULL,
  tagline TEXT,
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  features JSONB DEFAULT '[]',
  is_recommended BOOLEAN DEFAULT false,
  display_order INT
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
-- seed 3 tiers: Starter, PRO, PRIME

CREATE TABLE public.monetization_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,  -- view_paywall | select_plan | start_trial | convert
  plan_id TEXT,
  context TEXT,  -- post_assessment | hub_upsell | dedicated_screen
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 17.2 Telas

- `src/pages/9fit/Plans.tsx` — dark luxury, 3 cards (mobile-first), destaque PRIME, toggle mensal/anual com badge "economize 2 meses", FAQ + prova social.
- `src/components/9fit/ContextualPaywall.tsx` — modal glassmorphism com headline dinâmica ("Com base na sua avaliação de X..."), 2 opções (PRO/PRIME), CTA 7 dias trial.
- **Triggers:**
  - Pós-avaliação 360 → abre `ContextualPaywall` (1x por 7 dias).
  - Tentativa de acessar feature premium → paywall contextual.
  - Hub: banner upsell discreto em `EcosystemStatusCards` para usuários free após D7.

### 17.3 Tracking

Helper `trackMonetizationEvent(type, plan, context)` chamado em todos os pontos.

## Wave 18 — Edge Functions & Validação

- `supabase/functions/ai-coach/index.ts` — refactor com Context Builder + memory extraction.
- `supabase/functions/embeddings/index.ts` (novo) — endpoint para gerar embeddings via Lovable AI.
- Validar com `supabase--linter` após cada migration.
- Tornar tudo idempotente (`ON CONFLICT DO NOTHING` em seeds).

## Ordem de Execução

1. Migration única (Wave 14.1 + 16 + 17.1) — tabelas + grants + RLS + pgvector
2. Edge function ai-coach refactor + nova embeddings
3. Wave 13 (fixes rápidos)
4. Wave 14.2–14.5 (Adaptive State + RON UI)
5. Wave 15 (Core Loop closing)
6. Wave 16 (Onboarding wizard + activation tracking)
7. Wave 17 (Plans + Paywall)
8. Validação final

## Detalhes Técnicos

- **Stack:** Vite + React 18 + TS + Tailwind + shadcn + Supabase + pgvector + Lovable AI (Gemini/text-embedding-3-small) + Framer Motion + three.js (já instalado).
- **Memória/perfil histórico:** `profile_history` já existe (Wave 12). RON usa para retomar contexto.
- **Identidade:** continua `athletes` como canônica; RON busca via `useAthleteId`.
- **Sem rótulos neuro:** estados são Power/Low/Balanced apenas.
- **Idempotência:** todas migrations com `IF NOT EXISTS` / `ON CONFLICT`.

Aprove para eu executar tudo em sequência.  
