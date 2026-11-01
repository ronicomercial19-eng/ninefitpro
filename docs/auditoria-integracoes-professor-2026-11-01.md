# Integrações do professor — 2026-11-01

Base: `origin/main` / Lovable `5bccdd23bb6f348a4190b1f64d71855c25a4382d`. Trabalho separado do PR #131 (perfil, histórico e navegação). O checkout original, 49 commits atrás e com alterações locais, foi preservado.

## Conta e banco

A conta indicada pelo responsável tem perfil `admin`, está ativa e é responsável pelos 38 alunos. As outras duas contas com papel `professor` não têm alunos, mas isso não é o bloqueio da conta indicada. Nenhum responsável foi alterado.

As RPCs de contexto, publicação de treino/ciclo e histórico profissional existem, são executáveis por `authenticated` e não por `anon`. RLS permanece habilitada. Consulta de contexto e leitura das tabelas foram verificadas com claims da conta indicada e `SET LOCAL ROLE authenticated`, dentro de transação revertida.

`scripts/qa-professor-integrations.sql` verifica contexto, criação/edição/exclusão de modelos e gravação confirmada do histórico profissional. Todos os registros de teste são revertidos com `ROLLBACK`; não publica treinos de alunos. Super séries exigem pelo menos dois exercícios.

## Rotas

| Rota | Fluxo / resultado desta revisão |
| --- | --- |
| `/app/super-series` | Biblioteca existente → modelo validado → editor com aluno preservado. Escrita testada no banco em transação revertida. |
| `/app/series-referencia` | Mesmo contrato de exercícios, autoria e revisão. Biblioteca atualmente vazia; não foram inventados modelos. Escrita testada no banco. |
| `/app/smart-treino` | Substituídos atalhos repetidos por funções Prescrever / Ajustar / Planejar. Reutiliza o editor e a publicação canônicos. Proxy aceita e valida `student_external_id`, verifica conflitos e encaminha os dois nomes do contrato. |
| `/app/smart-periodizer` | Mantidos editor de ciclo e entrega revisada. Proxy passa a resolver referências Vault e limita espera do provedor. O Supabase compartilhado com FitPro é intencional. |
| `/app/fit-copilot` | Conversa profissional disponível no próprio painel, usando aluno selecionado, contexto autorizado e histórico persistido. Não declara sincronização com o projeto externo Fit360. |
| `/app/treino-ia` | Mantido editor de rascunho → revisão → RPC de publicação; nenhuma geração publica automaticamente. |
| `/app/assistente-ia` | Mantida conversa com contexto profissional. Erros textuais do controle de acesso agora chegam ao usuário. |
| `/app/analise-ia` | Mesmo serviço, modo de análise e histórico separado por professor/aluno. |
| `/app/healthflix` | Atribuição de vídeos pelo `LibraryAssignDialog` existente, gravando em `student_library_assignments`. Proxy respeita o nome da variável de credencial configurada e Vault. |
| `/app/community` | Feed nativo com atualização/erro recuperável. Corrigido prefixo `/public-api`, timeout e configuração de destino/credencial pelo conector. Provedor externo ainda indisponível no teste de DNS. |
| `/app/postura-pro` | Só confirma resultado completo com `status=success`, segmentos e protocolo; falha de gravação não retorna sucesso. Credenciais Vault suportadas. Adapter de quatro fotos preparado no repositório do provedor; publicação externa pendente. |
| `/app/ron` | Reutiliza conversa profissional autorizada e armazenamento de histórico. |
| `/app/nexus` | Acesso operacional para staff e atualização explícita. Eventos continuam sujeitos a RLS; configuração habilitada não é apresentada como entrega comprovada. |
| `/app/skills` | Consulta operacional de skills ativas também para professores. Administração global recolhida e restrita a administradores, com RLS preservada. |

Configurações de APIs administrativas ficam recolhidas e são montadas somente ao abrir, mantendo as ações do professor em primeiro plano.

## Backend FitPro publicado

Projeto `mfrydtrzjxscbkaiwfnw`: `smartreino-proxy` v35, `smartperiodizer-proxy` v34, `healthflix-proxy` v57, `postura-pro-scan` v61. `community-proxy` v17, com destino e credencial configuráveis.

Mantidos `withPaidAccess`, autenticação, limites, autorização de aluno e configuração anterior de JWT. Os arquivos de controle compartilhados foram comparados com os publicados antes do deploy e eram iguais. Smoke tests sem sessão retornaram `401/account_required` nos cinco serviços, confirmando inicialização e proteção; isso não comprova uma operação autenticada de ponta a ponta. Não houve erro de inicialização na consulta de logs posterior ao deploy inicial.

## Limites e dependências restantes

- **Postura Pro:** o projeto `rdyfekpeoeyymuqzujrr` recusou acesso pela conexão Supabase disponível. A resposta pública de autenticação difere do código do Git; antes de publicar o adapter, comparar com a função efetivamente implantada para preservar alterações externas ao Git. Adapter mantém token de integração, só aceita quatro URLs assinadas do bucket de avaliações FitPro e não lê/escreve alunos do provedor. A rota antiga `/analysis/photo` também passa a usar o contrato real `images/clientData`.
- **Comunidade:** o host `piqqmrwinullmenoyyfr.supabase.co` não resolveu na verificação externa; a URL coincide com a configuração do repositório do provedor. É necessário confirmar/restaurar o projeto externo ou configurar o destino ativo e a credencial. Corrigir apenas o caminho não resolve DNS/projeto indisponível.
- **HealthFlix e Fit360:** seus projetos Supabase não apareceram nas conexões acessíveis. Não foram alterados dados/credenciais desses projetos nem alegada sincronização autenticada sem evidência.
- Frontend permanece na branch/PR até integração/publicação. A aplicação publicada ainda possui o FitCopilot de atalhos; os assets públicos de Super Séries e Referências usam `TrainingTemplateLibrary`. A correspondência desses componentes não prova o SHA exato da publicação.
- QA visual e operações reais autenticadas ficam com o responsável, conforme solicitado. Não foram enviados e-mails de acesso nem criada sessão em nome de usuários.

## Verificação

- 86 testes automatizados do FitPro passaram, incluindo isolamento de aluno, erros de acesso, resolução Vault e rejeição de relatórios posturais inválidos.
- Typecheck e build de produção passaram. Há o aviso preexistente de chunks grandes.
- Script SQL transacional passou após corrigir a fixture de super série para dois exercícios.
- Provedor Postura: dois testes do contrato de imagens passaram; checagem sintática passou. Sem deploy externo por falta de permissão.
