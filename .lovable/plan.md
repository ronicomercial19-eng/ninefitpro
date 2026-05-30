# Wave 21 — FitPro V3 (P0 Crítico)

Escopo grande. Vou entregar em **4 ondas** sequenciais, todas dentro deste mesmo plano. Cada onda é um milestone fechado e testável. Sem novas plataformas: tudo continua em React + Supabase + Lovable Cloud. Os 3 zips (`9fit`, `prime-system`, `staff-container`) são referência visual; o doc V3 é o contrato. Zero duplicidade — `9pass`, `PrimePass`, `Plans` viram **uma rota só: `/9fit/prime**`.

---

## Onda A — Fundação (Skills · Nexus · API Connector · Monetização)

### A1. Schema (1 migration)

Novas tabelas (com GRANTs + RLS, padrão `auth.uid()`):

- `skills` — id, slug, name, category, tags[], version, status (`draft|active|archived`), content (jsonb: prompts/protocolos/regras), owner_id (professor), metrics (jsonb: usage/retention/completion/engagement/rating), created/updated.
- `skill_activations` — skill_id, scope (`global|trainer|student`), target_id, active, activated_by, activated_at.
- `skill_events` — skill_id, user_id, event_type (`view|start|complete|rate|abandon`), value, metadata, created_at. (alimenta auto-aprimoramento)
- `monetization_offers` — id, name, category, checkout_url, iframe_url, status, priority, plan_id (fk opcional), thumbnail_url, description.
- `api_connectors` — id, key, provider, endpoint, auth_mode (`none|apikey|oauth|iframe_sso`), iframe_url, permissions[], status, config (jsonb), owner scope.
- `biohacker_protocols` — id, category (`sleep|recovery|energy|performance`), name, description, hero_image, steps (jsonb), skill_id (fk), difficulty, duration_min, status.
- `physio_modules` — id, key, name, description, hero_image, cta_label, cta_route, category (`sono|recuperacao|performance|hormonal|nutricao|foco|estresse`), order.
- `onboarding_progress` — user_id (pk), current_step, completed_steps[], data (jsonb), updated_at.

Roles continuam via `user_roles`/`has_role`. Nada na schema `auth`.

### A2. Nexus Bus (frontend)

`src/services/nexus/` — barramento único que sincroniza Professor↔BD↔Aluno:

- `nexusBus.ts` — wrapper de `supabase.channel` por tópico (`skills`, `offers`, `protocols`, `connectors`).
- `skillsSync.ts` — escuta `skill_activations` em tempo real; invalida caches de Skill Engine e dispara `9fit:skill_activated`.
- `offersSync.ts` — idem para `monetization_offers`.
- Hook `useNexus(topic)` consumido por OS/Hub/Prime/Train.

### A3. API Connector universal

- `src/services/connectors/apiConnector.ts` — fábrica que dado um registro `api_connectors` retorna `{ fetch, openIframe, sso }`. Suporta `apikey` (Edge Function proxy), `oauth` (delega ao Lovable Cloud) e `iframe_sso` (passa JWT do Supabase em query `?token=`).
- Edge Function `api-connector-proxy` — assina/encaminha requests usando secrets do Supabase; nunca expõe chave ao client.
- Refatorar todos os módulos que hoje fazem fetch externo (HealthFlix, 9Foods, 9Beats, 9Zap, Staff, HabitFlow) para usarem `apiConnector(key)`.
- UI Admin existente `ApiConnectorCard.tsx` passa a persistir em `api_connectors` (não mais localStorage).

### A4. Monetização 9Pay end-to-end

- Página pública `/9fit/oferta/:offerId` — hero + CTA "Assinar".
- `/9fit/checkout/:offerId` — iframe 9Pay (`monetization_offers.iframe_url`) + listener `postMessage` (`9pay:paid` → marca `user_subscriptions` ativo + dispara `9fit:offer_converted`).
- Confirmação `/9fit/checkout/success` com liberação imediata (RLS de Prime já checa `user_subscriptions.active`).
- Admin `/app/monetizacao` (rota interna) — CRUD de `monetization_offers` (lista + form: nome, categoria, checkout_url, iframe_url, status, prioridade, thumbnail). Sem deploy.
- Edge Function `9pay-webhook` opcional (confirmar pagamento server-side via assinatura, fallback ao postMessage).

---

## Onda B — Prime unificado · Onboarding · Calibração Skill-Driven

### B1. Prime único (`/9fit/prime`)

- Remover páginas: `PrimePass.tsx`, `Plans.tsx` (deprecadas → redirect para `/9fit/prime`).
- Nova `Prime.tsx` integral baseada no zip `prime-system` (HomeScreen+PrimeScreen+ProfileScreen), portada para nossos tokens HSL e shadcn.
- 1 produto, 1 assinatura (`subscription_plans` row `prime`), 4 sub-apps mantidos (ELITE / Bio / Kitchen / Recovery).
- Benefícios + Protocolos Biohackers listados a partir de `biohacker_protocols`.

### B2. Onboarding guiado completo

`src/pages/9fit/onboarding/` com rotas filhas e `onboarding_progress`:

1. `/onboarding/welcome` 2. `/profile` 3. `/goals` 4. `/assessment` 5. `/calibration` 6. `/protocols` 7. `/prime` 8. `/done`.

- Stepper persistente; retomada automática em qualquer reload via `useOnboardingProgress`.
- Guard global no `App.tsx` redireciona usuário com `current_step != 'done'` para a etapa atual.

### B3. Skill-Driven Calibration

- Remover lógica estática atual.
- `src/services/engrenagem/calibrationEngine.ts` recebe `{ profile, goals, activeSkills[], protocols[], history, results }` e devolve plano calibrado (intensidade, volume, módulos sugeridos, próximos protocolos).
- Roda no fim do onboarding e a cada `9fit:protocol_completed` / `9fit:skill_activated`.
- Resultado persistido em `ai_context_snapshots` (já existe).

### B4. Insights personalizados

Refatorar `recommendationEngine.ts` para consumir `skill_events`, `biohacker_protocols`, `workout_executions`, `bio_*` por usuário. Insights genéricos removidos.

---

## Onda C — Grid Nativo · Reformulação das abas · Protocolos Biohacker

### C1. Grid Nativo do Ecossistema (componente compartilhado)

- `src/components/9fit/EcosystemGrid.tsx` — consome `physio_modules` e `api_connectors`. Cada card: **foto real**, nome, descrição, CTA. Sem emojis, sem listas.
- Roteamento: `Card → Tela → API → Sistema Nativo` via `apiConnector`.
- Imagens geradas via `imagegen` (premium) e armazenadas em `src/assets/physio/*.jpg`.
- aqui no grid deve aprensetar : **Meu Ecossistema**
  **Staff**
  Conectar com profissionais e agendar
  👥
  &nbsp;
  **Planejamento**
  Periodização científica e adaptativa
  📊
  &nbsp;
  **Ajuste de Treino**
  SmartTreino ou IA adaptativa
  ⚡  

  **Ron**
  Assistente com memória e autonomia
    
  🧠
  &nbsp;
  **Progress**
  Avaliações e histórico de resultados
    
  📈
  &nbsp;
  **Store**
  Produtos, suplementos, acessórios
    
  🛒
  &nbsp;
  **Foods**
  Minha dieta ou 9Foods marketplace
    
  🥗
  &nbsp;
  **HealthFlix**
  Conteúdo de treino e educação
  🎬  
    
  - todo grid da aba settings esta descrito acima, deve refletir no painel do professor para conexao das api keys secret.

### C2. Reformulação das abas

- **OS** (`/9fit/os`): Insights personalizados + EcosystemGrid inteligente + ofertas (`monetization_offers` ordenadas por `priority`).
- **Train** (`/9fit/train`): tabs `Train | Protocols | Streaming` (HealthFlix embed via apiConnector).
- **Prime**: `Prime | Benefícios | Protocolos Biohackers`.
- **Hub**: mantém estrutura; substitui "Insights Fisiológicos" por EcosystemGrid.
- BottomNav v5 mantida (Início · Train · PRIME · Hub · Perfil).

### C3. Protocolos Biohacker (seed real)

Inserir 12 protocolos (3 por categoria: Sono, Recuperação, Energia, Performance) em `biohacker_protocols`, cada um linkado a uma `skills` ativa. Imagens reais via `imagegen`. UI: `/9fit/protocols/:category` + `/9fit/protocols/:category/:id` com player de etapas + check de conclusão (emite `9fit:protocol_completed` → XP + calibração).

---

## Onda D — Settings 3.0 · Módulos · Skill Manager (Professor) · QA

### D1. Skill Manager (Professor) — `/app/skills`

CRUD completo: upload (jsonb/markdown), edição inline, ativar/desativar (escreve em `skill_activations` + dispara Nexus), categorias, tags, versionamento (`version++` ao salvar; histórico). Mostra métricas de `skill_events` agregadas (auto-improvement dashboard).

### D2. Settings 3.0 — `/9fit/settings`

Estrutura em árvore:

```
Settings
├── Ecossistema   (lista physio_modules + status)
├── Skills        (skills ativas para o usuário + toggle) / garantir que professor ira conseguir fazer uploads das skill e habilitar no sistema e refletir ativamente apos salvar.  
├── APIs          (api_connectors visíveis ao papel)
├── Nexus         (status realtime + logs últimos eventos)
└── Usuário       (perfil, preferências, segurança)
```

### D3. Módulos de Settings (telas dedicadas, todas via `apiConnector` quando externas — abrem já autenticadas via JWT em query)

- **Staff** (`/9fit/staff`): port do zip `staff-container` (match, agendamento, Express). Integra `StaffEventsHub`.
- **Planejamento** → Smart Periodizer (já existe, mover para settings).
- **Ajuste de Treino**: escolha Smart Treino vs FitCopilot.
- **Ron**: memória persistente (`ron_memory`) + API Ron (Edge Function `ron-actions` com whitelist de ações executáveis dentro do app).
- **Progress**, **Store** (Ecommerce 9FIT iframe), **Foods** (Minha Dieta nativo / 9Foods api), **HabitFlow**, **9Zap**, **Events** (StaffEventsHub), **HealthFlix** (streaming nativo, catálogo completo via apiConnector).

### D4. QA & memórias

- Testar fluxo completo Onboarding → Calibration → Protocolo → Insight → Oferta → Checkout → Liberação Prime.
- Atualizar memórias: `mem://features/skill-engine`, `mem://features/monetization-9pay`, `mem://architecture/nexus-bus`, `mem://architecture/api-connector`, `mem://features/biohacker-protocols`, `mem://features/onboarding-v3`, `mem://navigation/settings-3-0`.
- Marcar como deprecadas: PrimePass, Plans duplicado, ContextualPaywall antigo.

---

## Não-objetivos

- Sem Firebase (zip de referência usa, aqui é Supabase).
- Sem novas plataformas (Three.js, Mapbox, etc.).
- Sem alterar auth/onboarding existente além da extensão acima.
- Sem mock data: todos os módulos consomem tabelas reais (seed mínimo onde necessário).

## Ordem de execução

A1 → A2 → A3 → A4 → B1 → B2 → B3 → B4 → C1 → C2 → C3 → D1 → D2 → D3 → D4.

**Aprovar para sair de plan mode e implementar Onda A (Schema + Nexus + API Connector + Monetização 9Pay)?** As ondas B/C/D vêm em sequência, sem nova aprovação, salvo ajuste de escopo.