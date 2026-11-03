# Acessos pendentes no Acompanhamento

Local: painel do professor → Acompanhamento (`/app/acompanhamento`). A seção aparece antes dos acompanhamentos e independe de selecionar um aluno.

1. Buscar o cadastro por nome ou e-mail. Entradas pelo Google ficam identificadas.
2. Abrir “Liberar acesso”. Escolher 30 dias, 90 dias, um ano ou cortesia sem vencimento e informar o motivo.
3. Para quem ainda não tem ficha, confirmar o vínculo como aluno do professor. Uma colisão de e-mail exige revisão da ficha existente; não cria duplicata nem assume o cadastro por e-mail.
4. Confirmar a liberação. A lista de alunos é atualizada e o botão “Abrir acompanhamento do aluno” leva à ficha vinculada.

Alunos com acesso já válido, inclusive concessões legadas reconhecidas pelo backend, ficam fora da fila. A lista consulta novamente ao voltar à janela, a cada 30 segundos ou ao tocar em Atualizar.

Administradores podem revisar a fila da equipe. Professores acessam seus próprios alunos e os novos cadastros destinados à equipe de entrada configurada para eles. A função rejeita contas de aluno, sessões anônimas, professores inativos, contas não verificadas e tentativas de assumir alunos de outro professor.

A cortesia cria uma assinatura ativa com valor zero, origem `professor_courtesy`, motivo e autor; não cria comprovante ou pagamento. O recibo imutável fica em tabela privada com RLS. A mesma tentativa pode ser repetida após perda de resposta sem duplicar a concessão. Essa tela trata liberação de contas pendentes; cobrança e cancelamento seguem seus fluxos próprios.

Publicação: aplicar `20261103185812_coach_pending_access_grants.sql` junto do frontend. Nenhuma conta real, incluindo Marcelo, é liberada pela migração; a concessão depende da confirmação no painel.

Verificações:

- `node scripts/qa-coach-pending-access.mjs`: PostgreSQL isolado, permissões, cadastros Google, acesso legado, vínculo atômico, validade, cortesia sem vencimento, auditoria e repetição da chamada.
- `node scripts/qa-pending-access-browser.mjs`: navegador com API simulada, app local em `127.0.0.1:4182` ou `QA_BASE_URL`, fluxo mobile, falha/retry e atualização da lista de alunos.
