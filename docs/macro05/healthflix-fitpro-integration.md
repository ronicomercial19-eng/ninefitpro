# Macro 05 — Streaming HealthFlix no FitPro

## Pedido incorporado ao roteiro

Trocar o placeholder de Streaming pelo catálogo HealthFlix integrado ao FitPro: o aluno autenticado abre um contexto/embed seguro sem novo login, assiste dentro do app e consegue retomar conteúdo quando a API suportar esse estado.

## Fluxo previsto

1. A rota de Streaming resolve o usuário e o vínculo canônico com aluno/professor no servidor.
2. A Edge Function `healthflix-open` exige JWT, identifica o aluno a partir da sessão/vínculo autorizado e usa o secret HealthFlix já cadastrado. IDs e perfil enviados pelo navegador não são autoridade.
3. A função chama `fitpro-student-context`, valida a resposta e devolve apenas a URL de embed e validade necessárias.
4. O componente de streaming valida origem das mensagens do iframe; nunca anuncia progresso salvo até a API/protocolo confirmar eventos de consumo e posição.
5. Quando HealthFlix permitir retomar consumo, persistir conteúdo, posição e tempo por aluno usando o contrato oficial da API, com idempotência, RLS e acesso do professor conforme autorização.

## Segurança e critérios de aceite

- `verify_jwt = true`; validar `auth.uid()` e associação autorizada entre identidade FitPro e estudante/professor.
- Secret somente em ambiente Edge Function. Nunca enviar chave privada ao cliente.
- CORS limitado às origens do app; evitar `*` em respostas com contexto autenticado.
- Não confiar em `fitpro_student_id`, `fitpro_professor_id`, `role`, email ou nome do body para autorização.
- Validar host/protocolo do `embed_url` antes de renderizar iframe e permitir mensagens somente da origem HealthFlix esperada.
- Retentativas limitadas e somente para falha transitória; não repetir credenciais/contexto indefinidamente.
- Confirmar com a API real se `fitpro-student-context` cria sessões de usuário e se emite progresso/posição antes de prometer “Progresso salvo”.
- QA: sessão válida e inválida, vínculo indevido, secret ausente, CORS, host de embed inválido, carregamento/fechamento, reprodução e progresso/retomada somente se suportados pelo contrato real.

## Dependências e escopo

Este item pertence à Macro 05 (Player e consumo de conteúdo) e não à Macro 03 (periodização e jornada de treinos). Requer confirmação técnica do contrato da API HealthFlix e das origens do app antes da implementação; não cria secret novo.
