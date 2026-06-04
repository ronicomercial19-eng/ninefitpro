# Plano Final — Lançamento 9FIT PRO R$ 97 (Ondas 2-7 + Ajustes + Blindagem)

Execução em **4 blocos sequenciais**. Cada bloco é commitado independentemente.

---

## BLOCO 1 — Blindagem de Lançamento (URGENTE)

Remover qualquer 404 ou tela vazia antes de tráfego pago.

1. **Store → E-commerce nativo**: Card "Store" no `EcosystemGrid.tsx` aponta para `/9fit/native-system?app=store` que embeda [https://ninefit.lovable.app](https://ninefit.lovable.app) em iframe (já temos `NativeSystem.tsx` — generalizar para receber `?app=`).
2. **9Zap fallback**: Card "9Zap" aponta para link WhatsApp suporte (`https://wa.me/55XXXXXXXXXX`) até integração nativa. Configurável em `src/data/ecosystemConfig.ts`.
3. **Auditoria de 404**: Varrer rotas em `App.tsx`, ocultar módulos sem implementação real do `EcosystemGrid` (flag `enabled: false`).
4. **Recuperação de senha**: Validar fluxo `/forgot-password` → email → `/reset-password` (página já existe, garantir handler `type=recovery`).
5. **Boas-vindas RON**: Trigger no primeiro login (flag `first_login_at` em `athletes`) — RON dispara mensagem personalizada no Hub.
6. **Vídeo "Comece por Aqui"**: Card destacado no topo do `Hub.tsx` apontando para vídeo curto no HealthFlix (slot `featured_onboarding`).
7. **Sync Score calibração**: Texto explicativo "Calibrando seu sistema (3-7 dias)" quando score < 20 ou conta < 7 dias.

---

## BLOCO 2 — Ondas 2 a 7 (Roadmap Roadmap)

### Onda 2 — Train hero real

- `Train.tsx`: anel de progresso real via `useWorkoutOfTheDay`, INTERVENÇÕES do `recommendationEngine`, mini-chart últimas 7 execuções.
- **Entregar apenas treino do dia** — bloquear visualização de outros dias até concluir o atual (regra em `pickWorkoutOfTheDay`).

### Onda 3 — Hub OS+ refinement

- `EcosystemGrid.tsx`: indicadores online/% reais por módulo. Header "All modules • N active" calculado em runtime.

### Onda 4 — Progresso analytics real

- `Progresso.tsx`: queries reais a `physical_assessments`, `workout_exercise_sets`, `engrenagem_xp_logs`. Insights via `recommendationEngine.generateInsights()`.

### Onda 5 — Skills fechamento

- `SkillManagerPage` aba **Biblioteca** com "Instalar todas (19)" + busca. `StudentDetailedView` nova aba "Skills" com toggles.

### Onda 6 — Monetização

- `MonetizacaoPage.tsx`: KPIs (MRR/Churn/Prime conv.) reais. Tabela 20 últimas transações. CTA "Criar oferta dinâmica".

### Onda 7 — Staff check-in flow

- `QuickCheckIn` → sheet "Staff online agora" → CTA → `/9fit/staff?from=checkin`.  
Base URL: [https://xtexysqtfsofdohujtfr.supabase.co/functions/v1/staff-api](https://xtexysqtfsofdohujtfr.supabase.co/functions/v1/staff-api)

  | **Método** | **Endpoint**                                               | **Descrição**                                                                    |
  | ---------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
  | GET        | /methods                                                   | Catálogo 9HEALTH / 9PERFORMANCE / 9LIFESTYLE                                     |
  | GET        | /hubs                                                      | Hubs territoriais                                                                |
  | GET        | /professionals?method=&hub=                                | Lista profissionais do banco freelancers_cadastro rankeados                      |
  | POST       | /match { method, hub?, preferences?, limit? }              | Motor de matching com score (skill 50pt + hub 25pt + transporte/disponibilidade) |
  | POST       | /booking { freelancer_id, method, slot, client_name, hub } | Registra solicitação vinda do FitPro                                             |

  O FitPro consome esses endpoints no seu componente "Staff" — o matching cruza preferências do cliente com funcoes_experiencia, localizacao_bairro_cidade, disponibilidade e tem_transporte_proprio do Stevent.
  ### Embutir a tela via iframe (mais rápido)
  No app FitPro, dentro do componente **"Staff"**, basta abrir a rota pública:
  ```
  https://stevent.lovable.app/fitpro-staff

  ```
  ```
  <iframe
    src="https://stevent.lovable.app/fitpro-staff"
    style="width:100%; height:100vh; border:0;"
    allow="clipboard-write; geolocation"
    title="9FIT Staff"
  ></iframe>
  ```

---

## BLOCO 3 — Funcionalidades Operacionais (IA + Avaliações + Loops)

### 3.1 TREINO COM IA (professor)

- `AITrainingPage`: escolher aluno → onboarding curto de preferências → gera treino completo (HTML + vídeos) → publica em `student_training_assignments` → notifica aluno.

### 3.2 ASSISTENTE IA (professor)

- `AIChatPage`: comandos de ação direta. Edge function `ai-coach` modo `action` interpreta intents:
  - "ajustar periodização do João" → escreve em `periodization_cycles`
  - "criar treino X para Y" → cria assignment
  - "enviar análise para Z" → entrega via mensagem.

### 3.3 ANÁLISE COM IA (professor)

- `AIAnalysisPage`: após gerar análise, botão "Enviar ao aluno" → cria mensagem nova no OS do aluno + push.

### 3.4 Avaliação 360 (loop completo)  
- avaliaçao guiada vai fazer fazer requisao com o progress tracker nesse pagina e usar a tela em iframe /avaliacao-guiada/select utilizando a  **API Pública REST**

**Base URL:**`https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1/api-public`  
**GET**`?action=student_profile`

**cURL** Dados básicos do aluno email=aluno@email.com

**GET**`?action=student_assessments`

**cURL** Todas as avaliações do aluno

email=aluno@email.com

**GET**`?action=student_scores`

**cURL** Scores e flags da última avaliação

email=aluno@email.com

**POST**`?action=link_user`

**cURL** Vincula user_id externo ao aluno

Body: { email, external_user_id }

- Aluno responde questionário guiado no ProgressTracker → executa protocolos com anotação numérica → ProgressTracker avalia → professor recebe no painel → 1-clique "Ativar Periodizer + SmartTreino" → app do aluno configurado automaticamente.  
  
- manter a tela de progresso do fitpro , dentro de progresso adiciona esse avaliaçao guiada.   
- progress tracker em api para armzenar dados e avaliaçao robusta por professores, ou outra funçao nativa dentro do propio sistema para gerar recomendaçao pro fitpro. 

### 3.5 Avaliação Postural

- Aluno envia 4 fotos (frente/lados/costas) → edge function `postura-pro-scan` → resultado renderizado no `PosturaProPage` + recomendações enviadas ao aluno.  
- utilizar a api que vai ser conectada para exercer essa funçao . deixe o ambiente preparado . 

### 3.6 9Zap (futuro)

- Placeholder com card "Em integração" + link WhatsApp suporte. Pasta `9zap/` com structure para produtos/ofertas/conversas (mock até API ).  
- apos api este modulo deve funcionar de forma embed nativo dentro do app,atualizando todo front end para o app que foi conectado. 

### 3.7 Staff loop completo

- Seleção (método/hub) → matching (`staff-api/match`) → agendamento (`actions.book_freelancer`) → cobrança (Stripe checkout) → entrega (booking confirmado).

### 3.8 Store loop completo

- Aponta para `fitnessplace.lovable.app` nativo. Dropshipping ativo via Shopify do app embarcado (sem reinventar).

---

## BLOCO 4 — APIs e Sistemas Externos (Reflexão Real)

### 4.1 ApiConnectorCard validando de verdade

- `ApiConnectorCard.tsx`: ao salvar, edge function `api-connector-proxy` faz `GET <endpoint>/health` → grava `status: connected` + `last_sync_at` em `api_connections`.
- Frontend (`HealthFlixAdminPage`, etc.) exibe badge **CONECTADO** verde + contagem de itens sincronizados.
- **Aluno reflete em tempo real**: `useRealtimeTable` em `api_connections` + `library_items` → HealthFlix do aluno popula automaticamente após sync do professor.

### 4.2 Streaming HealthFlix completo

- `HealthFlix.tsx` (aluno): grid completo da API. `HealthFlixAdminPage` (professor): biblioteca + filtros + reatribuir/destacar.

### 4.3 Painel de APIs Configurável (NOVO)

- Nova seção em `SettingsPage` (professor): **"Integrações & APIs"**.
- Lista de sistemas com cards: SmartTreino, TrainCraft, Periodizer, ProgressTracker, PosturaPro, FitCopilot, HealthFlix, HTML→PDF, 9Zap, 9Flow, NineFitConnect.
- Botão **"+ Adicionar nova API"** abre modal genérico (nome, endpoint, auth type, key, módulo destino).
- Salva em `api_connections` com tipo `custom` e habilita reflexo automático no front via `useRealtimeTable`.

### 4.4 Tabela de mapeamento

- Criar `src/data/ecosystemApps.ts` com a matriz fornecida (Entram Agora / Depois / Fora) para alimentar `EcosystemGrid`, `ModuleGrid`, e painel de configurações.  
  
- criar uma funçao de compartilhamento - usuario consegue compartilha tela do fitpro, treino, dados, calorias, progresso,  planejamento, store, conquistas, metodo de virilizaçao interna via compartilhamento  *oferecer vantagens pro usuario que fizer isso* 

---

## Migrations necessárias

- `api_connections` (id, module_key, endpoint, status, last_sync_at, config jsonb) — RLS por professor.
- `daily_sync_logs` (se ausente).
- `infoproducts` + `user_unlocks` (se ausentes).
- `healthflix_videos` (se ausente).
- Todas com `GRANT` adequados.

---

## Ordem de execução

1. **Bloco 1** (blindagem — 1h) → testar fluxo de compra ponta a ponta.
2. **Bloco 2** (Ondas 2-7 — incremental, commits por onda).
3. **Bloco 3** (IA + loops — maior bloco, ~5 sub-tasks).
4. **Bloco 4** (APIs + painel configurável).

## QA final

- Screenshots 390x844 mobile + 1280 desktop em cada bloco.
- Teste E2E: cadastro → onboarding → primeiro treino → check-in → upgrade Prime.
- Validar zero 404 em todos os cards do Hub.

## Critérios de aceite

- Nenhum mock nas telas finais.
- Quiz emoji altera `sync_score` visível.
- Radar 5D atualiza após 1 protocolo.
- HealthFlix mostra itens reais após sync do professor (sem reload no aluno).
- `staff-api` responde 200 em todos endpoints.
- Store abre nativo (iframe Fitness Place).
- 9Zap tem fallback funcional (WhatsApp).
- TREINO/ASSISTENTE/ANÁLISE IA operacionais ponta a ponta.
- Avaliação 360 → ativação automática SmartTreino + Periodizer no app do aluno.

Confirmar para iniciar pelo **Bloco 1 (Blindagem)**.