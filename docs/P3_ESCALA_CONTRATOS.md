# P3 — Contratos canônicos de escala

## Objetivo

Unificar Professor, Aluno, Train, Dieta, Progress, SmartTreino, SmartPeriodizer e Planejamento sem duplicar fonte de verdade.

## Regras

1. O aluno é resolvido exclusivamente pelo usuário autenticado e pelo vínculo canônico de atleta.
2. Prescrições são templates versionados; a atribuição ao aluno é uma instância própria.
3. Execução, progresso e métricas pertencem ao aluno e nunca ao template.
4. Apenas templates aprovados podem ser aplicados.
5. Toda alteração registra autor, data, versão anterior, versão nova e motivo.
6. O frontend não cria ou altera permissões, plano, XP ou vínculo de aluno.
7. Ausência de dado permanece nula/indisponível; não usar mock ou zero artificial.
8. Professor pode consultar apenas alunos sob sua autorização; aluno só consulta seus próprios dados.

## Estados de template

- draft: rascunho editável;
- review: aguardando revisão;
- approved: disponível para aplicação;
- archived: não pode receber novas atribuições.

## Contrato de atribuição

Uma atribuição deve conter: template_id, template_version, athlete_id, created_by, starts_at, ends_at opcional, status e contexto individualizado.

## Contrato de execução

A execução referencia a atribuição e preserva os dados efetivamente realizados: started_at, completed_at, status, duração real, séries confirmadas e origem.

## Critérios de aceite

- Train, Dieta, Progress e painel do professor exibem a mesma atribuição e versão.
- Alterar um template não altera execuções já realizadas.
- Usuário sem autorização recebe vazio/403, nunca dados de outro aluno.
- Migrações e RPCs usam RLS e identidade autenticada.
- Build, testes de tipo e testes positivo/negativo de autorização passam antes do merge.

## Próximos artefatos

1. Migration/RPC para versionamento e atribuição.
2. Tipos frontend gerados a partir do contrato.
3. Adaptadores de Train, Dieta, Progress e painel do professor.
4. Auditoria e testes de isolamento por usuário.
