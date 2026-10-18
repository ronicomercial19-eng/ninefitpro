# Integração 9FIT Community → FitPro

## Status

O FitPro possui a Edge Function `community-proxy`, que encaminha as chamadas do front-end para a API pública do Community sem expor credenciais no navegador.

O card **Acessar Comunidade** navega para `/9fit/community`, que consome o feed pela API. Não há iframe nesse fluxo.

## Contrato confirmado

Projeto Supabase do Community: `piqqmrwinullmenoyyfr`

Base: `https://piqqmrwinullmenoyyfr.supabase.co/functions/v1/public-api`

O endpoint público confirmou os seguintes recursos:

- `GET /community/posts?limit=30`
- `GET /community/groups`
- `GET /categories`
- `GET /products?limit=50`
- `GET /products/:slug`

Autenticação da API do Community:

```text
x-api-key: <COMMUNITY_API_KEY>
```

## Configuração necessária no FitPro

Cadastrar no Supabase do FitPro, exclusivamente como secret de Edge Function:

```text
COMMUNITY_API_KEY=<chave bruta autorizada pelo Community>
```

Não usar `anon`, `publishable` ou `service_role` como essa chave. Nenhuma chave deve ser colocada em React, `.env` público ou documentação versionada.

## Rotas internas do FitPro

```text
GET /functions/v1/community-proxy?action=feed
GET /functions/v1/community-proxy?action=posts
GET /functions/v1/community-proxy?action=groups
GET /functions/v1/community-proxy?action=categories
GET /functions/v1/community-proxy?action=products
```

Essas rotas exigem o Bearer token do usuário autenticado no FitPro. A Edge Function valida a sessão e somente então chama a API do Community com a chave server-side.

## Checklist da equipe do Community

1. Entregar uma API Key válida para o ambiente de produção.
2. Confirmar que a chave tem acesso aos endpoints acima.
3. Confirmar o formato final dos objetos de posts e grupos para o componente visual do FitPro.
4. Informar limites de rate limit e códigos de erro esperados.
5. Avisar antes de alterar a base URL ou os nomes das rotas.

O endpoint público respondeu corretamente ao probe sem credencial e publicou a lista de recursos. A leitura de dados reais depende da `COMMUNITY_API_KEY` autorizada.
