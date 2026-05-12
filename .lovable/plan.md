# Plano Final — Fit OS Vanguarda (Refinamento Completo)

Objetivo: deixar o app 100% alinhado ao wireframe (Personal ID + Aderência + Módulos 2col + Protocolos) com navegação nativa, sem iframes, e UX Mission Control consistente em todas as telas.

## 1. Navegação (BottomNav)

Manter 5 abas conforme já decidido: `[OS] [TRAIN] [HUB] [STAFF] [STORE]`, HUB central destacado.

- Refinar `BottomNavigation.tsx`: altura 64px, glass-mission ring, indicador ativo com glow.
- Adicionar header global `TopBar` (≡ Fit OS  🔔) em todas as páginas `/9fit/*` com badge de notificações.

## 2. HUB (`/9fit/hub`) — alinhar ao wireframe

Ordem vertical exata:

1. **Personal ID Card** (glass-mission, flip 3D) — Nome, Nível Operativo, Classe (Diamante/Elite), barra **Sync Score animada** com gradiente neon.
2. **Aderência / Performance** — 1 card com 2 mini-gráficos Recharts lado a lado: Radar (7 dias) + Linha (XP semanal). Mostra "XP Semanal: 1250".
3. **Módulos de Vanguarda** — Grid **2 colunas** (não 4), cards retangulares glass-mission com ícone grande à esquerda + label, ring neon nos recomendados. 8 módulos: FitCommunity, O Ron, PrimePass, 9Store, 9Progress, SmartTreino, HealthFlix, 9Foods. Lazy-load via `React.lazy`.
4. **Protocolos & Tarefas** — `DailyProtocol` com checklist +25 XP por item.

Remover insights flutuantes — integrar como badge no card de Aderência.

## 3. OS (`/9fit/os`) — Dashboard Pessoal

- Personal ID Card holográfico (mesmo componente do HUB).
- **Daily Protocol** (gatilho diário): energia, foto, treino, água, sono.
- **Hub de Lacunas**: grid 3x2 com atalhos para Biblioteca, Planejamento, Progresso, Dieta, Staff, Suporte.
- Card **RON Insights** com sugestão do dia.
- Card **Estatísticas** (XP, aderência, streak).

## 4. TRAIN (`/9fit/train`)

Sub-tabs internas: **Treino do Dia | Protocolo | HealthFlix**.

- Treino do Dia: execução guiada (séries/reps/carga/descanso) usando `WorkoutExecution` existente.
- Protocolo: visualização Macro → Meso → Micro (cards horizontais com timeline).
- HealthFlix: catálogo nativo de vídeos com player imersivo (já criado, refinar UI).
- Botão flutuante **RON Notes** para feedback técnico pós-treino.

## 5. STAFF (`/9fit/staff`) — totalmente nativo

3 sub-tabs: **Equipe | Suporte | Agenda**.

- Equipe: cards de Master Coaches por categoria (9HEALTH, 9PERFORMANCE, 9LIFESTYLE) com Method Engine (Recovery/Strength/Signature).
- Agenda: calendário → solicitação → confirmação (já existe lógica `appointments`, conectar UI).
- Suporte: chat direto + tempo médio 4min.
- Hubs Territoriais como chips (Maison, Granja, Panamby, Moema) — sem Google Maps (fora de escopo).
- 9EXPRESS: placeholder "Em breve" (sem Maps API).

## 6. PrimePass / 9Elite (`/9fit/primepass`)

Microestados: **Diagnostic → Main → Upgrading → Success**.

- Scanner biométrico animado (framer-motion + partículas).
- 4 pilares interativos: Genetics, Performance, Longevity, Bio-Hacking.
- Tabela comparativa Free vs Elite em dourado/neon.

## 7. RON (`/9fit/ron`)

- Orbe animado central + chat SSE streaming (já implementado em `ron-chat` edge function).
- Persistência via `ron_memory` (já criada).
- Sugestões contextuais derivadas de `usePredictiveContext`.

## 8. Store (`/9fit/store`) + 9Foods (`/9fit/dieta`)

- Store nativa: catálogo de produtos, integração com `master_registry` ao comprar (gatilho elástico → HealthFlix).
- 9Foods: log nutricional + recomendações.

## 9. Design System (`index.css`)

- Confirmar tokens: `--background: 0 0% 0%`, `--neon-orange: 22 100% 50%`.
- Adicionar `.flip-3d` (perspective + rotateY), `.scan-line` (animação scanner), `.glow-gold` (PrimePass).
- Tipografia: display Sans-Serif Black/Italic (já no projeto).

## 10. Limpeza / Pendências

- Remover componentes `EcosystemFrame` órfãos.
- Garantir lazy-load em todas as rotas `/9fit/*` no `App.tsx`.
- Realtime: `workout_executions` channel já conectado no `WeeklyProgressChart`.
- Biblioteca de Exercícios: confirmar `sync-exercise-library` rodando e UI consumindo `exercises` table com botão "Atribuir ao Aluno" (LibraryAssignDialog já existe — conectar no `ExercisesPage`).

## Fora de escopo (declarado)

- Google Maps / 9EXPRESS geolocalizado (precisa `GOOGLE_MAPS_API_KEY`).
- Agentes Epsilon/Zeta backend (precisa `SUPRA_HUB_URL`).
- 9Pay / pagamentos reais.

## Detalhes técnicos

- Sem migrations novas — tabelas `master_registry`, `ron_memory`, `daily_tasks`, `athletes.sync_score/xp_total` já existem.
- Performance: code-splitting por rota, `Suspense` com skeleton glass-mission.
- Sem alterações no admin `/app`.

## Pergunta antes de implementar

O HUB do wireframe mostra **grid 2 colunas** (cards retangulares maiores) — hoje está em 4 colunas (quadrados pequenos). Confirma a mudança para **2 colunas retangulares** com ícone grande + label? sim porem com suas divisoes ..