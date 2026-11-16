# Revisão da integração antes de publicar

Atualizado em 10 de outubro de 2026. Os três checkouts apontam para o mesmo projeto Supabase. Este pacote é local; nenhuma migração, Edge Function ou interface foi publicada.

## Contrato que será ativado

1. `athletes.id` identifica o aluno; `athlete_periodizations` identifica a atribuição vigente e `periodization_annual_plans` mantém a decisão científica. O SmartTreino resolve fase e semana pela data e registra plano, atribuição, fase, semana e snapshot em `daily_workouts`. Sem plano ativo, usa a origem independente explícita.
2. Sessões de força usam `workout_exercises` e séries. Corrida/cardio usa `prescription_segments` com `distance_m` e/ou `duration_seconds`, zona e RPE. Sessão mista mantém ambos, sem converter metros em repetições.
3. A publicação atômica preenche apenas dias vazios. Sessão existente de outra fonte/plano, prescrição inválida ou execução já existente bloqueia a geração com motivo. Um gatilho preserva exercícios e prescrição da sessão iniciada.
4. O aluno vê o plano no Planejamento e as sessões no Train; execução de endurance grava tempo, distância e RPE. Professor vê o plano ativo e a disponibilidade do dia. A entrega só vira sucesso após recibo de serviço ligado à sessão recuperável.
5. `periodization_plan_revisions` registra uma decisão de recuperação por atribuição e semana, com recomendação de origem, versão do plano, bloco de deload usado e autor. `daily_workouts.plan_snapshot.revision_id` liga a sessão gerada à revisão; a entrega desse ajuste filtra pelo mesmo ID. O plano anual e sessões iniciadas permanecem intactos.

## Ordem de implantação para revisão

As migrações são aditivas e devem ser aplicadas ao projeto compartilhado nesta ordem: FitPro `20261008085903`, FitPro `20261008085904`, Periodizer `20261008091036`, SmartTreino `20261008091303`, FitPro `20261008130000`, FitPro `20261008130500`, FitPro `20261008131000`, SmartTreino `20261008132000`, FitPro `20261008132500`, SmartTreino `20261008133000`, FitPro `20261008134000`, Periodizer `20261008134500`. Depois publicar as Edge Functions alteradas, usando uma única cópia de `fitpro-api` (os fontes FitPro e Periodizer estão idênticos). Por último publicar as três interfaces, de preferência por coorte. Não inverter a ordem: a UI nova lê colunas que ainda não existem no banco publicado.

Funções a publicar com seus arquivos `_shared` importados: FitPro `fitpro-api`, `smartperiodizer-proxy`, `smartperiodizer-sync`, `smartreino-proxy`; SmartTreino `fitpro-adjust-workout`, `fitpro-complete-workout`, `fitpro-copilot-adjust`, `fitpro-deliver-week`, `fitpro-deliver-workout`, `fitpro-delivery-retry`, `fitpro-plan-workout`, `fitpro-quick-workout`, `fitpro-streaming-feed`, `fitpro-week-workouts`, `generate-full-plan`, `generate-smart-treino`, `generate-workout`, `library-full`, `training-adjustment-analytics`, `training-adjustment-apply`, `training-adjustment-deliver`, `training-adjustment-review`, `training-feedback-loop`, `weekly-training-orchestrator`; Periodizer `api-periodization`, `generate-workouts`. A cópia de `fitpro-api` no Periodizer tem o mesmo SHA-256 que a do FitPro e deve ser implantada uma vez. Conferir `verify_jwt` e os segredos de cada função antes da publicação; o projeto atual mistura funções com autenticação JWT da plataforma e funções que validam credenciais no próprio código.

## Evidência local

Typecheck e build oficial passaram nos três frontends. FitPro: 8 testes de autorização e roteamento; SmartTreino: 18 testes de contrato; Periodizer: 4 testes de autorização/duração. A nova migração de revisão foi analisada pelo parser PostgreSQL. Isso não substitui aplicar as migrações em banco isolado e exercitar RLS, funções e login com identidades sintéticas.

Conferência somente leitura no projeto publicado em 10/10: as tabelas e colunas-base consultadas existem, mas `athletes.training_management_mode` e `daily_workouts.plan_snapshot` ainda não existem (são adições deste pacote). As cinco políticas alteradas pela migração `20261008085904` existem com os nomes esperados. O advisor atual aponta `vw_athlete_periodizacao_ativa` como view `SECURITY DEFINER`; a migração `20261008085904` deve removê-lo e o advisor deverá ser executado novamente no banco isolado. Não há branch de desenvolvimento existente. Nenhuma migração deste pacote aparece no histórico publicado.

## Aceite com dados sintéticos, sem aluno real

- Professor vinculado atribui plano e vê fase e sessão; outro professor e outro aluno não leem nem alteram esse plano.
- Aluno em autogestão entra no FitPro e encontra plano e Train; o modo independente do SmartTreino continua funcionando sem plano anual.
- Aluno sem professor abre o wizard do Periodizer e o builder do SmartTreino para seu próprio `athletes.id`; professor vinculado abre os mesmos caminhos pelo perfil do aluno.
- Força gera dose dentro da faixa do mesociclo; corrida de 400 m aparece em metros, registra realizado e nunca vira `8×400` repetições; sessão mista mostra ambos os blocos.
- Abrir a semana no FitPro não gera sessão implicitamente; se o SmartTreino ainda não publicou nada, a interface informa pendência em vez de chamar isso de descanso.
- Iniciar a sessão, registrar parte do realizado e pedir regeneração/ajuste preserva o treino aberto; a nova proposta vale apenas para sessão futura.
- Entrega com conexão válida gera um recibo por `daily_workout_id`; repetir não duplica. Falhas de chave, rede, conexão ou prescrição ficam pendentes/erro com motivo; a tela do professor permite nova tentativa.
- Revisar entrada por cadastro, login existente, Google e portal de roteamento; um aluno autenticado chega ao Início FitPro.

O portal de roteamento deve enviar um código OAuth/PKCE para `/auth/callback` ou um par `access_token` + `refresh_token` do mesmo projeto Supabase. Um `access_token` isolado, como no link enviado anteriormente, não permite persistir a sessão; o FitPro limpa a URL e oferece entrada direta. O portal também deve apontar para `https://ninefitpro.lovable.app`, sem usar o domínio legado.

Sem banco isolado disponível neste trabalho, as verificações autenticadas permanecem condição de liberação. Uma recomendação de recuperação aceita cria uma revisão rastreável a partir do mesociclo de deload já previsto, apenas para semana futura vazia. O SmartTreino incorpora o ID da revisão no snapshot da sessão; a entrega de ajuste só confirma sessões desse ID. O orquestrador aguarda a decisão antes de gerar a semana. Se não houver bloco de recuperação previsto, regras ativas únicas ou semana vazia, a etapa fica pendente com motivo explícito. O usuário fará a validação final de produto após a revisão do pacote. Nenhum dado real de aluno foi alterado para testar.




