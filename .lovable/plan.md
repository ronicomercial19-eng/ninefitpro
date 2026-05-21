
# 9FIT ELITE — Plano Consolidado v2 (expandido com novos anexos)

## Respostas confirmadas (perguntas anteriores)

1. **Reskin global irreversível** — APROVADO. Sobrescrever tokens, remover `glow-neon` / `gradient-mission` / `glass-mission-active` / sombras saturadas. Direção: **Apple Fitness + WHOOP + Oura + Neural OS**. Sem flag de coexistência.
2. **Bottom nav** — manter `OS / TRAIN / HUB / STAFF / COMMUNITY`. **Comunidade incorporada como extensão do app** (não iframe puro): rota interna `/9fit/community` que monta a SPA externa (`https://ninefit-community-flow.lovable.app`) dentro do shell do 9FIT (mesma top/bottom nav, mesmo header de identidade, deep-link funcional).
3. **Ordem** — seguir 6 ondas sequenciais como descrito. Reportar bugs ao final de cada onda.

---

## Novos insumos absorvidos

### Do `9FIT_UX_Design-3.docx` (Modo Rony · Vazio com Peso)
- **Hierarquia visual** : 1 elemento vence cada tela. Sync Score OU Nome — não os dois com mesmo peso.
- **Vazio com peso**: substituir todos os estados zero por copy de inteligência:
  - "Nenhum treino atribuído" → **"O sistema ainda não te conhece."**
  - "Nenhum profissional ativo" → **"RON disponível. Humanos: a caminho."**
  - "Sugestões aleatórias" → **"Sistema calibrado. Próxima janela: 18h."**
- **RON com silêncio intencional** : bolha pulsa 1s antes de falar. Abre sem boas-vindas. Já agiu antes de informar.
- **Gamificação invisível** : XP some da superfície, vira motor interno. Sync Score é dado técnico, não badge.
- **Onboarding** : 1 pergunta por tela, RON como entrevistador, sem formulário, sem skip, encerra com "Seu sistema está online".

### Do `9FIT_ELITE_Roadmap_Executivo_1.docx`
- **Gap P0** : bug de roteamento pós-troca de senha (usuário trava antes do Daily Protocol). Bloqueia 2 professores externos pagantes.
- **Onboarding obrigatório** ≤60s — Daily Protocol como primeira tela utilizável.
- **Avaliação RML dentro do app** (hoje em Notes do iPhone) — tela de Avaliação Inicial + evolução em gráfico no Dashboard Pessoal.
- **Streak punitivo** : notificação 23h "Seus N dias estão em risco".
- **Share automático** : Sync>75% → card 9:16 para Stories.
- **Daily Protocol contextualizado** : cada item com 1 frase do porquê ("Hoje é híbrido porque dormiu bem e Sync 68%").

### Referências visuais (uploads PNG)
- Cards glassmórficos flutuantes (Water/Heart/Calories/Blood Pressure) com **anéis de progresso laranja sobre fundo grafite**.
- "Ask Anything" — chat AI com chips de sugestão (Cardio / Nutrition / Supplements / Weight Loss / Muscle Gain / Meal Plans) e bolha de mic central elevada — referência direta para **RON**.
- Scan Meal full-bleed com cantos de mira — referência para **NutriScan** futuro.
- Header com avatar circular + "Hello, [Nome]" + ícones de ação à direita — referência para **NineFitTopBar**.

### Do `9fit-ecosystem---staff-container-3.zip`
- Container Vite/React isolado (`src/App.tsx`, `src/main.tsx`, `src/index.css`). Será montado dentro de `/9fit/staff` como módulo embarcado (mesmo padrão de Community), com integração ao `appointments_v2` + `staff_credits` existentes.

---

## ONDA 0 — Auditoria & Pré-flight (sem código)

- Validar logs `ai-coach` e secret `LOVABLE_API_KEY`.
- Confirmar RLS de `student_library_assignments` e `athletes.user_id` (já validado — atletas têm `user_id`, RLS OK; bug do infoproduto é de **payload incompleto na atribuição** + **viewer pobre**, não RLS).
- Extrair Staff container v3 para `/tmp/staff3/` (feito).

---

## ONDA 1 — Design System "Premium Neural Minimalista" (mata o cyber)

### `src/index.css` + `tailwind.config.ts`
- Paleta HSL final (alinhada às refs Apple/WHOOP):
  - `--background 240 5% 5%` · `--card 240 4% 9%` · `--elevated 240 4% 12%`
  - `--primary 18 87% 52%` (uso restrito a CTA, Sync, Streak, anel de progresso)
  - `--neural 213 90% 65%` (apenas RON/IA)
  - `--muted-foreground 240 4% 56%` · `--subtle 240 4% 38%`
  - `--border 0 0% 100% / 0.05`
- Tipografia: **Satoshi (display) + Inter (body)**. Pesos 400–900. `text-display`, `text-label`, `text-hero`, `text-data` (tabular).
- Utilitários: `surface-card`, `surface-elevated`, `ring-primary-soft`, `glass` (blur 12px, border 1px white/6%).
- Remover globalmente: `glow-*`, `gradient-mission`, `glass-mission-active` com box-shadow neon, `shadow-[0_0_24px_...]`, `text-massive italic`, `animate-pulse` em labels.

### Reskin de componentes-âncora (sem mudar lógica)
`PersonalIDCard`, `DailyProtocol`, `SyncScoreRing`, `StreakBadge`, `WeeklyRadar`, `HubPredictiveTip`, `HubSequentialCarousel`, `NineFitTopBar`, `BottomNavigation`, `HUDBar`, `WeeklyProgressChart`, `HomeFeed`, cards de OS/Train/Ron/Staff.

---

## ONDA 2 — Entrega real do Infoproduto/Protocolo (bug crítico)

### Diagnóstico confirmado
DB tem 9 atribuições reais (`9Calisthenics`, `9Fight`, `9Integrated`, …). RLS OK. **Bug real**:
1. `LibraryAssignDialog` só persiste `player_url` e `thumbnail_url` — ignora `access_url`, `download_url` e o `payload` rico da `library_items`.
2. `ProtocolViewer` cai num card pobre "Abrir conteúdo externo" para tipo `infoproduto` — usuário não vê capa, módulos, estrutura, CTA primário.
3. Entry point no Hub é discreto (1 linha) — aluno não percebe.

### Migration
- `student_library_assignments` += `access_url text`, `download_url text`, `payload jsonb` (idempotente).
- Index em `(athlete_id, completed_at)`.

### Frontend
- `LibraryAssignDialog`: gravar `access_url`, `download_url` e snapshot do `payload`.
- `ExercisesPage`: passar objeto completo de `library_items` (incluindo `payload`) ao dialog.
- `ProtocolViewer` reescrito com **modo Infoproduto**:
  - Hero com `thumbnail_url`, título, duração, módulos.
  - Seções `Estrutura` (payload.structure), `Diretrizes` (payload.guidelines), `Conteúdo` (videosIncluded/pdfIncluded).
  - CTA primário grande **"ABRIR PLAYER"** → iframe inline com `allow-fullscreen` + sandbox.
  - CTA secundário "Abrir em nova aba" (fallback obrigatório p/ X-Frame-Options).
  - Botão "Marcar concluído" → `progress_pct=100`, `completed_at=now()`, `master_registry { event_type:'protocol_completed' }`.
- `Hub`: card "Seu Protocolo" promovido — capa do item ativo mais recente, sempre visível quando ≥1 ativo. Tile "Biblioteca" quando zero (vazio com peso: "Seu coach ainda não atribuiu conteúdo. RON está observando.").

---

## ONDA 3 — RON Neural funcional + proatividade contextual

- Validar `LOVABLE_API_KEY` (criar via `ai_gateway--enable` se faltar). Fallback `GEMINI_API_KEY`.
- `ai-coach` unificado em `google/gemini-3-flash-preview` com 4 modos isolados: `chat` (RON), `train`, `analyze`, `recommend`.
- **Proatividade** (do Roadmap Executivo):
  - `IF Sync<60 AND hora=7h` → "Fernanda, você dormiu 6h ontem. Hoje é dia leve."
  - `IF Treino=não iniciado AND hora=17h` → "Seu treino demora 35min. Começar agora ou 18h?"
  - `IF Mobilidade=não feita AND hora=21h` → "Recuperação é tão importante. 10min comigo?"
- **Silêncio de design** (do UX v3): `Ron.tsx` exibe bolha pulsando 1s antes do primeiro token. Abre sem "Olá, sou o RON". Já agiu, informa depois.
- `FitCopilotPage`: apenas `train`/`analyze`. Nunca `chat`.

---

## ONDA 4 — HUB Premium (ordem canônica + vazio com peso)

Ordem fixa em `Hub.tsx`:
1. Saudação editorial (Chakra/Satoshi, peso 900, tracking -0.04em) — **único elemento dominante na primeira dobra; Sync Score recua em peso**.
2. **PersonalIDCard** minimalista.
3. **DailyProtocol contextualizado** : cada item com 1 frase do porquê + tempo + recompensa silenciosa (XP invisível).
4. **SyncScoreRing** com comparativo semanal (`↑ +4% — você está melhorando`).
5. **StreakBadge** : número grande + 🔥; badge "EM RISCO" se >20h sem check-in. Notificação 23h.
6. **WeeklyRadar 5D** : laranja semana atual vs cinza semana passada. Abaixo, 1 linha fria: "Ponto fraco desta semana: Sono."
7. **HubPredictiveTip** : 1 frase do RON.
8. **ProtocolCard** : capa + título + CTA "Continuar".
9. **HubSequentialCarousel** : módulos.

Substituir TODOS os estados zero por copy de inteligência (tabela do UX v3).

Share automático: `ShareCard` 9:16 + `html-to-image` quando Sync>75% OU Daily completo.

---

## ONDA 5 — Fluxos de borda (Auth, Onboarding, RML, Staff, Community)

### Fix P0 — bug de roteamento pós-senha
- `Login.tsx` + `useFirstAccess`: após `supabase.auth.updateUser({password})`, aguardar `onAuthStateChange` antes de redirecionar. Forçar refresh do JWT.
- Teste: criar conta nova, trocar senha, validar entrada direta no Daily Protocol.

### Onboarding obrigatório (≤60s, RON como entrevistador)
- `Onboarding.tsx` reescrito: 1 pergunta por tela, sem skip, sem scroll.
  1. Nome.
  2. Objetivo principal (perder gordura / ganhar massa / performance / saúde).
  3. Personal trainer? (sim / não, quero / não, prefiro sozinho).
  4. Estado atual (iniciante / base / treinado).
  5. Tempo disponível (30 / 60 / +60 min).
- Tela final: progress bar 3s real + "Seu sistema está online. RON já sabe o que você precisa."
- Concluir → gera Daily Protocol inicial via `ai-coach mode=recommend` → Hub.

### Avaliação RML inicial (Gap 3)
- Nova tela `/9fit/assessment/initial` capturando RML (postura, mobilidade, dor, lesões prévias).
- Persiste em `physical_assessments` com tipo `rml_initial`.
- Dashboard Pessoal: gráfico `RML inicial vs atual` (Recharts line).

### Staff Container v3
- Portar `/tmp/staff3/src/App.tsx` → `src/pages/9fit/Staff.tsx` mantendo shell 9FIT.
- Estados zero: "RON disponível. Humanos: a caminho." (vs "Nenhum profissional ativo").
- Trainer online → nome + foto + "Online agora". Offline → "Última análise: ontem".
- Integração: `appointments_v2` + `staff_credits` (já existem).

### Community incorporada
- `/9fit/community` carrega o app externo `ninefit-community-flow.lovable.app` em iframe full-bleed dentro do shell 9FIT (mesma top/bottom nav). PostMessage handshake para sincronizar usuário e tema.
- Estado tribo: "Você está em 3º lugar esta semana." (sem ranking global por padrão).

### Treino
- Vídeo inline em `WorkoutExecution.tsx` (já garantido por external URL rule).
- "Concluir set" → `progress-sync` → Sync recalcula em tempo real.

### Cleanup
- Sweep `rg` por `glow-`, `shadow-\[0_0_`, `text-massive`, `animate-pulse` em labels, `italic font-black uppercase tracking-widest text-\[8px\]`. Remover/substituir por utilitários premium.
- Deletar componentes sem referência após reskin.

---

## ONDA 6 — Notificações & Engajamento (smart-notifications cron)

- **23h** : streak em risco (`STREAK em risco. N dias.`).
- **Manhã** (7h) : "Seu Daily Protocol está pronto."
- **Pós-treino** : pedir RPE 1-10.
- **Sync<60 às 7h** : trigger proativo do RON.
- Web Push via PWA (já configurado, sem novo provider).

---

## Fluxo do usuário (atualizado)

```
Login
  └─ FirstAccess? ──sim──> Onboarding 60s (RON entrevistador) ──> Avaliação RML inicial ──> Daily Inicial ──┐
                  └──não──────────────────────────────────────────────────────────────────────────────────────┤
                                                                                                              ▼
                                                                                                             HUB
                                            ┌──────────┬────────────┬────────────┬────────────┬─────────────┤
                                            ▼          ▼            ▼            ▼            ▼             ▼
                                    Daily Protocol  Sync Score   Streak      Radar 5D    Protocolo      Módulos
                                       │              │             │            │            │
                                       ▼              ▼             ▼            ▼            ▼
                                  progress-sync ──► master_registry ◄──── protocol_completed
                                                          │
                                                          ▼
                                              Sync recalc + XP invisível + Streak + Share trigger (>75%)
```

---

## Critérios de DONE

| # | Critério | Validação |
|---|---|---|
| 1 | Zero `glow-*` / `gradient-mission` no DOM | `rg` retorna 0 |
| 2 | Infoproduto atribuído renderiza com capa + módulos + CTA "ABRIR PLAYER" | atribuir 9Calisthenics → `/9fit/protocolo` mostra hero completo |
| 3 | RON responde <5s com contexto e proatividade | `/9fit/ron` abre com mensagem contextual |
| 4 | Hub segue ordem ID→Daily→Sync→Radar→Tip→Protocolo→Módulos | visual check |
| 5 | Login pós-troca-de-senha entra direto no Daily Protocol | conta nova manual |
| 6 | Onboarding ≤60s, não pulável, RML inicial capturado | fluxo manual |
| 7 | Sync Score recalcula realtime | marcar Daily → ring atualiza |
| 8 | Estados zero usam copy de inteligência (tabela UX v3) | grep + visual |
| 9 | Staff container v3 montado em `/9fit/staff` | navegação |
| 10 | Community embarcada com shell 9FIT | navegação |
| 11 | Share automático aparece em Sync>75% | dispara overlay |
| 12 | Notificação 23h se streak em risco | edge function cron |

---

## Fora de escopo (mantém atual)

SmartPeriodizer, PosturaPro, HealthFlix sync, Nexus, Elite BioHacking, Habit Flow — apenas reskin visual da Onda 1.

---

## Status das perguntas
Todas respondidas e gravadas acima. Pronto para executar Onda 0 → 6 em sequência ao receber **APROVAR**.
