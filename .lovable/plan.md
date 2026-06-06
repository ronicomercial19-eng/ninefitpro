## Contexto

O zip enviado contém as edge functions do **projeto externo HealthFlix** (`kixjiwsfogqztlgiiztp`). Elas NÃO devem ser reimplantadas no nosso projeto (`mfrydtrzjxscbkaiwfnw`). O FitPro vai atuar como **cliente** dessas APIs usando:

- `x-api-key` (HealthFlix): `c3e8579a23ba653bddf229b28032698e74c2f43b7ea09cb1`
- `webhook_secret` (HealthFlix callbacks): `31851e8ef10c7eb7c64bc96722e41d8f0e0a62003c2637c4cf65070623b6d542`
- `x-partner-key` (Biblioteca `vrbhljmsakruoejctclg`): chave fornecida (mesma `c3e857…` por padrão; confirmar)
- SmartPeriodizer: já existe `ApiConnectorCard` em `src/pages/SmartPeriodizer.tsx`

*ENTREGAR ETAPAS E PENDENCIAS DAS ONDAS ANTERIORES , PENDENCIAS, ATUALIZAÇOES DO FRONT,DESIGN, INTELINGENCIA, TABELAS, SCHEMAS ) 

## Entregáveis

### Bloco A — Streaming HealthFlix nativo (Aluno + Professor)

1. **Secrets**: salvar `HEALTHFLIX_API_KEY`, `HEALTHFLIX_WEBHOOK_SECRET`, `LIBRARY_PARTNER_KEY` via `add_secret` (não em código).
2. **Edge function proxy `healthflix-proxy**` (no nosso projeto): valida JWT do usuário, monta `x-api-key` no servidor e expõe 3 rotas internas:
  - `POST /context` → chama `fitpro-student-context` da HealthFlix, devolve `embed_url` assinado (role student|professor).
  - `GET /content` → chama `fitpro-content` (catálogo completo).
  - `POST /assign` → chama `fitpro-content-assign` (professor atribui conteúdo ao aluno).
  - `POST /events` → repassa eventos do player para `fitpro-events`.
3. **Sincronização de aluno**: edge `healthflix-sync-student` que dispara `fitpro-sync` antes do primeiro acesso (resolve o erro "student not synced").
4. **Aluno — `src/pages/9fit/HealthFlix.tsx**`: trocar o fetch direto de `library_items` por:
  - Listar catálogo via `/content` (grid nativo já existente).
  - Ao clicar em um vídeo OU no botão "Abrir HealthFlix completo": chamar `/context` e renderizar iframe com `embed_url` (full-screen dentro do app).
5. **Train → Streaming**: o card "Streaming" em `src/pages/9fit/Train.tsx` continua navegando para `/9fit/healthflix`, mas agora com o catálogo real conectado.
6. **Professor — `src/pages/admin/HealthFlixAdminPage.tsx**`: adicionar aba "Biblioteca HealthFlix" que abre `embed_url` no modo `role=professor` (acesso completo /professor/library) e mantém o gerenciamento manual atual como fallback.
7. **Webhook receiver `healthflix-webhook**`: valida `x-webhook-secret` contra `HEALTHFLIX_WEBHOOK_SECRET` e grava em `integration_events` (nova tabela) + atualiza progresso em `content_progress`.

### Bloco B — Biblioteca de Conteúdo (library-full)

1. Edge proxy `library-full-proxy` no nosso projeto:
  ```
   GET /library-full-proxy?student_external_id=<id>
   header: x-partner-key = secret LIBRARY_PARTNER_KEY
   → repassa para https://vrbhljmsakruoejctclg.supabase.co/functions/v1/library-full
  ```
2. Nova página `**src/pages/9fit/Biblioteca.tsx**` (Aluno) — grid nativo (cards categoria/título/thumb) usando o JSON retornado. Acessível em `9fit/biblioteca` e no Hub OS como módulo "Biblioteca".
3. Rota registrada em `src/App.tsx` + entrada no `ModuleGrid`.

### Bloco C — Planejamento via SmartPeriodizer

1. **Migration**: tabela `periodization_plans_remote` cacheando o plano (semana, microciclo, volume, intensidade, recovery, status) keyed por `athlete_id` + `external_plan_id`. GRANTs + RLS (aluno vê o seu, trainer vê dos seus, service_role tudo).
2. Edge `smartperiodizer-sync` (verifica `api_connectors.smart_periodizer` → endpoint + key, faz GET `/plan?athlete=<id>`, upserta em `periodization_plans_remote`, registra log).
3. **Aluno — `src/pages/9fit/Planejamento.tsx**`: substituir placeholder pelas ondas 2–7 reais lidas da tabela (timeline, semana atual destacada, RPE alvo, carga prevista vs real, próximo deload). Empty-state com botão "Solicitar plano ao professor".
4. **Professor — `src/pages/SmartPeriodizer.tsx**`: além do `ApiConnectorCard`, adicionar:
  - Lista de alunos com plano sincronizado (status, última sync).
  - Botão "Sincronizar agora" por aluno (chama `smartperiodizer-sync`).
  - Iframe nativo do painel SmartPeriodizer (mesma estratégia de `NativeSystem.tsx`).

### Bloco D — Schema de suporte (Migration única)

Criar/alterar:

- `fitpro_connections` (nossa cópia local mínima: id, provider enum [healthflix, smartperiodizer, library], endpoint, status, last_sync_at) — para o dashboard admin.
- `integration_events` (log de eventos recebidos por webhook).
- `content_progress` (espelho do progresso vindo do HealthFlix).
- `periodization_plans_remote`.
- Todas com GRANTs + RLS + triggers `updated_at`.

### Bloco E — UI de admin de integrações

Aba "Integrações" em `SettingsPage` agregando: HealthFlix, Biblioteca, SmartPeriodizer com status real (cor verde quando `/health` ok), botão Validar e botão Rotacionar chave.

## Detalhes técnicos

- Nenhuma chave é colocada em `.env`/cliente — tudo via Edge Function proxy + secrets.
- Iframe HealthFlix recebe `sandbox="allow-scripts allow-forms allow-popups"` (sem `allow-same-origin` por padrão; trocar apenas se o domínio for whitelisted).
- Realtime: `content_progress` exposto via Supabase Realtime para refletir minutos assistidos no Hub.
- `embed_url` é assinado e expira em 15 min — re-pedir ao expirar.

## Fora de escopo

- Não reimplantar as edges enviadas no zip (são do outro projeto).
- Não alterar fluxo de login/onboarding existente.
- Não tocar componentes não relacionados (workout execution, anamnese etc.).

## Confirmações antes de implementar

1. A `LIBRARY_PARTNER_KEY` para `vrbhljmsakruoejctclg/library-full` é a **mesma** `c3e857…` ou é outra chave? (Se outra, me envie.)
2. O domínio base do embed HealthFlix é `https://healthflixnine.lovable.app` (padrão da função) ou outro?
3. Posso seguir e criar os 4 secrets agora (`HEALTHFLIX_API_KEY`, `HEALTHFLIX_WEBHOOK_SECRET`, `LIBRARY_PARTNER_KEY`, `SMARTPERIODIZER_API_KEY` se já tiver)?