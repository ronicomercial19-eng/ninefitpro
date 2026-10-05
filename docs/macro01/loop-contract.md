# Contrato único de loop v1

Gatilho → contexto/autorização/segurança → preparação → aprovação quando exigida → execução → confirmação → evento → atualização pertinente → próximo passo.

Implementação tipada: src/types/fitproLoop.ts. Ainda não é um motor de tarefas ou barramento global ativo; os loops serão migrados nas macros responsáveis.

## Requisição
schemaVersion, loop, athleteId, actor, idempotencyKey, origin, requestedAt. A identidade do actor será resolvida no servidor; aceitar um objeto tipado não autentica ninguém.

## Entrega
id + module + revision, state, requiresApproval, approvedRevision, confirmação da entidade real ou falha com retryability. Card do chat aponta para entrega específica, nunca somente para a home do módulo.

## Estados
preparing → awaiting_approval → approved → executing → confirmed.
blocked exige revisão e nova preparação. failed permite nova preparação. cancelled/superseded são terminais. Preparação sem aprovação pode executar somente quando a política de servidor permitir.
Sem entidade e instante confirmados, não marcar confirmed. Mudança de revisão exige aprovação atual.

## Eventos e efeitos
eventId estável, requestIdempotencyKey, aluno, loop, entidade, momento. Mesmo evento/tentativa não pode repetir efeito.
- SYNC: somente dimensões sustentadas pela ação; não aumenta por clicar num módulo.
- XP: recibo de regra servidor, opcional. Nunca quantidade decidida pelo cliente.
- Notificação: opcional, respeita preferência e necessidade; texto do chat não comprova sucesso.
- UI: atualização por eventos locais serve para recarregar dados; backend é a autoridade.

## Permissões
| Ator | Permitido | Exige outra decisão |
|---|---|---|
| Aluno | Próprios registros e ações previstas no plano | Dados alheios, assinatura e recompensa não são editáveis |
| Profissional vinculado | Prescrição/atribuição conforme atribuição e permissões | Acesso a qualquer aluno só por ser trainer não basta |
| RON no FitPro | Explicar e preparar dentro das ferramentas habilitadas | Não recebe autonomia comercial por conversar |
| RON no Prime | Executar trabalho autorizado e acompanhar | Aprovação atual para decisões relevantes; autorização específica para gasto/dados |
| Job/integração | Ferramenta e escopo servidor explícitos | Credencial privilegiada não pode chegar ao cliente |

## Compatibilidade
Manter argumentos/retornos usados, construir wrappers quando necessário e migrar chamadores antes de retirar endpoint. Aliases de treino rápido hoje delegam à mesma geração e validação. Demais funções legadas permanecem catalogadas.
Não sobrepor uma prescrição iniciada ou concluída. Padronização completa dos locks e versionamento de treino ocorre na Macro 03.
