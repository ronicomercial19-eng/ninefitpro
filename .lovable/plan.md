## Plano Final Consolidado — Waves 3→7 (RON proativo + First-Access fix + Onboarding obrigatório + Infoproduto semanal + Refino visual premium)

Aplico tudo do `9fit_3.zip` (HubView, OSView, OnboardingFlow, ProtocolViewer/DailyProtocol, DigitalIDCard, BottomNav, PremiumView) e dos anexos visuais (C9, C11, C13, C14, helicóptero glass, VitalFit) como **referência de UX/UI**, expandindo o que já existe sem reescrever do zero. Hierarquia mantida: graphite `#0D0D0D`, accent `#FF5500`, neural `#3B82F6`, success `#22C55E`. Tipografia: Sora/Chakra (display) + Inter (body).

---

### Wave 3 — RON Proativo + AI Coach fix

`**src/pages/9fit/Ron.tsx` + `src/pages/FitCopilotPage.tsx`:**

- Parser ajustado: `result.data?.data?.content ?? result.data?.content ?? result.content`.
- Sempre enviar JWT no header: `Authorization: Bearer ${session.access_token}`.

**Novo hook `src/hooks/useProactiveRon.ts`:**

- Lê `sync_score`, `last_workout_at`, `streak_dias`, hora local.
- Dispara mensagens contextuais com bubble pulsante 1s antes do texto:
  - 07h + Sync<60 → "Seu sistema acordou abaixo da média. Vamos calibrar?"
  - 17h + treino pendente → "Ainda dá tempo. 35 min é tudo que você precisa hoje."
  - 21h sem mobility → "Recuperação é parte do protocolo."
  - 23h + streak em risco → "Faltam 47 min para preservar sua sequência."

**Novo componente `src/components/9fit/RonBubble.tsx`:**

- Bubble flutuante canto inferior direito, acima do BottomNav.
- Avatar circular RON + texto + CTA "Conversar" → abre `/9fit/ron`.
- Dismissable, reaparece no próximo trigger.
- Montado em `NineFitLayout`.

**Edge function `smart-notifications`:** adicionar mesmos 4 triggers para envio push/WhatsApp em background (cron já existe).

---

### Wave 4 — Login First-Access Fix (P0)

**Migration:** RPC `complete_first_access()` SECURITY DEFINER que marca `profiles.first_access_completed = true` e bypassa RLS.

`**src/hooks/useFirstAccess.ts`:** após `supabase.auth.updateUser({ password })`, chamar:

```ts
await supabase.auth.refreshSession();
await supabase.rpc('complete_first_access');
```

`**src/contexts/AuthContext.tsx`:** ordem de redirecionamento:

1. Não autenticado → `/9fit/login`
2. `first_access_completed=false` → `/9fit/first-access`
3. `onboarding_completed_at IS NULL` (athletes) → `/9fit/onboarding`
4. Senão → `/9fit/hub`

Resolve o loop dos 2 coaches externos travados.

---

### Wave 5 — Onboarding Obrigatório "Vazio com Peso"

`**src/pages/9fit/Onboarding.tsx**` reescrito seguindo `OnboardingFlow.tsx` do zip:

- 1 pergunta por tela, RON como entrevistador (avatar + bubble esquerda).
- Barra de progresso fina topo (1px, accent).
- Sem botão "pular", botão "Continuar" só ativo quando resposta válida.
- Sequência (≤60s):
  1. Nome
  2. Objetivo (4 chips: Hipertrofia / Emagrecimento / Performance / Saúde)
  3. Frequência semanal (slider 2–7)
  4. Restrição alimentar (chips multi)
  5. Wearable (opcional, skip explícito)
  6. Tela final: "Seu sistema está online."
- Persiste em `athletes` (já existe) + `master_registry` event `onboarding_completed` + `athletes.onboarding_completed_at = now()`.

`**src/components/auth/PrivateRoute.tsx`:** bloqueia qualquer `/9fit/*` exceto `/9fit/onboarding` enquanto `onboarding_completed_at IS NULL`.

`**src/components/9fit/EmptyState.tsx**` refatorado — copy "Vazio com peso" aplicado globalmente:

- `<EmptyState variant="no-coach" />` → "O sistema ainda não te conhece"
- `variant="no-protocol"` → "Nenhum protocolo atribuído. Explore a biblioteca."
- `variant="ron-only"` → "RON disponível. Humanos: a caminho."
- `variant="no-data"` → "Sem dados ainda. RON está observando."
- Layout: ícone outlined grande centralizado, copy display 2xl, CTA único accent.

Substituir todos placeholders cinza atuais (Hub, OS, Train, Social, Stats, Aulas) por `<EmptyState>` apropriado.

---

### Wave 6 — Infoproduto com Planner Semanal

**Migration:**

```sql
ALTER TABLE student_library_assignments
  ADD COLUMN IF NOT EXISTS weekly_schedule jsonb DEFAULT '{}'::jsonb;
```

Estrutura: `{ "mon": ["module_id_1"], "tue": [...], ... "sun": [...] }`.

**Novo `src/components/9fit/ProtocolWeeklyPlanner.tsx`:**

- Grid 7 colunas (Seg–Dom) com header de dia.
- Lista de módulos do `payload.modules` à esquerda como chips arrastáveis.
- Drag-and-drop com `@dnd-kit/core` (já no projeto) — arrasta módulo → dia.
- Botão "Organizar automaticamente" → distribui módulos respeitando `frequência semanal` do onboarding.
- Salva em `weekly_schedule` com debounce 500ms via `supabase.update`.
- Indicador de módulos concluídos (checkbox no chip).

`**src/components/9fit/ProtocolViewer.tsx`:** adicionar seção `<ProtocolWeeklyPlanner>` abaixo de "Estrutura" para tipo `infoproduto`.

`**src/components/9fit/DailyProtocol.tsx`:** lê `weekly_schedule` do dia atual (todos os infoprodutos ativos) e exibe módulos como itens do protocolo diário com "Por quê:" contextual extraído de `payload.modules[].why` ou auto-gerado por RON.

**Hub:** card "Seu Protocolo" sempre visível quando ≥1 ativo, com mini-preview do planner do dia.

Marcar módulo concluído → atualiza `payload.completed_modules[]` e recalcula `progress_pct = completed/total * 100`.

---

### Wave 7 — Refino Visual Premium (anexos C9/C11/C13/C14/helicóptero/VitalFit)

Mantém paleta, adiciona profundidade premium **sem reintroduzir cyber/neon**.

**Tokens em `src/index.css`:**

```css
--glass: 0 0% 100% / 0.04;
--glass-border: 0 0% 100% / 0.08;
--halo-primary: radial-gradient(circle, hsl(18 87% 52% / 0.22) 0%, transparent 70%);
--halo-neural: radial-gradient(circle, hsl(213 90% 65% / 0.18) 0%, transparent 70%);
--shadow-elevated: 0 24px 48px -16px hsl(0 0% 0% / 0.6);
--shadow-card: 0 8px 24px -8px hsl(0 0% 0% / 0.4);
```

Utilitário `.glass-surface`: `bg-[hsl(var(--glass))] backdrop-blur-xl border border-[hsl(var(--glass-border))] rounded-2xl`.

**Componentes refinados (estrutura mantida, visual elevado):**

1. `**NineFitTopBar**` — avatar circular esquerda + saudação editorial "Hi, {nome}" + data discreta + ícone calendário (ref C13/VitalFit).
2. `**PersonalIDCard**` — hero full-bleed com imagem fitness B&W de fundo + overlay gradient pesado + número grande do Sync Score "90%" estilo display 6xl com accent orange (ref VitalFit).
3. `**SyncScoreRing**` — gauge semi-circular accent orange (ref C14 yellow), número 75 ao centro display 4xl, label "Activity Score" abaixo, 2 estrelas pequenas.
4. `**DailyProtocol**` — cards `.glass-surface`, ícone lucide à esquerda em pill accent, título semibold, "Por quê:" em muted itálico abaixo, checkbox quadrado preenchido accent.
5. **NOVO `src/components/9fit/HubFloatingMetrics.tsx**` — 4 mini-cards glass (Water/Heart/Calories/HRV) em grid 2×2 com mini progress ring orange à esquerda do número (ref C13 metric pills + helicóptero glass). Renderizado entre SyncScoreRing e Streak.
6. `**src/pages/9fit/Ron.tsx**` — full-bleed dark, waveform animado quando ouvindo (canvas 60fps, barras orange), 3 chips de sugestão ("Treino de hoje", "Como melhorar Sync?", "Plano semanal"), bubble grande do RON estilo conversational (ref C9).
7. `**ProtocolViewer` hero** — `aspect-[3/4]` em mobile, `aspect-[16/9]` em desktop, gradient pesado embaixo, título display 4xl, badge categoria + dificuldade pequena em accent (ref C11 "Strength Workouts").
8. `**BottomNavigation**` — 5 tabs: `OS · Train · HUB (central elevado pill orange) · Social · Perfil`. Ícones lucide thin, label `text-[9px] tracking-[0.18em] uppercase`. Hub central: pill 56px com elevação `-translate-y-2` e shadow accent suave.
9. `**EmptyState**` — full-bleed centralizado, ícone outlined 64px muted, copy display 2xl, sub-copy muted, CTA único pill accent.
10. **Cards de módulos** (Train, Aulas, Healthflix) — thumbnail full-width arredondado, badge categoria accent pill canto sup-esq (ref C11), título sobreposto bottom + meta "20min · Upper Body".  
11. 9FIT ELITE — MASTER IMPLEMENTATION DOSSIER
  ## Full Architecture + UX System + Elite Protocol Engine + Premium UI Refinement
  Aplicar tudo do ecossistema atual sem reescrever do zero.  
  Expandir estrutura existente usando os anexos visuais como referência:
  - VitalFit
  - C9
  - C11
  - C13
  - C14
  - Helicopter Glass UI
  - MuseFit
  - HubView
  - OSView
  - PremiumView
  - OnboardingFlow
  - ProtocolViewer
  - DailyProtocol
  - DigitalIDCard
  - BottomNav
  O objetivo NÃO é criar mais um app fitness.  
  O objetivo é transformar o 9FIT em um Sistema Operacional Biológico.
  ---
  # DIRETRIZ CENTRAL DE UX
  ---
  O usuário NÃO deve sentir que está navegando em:
  - listas
  - menus comuns
  - catálogo de funcionalidades
  - dashboard tradicional
  O sistema deve parecer:
  - vivo
  - responsivo
  - inteligente
  - editorial
  - cinematográfico
  - personalizado
  - premium
  Cada tela deve transmitir:
  "o sistema está observando meu estado atual"
  Não usar:
  - grids secos
  - caixas isoladas
  - cards genéricos
  - neon cyber exagerado
  - excesso de glow
  - cara de template SaaS
  A interface precisa parecer:
  - Apple Health + WHOOP + Oura + Netflix Editorial + Jarvis
  ---
  # DESIGN SYSTEM GLOBAL
  ---
  ## Paleta
  Background:
  - #0D0D0D
  - #111111
  - #171717
  Accent:
  - #FF5500
  Neural:
  - #3B82F6
  Success:
  - #22C55E
  Muted:
  - rgba(255,255,255,0.55)
  Glass:
  - rgba(255,255,255,0.04)
  Glass Border:
  - rgba(255,255,255,0.08)
  ---
  ## Tipografia
  Display:
  - Sora
  - Chakra Petch
  Body:
  - Inter
  Hierarquia:
  Hero:
  - 52-72px
  - weight 700
  - tracking negativo
  Cards:
  - 18-24px
  Meta:
  - 12-14px uppercase tracking wide
  ---
  ## Tokens
  Adicionar em src/index.css:
  :root {  
  --glass: 0 0% 100% / 0.04;  
  --glass-border: 0 0% 100% / 0.08;
  --halo-primary:  
  radial-gradient(circle,  
  hsl(18 87% 52% / 0.22) 0%,  
  transparent 70%);
  --halo-neural:  
  radial-gradient(circle,  
  hsl(213 90% 65% / 0.18) 0%,  
  transparent 70%);
  --shadow-elevated:  
  0 24px 48px -16px hsl(0 0% 0% / 0.6);
  --shadow-card:  
  0 8px 24px -8px hsl(0 0% 0% / 0.4);  
  }
  ---
  ## Utility
  .glass-surface {  
  background: hsl(var(--glass));  
  backdrop-filter: blur(24px);  
  border: 1px solid hsl(var(--glass-border));  
  border-radius: 24px;  
  }
  ---
  # CORE UX PRINCIPLES
  ---
  ## 1. Vazio com Peso
  Nunca mostrar:
  - “Nenhum dado”
  - “Empty”
  - “Nothing here”
  Substituir por:
  - “O sistema ainda não te conhece.”
  - “RON está observando seus padrões.”
  - “Nenhum protocolo atribuído ainda.”
  - “Seu núcleo neural ainda está calibrando.”
  ---
  ## 2. Sensação de Sistema Vivo
  Toda tela precisa reagir:
  - ao horário
  - ao estado do usuário
  - ao Sync Score
  - ao streak
  - ao treino pendente
  - ao sono
  - ao protocolo ativo
  Exemplo:
  07h + sync baixo:  
  “Seu sistema acordou abaixo da média.”
  23h + streak em risco:  
  “Faltam 47 minutos para preservar sua sequência.”
  ---
  ## 3. Sem Menus Mortos
  Não usar:
  - lista vertical simples
  - cards secos
  - caixas sem contexto
  Tudo precisa parecer:
  - contextual
  - editorial
  - cinematográfico
  ---
  # ESTRUTURA DO ECOSSISTEMA
  ---
  ## HUB CENTRAL
  O Hub NÃO é dashboard.
  O Hub é:
  “Estado atual do organismo.”
  ---
  ## Ordem visual do Hub
  1. TopBar Editorial
  2. Hero Sync Score
  3. Floating Metrics
  4. RON Insight
  5. Daily Protocol
  6. Active Vertical
  7. Progressão Neural
  8. Recovery State
  9. Streak
  10. Ecosystem Modules
  ---
  # TOPBAR
  ---
  src/components/9fit/NineFitTopBar.tsx
  Estrutura:
  - avatar circular esquerda
  - “Hi, {nome}”
  - data discreta
  - ícone calendário
  Referência:
  - C13
  - VitalFit
  ---
  # HERO — PERSONAL ID CARD
  ---
  src/components/9fit/PersonalIDCard.tsx
  Tela full bleed.
  Background:
  - imagem fitness B&W
  - overlay gradient pesado
  Centro:
  Sync Score gigante:
  - 90%
  - display 6xl
  - accent orange
  Sub:
  - “Seu organismo está operando acima da média.”
  Ações:
  - Ver protocolo
  - Abrir RON
  ---
  # HUB FLOATING METRICS
  ---
  src/components/9fit/HubFloatingMetrics.tsx
  Grid 2x2.
  Cards glass:
  - Water
  - Calories
  - Heart
  - HRV
  Cada card:
  - mini progress ring
  - número grande
  - label pequena
  Referência:
  - C13
  - Helicopter Glass
  ---
  # SYNC SCORE RING
  ---
  src/components/9fit/SyncScoreRing.tsx
  Gauge semicircular.
  Accent orange.
  Centro:
  - score
  - label Activity Score
  - estrelas pequenas
  Estados:
  90+:
  - “Elite State”
  75-89:
  - “Operação Estável”
  60-74:
  - “Sistema sobrecarregado”
  <60:
  - “Recuperação necessária”
  ---
  # RON — AI CORE
  ---
  RON não é chatbot.
  RON é:
  - coach
  - observador
  - sistema operacional neural
  - copiloto biológico
  ---
  ## Página
  src/pages/9fit/Ron.tsx
  Estrutura:
  - full bleed dark
  - waveform animado
  - conversational bubbles
  - chips rápidos
  Chips:
  - Treino de hoje
  - Melhorar Sync
  - Plano semanal
  - Ajustar recuperação
  ---
  ## Hook Proativo
  src/hooks/useProactiveRon.ts
  Lê:
  - sync_score
  - streak_dias
  - hora local
  - last_workout_at
  Triggers:
  07h + sync<60  
  “Seu sistema acordou abaixo da média.”
  17h + treino pendente  
  “Ainda dá tempo. 35 minutos mudam seu estado.”
  21h sem mobility  
  “Recuperação é parte do protocolo.”
  23h streak em risco  
  “Seu streak está em risco.”
  ---
  ## RON Bubble
  src/components/9fit/RonBubble.tsx
  - floating
  - canto inferior direito
  - acima do BottomNav
  - dismissable
  Ação:
  - abrir /9fit/ron
  ---
  # ONBOARDING
  ---
  O onboarding precisa parecer:
  “RON entrevistando o usuário.”
  ---
  ## Estrutura
  1 pergunta por tela.
  Sem forms grandes.
  Sem múltiplos inputs.
  ---
  ## Sequência
  1. Nome
  2. Objetivo
  3. Frequência semanal
  4. Restrição alimentar
  5. Wearable
  6. Tela final
  ---
  ## Tela Final
  “Seu sistema está online.”
  ---
  # 9FIT ELITE — ESTRUTURA
  ---
  O Elite não vende tecnologia futurista.
  Vende:
  - protocolos aplicáveis
  - biohacking natural
  - regulação fisiológica
  - performance real
  ---
  # VERTICALS
  ---
  # 1. 9FIT BIO
  ## Produto
  Protocolos Bioadaptativos.
  ---
  ## O que entrega
  Interpretação de exames.
  Ajuste:
  - treino
  - recuperação
  - intensidade
  - cardio
  - sono
  ---
  ## Resultado percebido
  “O treino começa a fazer sentido para o meu organismo.”
  ---
  ## Estrutura de UX
  Tela inicial:
  - fundo escuro editorial
  - exames flutuando em glass
  - headline:
  “Seu corpo não responde igual ao dos outros.”
  CTA:
  - Enviar exames
  ---
  ## Motor lógico
  Exemplos:
  Pressão alta:
  - mais cardio zona 2
  - menos estímulo simpático
  Testosterona baixa:
  - treino curto e intenso
  - gordura boa
  - menos volume
  Diabetes:
  - musculação
  - caminhadas pós-prandiais
  ---
  # 2. 9FIT KITCHEN
  ---
  ## Produto
  Protocolos Nutricionais Neurofisiológicos.
  ---
  ## O que entrega
  Não é contador de calorias.
  Não é diário alimentar.
  Não exige preencher refeições.
  Entrega:
  - protocolos alimentares
  - guias metabólicos
  - stacks naturais
  - alimentação orientada por objetivo
  ---
  ## Protocolos
  - Desinflamar
  - Melhorar sono
  - Aumentar testosterona
  - Melhorar foco
  - Reduzir compulsão
  - Recuperar SNC
  ---
  ## Insights
  - azeite → aumento agudo hormonal
  - temperos → biohack neural
  - proteína + gordura → estabilidade
  - refeições noturnas → recuperação
  ---
  ## Resultado percebido
  “Estou usando comida como ferramenta de performance.”
  ---
  # 3. 9FIT RECOVERY
  ---
  ## Produto
  Protocolos de Reset Neural.
  ---
  ## O que entrega
  Regulação:
  - dopamina
  - hiperatividade
  - raiva
  - ansiedade
  - sistema nervoso
  ---
  ## Protocolos
  ### Estado acelerado
  - corrida BPM guiada
  - música específica
  - respiração
  - zona 2
  ---
  ### Raiva/agressividade
  - tiros aláticos
  - sprint 20-25km/h
  - boxe agressivo
  - descarga simpática
  ---
  ### Reset profundo
  - praia
  - água gelada salgada
  - água doce gelada
  - grounding
  - outdoor
  ---
  ## Resultado percebido
  “Meu cérebro desacelerou.”
  ---
  # DAILY PROTOCOL
  ---
  src/components/9fit/DailyProtocol.tsx
  Não usar checklist seca.
  Cada item precisa explicar:
  “Por quê isso existe.”
  ---
  ## Estrutura do card
  - ícone accent
  - título
  - duração
  - “Por quê:” em itálico
  - checkbox premium
  ---
  # PROTOCOL VIEWER
  ---
  src/components/9fit/ProtocolViewer.tsx
  Hero:
  - editorial
  - imagem full bleed
  - overlay pesado
  - categoria
  - dificuldade
  - CTA iniciar
  ---
  # PLANNER SEMANAL
  ---
  src/components/9fit/ProtocolWeeklyPlanner.tsx
  Grid 7 colunas.
  Drag-and-drop.
  Módulos arrastáveis.
  Botão:  
  “Organizar automaticamente.”
  ---
  # SOCIAL
  ---
  O Social NÃO deve parecer feed comum.
  Deve parecer:
  - elite club
  - performance journal
  - conquistas neurais
  ---
  ## Mostrar
  - streaks
  - recovery
  - PRs
  - protocolos concluídos
  - evolução
  ---
  # BOTTOM NAVIGATION
  ---
  5 tabs:
  - OS
  - Train
  - HUB
  - Social
  - Perfil
  Hub:
  - central elevado
  - pill orange
  - glow suave
  ---
  # EMPTY STATES
  ---
  src/components/9fit/EmptyState.tsx
  Variantes:
  no-coach:  
  “O sistema ainda não te conhece.”
  no-protocol:  
  “Nenhum protocolo atribuído.”
  ron-only:  
  “RON disponível. Humanos: a caminho.”
  no-data:  
  “RON está observando.”
  ---
  # BANCO DE DADOS
  ---
  ## Tabelas principais
  users  
  profiles  
  athletes  
  workouts  
  protocols  
  protocol_modules  
  student_library_assignments  
  progress_logs  
  achievements  
  subscriptions  
  recovery_sessions  
  bio_markers  
  wearable_data
  ---
  # MIGRATIONS
  ---
  ALTER TABLE student_library_assignments  
  ADD COLUMN IF NOT EXISTS weekly_schedule jsonb DEFAULT '{}'::jsonb;
  ---
  ## RPC
  complete_first_access()
  SECURITY DEFINER.
  Marca:
  profiles.first_access_completed = true
  ---
  # AUTH FLOW
  ---
  Ordem:
  Não autenticado:  
  → /9fit/login
  first_access_completed=false:  
  → /9fit/first-access
  onboarding_completed_at IS NULL:  
  → /9fit/onboarding
  Else:  
  → /9fit/hub
  ---
  # MICROSTATES
  ---
  Toda tela precisa:
  - loading
  - partial loading
  - skeleton
  - empty
  - processing
  - success
  - recovery
  - retry
  ---
  # MOTION
  ---
  Animações:
  - suaves
  - editoriais
  - cinematic easing
  - blur transitions
  - opacity transitions
  Não usar:
  - pulse neon exagerado
  - glow cyberpunk
  - motion agressiva
  ---
  # FINAL EXPERIENCE
  ---
  O usuário deve sentir:
  “isso não é um aplicativo.”
  “é um sistema acompanhando meu organismo.”
  ---
  # RESULTADO FINAL
  ---
  O FitPro/9FIT deve parecer:
  - inteligente
  - vivo
  - premium
  - editorial
  - humano
  - fisiológico
  - exclusivo
  E NÃO:
  - SaaS fitness comum
  - catálogo de treino
  - dashboard genérico
  - app de academia
  ---
  # STATUS FINAL ESPERADO
  ---
  DONE:
  ✓ Onboarding obrigatório em ≤60s  
  ✓ RON proativo funcional  
  ✓ Hub contextual e vivo  
  ✓ Planner semanal drag-and-drop  
  ✓ Protocolos Elite estruturados  
  ✓ Daily Protocol contextual  
  ✓ Empty states editoriais  
  ✓ BottomNav premium  
  ✓ Glass surfaces refinadas  
  ✓ Zero neon residual  
  ✓ UX cinematográfica  
  ✓ Sistema operacional biológico completo

**Sweep final de cyber/neon residual:**

```bash
rg -l "shadow-\[0_0_|glow-|animate-pulse.*neon|text-cyan|text-fuchsia|drop-shadow-\[0_0|border-primary/40 shadow"
```

Neutralizar em: `ModuleGrid`, `HubSequentialCarousel`, `EcosystemStatusCards`, `WorkoutHome`, `MissionCard`, `RecoveryMission`, `LiveClassCard`, `TribeCard`.

---

### Ordem de Execução (10 passos)

```text
1. Migration: weekly_schedule + RPC complete_first_access
2. Wave 4: useFirstAccess + AuthContext routing (desbloqueia coaches)
3. Wave 5: Onboarding obrigatório + EmptyState refatorado + PrivateRoute guard
4. Wave 3: Parser RON fix + useProactiveRon + RonBubble + smart-notifications triggers
5. Wave 6 (DB): leitura weekly_schedule no DailyProtocol
6. Wave 6 (UI): ProtocolWeeklyPlanner + integração ProtocolViewer + Hub card
7. Wave 7 (tokens): index.css glass/halo/shadow tokens
8. Wave 7 (componentes): TopBar, IDCard, SyncRing, DailyProtocol, HubFloatingMetrics,
   Ron page, ProtocolViewer hero, BottomNav, cards de módulo
9. Wave 7 (sweep): remover cyber/neon residual
10. Validação: console logs limpos, fluxo first-access → onboarding → hub → infoproduto 11. reforço textual para tudo que deve ser entregue complementamente funcional. 
```

1

### DONE

- Coaches externos logam sem loop · Onboarding força ≤60s · Hub mostra módulos do infoproduto do dia · Planner semanal funcional com drag-and-drop · RON proativo dispara 4 triggers · Zero classes neon/cyber residuais · Todas zero-states com copy "Vazio com peso" · BottomNav 5 tabs com HUB central elevado · Glass surfaces + halo accent aplicados ao Hub · ProtocolViewer com hero editorial full-bleed.

**Aprovar para executar todas as ondas em sequência.**