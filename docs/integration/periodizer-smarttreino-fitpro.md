# Contrato de integração: Periodizer, SmartTreino e FitPro

Estado: etapas locais de segurança e publicação preparadas para revisão; nenhuma migração ou Edge Function deste trabalho foi publicada. Inspeção de código e produção em 8 de outubro de 2026.

## Responsabilidades

- Smart Periodizer: plano científico anual, fase vigente, limites de carga e regras de progressão.
- SmartTreino: composição e versionamento das sessões executáveis dentro do plano vigente.
- FitPro: apresentação da prescrição, protocolos do professor, execução, feedback e histórico realizado.

As estruturas existentes têm papéis diferentes e serão preservadas. `student_training_assignments` entrega conteúdos e treinos do profissional; `periodization_annual_plans` contém o plano anual; `daily_workouts` e `workout_exercises` contêm a sessão diária; `workout_executions` e `workout_exercise_sets` contêm o realizado. PDF/HTML atribuído não equivale automaticamente a um plano anual calculado. Um usuário pode gerenciar o próprio treino ou estar vinculado a um professor.

## Identidade e autorização

`auth.users.id` é o usuário, `athletes.id` é o aluno. Chamadas com chave de serviço devem conferir o alvo no servidor: conta do próprio atleta (`athletes.user_id`), vínculo (`athlete_auth_link`), profissional designado (`athletes.coach_id`) ou administrador. Papel genérico de professor, sem vínculo com o aluno, não autoriza o alvo.

## Contrato de dados confirmado

| Conceito | Fonte atual | Regra de integração |
| --- | --- | --- |
| Aluno | `athletes.id` | Mesmo UUID nos três produtos; `auth.users.id` é identidade de acesso, não chave da prescrição. |
| Plano vigente | `athlete_periodizations.annual_plan_id` com status `in_progress`, ligado a `periodization_annual_plans.id` com status `active` | Periodizer determina fase, carga e limites. Hoje não há coluna de revisão imutável; não inferir revisão de `updated_at`. |
| Regra de sessão | `smart_treino_macro_rules.id` e `aluno_id` | SmartTreino só pode gerar para o aluno dono da regra e, no modo integrado, dentro do plano vigente. O modo comercial independente continua possível com origem explícita. |
| Prescrição do dia | `daily_workouts.id`, `athlete_id`, `workout_date` e `workout_exercises` | FitPro lê essas tabelas. `student_training_assignments` continua como caminho do profissional/conteúdo; não substituir por sessão automática. |
| Realizado | `workout_executions.daily_workout_id`, `athlete_id`, `status`, `started_at` e séries executadas | Uma sessão iniciada, concluída ou com qualquer exercício executado não pode ser substituída por geração/ajuste. |
| Entrega | `fitpro_delivery_log` e recibo do destino | `daily_workouts` salvo significa “publicado no banco compartilhado”; “entregue via evento” exige resposta válida do endpoint e leitura recuperável para o mesmo aluno. |

Na inspeção de produção, nenhum atleta tinha dois planos anuais `active` ou duas atribuições `in_progress`, e nenhuma atribuição ativa apontava para plano anual inativo. Isso descreve os dados de 8/10/2026, não é garantia estrutural: ainda é preciso impedir novos conflitos por migração e validar o fluxo de substituição sem apagar histórico. A conexão FitPro ativa está sem professor associado e não há linhas em `fitpro_student_map`; a rota de eventos precisa, portanto, de uma regra explícita para o banco compartilhado antes de aceitar recibos.

A etapa 1 acrescenta esse controle nas chamadas do FitPro a `smartperiodizer-proxy` e `smartperiodizer-sync`. O proxy exige um alvo único e confere que `plan_id`, quando presente, pertence ao mesmo atleta. A função de sincronização foi reconciliada com a versão publicada que usa `sync_fitpro_planejamento`. Uma nova migração torna `vw_athlete_periodizacao_ativa` uma view `security_invoker`, de modo que a leitura obedeça às políticas das tabelas base. Nenhuma tabela, rota ou dado foi removido.

## Mudanças locais adicionais, ainda sem publicação

- No Periodizer, `deliver_periodization_to_athlete` passa a conferir que o plano pertence ao atleta e que o usuário autenticado é o próprio atleta, seu profissional designado ou administrador antes de executar as atualizações existentes. O corpo de geração e snapshot foi preservado.
- No SmartTreino, a nova `fn_publish_smart_treino_day` grava sessão e exercícios na mesma transação e preserva qualquer treino existente para o mesmo atleta e dia. A geração verifica a identidade do atleta e a regra macro, e só informa sucesso quando todas as sessões têm recibo de publicação ou de preservação.
- A entrega semanal tenta enviar apenas sessões publicadas. A função de entrega e a de nova tentativa exigem autenticação e vínculo com o atleta; o processamento em lote exige administrador ou chave de serviço. O construtor e a tela de entregas só anunciam entrega quando o recibo confirma sucesso. O orquestrador registra `generated` quando o treino foi salvo, mas a entrega não foi confirmada.
- Os geradores `generate-full-plan` e `generate-workout` do SmartTreino agora autorizam o `studentId` antes de usar service role. O cadastro legado `alunos` mantém acesso para seu professor ou conta do próprio aluno com e-mail verificado; `generate-full-plan` também aceita o atleta canônico vinculado. `generate-workouts` do Periodizer valida JWT e vínculo do atleta; o `config.toml` passa a refletir `verify_jwt=true` já observado na publicação. O proxy SmartTreino do FitPro confere o alvo antes de encaminhar a chave de integração.
- As duas versões locais de `fitpro-api` agora conferem o alvo e a titularidade do plano antes das rotas de consulta/escrita. A chave de conexão sem professor não autoriza selecionar qualquer atleta por ID: é necessário usuário vinculado ou chamada interna com service role. O proxy FitPro só encaminha o JWT à API quando o endpoint configurado aponta para a função do mesmo projeto Supabase. No SmartTreino, as rotas parceiras usam autorização central no resolvedor de `athletes`, `alunos` e `students`, inclusive para ID externo e e-mail.
- A rota `/v1/fitpro/events` ainda não existe na função `fitpro-api`. Por isso, essas mudanças não tornam a entrega HTTP funcional por si sós. O treino já gravado em `daily_workouts` pode estar visível ao aluno, mas isso é um estado diferente de confirmação do evento de entrega.

## Contrato-alvo das próximas etapas

1. Toda sessão criada pelo SmartTreino deverá carregar `athlete_id`, ID e revisão do plano Periodizer, fase/semana usada, origem, data local e revisão da prescrição.
2. Geração e ajuste deverão ser idempotentes por aluno, data e revisão. Sessões com execução iniciada/concluída serão preservadas; uma nova revisão será explícita, com histórico anterior disponível.
3. O FitPro continuará a renderizar conteúdo profissional e sessões automáticas, mas apresentará a origem e a versão de cada uma. Execução será vinculada à revisão efetivamente mostrada ao aluno.
4. Entrega só será considerada confirmada após gravação autorizada, leitura recuperável pelo aluno e recibo de evento coerente. Falha parcial terá estado explícito e opção de repetição segura.
5. Treino rápido, ajuste estruturado e ajuste por texto livre serão ligados a esse contrato sem eliminar os caminhos atuais até que sua equivalência seja testada.

## Verificação da etapa 1

- Teste local `tests/athlete-access.test.mjs`: dono, professor vinculado, conta ligada e administrador permitidos; usuário estranho e profissional não vinculado negados.
- Typecheck do FitPro concluído sem erros.
- `git diff --check` sem problemas.
- Build Vite não pôde concluir no ambiente local: o pacote nativo do SWC falhou ao carregar na instalação pnpm do Windows. Isso não valida o bundle; o build deve ser repetido em ambiente com dependências nativas íntegras antes de publicar.
- A migração ainda não foi aplicada. Após aplicar em ambiente de teste, repetir uma consulta à view como aluno e como outro aluno e conferir que cada sessão vê somente suas linhas; confirmar também o acesso do profissional vinculado.

## Pendências antes de produção

Validar as migrações e Edge Functions em ambiente isolado, inclusive políticas RLS com duas identidades sintéticas e sem dados reais de alunos. Ainda faltam o recibo real da rota de eventos FitPro, ID/revisão única do plano ativo, a geração SmartTreino vinculada à fase científica do Periodizer, a leitura da mesma revisão no FitPro, e a proteção de todos os caminhos de ajuste. A integração deve manter os modos comercial independente, autogestão e trabalho do professor.

Há duas fontes diferentes de `fitpro-api` no Git: a do FitPro reproduz o endpoint publicado e não tem `/v1/fitpro/events`; a do Periodizer tem essa rota, mas ela apenas grava log. Não publicar uma sobre a outra sem reconciliar recursos e definir recibo verificável. A conexão ativa observada não tem professor e o mapa de alunos está vazio: chamadas apenas com sua chave passarão a ser negadas no código preparado. O rollout exige encaminhar o JWT validado pelo proxy ou autenticação interna, e testar os consumidores comerciais antes do deploy.

O typecheck do FitPro passou após essas alterações. O do SmartTreino continua falhando em arquivos preexistentes fora desta etapa (`chart`, `Profile`, `UserSettings`, serviços de alunos/perfil e dependências de teste ausentes). O Periodizer está sem dependências instaladas neste checkout. O build dos frontends permanece sem validação por causa do binário nativo SWC no ambiente Windows atual. Não considerar os artefatos locais aptos para produção antes de repetir essas verificações em ambiente íntegro. Nenhum dado de aluno foi alterado.
