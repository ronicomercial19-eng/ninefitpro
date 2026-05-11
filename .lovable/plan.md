# Fit OS — Single-App Shell (Vanguarda)

## Objetivo

Eliminar redirecionamentos externos (EcosystemFrame iframes) e transformar o app em **shell único** com views nativas, estética Dark/Laranja #FF6600, Glassmorphism e tipografia editorial. HUB preditivo reage ao Master Registry.

## Escopo desta entrega (Fase HUB)

### 1. Design tokens (src/index.css + tailwind.config.ts)

- Confirmar `--background: 0 0% 0%` (preto absoluto) e `--neon-orange: 22 100% 50%` (#FF6600) como primary.
- Adicionar utilities: `.glass-mission` (backdrop-blur-xl + border laranja translúcida + shadow interna), `.text-editorial` (font-display, tracking tight, peso 900 itálico para títulos massive).
- Tokens de gradiente: `--gradient-mission` (radial laranja → preto).

### 2. Bottom Navigation — 5 abas

Atualizar `src/components/9fit/BottomNavigation.tsx`:

```
[OS] [Train] [HUB] [Staff] [Store]
```

- OS = `/9fit/os` (dashboard pessoal + tarefas diárias)
- Train = `/9fit/train`
- HUB = `/9fit/hub` (preditivo — tela central)
- Staff = `/9fit/staff`
- Store = `/9fit/store` (nova rota nativa, substitui iframe 9Store)

### 3. HUB Preditivo (`src/pages/9fit/Hub.tsx` — rewrite)

Layout vertical, mobile-first: como o app ele tem esstado dinamico , irei colar mais uma versao do wireframes que podemos implementar para alternar modos

```text
┌─────────────────────────────┐
│  PERSONAL ID CARD           │  glass-mission, flip 3D
│  nome • nível • classe      │  Sync Score animado
│  Diamante/Elite • SyncScore │
├─────────────────────────────┤
│  ADERÊNCIA (radar/linha)    │  recharts
│  7 dias • XP semanal        │
├─────────────────────────────┤
│  MÓDULOS (grid 2 col)       │
│  [FitCommunity] [O Ron]     │
│  [PrimePass]    [9Store]    │
│  [9Progress]    [SmartTreino]│
│  [HealthFlix]   [9Foods]    │
├─────────────────────────────┤
│  TAREFAS DIÁRIAS (+25 XP)   │
└─────────────────────────────┘
```

  
┌─────────────────────────────┐ │ PERSONAL ID CARD │ glass-mission, flip 3D │ nome • nível • classe │ Sync Score animado (0-100%) │ Diamante/Elite • 🔥 Streak │ Streak diário no topo ├─────────────────────────────┤ │ ADERÊNCIA (radar/linha) │ recharts (XP e 7 dias) ├─────────────────────────────┤ │ DAILY PROTOCOL (Timeline) │ Nova seção interativa │ [ ] Neural Prep (Manhã) │ Tarefas checkáveis │ [ ] Elite Training │ Gera +25 XP ├─────────────────────────────┤ │ MÓDULOS NATIVOS (Grid 2x2) │ Lazy-loaded via Suspense │ [FitCommunity] [O Ron] │ Badge "Recomendado" via IA │ [PrimePass] [9Store] │ │ [9Progress] [HealthFlix]│ /9fit/healthflix (Player nativo) └─────────────────────────────┘

Cada card:

- Lazy-loaded via `React.lazy` + Suspense skeleton.
- Click → rota **interna** (`/9fit/train`, `/9fit/community`, `/9fit/ron`, etc.), NÃO iframe externo.
- Estado preditivo: badge "Recomendado" baseado em `master_registry` (ex: comprou Elástico → HealthFlix card prioriza thumb de vídeo de elástico).

### 4. Master Registry (Banco Supremo)

Tabela `master_registry` (additive, não-destrutivo):

- `user_id`, `event_type` (purchase/sleep/workout/biometric), `payload jsonb`, `created_at`.
- View `user_context_snapshot` agrega últimos sinais → consumida por hook `usePredictiveContext()`.

Gatilhos preditivos (client-side rules engine em `src/services/predictiveEngine.ts`):

- Compra "Elástico" (Banco D=9Store) → flag `prioritize_elastic` → HealthFlix filtra `category=elastic`.
- Sono ruim (Banco I=FitCopilot) → flag `reduce_load` → SmartTreino mostra aviso "Reset Neural" e reduz carga sugerida 10%.

Hook `usePredictiveContext(userId)`:

- Retorna `{ context: 'morning'|'post-purchase'|'recovery', flags: string[], priorityModule: string }`.
- HUB usa para reordenar cards (priorityModule sobe pro topo).

### 5. RON (Neural Assistant) — base persistente

Tabela `ron_memory`:

- `user_id`, `key` (preference/insight/workout_feedback), `value jsonb`, `confidence float`, `created_at`.
- Edge function `ron-chat` (já existe `ai-coach`, estender modo `chat` para gravar memória + ler últimos 20 registros como contexto).
- Tela `/9fit/ron` com chat + logs em tempo real (stream SSE do ai-coach), partículas orbitais animadas (framer-motion).

### 6. Single-App Shell — eliminar iframes

- `EcosystemFrame.tsx` mantido apenas como fallback opcional.
- Rotas internas novas: `/9fit/store` (catálogo 9Store), `/9fit/healthflix` (player nativo lendo `library_items` type=video), `/9fit/9progress` (gráfico radar antes/depois).
- Lazy-load por rota (`React.lazy` em `App.tsx`) → primeiro paint instantâneo.

### 7. Gamificação

- XP +25 por checklist diário (tabela `daily_tasks` + trigger soma em `athlete_xp`).
- Leaderboard global em `/9fit/community` (já existe estrutura, completar query ordenada por XP).
- Sync Score = média ponderada (aderência treino 40% + nutrição 30% + sono 30%), exibido no ID Card.

## Detalhes técnicos

**Migrações (additive, sem DROP):**

```sql
CREATE TABLE master_registry (...);
CREATE TABLE ron_memory (...);
CREATE TABLE daily_tasks (...);
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS sync_score int DEFAULT 0;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS xp_total int DEFAULT 0;
-- RLS: user só lê/escreve próprios registros via athlete_id
```

**Bibliotecas:** framer-motion (já instalado), recharts (já), lucide-react (já). Nenhuma nova dep.

**Performance:**

- Code-split por rota.
- `usePredictiveContext` cacheado via `cacheManager` (TTL 60s).
- Imagens lazy via `<LazyImage>`.

## Fora do escopo desta entrega

- 9EXPRESS com Google Maps (requer secret `GOOGLE_MAPS_API_KEY`).
- Bio-Hacking 4 pilares Elite (Fase 5).
- Agentes silenciosos Epsilon/Zeta (requer `SUPRA_HUB_URL`).
- Pagamentos 9PAY (requer Stripe/Paddle).

## Entrega em uma mensagem

1. Migração `master_registry` + `ron_memory` + `daily_tasks`.
2. BottomNavigation 5 abas (OS/Train/HUB/Staff/Store).
3. HUB redesign com ID Card flip, Aderência, grid de módulos, Tarefas.
4. Rotas internas `/9fit/os`, `/9fit/store`, `/9fit/ron`, `/9fit/healthflix` (substituem iframes).
5. `usePredictiveContext` + `predictiveEngine` com 2 gatilhos (Elástico, Sono Ruim).
6. Tokens `.glass-mission` + tipografia editorial.

## Pergunta antes de implementar

Confirma a ordem das abas como **[OS, Train, HUB, Staff, Store]** (HUB no centro)? Mensagem anterior você mencionou também essa ordem — só validando antes de mexer na nav que afeta todos os usuários ativos.   
  
  
7 - ponto extra de informaçoes : Fit OS — Vanguarda Nexus (Single-App Shell)

**Role & Objetivo:** Atue como um Engenheiro de Software Full-Stack Sênior e Designer de Produto de Luxo. O objetivo é consolidar o ecossistema "Fit OS" em um **Single-App Shell** preditivo, gamificado e imersivo. Elimine redirecionamentos externos (`EcosystemFrame` iframes) e implemente views nativas com estética de "Controle de Missão" e "Hardware de Luxo".

### 1. Design Tokens & Identidade (src/index.css + tailwind.config.ts)

- **Background:** `--background: 0 0% 0%` (Preto absoluto).
- **Primary:** `--neon-orange: 22 100% 50%` (#FF6600).
- **Utilities:** * `.glass-mission` (backdrop-blur-xl + borda laranja translúcida + shadow interna).
  - `.text-editorial` (font-display, tracking tight, peso 900 itálico para títulos massive).
  - `.gradient-mission` (radial laranja → preto).
- **Micro-interações:** Usar `framer-motion` para transições fluidas e estados de "processamento" simulado.

### 2. Navegação Core & Ações Rápidas

- **Bottom Navigation (5 Abas Fixas em** `src/components/9fit/BottomNavigation.tsx`**):**
  1. `[OS]` (`/9fit/os`) - Dashboard pessoal
  2. `[Train]` (`/9fit/train`) - Execução
  3. `[HUB]` (`/9fit/hub`) - Centro Preditivo
  4. `[Staff]` (`/9fit/staff`) - Gestão
  5. `[Store]` (`/9fit/store`) - E-commerce nativo
- **QuickActionMenu:** Botão flutuante (Speed Dial) acessível em qualquer tela para: Log de Água, Nutri-Cam (Scanner) e Check de HRV.

### 3. HUB Preditivo & Fluxo Diário (src/pages/9fit/Hub.tsx — rewrite)

Layout vertical, mobile-first, atuando como um "Protocolo Operacional Diário":

Plaintext

```
┌─────────────────────────────┐
│  PERSONAL ID CARD           │  glass-mission, flip 3D
│  nome • nível • classe      │  Sync Score animado (0-100%)
│  Diamante/Elite • 🔥 Streak │  Streak diário no topo
├─────────────────────────────┤
│  ADERÊNCIA (radar/linha)    │  recharts (XP e 7 dias)
├─────────────────────────────┤
│  DAILY PROTOCOL (Timeline)  │  Nova seção interativa
│  [ ] Neural Prep (Manhã)    │  Tarefas checkáveis 
│  [ ] Elite Training         │  Gera +25 XP
├─────────────────────────────┤
│  MÓDULOS NATIVOS (Grid 2x2) │  Lazy-loaded via Suspense
│  [FitCommunity] [O Ron]     │  Badge "Recomendado" via IA
│  [PrimePass]    [9Store]    │  
│  [9Progress]    [HealthFlix]│  /9fit/healthflix (Player nativo)
└─────────────────────────────┘

```

### 4. O Launcher: Performance Marketplace

- Para acomodar o ecossistema satélite (as 40+ ferramentas B2B, B2C e Mobile), crie a rota nativa `/9fit/place` (Performance Marketplace).
- O Marketplace deve categorizar os links (Core Operacional, Performance B2C, B2B & Staff, Marketing) e atuar como um portal.
- **Regra de Roteamento:** Não recriar ferramentas complexas externas, mas usar o app como "Launcher". Ao clicar, o `predictiveEngine` deve registrar: "Usuário acessou módulo X".

### 5. Microestados de Alta Tecnologia (Elite Panel / PremiumView)

Transformar a visualização de serviços Elite em uma experiência de "Bio-Hacking":

- **Estado [DIAGNOSTIC]:** Ao abrir o PrimePass/Elite, exibir um scanner holográfico com barra de sincronização neural e "Matrix rain" dourado antes de carregar os dados.
- **Estado [SUBVIEW]:** Telas detalhadas de Genética, Performance, Longevidade e Bio-Hacking com navegação via "breadcrumbs" nodais.
- **Ação:** Botões de upgrade disparam o estado `[UPGRADING]` com o texto: *"Sincronizando DNA..."*.

### 6. Master Registry & Engine Preditiva (Banco Supremo)

- **Tabela** `master_registry` **(additive):** `user_id`, `event_type`, `payload jsonb`, `created_at`.
- **Engine (**`src/services/predictiveEngine.ts`**):** * *Gatilho 1:* Compra "Elástico" (9Store) → Prioriza thumb de elástico no HealthFlix.
  - *Gatilho 2:* Check-in Bio-Rítmico (Sono Ruim) → `SmartTreino` reduz carga em 10% e sugere "Reset Neural".
- **RON Memory (**`ron_memory`**):** Tabela persistente de preferências. A aba `/9fit/ron` deve ter chat SSE em tempo real com partículas orbitais animadas.

### 7. Auditoria de Sistema (Transparência)

- `src/components/Dashboard/ProjectAudit.tsx`**:** Componente de auditoria acessível no Perfil (`Bio`).
- Exibe o status de saúde dos módulos, latência do RON AI e integridade de rotas, comprovando que o app entrega a performance que promete.

### 8. Detalhes Técnicos & Performance

- **Migrações:** ADD `master_registry`, `ron_memory`, `daily_tasks`. ADD `sync_score` e `xp_total` na tabela `athletes`. (Additive, sem DROP).
- **Performance:** Code-split por rota, `React.lazy` no `App.tsx` para First Paint instantâneo, e `<LazyImage>` para thumbs. `usePredictiveContext` cacheado via cacheManager (TTL 60s).
- **Fora do Escopo:** Pagamentos reais (9PAY via Stripe), Agentes Silenciosos Epsilon/Zeta.

**Entrega Imediata:** Aplique as migrações, reestruture o BottomNav (5 abas), reescreva o `Hub.tsx` com o Wireframe Exato + Daily Protocol, crie os tokens de CSS `.glass-mission`, e implemente os microestados do Elite Panel. Nenhuma rota deve usar `EcosystemFrame` iframe se for módulo nativo.