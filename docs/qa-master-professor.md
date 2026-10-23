# QA MASTER — Professor FitPro

Fonte principal: dossiê complementar de 20/10/2026 em ninefitpro.lovable.app, painel /app.
O relatório de 11/09 sobre Staff Connection/stevent.lovable.app é separado: talentos, vagas, contratos, pagamentos e alegada exposição pública não pertencem ao painel FitPro. Não declarar esse incidente corrigido neste repositório.

## Fila de correção e reteste

| IDs QA-PROF | Frente | Estado em 22/10/2026 |
| --- | --- | --- |
| 001, 002 | SmartPeriodizer e FitCopilot | Rotas atuais possuem componentes funcionais sob PrivateRoute/AppLayout. Pendente sessão real, refresh e contrato externo; existência de componente não prova integração. |
| 003, 006 | Análise e Assistente IA | Prioridade P0/P1: reproduzir erro e verificar autenticação, payload, timeout e resposta antes de mudar backend. |
| 004 | RON sem alunos | Consulta usa coach_id e ignora erro; pendente reconciliar papel, escopo e estados de carregamento sem ampliar autorização. |
| 005, 012, 019 | Contagens | Confirmado erro em Estatísticas: contava atribuições como alunos. Corrigido cálculo por pessoa e categorias exclusivas; erros de consulta agora bloqueiam indicadores em vez de aparentar zero. Ainda pendente unificar escopo com Dashboard/Relatórios. |
| 007 | Postura | Pendente erro recuperável, motivo e reprocessamento; não tratar artefato parcial como laudo. |
| 008, 009, 017 | Roadmap e conectores | Pendente distinguir implementado, configurado, health check e operação validada. |
| 010 | Monetização | Pendente sandbox checkout/webhook; nenhuma transação real autorizada nesta rodada. |
| 011 | Treino IA | Pendente geração → persistência → entrega ao aluno com fixture autorizada. |
| 013 | Agenda | Pendente escopo, status, fuso e atualização após reserva. |
| 014 | Duplicidades | Nomes iguais não provam duplicação; não mesclar nem excluir cadastros automaticamente. |
| 015, 018 | Ações sensíveis e dados clínicos | Conferir evidências existentes em professor-checklist-progress.md; pendente completar autorização/auditoria/arquivos. Sem revogação ou rotação automática. |
| 016 | Exercícios | Pendente paginação, mídia e atribuição. |
| 020, 021 | Tour e configurações | Pendente persistência e teste reversível com conta autorizada. |

## Primeira correção verificável

trainingFollowUp conta IDs únicos no escopo da consulta. Entre planos ativos do mesmo aluno, a categoria segue: vigente (inclui vencimento hoje), sem data, vencido; sem atribuição resulta em sem treino. Um aluno não pode ocupar múltiplas fatias. Data usa calendário local do navegador, não corte UTC. Duas regressões automatizadas cobrem duplicação, isolamento e precedência.

## STEVENT — dependência externa

Achados QA-STAFF-001 a 020 permanecem em fila externa e não verificados. Correção de autenticação/RLS/tenant exige acesso ao código e ao projeto corretos. Rotacionar credenciais ou encerrar sessões exige autorização específica e avaliação de impacto.

## Atualização de 23/10/2026 — integração implementada

A entrega atual está detalhada em [professor-aluno-integracao.md](professor-aluno-integracao.md). Os estados antigos abaixo/acima permanecem como histórico; consultar o novo documento para implementação, backend publicado, testes e fechamento operacional. QA autenticado real e publicação Lovable continuam com o usuário.
