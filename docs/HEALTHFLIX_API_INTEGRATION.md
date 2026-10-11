# HealthFlix ↔ FitPro — API & SDK de Integração (v1)

Documento único e definitivo para o time do **FitPro** integrar o catálogo HealthFlix
(streaming de aulas) dentro do app, fechando o loop:

```
FitPro → Train → Streaming → API HealthFlix → Catálogo no iframe
```

---

## 0. Conceitos

- **HealthFlix** = serviço de curadoria de conteúdo (vídeos, programas, aulas).
- **FitPro** = app cliente que consome o catálogo e atribui conteúdo a alunos.
- A integração é **machine-to-machine** via API Key + opcional webhook.
- O usuário final (aluno/professor) entra na HealthFlix via **deep-link assinado** (`/embed?ctx=<token>`), sem precisar de senha.

### Identidades

| Quem | Onde mora | Como entra na HealthFlix |
|---|---|---|
| Backend do FitPro | servidor FitPro | header `x-api-key: <FITPRO_API_KEY>` |
| Aluno do FitPro | app FitPro | iframe com `embed_url` retornado por `fitpro-student-context` |
| Professor do FitPro | app FitPro | mesmo fluxo, com `role: "professor"` |

A **API Key bruta** fica **somente** no backend do FitPro. A HealthFlix guarda apenas o `sha256` em `fitpro_connections.api_key_hash`.

---

## 1. Base URL

```
https://kixjiwsfogqztlgiiztp.supabase.co/functions/v1
```

Todas as funções aceitam **CORS** (`*`) e respondem JSON.
Para Supabase Edge Functions também é necessário enviar o header `apikey` (anon key pública) **junto** com o `x-api-key`:

```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...m-3-rIPbA_9fEKrZEd0wVe7hZRqBA3vR16e9zzifadY
x-api-key: <FITPRO_API_KEY>
Content-Type: application/json
```

> O `apikey` é público — pode ficar embutido no SDK. O `x-api-key` **nunca** sai do backend.

---

## 2. Endpoints

### 2.1 `GET /fitpro-health`
Healthcheck público. Não exige `x-api-key`.
```json
{ "status": "ok", "module": "HealthFlix", "version": "v1", "time": "..." }
```

### 2.2 `POST /fitpro-connect`
Confirma a conexão e registra `endpoint_url` (webhook) e `webhook_secret`.
```json
// body
{
  "endpoint_url": "https://api.fitpro.app/webhooks/healthflix",
  "fitpro_tenant_id": "fitpro-prod",
  "webhook_secret": "<segredo compartilhado>"
}
// 200
{ "ok": true, "status": "connected", "connection_id": "uuid" }
```

### 2.3 `POST /fitpro-sync`
Faz upsert em massa de alunos/professores do FitPro.
```json
{
  "users": [
    { "fitpro_user_id": "stu_123", "role": "student", "email": "a@b.com", "full_name": "Ana", "professor_fitpro_id": "prof_9" },
    { "fitpro_user_id": "prof_9", "role": "professor", "email": "p@b.com", "full_name": "Prof" }
  ]
}
// 200 → { "ok": true, "synced": 2 }
```

### 2.4 `POST /fitpro-student-context` ★ (loop principal)
Gera **deep-link assinado** para abrir o catálogo HealthFlix no contexto do usuário do FitPro.

```json
// body — aluno
{
  "fitpro_student_id": "stu_123",
  "fitpro_professor_id": "prof_9",
  "role": "student",
  "view": "home",               // "home" | "library" | "workout"
  "return_url": "/home",        // opcional
  "email": "a@b.com",           // opcional, enriquece o cadastro
  "full_name": "Ana",           // opcional
  "permissions": ["watch", "favorite"]
}

// 200
{
  "ok": true,
  "embed_url": "https://healthflixnine.lovable.app/embed?ctx=<token>&return=/home",
  "role": "student",
  "expires_at": "2026-06-07T12:15:00Z"
}
```

> **Não exige `/fitpro-sync` prévio** — esta função faz `upsert` automático do usuário.
> O token expira em **15 min** e é uso único conceitual; gere um novo a cada abertura.

**Uso no FitPro:** quando o usuário toca em `Train → Protocol → Streaming`, o backend do FitPro chama este endpoint e devolve o `embed_url` ao app, que abre num `<iframe>` ou `WebView`.

### 2.5 `GET /fitpro-content`
Lista o catálogo unificado (9FIT + curadoria internacional).
```json
{
  "ok": true,
  "total": 146,
  "items": [
    { "id": "1", "title": "...", "category": "HIIT", "level": "Intermediário",
      "duration": "30 min", "thumbnail": "...", "video_url": "https://youtube.com/..." }
  ]
}
```

### 2.6 `POST /fitpro-content-assign`
Professor atribui um conteúdo a um aluno.
```json
{
  "fitpro_student_id": "stu_123",
  "fitpro_professor_id": "prof_9",
  "content_id": "42",
  "content_title": "HIIT 30min",
  "content_category": "HIIT",
  "due_at": "2026-06-15T10:00:00Z"
}
// 200 → { "ok": true, "assignment_id": "uuid" }
```

### 2.7 `GET /fitpro-student-progress?fitpro_student_id=stu_123`
Lista o progresso do aluno.
```json
{ "ok": true, "progress": [
  { "content_id": "42", "progress_percent": 100, "completed_at": "..." }
] }
```

### 2.8 `POST /fitpro-events`
FitPro envia eventos extras para a HealthFlix (opcional, bidirecional).
Tipos com efeito colateral em `content_progress`:
`content_started`, `content_progress_updated`, `content_completed`.

```json
{
  "event_type": "content_completed",
  "fitpro_student_id": "stu_123",
  "entity_type": "content",
  "entity_id": "42",
  "payload": {
    "progress_percent": 100,
    "last_position_seconds": 1800,
    "duration_seconds": 1800,
    "watched_seconds": 1800
  }
}
```

Para que o aluno retome no mesmo ponto, o player deve enviar `last_position_seconds`, `duration_seconds` e `watched_seconds` nos eventos de início/progresso/conclusão. O FitPro persiste essa posição no histórico HealthFlix e atualiza a atribuição correspondente quando `entity_id` corresponde ao `content_ref` atribuído.

---

## 3. Webhook reverso (HealthFlix → FitPro)

Sempre que houver `content_started`, `content_completed`, `content_assigned`, `engagement_alert_created`, etc., a HealthFlix faz `POST` em `fitpro_connections.endpoint_url` com:

```
POST <endpoint_url>
Headers: { "x-webhook-secret": "<webhook_secret>" }
Body:
{
  "event_type": "content_completed",
  "module": "HealthFlix",
  "fitpro_student_id": "stu_123",
  "fitpro_professor_id": "prof_9",
  "entity_type": "content",
  "entity_id": "42",
  "payload": { "progress_percent": 100 },
  "created_at": "2026-06-07T12:00:00Z"
}
```

Responder **2xx** em ≤5s. Em falha, o evento fica em `integration_events.delivered=false` para retry manual/cron.

---

## 4. Tratamento de erros e retry

| Código | Causa | Ação recomendada no SDK |
|---|---|---|
| 401 `missing x-api-key` / `invalid api key` | header ausente ou chave revogada | **NÃO** retry. Alertar admin. |
| 400 `...required` | body inválido | corrigir e reenviar |
| 405 | método errado | corrigir verbo HTTP |
| 5xx ou network | indisponibilidade | **retry exponencial**: 500ms, 1s, 2s, 4s (máx 4 tentativas) |
| outros | desconhecido | exibir fallback e logar |

O SDK abaixo já implementa essa política.

---

## 5. SDK oficial (TypeScript / JavaScript)

Drop-in para qualquer projeto Node 18+, Bun, Deno ou browser.
Arquivo: `sdk/healthflix-sdk.ts` neste repositório — copie para o FitPro.

```ts
import { HealthFlixClient } from "./healthflix-sdk";

const hf = new HealthFlixClient({
  apiKey: process.env.HEALTHFLIX_API_KEY!,   // backend only
  // baseUrl, supabaseAnonKey já têm default para produção
});

// 1. Aluno toca em Train → Streaming → o backend gera o link e devolve ao app
const { embed_url } = await hf.studentContext({
  fitpro_student_id: "stu_123",
  fitpro_professor_id: "prof_9",
  role: "student",
  view: "home",
  email: aluno.email,
  full_name: aluno.nome,
});

// 2. App FitPro abre no iframe / WebView
//    <iframe src={embed_url} allow="autoplay; fullscreen" />

// 3. Professor atribui um conteúdo
await hf.assignContent({
  fitpro_student_id: "stu_123",
  fitpro_professor_id: "prof_9",
  content_id: "42",
  content_title: "HIIT 30min",
  content_category: "HIIT",
});

// 4. Sincronizar planejamento
await hf.syncUsers([{ fitpro_user_id: "stu_123", role: "student", email: "a@b.com" }]);

// 5. Consultar progresso
const { progress } = await hf.studentProgress("stu_123");
```

### Mensagens amigáveis (i18n PT-BR)
O SDK expõe `HealthFlixError` com `.userMessage` pronto para UI:

| Código interno | userMessage |
|---|---|
| `AUTH` | "Conexão com a HealthFlix expirou. Avise o administrador." |
| `BAD_REQUEST` | "Dados incompletos para abrir o catálogo." |
| `UNAVAILABLE` | "HealthFlix temporariamente indisponível. Tentando novamente..." |
| `NETWORK` | "Sem conexão. Verifique sua internet." |

---

## 6. Loop completo `FitPro → Train → Streaming → Catálogo`

```text
[App FitPro]                                [Backend FitPro]                  [HealthFlix]
  toca em "Streaming"  ───────POST /healthflix/open──►
                                                hf.studentContext(...)  ───POST /fitpro-student-context──►
                                                                         ◄── { embed_url, expires_at } ──
                                            ◄── { embed_url } ─────────
  abre <iframe src=embed_url>
  ──────────────────────────────────GET /embed?ctx=...─────────────────────────────────►
                                                                          decodifica token,
                                                                          cria sessão guest,
                                                                          redireciona /home
  ◄────────────── Catálogo renderizado, vídeos liberados ──────────────────────────────
```

Quando o aluno completa um vídeo, a HealthFlix dispara webhook
para `endpoint_url` configurado em `/fitpro-connect`, e o FitPro
atualiza o perfil/protocolo do aluno.

---

## 7. Planejamento (Smart Periodizer)

A função `smartperiodizer-sync` (lado FitPro) deve:
1. Buscar planos em `periodization_plans_remote`.
2. Comparar com o catálogo via `GET /fitpro-content`.
3. Atualizar a página **Planejamento** mostrando Ondas 1–7 com cards do catálogo.
4. Ao salvar, chamar `POST /fitpro-content-assign` para cada `content_id` da onda.

---

## 8. Checklist de Go-Live FitPro

- [ ] Backend guarda `FITPRO_API_KEY` em secret manager.
- [ ] Backend expõe rota interna `POST /healthflix/open` que chama `hf.studentContext`.
- [ ] App abre o `embed_url` retornado em iframe/WebView.
- [ ] Webhook `/webhooks/healthflix` registrado via `POST /fitpro-connect`.
- [ ] Tratamento de `HealthFlixError.code === "AUTH"` aciona alerta no admin.
- [ ] Retry exponencial habilitado (default do SDK).
- [ ] Página Planejamento consome `periodization_plans_remote` + catálogo.

---

## 9. Suporte

Logs em tempo real: Supabase Dashboard → Functions → Logs.
Eventos persistidos: tabela `integration_events` (filtrar por `connection_id`).
Status: `GET /fitpro-health`.
