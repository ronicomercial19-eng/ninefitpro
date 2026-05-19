# 9FIT ELITE — Refundação Premium + Entrega Total (Plano Expandido)

Plano em **6 ondas sequenciais**, cada uma entrega valor isolado e não quebra o que veio antes. Tokens primeiro, bugfixes críticos depois, redesign global, e por último features novas.

---

## ONDA 0 — Auditoria Rápida (sem código, ~15min)

- Parse dos anexos `9FIT_UX_Design-2.docx`, `9fit-complete-spec-6.pdf`, `9FIT-Alpha-Kappa-Neural-Architecture.pdf` via `document--parse_document` para extrair specs canônicos (tokens, copy, fluxos).
- Extrair `9fit_1-2.zip` e `9fit-ecosystem---staff-container-2.zip` em `/tmp/` para mapear assets/componentes reutilizáveis (especialmente o Staff container).
- Logs de edge function `ai-coach` para diagnosticar bug do RON.
- Query rápida em `student_library_assignments` para validar se assignments existem mas não aparecem (bug do protocolo).

---

## ONDA 1 — Design System "Premium Minimalista" (mata o cyber)

**Objetivo:** substituir paleta neon/cyber por WHOOP/Oura/Apple Fitness.

### Tokens (`src/index.css`, `tailwind.config.ts`)

- HSL puros:
  - `--background` 240 5% 5% (#0B0B0D)
  - `--card` 240 4% 9% (#141416)
  - `--elevated` 240 4% 12% (#1C1C1F)
  - `--primary` 18 87% 52% (#F05C1A) — uso restrito a CTA/Sync/Streak/XP/highlight
  - `--foreground` 0 0% 100%, `--muted-foreground` 240 4% 56%, `--subtle` 240 4% 38%
  - `--neural` 213 100% 65% (#4DA3FF) — apenas IA/RON
  - `--border` 0 0% 100% / 0.05
  - Remover: `--neon-400`, gradientes saturados, glows múltiplos.
- Tipografia: Satoshi (display) + Inter (body). Pesos 400-900.
- Classes utilitárias novas: `.surface-card`, `.surface-elevated`, `.text-display`, `.text-label` (uppercase 10px tracking 0.12em), `.text-hero`.

### Remoções globais

- Apagar/desabilitar: `gradient-mission`, `glow-neon`, `glass-mission-active` neon, `shadow-[0_0_24px...]`, `drop-shadow-[0_0_8px_hsl(var(--neon-400))]`.
- Substituir por `bg-card`, `border-white/5`, `shadow-sm`, `ring-1 ring-primary/20`.
- Buscar e reskinar componentes-âncora: `PersonalIDCard`, `DailyProtocol`, `HubSequentialCarousel`, `HUDBar`, `NineFitTopBar`, `BottomNavigation` (botão central laranja sólido sem glow exagerado), `WeeklyProgressChart`, `HomeFeed`, cards de OS/Train/Ron/Staff.
- `App.css` legacy: limpar regras genéricas (`#root`, `.logo`).

**Sem alteração de lógica** nesta onda. Só visual.

---

## ONDA 2 — BUG CRÍTICO: Entrega do Protocolo/Biblioteca ao Aluno

**Sintoma:** `LibraryAssignDialog` grava em `student_library_assignments`, mas o aluno não vê nada no app.

### Backend

- Migration:
  - Garantir colunas em `student_library_assignments`: `thumbnail_url`, `player_url`, `content_type`, `content_ref`, `content_title`, `notes`, `assigned_by`, `progress_pct` (default 0), `completed_at`.
  - RLS: aluno lê `WHERE athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid() OR id IN (SELECT athlete_id FROM athlete_auth_link WHERE user_id = auth.uid()))`.
  - Adicionar tabela ao `supabase_realtime` publication.

### Frontend

- Nova página `src/pages/9fit/Protocolo.tsx` rota `/9fit/protocolo`:
  - Lista assignments do `athleteId` atual (usando `useAthleteId`).
  - Filtra por status (ativos / concluídos).
  - Cards: thumbnail, título, tipo, progresso, CTA "Acessar".
  - Realtime via `useRealtimeTable` em `student_library_assignments`.
- Novo componente `ProtocolViewer.tsx`:
  - HTML → DOMPurify + iframe responsivo (mobile viewport injection já existe).
  - Link externo → `window.open` em nova aba.
  - PDF → iframe `<embed>` inline.
  - Vídeo → reaproveita `ExerciseVideoPlayer`.
  - Botão "Marcar como concluído" → grava `progress_pct=100`, `completed_at=now()`, dispara `master_registry { event_type: 'protocol_completed' }` (+XP +Sync).
- Entry points:
  - Card "Seu Protocolo" no Hub quando houver assignment ativo (acima dos módulos).
  - Item no `DailyProtocol` se houver protocolo pendente do dia.
  - Tile na bottom nav OS ou tile no Hub Tile grid.

### Sync da biblioteca

- Garantir `sync-library-full` realmente upserta tudo (já removeu limit 2000 na onda anterior). Validar contagem.

---

## ONDA 3 — RON Neural funcional + separação clara FitCopilot

**Sintoma:** RON não responde.

### Diagnóstico

- `supabase--edge_function_logs` em `ai-coach`.
- Validar secret `LOVABLE_API_KEY` (criar via `ai_gateway--enable` se faltar) e/ou `GEMINI_API_KEY` (fallback gratuito).

### Refactor `ai-coach`

- Provider unificado: Lovable AI Gateway (`google/gemini-3-flash-preview`) com header `Lovable-API-Key`. Fallback para Gemini direto se gateway falhar.
- Quatro modos isolados: `chat` (RON), `train` (FitCopilot gerador), `analyze` (FitCopilot análise), `recommend`.
- Modo `chat`:
  - Aceita `history` (últimas 20 msgs).
  - Injeta contexto auto: Sync, último treino, sono, streak, aderência semanal, próxima ação.
  - Resposta curta, conversacional, em PT-BR, tom coach.
- Resposta padronizada `{ data: { content: string } }` (RON já parseia isso).

### Frontend `Ron.tsx`

- Proatividade: ao abrir, se não há mensagem do dia, dispara `mode=chat` com `message="__open__"` → backend gera abertura contextual.
- Loader/skeleton enquanto streama.
- Toast em erro (429/402/timeout).

### FitCopilot

- `FitCopilotPage` SÓ chama `mode=train`/`analyze`. Nunca `chat`.
- Resultado renderiza HTML do treino gerado + botão "Atribuir ao aluno".

---

## ONDA 4 — HUB Premium (segue Master Prompt ao pé da letra)

Reescreve `src/pages/9fit/Hub.tsx` na ordem canônica:

```text
┌─────────────────────────────┐
│  TOP BAR (sticky)           │
├─────────────────────────────┤
│  1. ID CARD (premium)       │  ← identidade
├─────────────────────────────┤
│  2. DAILY PROTOCOL (domina) │  ← ação agora
├─────────────────────────────┤
│  3. SYNC SCORE RING (hero)  │  ← métrica central
├─────────────────────────────┤
│  4. STREAK + RADAR 5D       │  ← progressão
├─────────────────────────────┤
│  5. HUB PREDITIVO (RON tip) │  ← contexto IA
├─────────────────────────────┤
│  6. SEU PROTOCOLO (se há)   │  ← biblioteca
├─────────────────────────────┤
│  7. MÓDULOS (grid compacto) │  ← exploração
└─────────────────────────────┘
```

### Novos componentes

- `SyncScoreRing.tsx`: ring SVG grande, label "SYNC", número 0-100, breakdown em hover/tap (5 fatias).
  - Fórmula: `Treino*0.25 + Nutri*0.25 + Sono*0.25 + Mob*0.125 + Hidr*0.125`. Inputs lidos de `master_registry` últimos 7d.
- `StreakBadge.tsx`: número grande + 🔥, glow sutil >15 dias, badge vermelho "EM RISCO" se >20h sem check-in.
- `WeeklyRadar.tsx` (Recharts RadarChart): 5 eixos, semana atual sólida laranja, anterior outline cinza.
- `HubPredictiveTip.tsx`: 1 frase do RON com ícone neural; clique → abre Ron com contexto.
- `ProtocolCard.tsx`: aparece só se houver assignment ativo.

### Daily Protocol redesign

- Cada item:
  - Checkbox grande à esquerda.
  - Título + 1 frase de contexto ("Hoje o foco é performance porque seu sono foi bom").
  - Tempo estimado + recompensa XP/Sync.
  - Animação de check com micro-celebração ao concluir.
- Linha unificada conforme pedido prévio: ao marcar uma, expande a próxima.

### Share automático

- Trigger: Sync>75% OR Daily completo.
- Componente `ShareCard.tsx` 9:16 com radar+sync+streak+branding 9FIT.
- Export via `html-to-image` → botão "Compartilhar progresso".

---

## ONDA 5 — Fluxos de borda + Staff + Onboarding

### Login → Onboarding (corrigir sync de senha)

- `Login.tsx`: após sucesso, checar `useFirstAccess`. Se primeiro acesso → forçar `/9fit/onboarding`.
- `Onboarding.tsx`: 3 perguntas (objetivo, frequência, sono) em ≤60s. Não pulável.
- Ao concluir: gera Daily Protocol inicial via `ai-coach` mode=`recommend`, marca `password_changed=true`, redireciona Hub.

### Staff container (do zip)

- Mapear componentes do zip → portar para `/9fit/staff`:
  - Lista de profissionais (cards com foto, nome, especialidade).
  - Clique → tela do profissional → serviços disponíveis → CTA agendar.
  - Integrar com `appointments_v2` + `staff_credits` (já existem).

### Treino

- Garantir vídeo inline em `WorkoutExecution.tsx` (sem sair da tela).
- Botão "concluir set" → POST `progress-sync` → atualiza Sync em tempo real.

### Bottom Nav

- Manter: OS / TRAIN / HUB / STAFF / COMMUNITY (já alinhado ao master prompt, exceto "STORE"). Sugiro adicionar Store no perfil ou substituir Community → Store conforme master prompt; **pergunta ao usuário**.

### Limpeza

- Deletar componentes legados sem referência após redesign (busca por `grep -r` antes de cada delete).

---

## ONDA 6 — Notificações + Engajamento

- `smart-notifications` edge function (cron):
  - 23h: streak em risco.
  - Manhã: "Seu Daily Protocol está pronto."
  - Pós-treino: pedir RPE.
- Push web (já tem PWA configurado) — opcional, sem novo provider.

---

## Diagrama de fluxo do usuário

```text
Login
  └─ FirstAccess? ──sim──> Onboarding (60s) ──> Daily Inicial ──┐
                  └──não──────────────────────────────────────────┤
                                                                  ▼
                                                                 HUB
                                                ┌────────────────┼────────────────┐
                                                ▼                ▼                ▼
                                          Daily Protocol     Sync Score      Protocolo
                                                │                                  │
                                                ▼                                  ▼
                                          Train / Ron / Staff               Conteúdo (HTML/PDF/Link)
                                                │                                  │
                                                ▼                                  ▼
                                          progress-sync ───► master_registry ◄────┘
                                                                  │
                                                                  ▼
                                                            Sync recalc + XP + Streak
```

---

## Critérios de DONE (testáveis)


| #   | Critério                                    | Como validar                                            |
| --- | ------------------------------------------- | ------------------------------------------------------- |
| 1   | Zero `glow-neon`/`gradient-mission` no DOM  | `grep -r` retorna 0                                     |
| 2   | Aluno vê protocolo atribuído                | Atribuir via admin → recarregar app → card aparece      |
| 3   | RON responde em <5s com contexto            | Abrir /9fit/ron → mensagem chega com referência ao Sync |
| 4   | Hub segue ordem ID→Daily→Sync→Radar→Módulos | Visual check                                            |
| 5   | Login→Onboarding→Hub sem travas             | Fluxo manual em conta nova                              |
| 6   | Sync Score recalcula em tempo real          | Marcar item Daily → ring atualiza                       |
| 7   | Staff agendamento debita crédito            | Agendar → `staff_credits` decrementa                    |


---

## Fora de escopo (mantém atual)

SmartPeriodizer, PosturaPro, HealthFlix sync, Nexus, Elite BioHacking, Habit Flow — já entregues. Só recebem reskin visual da Onda 1.

---

## Perguntas antes de implementar

1. **Reskin global irreversível:** confirma sobrescrever totalmente `index.css` tokens + remover classes neon em todo o projeto? Ou prefere flag `theme=premium|cyber` para coexistir?Confirmado: sobrescrever COMPLETAMENTE o sistema visual legado cyber.
  Pode:
  - substituir globalmente os tokens em index.css,
  - remover gradient-mission,
  - remover glow-neon,
  - remover glass-mission-active,
  - remover gradientes saturados,
  - remover estilos cyber/rgb/neon,
  - remover sombras exageradas.
  Não precisamos coexistência de temas premium|cyber.
  Objetivo:  
  transformar o 9FIT em uma interface premium neural minimalista, focada em:
  - clareza,
  - aderência,
  - performance,
  - contexto,
  - rotina,
  - sensação healthtech elite.
  Prioridade visual:  
  ID Card → Daily Protocol → Sync → Radar → Módulos.
  Manter:
  - profundidade sutil,
  - contraste forte,
  - motion leve,
  - sensação operacional.
  Evitar:
  - cyberpunk,
  - gamer RGB,
  - excesso de glow,
  - excesso de gradients,
  - excesso de efeitos visuais.
  A direção correta é:  
  Apple Fitness + WHOOP + Oura + Neural OS.
  Aprovado seguir as 5 ondas exatamente como descritas.
2. **Bottom Nav:** mantém `COMMUNITY` ou troca por `STORE` (conforme master prompt `/os /train /hub /staff /store`)? eu quero que a comunidade seja exibida deentro do app de forma incororada, nao reporduzir como iframe mas sim o link como a propia extensao do app : [https://ninefit-community-flow.lovable.app](https://ninefit-community-flow.lovable.app) - comunidade  e assim mantenha comunity no navbar : /os /train /hub /staff /community
3. **Ordem de execução:** posso começar pela Onda 2 (bug crítico do protocolo) antes da Onda 1 (visual)? Ou prefere visual primeiro como está no plano? siga o plano e me entregue completo tudo atualizado e funcional respeitando as  ondas e me relate se tiver erros. 