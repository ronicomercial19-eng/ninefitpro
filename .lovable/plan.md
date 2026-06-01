# Plano — FitPro V3 Wave 23 (Mocks + Profundidade Train)

Inspecionei os 4 zips:

- `moocks.zip` → 42 mockups PNG/JPG (telas finais do app)
- `9fit.zip` → protótipo React/Firebase com `agentService`, `trainingAgent`, `workoutService` (lógica de IA + treino)  *CONTINUE USANDO O SUPABASE NATIVO* 
- `files-cf39a26f.zip` → 10 markdowns de arquitetura + protótipo `9fit_app`
- `implementacao.zip` → componentes-referência (`Train/`, `Workout/`, `Dashboard/`, `Hub/`, `Premium/`, `Staff/`, `Onboarding/`, `Shop/`, `Social/`, `Profile/`)

Como são 42 telas + lógica nova, vou executar em **3 ondas** sequenciais. Ondas 2 e 3 só começam após você validar a Onda 1 no preview.

---

## Onda 1 — TRAIN + ENGRENAGEM (ênfase pedida)

Portar a inteligência de treino dos zips para o app real e refazer o Train do zero seguindo os mocks.

**Telas / componentes (mocks correspondentes):**

- `Train` redesenhado: lista de treinos da semana + cartão "Treino de Hoje" com músculos, duração, intensidade IA, RPE previsto.
- `WorkoutOverview` (pré-treino): exercícios, séries, descanso, vídeo, aquecimento sugerido pela IA.
- `WorkoutExecution` (execução): timer inteligente, controle série/peso/reps, RPE pós-set, RON dica contextual.
- `AjusteDeTreino` (mock #2): SmartTreino + FitCopilot tabs, slider intensidade, gauge fadiga, sugestão IA com "Aplicar".
- `Planejamento` (mock #1): periodização científica com calendário mensal, ciclos adaptativos carousel, gráfico evolução de carga (IA vs real).
- `PostWorkoutReview`: RPE total, volume, comparação semana anterior, XP ganho, próximas recomendações.  
  
*ADICIONAR O COMPONENTE DA NAV BAR :   TRAIN / PROTOCOL / STREAMING 

**Lógica nova (portada de `9fit.zip/services`):**

- `src/services/training/trainingAgent.ts` — gera ajustes baseados em fadiga/HRV/sono (porta `trainingAgent.ts`)
- `src/services/training/workoutPlanner.ts` — monta sessão diária a partir de `athlete_periodizations` + bio
- `src/services/training/loadProgression.ts` — projeta carga relativa por exercício (alimenta gráfico de Planejamento)
- Edge function `training-ai-adjust` (Lovable AI Gateway) — recebe contexto e devolve `{intensity, swaps[], rationale}`
- Hook `useWorkoutOfTheDay`, `useAdaptiveAdjustment`

**Persistência:** usa `athletes`, `athlete_periodizations`, `workout_executions`, `workout_exercise_sets`, `bio_*`, `ai_context_snapshots`. Sem novas tabelas.

---

## Onda 2 —  OS / TRAIN / PRIME / HUB / STAFF ( SIGA ESSA ORDEM ) 

Portar visual dos mocks restantes do hub e fluxos de orquestração.

- `OSDashboard` final (hero Sync Score + recomendações Squad + missões ativação + ecosystem grid com fotos).
- `Hub` "Meu Ecossistema" no layout do `9fitpro_native_modules_grid.html` (cards horizontais 140px com imagem diagonal e badge API).
- `Perfil/Configurações` igual mock #3 (Staff online, Planejamento, Ajuste Treino "Novo", Ron, Histórico, Pagamento).
- `Staff` aprimorado: lista profissionais online, agendamento direto, chat 1:1.
- `Prime / SeasonPass` (telas elite, pillars, marketplace performance).
- `Onboarding` 6 passos com visual completo dos mocks.
- `Social` feed + `Tribos` + `AIPremiumChat`.

---

## Onda 3 — PROFESSOR / SKILLS / MONETIZAÇÃO / SETTINGS

- `Gerenciar Skills` (mock #4) refeito: form Nova Skill (nome, categoria, descrição com counter 87/180, Upload Skill), lista com toggle on/off, prévia "como o aluno vê".
- `TeacherWorkoutPanel` portado: visão do professor para criar/ajustar treinos com IA assistente.
- Painel Monetização: ofertas, campanhas, métricas de conversão (visual dos mocks).
- DesignSystemView interno (debug).
- Settings completo (notificações, integrações wearable, privacidade).
- Permitir o upload de skill em .json / .skill / word / pdf / .tsx

---

## Premissas técnicas

- Tudo continua em React/Vite/Tailwind/shadcn, semantic tokens em `index.css` (Dark + Neon Orange `#E8571A`).
- Sem novas tabelas; só novos arquivos em `src/`, `src/services/`, `supabase/functions/`.
- Imagens geradas com `imagegen` para preencher cards do ecosystem e backgrounds.
- Cada onda termina com checklist visual: rodar preview, comparar com mocks de referência, ajustar.

---

## Decisão necessária

Antes de implementar, confirme:

1. **Começo pela Onda 1 (Train + Engrenagem) — ok?** Ou prefere outra ordem? ok. profundidade e engreanagem do app  depois funcionalidades , telas para corresçoes . 
2. Alguma tela específica dos 42 mocks que NÃO deve entrar? as que atrapalham o funcionamento do app, nao alterar as que ja existem funcionalmente pode aprimorar e refinar.   
- atendo : preciso que remova os detalhes de daily protocol em um unico grid sequencial   
- atendo: intervencoes fisioligcas: somente em um grid sequencial   
 
3. Posso gerar novos assets (`imagegen`) para fotos/heros das telas, ou prefere usar só os já existentes em `src/assets/modules/`? usar os novos pois esta mais refinados para aprimorar o ja existente.   
  
  
  
-  O DOCUMENTO DE FILES QUE GERA A ENGRENAGEM INTELIGENCIA É TOTALMENTE PRIMORADIAL PARA CORRESPONDE O SCHEMA DE DADOS, ALIMENTAR O BANCO DE DADOS SUPREMO , O FIT EVOLUITION  
- PERMITIR INSERIR AVALAIÇAO NO PERFIL DO ALUNO / GERAR TREINAR COM IA ATRAVES DO NAVBAR
  &nbsp;