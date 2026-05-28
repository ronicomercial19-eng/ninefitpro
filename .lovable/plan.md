# Plano consolidado — Ondas 8 a 12

Refino "Sistema Operacional Biológico" + débitos visuais + reorganização do banco. Tudo respeitando paleta atual (dark + accent laranja, zero neon cyber).

## Onda 8 — Hub Cinematográfico (Hero + Floating Metrics + Order)

**Hub.tsx (reordenação canônica):**
TopBar → Hero Sync → Floating Metrics → RON Insight → Daily Protocol → Recovery State → Active Vertical → Progressão Neural → Ecosystem Modules. Remove grids secos, aplica `space-y-10`, breathing entre seções, fade-in escalonado (stagger 80ms).

**HeroSyncSection.tsx (novo):**

- Imagem B&W full-bleed (`object-cover`, `grayscale`, `aspect-[3/4]` mobile / `aspect-[16/9]` desktop)
- Overlay duplo: `bg-gradient-to-t from-background via-background/80 to-transparent` + halo radial accent canto inferior (`--halo-primary`)
- `SyncScoreRing` 240px centralizado, número 88px display
- Headline contextual dinâmico baseado em score: `score>80 → "Seu organismo está operando acima da média."`, `60-80 → "Sistema em equilíbrio. Mantenha o ritmo."`, `<60 → "Sinais de sobrecarga detectados."`
- Subline data: "Atualizado há Xmin · HRV/Sono/Treino"

**HubFloatingMetrics.tsx (novo):**
4 mini-cards glass (`bg-glass backdrop-blur-xl border-white/5`):
Water · HRV · Calories · Heart. Cada um com micro-ring SVG 32px (stroke 2.5, accent), valor + unidade, label data uppercase. Animação: ring fill on mount (easeOut 1.2s), valor count-up. Layout: grid-cols-4 mobile, sticky abaixo do hero com `-mt-8 z-10`.

## Onda 9 — Radar 5D 3D Interativo

**WeeklyRadar3D.tsx (substitui WeeklyRadar.tsx):**
Stack: `@react-three/fiber@^8.18` + `@react-three/drei@^9.122.0` + `three@^0.160`.

- Pentágono 3D rotacionável (drag / auto-rotate lento)
- 5 eixos: Treino, Nutri, Sono, Mob, Hidr — vértices animados por valor
- Material: meshStandardMaterial accent com emissive halo, wireframe sobreposto
- Hover/tap em vértice → tooltip glass com valor atual vs semana anterior + delta %
- Comparação semana anterior: mesh fantasma opacity 0.15
- Fallback 2D (recharts atual) se WebGL indisponível
- `OrbitControls` limitado: enableZoom=false, autoRotate=true speed=0.4, pausa em interação

## Onda 10 — Daily Protocol Premium + RON Vivo

**DailyProtocol.tsx (refator):**
Cada protocolo vira card glass full-width, não checklist:

- Ícone lucide grande (40px) accent
- Título display + duração
- **Bloco "Por quê:"** muted-foreground italic, com explicação fisiológica gerada/estática por tipo (ex.: "Seu sistema mostrou sobrecarga simpática nas últimas 48h.")
- CTA "Iniciar" ghost accent + estado completo com checkmark sutil (sem confete)
- Espaçamento `p-6`, gap-4 entre cards, sem bordas duras

**RonBubble.tsx + Ron.tsx (refino):**

- Substitui blob por waveform animado (5 barras SVG, altura senoidal, GSAP-like com framer)
- Copy observacional: troca "Sinal instável" por "Aguardando mais sinais do seu corpo."
- Sugestion chips abaixo do input ("Como está meu recovery?", "Próximo treino", "Análise da semana")
- Bubbles: spacing `py-3 px-4`, max-w 75%, assistant com border-l-2 accent

## Onda 11 — Planner Semanal + Pendências Visuais

**ProtocolWeeklyPlanner.tsx (novo):**
Grid 7 colunas (Seg→Dom), drag-drop com `@dnd-kit/core` + `@dnd-kit/sortable`. Lê/escreve `student_library_assignments.weekly_schedule` (jsonb). Auto-distribui na 1ª abertura com base em `onboarding.weekly_frequency`. Debounce save 500ms via RPC.

**DailyProtocol leitura:** filtra módulos onde `weekly_schedule[hoje].includes(module_id)`.

**BottomNavigation:** HUB central já elevado — aumenta para `-mt-7`, halo `shadow-[0_0_24px_-4px_hsl(var(--primary)/0.4)]`, ícones stroke 1.8 (mais thin).

**Pesquisa final:** `rg "shadow-glow|animate-pulse|neon-|cyber"` → remove resíduos.

## Onda 12 — Supabase Modular + Identidade Cross-System

**Migração de reorganização (não-destrutiva, apenas views + FKs + indexes):**

1. **Identidade unificada:** view `v_unified_users` JOIN `profiles + athletes + user_profiles_extended` por `user_id`. Resolve SmartTreino não reconhecer alunos.
2. **Bridge SmartTreino:** garantir `estudantes.user_id` populado por trigger `sync_athlete_to_estudante` quando athlete cria. RLS: `student` policy via `has_role` + `user_id = auth.uid()`.
3. **Domínios time-series (novas tabelas):**
  - `bio_hrv_logs` (user_id, recorded_at, hrv_ms, source)
  - `bio_heart_rate_logs` (user_id, recorded_at, bpm, context)
  - `bio_sleep_logs` (user_id, sleep_date, duration_min, quality_score, deep_min, rem_min)
  - `bio_activity_logs` (user_id, recorded_at, steps, calories, distance_m)
  - `bio_recovery_state` (user_id, evaluated_at, recovery_score, nervous_system)
   Todas com `GRANT` + RLS (`auth.uid() = user_id`) + index `(user_id, recorded_at DESC)`.
4. **AI Context Engine:**
  - `ai_context_snapshots` (user_id, captured_at, context jsonb, sync_score)
  - `ai_insights` (user_id, generated_at, type, payload, consumed_at)
  - `proactive_events` (user_id, trigger_id, fired_at, dismissed_at)
   Alimenta RON proativo e histórico.
5. **Perfil histórico:** `profile_history` (user_id, snapshot_at, snapshot jsonb) — trigger em `profiles UPDATE` salva versão anterior. Resolve "salvar histórico no próprio perfil".
6. **Views agregadas:** `v_user_dashboard` (sync_score + última métrica de cada domínio bio) para 1 query do Hub.
7. **Indexes faltantes:** scan via `supabase--linter` pós-migração.

**Modularização (sem renomear tabelas existentes — apenas comentários SQL + views):**
COMMENT ON TABLE para tag de domínio (`identity`, `progression`, `protocols`, `bio`, `wearables`, `ai`, `social`, `monetization`).

## Detalhes técnicos

- Stack 3D: `bun add three@0.160 @react-three/fiber@^8.18 @react-three/drei@^9.122.0` (versões locked).
- Stack DnD: `bun add @dnd-kit/core @dnd-kit/sortable`.
- Tokens novos em `index.css`: `--halo-accent`, `--glass-strong`, `--ring-track`.
- Nenhuma tabela existente é dropada — apenas adições + views + triggers.
- Edge function `ai-coach` ajustada: ao receber `mode=chat`, persiste snapshot em `ai_context_snapshots` para histórico do RON.  
  
**Onda 13 — Core Loop + Experiência dos Primeiros 14 Dias** (NOVA)
  **Objetivo:** Definir e implementar o loop principal de retenção e criar uma experiência clara de valor nas primeiras duas semanas.
  **Entregáveis:**
  1. **Definição de Core Loop** Estabelecer o loop principal do app como: **Neural Prep → Execução do Protocolo → Reflexão + Feedback do RON → Atualização do Sync Score**. Criar recompensas claras a cada 3–4 dias (além de XP). Implementar gatilho de retorno no dia seguinte quando o usuário não completa o protocolo.
  2. **Onboarding de Ativação (Primeiros 7 dias)** Criar fluxo de onboarding curto (máximo 4 telas). Coletar objetivo principal do usuário e gerar automaticamente um protocolo inicial personalizado. Criar “Missão da Semana 1” com objetivos claros e mensuráveis.
  3. **Estado de Progresso Visível (Week 1 e Week 2)** Exibir um dashboard de “Progresso Inicial” durante os primeiros 14 dias. Mostrar evolução do Sync Score + 1 ou 2 métricas principais. RON deve entregar um resumo contextual no final da primeira e segunda semana.
  4. **Mecanismo de Recuperação de Streak** Criar lógica de recuperação de sequência (não apenas punição). Oferecer micro-recompensa ou ajuste leve quando o usuário retoma após 1 ou 2 dias sem completar o protocolo.
  **Resultado esperado:** O usuário consegue sentir valor real e progresso nas primeiras 2 semanas de uso.
  ---
  ### **Onda 14 — RON Intelligence Layer** (NOVA)
  **Objetivo:** Elevar o RON de uma interface bonita para um assistente que realmente entrega valor inteligente.
  **Entregáveis:**
  1. **RON Context Engine** Utilizar as tabelas criadas na Onda 12 (ai_context_snapshots, bio_hrv_logs, bio_sleep_logs, etc.) para gerar respostas mais contextualizadas. RON deve considerar os últimos 3–5 dias de treino, sono, recuperação e Sync Score ao responder.
  2. **Modos de RON** Criar 3 modos de operação:
    - **Observacional** (padrão)
    - **Coach** (mais direto e prescritivo)
    - **Análise Semanal** (resumo + recomendações)
  3. **RON Proativo (Básico)** Implementar no máximo 1 notificação por dia baseada em dados reais (ex: recovery baixo, queda de consistência, etc.). Usar a tabela proactive_events.
  4. **Memória de Curto Prazo** Fazer com que o RON consiga referenciar interações e dados dos últimos 3–4 dias dentro da mesma conversa.
  **Resultado esperado:** O RON deixa de ser apenas visual e passa a entregar recomendações úteis e contextualizadas.
  ---
  ### **Onda 15 — Oferta, Ativação e Monetização** (NOVA)
  **Objetivo:** Preparar o app para converter leads de forma mais clara e eficiente.
  **Entregáveis:**
  1. **Definição da Oferta Principal** Estabelecer internamente qual é a promessa central do app (ex: “Sistema de consistência neural + periodização adaptativa com feedback inteligente”). Definir 2 ou 3 planos simples de assinatura (mensal, trimestral e PrimePass).
  2. **Tela de Paywall / Upgrade** Criar tela clara que diferencia o que é gratuito e o que é liberado ao pagar. Comunicar o benefício principal de forma direta.
  3. **Fluxo de Trial / Primeiros 14 Dias** Estruturar um trial de 7 ou 14 dias com objetivos claros. No final do trial, mostrar um resumo do que o usuário conquistou + CTA forte para assinatura.
  4. **Métricas de Ativação** Definir os eventos chave de ativação (ex: completou X protocolos, interagiu com RON, manteve streak por Y dias). Criar visão simples (interno) para acompanhar taxa de ativação dos novos usuários.
  **Resultado esperado:** O app fica mais preparado para receber leads pagos com clareza de valor e um fluxo de ativação estruturado.

## Ordem de execução

1. Migração Onda 12 (views + tabelas bio + ai_context + profile_history)
2. Onda 8 (Hub Hero + Floating Metrics)
3. Onda 9 (Radar 3D — instala deps)
4. Onda 10 (Daily Protocol + RON waveform)
5. Onda 11 (Planner + BottomNav refino + sweep)
6. Validação: linter, sweep `rg`, navegação visual  
7. implmentar ondas extras ( 13-15 ) 

## DONE

- Hub reordenado com Hero B&W full-bleed + Sync Score gigante + headline contextual
- 4 Floating Metrics glass animadas
- Radar 5D em 3D interativo com fallback 2D
- Daily Protocol com "Por quê" fisiológico, sem checklist
- RON com waveform + chips + copy observacional
- ProtocolWeeklyPlanner drag-drop funcional, DailyProtocol filtra por dia
- BottomNav HUB elevado com halo
- Supabase: identidade unificada, SmartTreino reconhece alunos, time-series bio, AI context, profile history
- Zero classes neon/cyber/glow residuais