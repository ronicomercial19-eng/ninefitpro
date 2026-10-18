# FitPro ⇄ CORE OS (9ZAP)

## Produção

O FitPro chama a Edge Function do motor 9ZAP:

```text
https://hmppvtdlzsnxyiaozssu.supabase.co/functions/v1/zap-api
```

No Supabase do FitPro, os secrets necessários são:

```text
NINEZAP_BASE_URL=https://hmppvtdlzsnxyiaozssu.supabase.co/functions/v1/zap-api
NINEZAP_TENANT=fitpro
NINEZAP_SHARED_SECRET=<mesmo valor configurado no motor>
```

O segredo nunca deve aparecer no front-end ou no GitHub.

## Fluxo

```text
Chat do aluno
  ↓
supabase/functions/zap-proxy
  ↓ HMAC-SHA256(timestamp.corpo)
CORE OS / zap-api
  ↓
9FLOW ou agente A055/A011
  ↓
Thread do FitPro
  ↓ polling de mensagens
Chat do aluno
```

O contexto da thread deve incluir `user_id`, `name` e, quando disponível, `phone` em formato E.164. O telefone é necessário para retomar conversas guiadas de aulas e avaliações.

## Endpoints usados pelo proxy

- `POST /threads`
- `GET /threads?external_key=...`
- `POST /threads/{id}/messages`
- `GET /threads/{id}/messages?limit=50`

O FitPro usa `external_id` único para evitar mensagens duplicadas. O navegador nunca chama o CORE OS diretamente.

## Teste operacional

1. Abrir o RON no FitPro.
2. Enviar `menu`.
3. Confirmar resposta com as opções de aula.
4. Enviar texto livre, por exemplo `terminei o treino`.
5. Confirmar resposta do agente na mesma thread.

Se retornar `503`, o secret não está configurado no motor. Se retornar `401`, o valor do secret não é idêntico nos dois Supabase ou a assinatura está incorreta.
