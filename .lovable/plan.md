# Wave 19 — Consolidação Final FitPro 9.0

Plano consolida 4 frentes prioritárias para elevar o app ao nível 9.0. Reaproveita infra já criada (Waves 13-18: `subscription_plans`, `monetization_events`, `activation_events`, `adaptiveState.ts`, `useUserState`, `ContextualPaywall`, `RonBubble`).

---

## 1. MONETIZAÇÃO 9.0

### 1.1 Refinar `src/pages/9fit/Plans.tsx`

- 3 cards lado a lado: **STARTER (Grátis) | PRO | PRIME** (badge "Recomendado" no PRIME).
- Toggle Mensal/Anual com selo de economia (`Economize 25%`) em destaque.
- Reescrever copy de features para **linguagem de outcome** (ex: "Treinos que evoluem com você" em vez de "AI Coach v9").
- Seção **Prova Social** (3 depoimentos curtos + métricas: "+12mil atletas").
- **FAQ** com 5 perguntas (cancelamento, trial, suporte, troca de plano, pagamento).
- Visual: dark luxury + glassmorphism + neon accents (amber para PRIME, cyan para PRO).

### 1.2 Refinar `ContextualPaywall.tsx`

- Subheadline dinâmica baseada em `context`:
  - `post_assessment` → "Com base na sua avaliação de {data}, o PRIME foi feito para você."
  - `feature_locked` → "Esta feature faz parte do PRIME."
  - `hub_upsell` → "Acelere seus resultados em 7 dias."
- Mostrar apenas **PRO + PRIME** (PRIME destacado com glow).
- Microcopy de confiança: "7 dias grátis • Cancele em 1 clique • Sem fidelidade".

### 1.3 Novo: `src/components/9fit/UpsellBanner.tsx`

- Banner glassmorphism reutilizável (compacto, dismissable, 24h cooldown via localStorage).
- Props: `context`, `headline`, `cta`, `icon`.
- Integrar em: `Train.tsx` (topo), `Hub.tsx` (após Daily Protocol), `Stats.tsx` (após gráfico).

---

## 2. CORE LOOP + RON ADAPTATIVO

### 2.1 RON auto-abertura pós-protocolo

- No `DailyProtocol.tsx`, ao disparar `9fit:protocol_completed`, navegar para `/9fit/ron?auto=1&context=protocol_complete`.
- `Ron.tsx` lê query param e abre conversa automática com mensagem inicial do estado atual.

### 2.2 Refinar `RonBubble.tsx` por estado

- **Power**: bolha verde, waveform amplitude alta, mensagens 2-3 linhas, tom desafiador.
- **Low**: bolha âmbar, waveform suave, mensagens 1 linha, tom empático.
- **Balanced**: bolha neutra, equilíbrio.
- Mostrar badge de estado ao lado do nome RON.

### 2.3 Hub: card RON & PRESENÇA inteligente

- Em `Hub.tsx`, substituir card RON atual por componente que:
  - Mostra estado inferido + Sync Score
  - Mostra **insight do dia** (de `STATE_INSIGHT`)
  - CTA: "Conversar com RON" → abre RON com contexto pré-carregado

### 2.4 Daily Protocol adaptativo (já parcialmente feito)

- Validar: Low mostra versão leve; Power adiciona bloco extra; Balanced versão padrão.
- Adicionar **insight contextual** no topo da lista.

---

## 3. ATIVAÇÃO — Wizard de Onboarding

### 3.1 Refatorar `src/pages/9fit/Onboarding.tsx`

Wizard 6 passos com progress bar no topo:

1. **Objetivo principal** (emagrecer / hipertrofia / performance / saúde)
2. **Dados essenciais** (nome, idade, peso, altura, foto opcional)
3. **Frequência + experiência** (dias/semana, nível)
4. **Avaliação inicial** (rápida 5 perguntas OU "Pular para completa depois")
5. **Preview do plano** (chamar `ai-coach` mode `train`, mostrar resumo da semana 1)
6. **Primeira ação** (CTA: "Iniciar treino agora" → `/9fit/train`)

- Bloquear "Pular" nos passos 1-3 (campos obrigatórios validados com `react-hook-form`).
- Marcar `activation_events` ao final do passo 5 (`first_plan`) e passo 2 (`profile_complete`).

### 3.2 Barra de Ativação no Hub

- Refinar `ActivationMissionCard.tsx`:
  - Progress bar com 0/6 etapas + percentual
  - Lista das 6 missões com check ✓ / pendente
  - "Próxima missão" destacada com CTA direto
  - Auto-hide quando `percent === 100`

### 3.3 Gamificação inicial

- `useActivationProgress`: ao marcar evento, conceder XP bônus via `gamification_events` (50 XP por missão).
- Streak começa no dia 1 (já existe `StreakBadge.tsx`, validar integração).

---

## 4. SOVEREIGN COMMAND CORE (NEXO) — opcional escopo reduzido

> O prompt SCC pressupõe tabelas que **não verifiquei se já existem** no Supabase (`core_tasks`, `agent_executions`, `squad_handoffs`, etc.). Antes de implementar, preciso confirmar com o usuário (ver perguntas abaixo).

Se tabelas existirem:

- `src/services/scc/sccService.ts` (5 funções listadas)
- `src/hooks/useSovereignCore.ts`
- `src/components/NexoSoberano/CoreDashboard.tsx` (rota admin `/admin/nexo`)
- `TaskCard.tsx` reutilizável
- Toast pós-avaliação: "EPSILON está gerando seu plano…"

---

## Arquivos a criar/editar

**Novos:**

- `src/components/9fit/UpsellBanner.tsx`
- `src/components/9fit/HubRonCard.tsx` (substitui card RON atual)
- (Se SCC aprovado) `src/services/scc/sccService.ts`, `src/hooks/useSovereignCore.ts`, `src/components/NexoSoberano/CoreDashboard.tsx`, `TaskCard.tsx`

**Refatorados:**

- `src/pages/9fit/Plans.tsx` — 3 tiers + anual + social proof + FAQ
- `src/components/9fit/ContextualPaywall.tsx` — copy dinâmica
- `src/pages/9fit/Onboarding.tsx` — wizard 6 passos com validação
- `src/components/9fit/ActivationMissionCard.tsx` — progress bar 0/6
- `src/components/9fit/RonBubble.tsx` — variações visuais por estado
- `src/pages/9fit/Ron.tsx` — auto-abertura via query param
- `src/pages/9fit/Hub.tsx` — UpsellBanner + HubRonCard
- `src/pages/9fit/Train.tsx`, `src/pages/9fit/Stats.tsx` — UpsellBanner integrado
- `src/components/9fit/DailyProtocol.tsx` — insight contextual + navegação para RON

**Migrações:**

- Nenhuma nova migração obrigatória (infra já existe). Apenas seed/update de `subscription_plans` se precisar ajustar features text.

---

## Perguntas antes de implementar

1. **Sovereign Core (NEXO):** As tabelas `core_tasks`, `agent_executions`, `squad_handoffs`, `decisions` e as RPCs `scc_create_task` etc. **já existem** no Supabase? Devo implementar a frente 4 ou pular para focar em monetização + onboarding? s
2. **"Corrigir telas do print":** Você não anexou o print. Quer enviar a captura ou pular essa correção?
3. **Escopo desta rodada:** Implemento as 4 frentes de uma vez (grande), ou prefere começar por **Monetização (1) + Onboarding Wizard (3)** primeiro e RON adaptativo (2) em seguida?  
  
RESPOSTAS :   
**1. Sovereign Core (NEXO):**  
**Pular a frente 4 por enquanto.**  
Não implemente nada relacionado a Sovereign Core, NEXO, core_tasks, agent_executions etc. Foco total nas frentes 1 (Monetização), 2 (RON + Core Loop) e 3 (Ativação/Onboarding).
  **2. Corrigir telas do print:**  
  Sim, já enviei as duas telas.
  - **Tela 1 (Sync Score 0):** Tornar mais acolhedora, motivadora e menos fria. Melhorar o texto e adicionar CTA claro.
  - **Tela 2 (Hub):** Melhorar visual do card de Ativação 0/6 (progress bar + checklist), card do RON Insight e hierarquia geral.
  **3. Escopo desta rodada:**  
  **Comece com foco e ordem clara:**
  **Prioridade 1 (fazer primeiro):**
  - Monetização 9.0 completa (Tela de Planos + Paywall Contextual + UpsellBanner)
  **Prioridade 2:**
  - Melhorias no Hub (card RON & PRESENÇA, card Ativação 0/6, ajustes de UI/UX)
  **Prioridade 3:**
  - RON Adaptativo + ajustes na tela de calibração