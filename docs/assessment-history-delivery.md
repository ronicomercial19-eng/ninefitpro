# Histórico — auditoria e correções de dados, 22/10/2026

Projeto: FitPro / mfrydtrzjxscbkaiwfnw. Visual e navegação existentes preservados; adicionada seção de fotos vinculadas.

## Mapa de dados

| Área | Fonte / contrato |
| --- | --- |
| Resumo, avaliações, fontes, metas, treinos/cargas/recordes | fn_get_assessment_hub; avaliacoes_unificadas, athlete_data_sources, metas_progresso, workout_executions/workout_exercise_sets, treinos_realizados/registros_carga, personal_records |
| Detalhe e comparação | fn_get_avaliacao_detalhe, fn_assessment_tests, avaliacao_tentativas |
| Autoavaliação | fn_salvar_avaliacao_guiada_v2; mesma tabela de avaliações com origem explícita |
| Confiabilidade e score | fn_assessment_is_official, fn_calcular_score_avaliacao; função de compatibilidade por métrica |
| Reavaliação | athlete_reassessment_settings, fn_save_assessment_preferences; fn_emit_reassessment_reminders e cron já existentes |
| Faixas | ref_faixas com idade, sexo, teste, unidade e protocolo compatíveis; sem criar referências fictícias |
| Fotos | caminhos da própria avaliação em dados_adicionais.fotos; bucket privado student-photos; URLs assinadas por 300 segundos sob RLS existente |

## Implantado no banco

- 20261022101840_assessment_history_contract_completion: autorização do cálculo por vínculo, índice parcial único do registro guiado por atleta/data/origem, ordenação de comparação determinística, catálogo de testes guiados, confiança por métrica e separação de estimativas.
- 20261022102100_assessment_history_goal_owner_access: metas reconhecem dono direto e professor vinculado, não apenas cadastro legado; consulta de avaliações recusa sign-in anônimo.
- Score coverage_v2 mantém as escalas internas já existentes, mas calcula a média somente dos testes presentes. Não é faixa normativa nem classificação clínica. Registros anteriores não foram recalculados. Comparações bloqueiam versões e cobertura de pilares diferentes.
- Fonte guiada, autoavaliação, peso avulso e self_checkin não produzem score oficial. Estimativas de 1RM e Navy são explicitamente estimadas.
- Política de inserção própria não permite que um aluno atribua origem profissional arbitrária. Políticas profissionais preexistentes por vínculo foram preservadas.

## Verificação

- Testes SQL executados antes da aplicação e novamente após: proprietário lê/salva, gravação repetida retorna mesmo ID, confiança estimada preservada, data futura recusada, testes ausentes não viram zero, acesso de outra pessoa e anônimo recusados. Testes dentro de BEGIN/ROLLBACK; não persistem avaliações, notificações ou requisições pg_net.
- Meta de teste criada e atualizada para dono sem vínculo legado, sob role authenticated, com rollback; sign-in anônimo recusado.
- Nove regressões de métricas/projeções, uma regressão de renderização de meta inválida e suíte selecionada de 23 testes passaram. Typecheck e build/PWA passaram.
- Advisor mantém avisos gerais do projeto e de RPCs security definer intencionalmente expostas. Não equivale a certificação global de segurança; a autorização das funções deste fluxo foi testada.

## Limites e pendência cadastral

- Uma avaliação manual antiga não tem athlete_id nem candidato inequívoco em athletes.aluno_id. Preservada sem associação por nome/email e sem exclusão. Recuperá-la para um usuário depende de confirmação do proprietário e vínculo pelo responsável.
- avaliacao_tentativas e ref_faixas não tinham registros no momento da auditoria. Ausência é apresentada como não disponível; não foram inventados testes, sensores ou classificações.
- URLs de fotos dependem de objeto existente e autorização. Falha de foto não bloqueia o restante da avaliação.
- As preferências de fontes limitam este painel; não revogam automaticamente acessos de outros módulos.
- A primeira inspeção autenticada do domínio público carregou o Progresso legado, diferente da fonte atual no Git. Isso exigiu publicar no Lovable e conferir a versão nova, além do push ao Git.

## Reteste autenticado e publicação

- Publicação Lovable solicitada após confirmar sincronização do SHA com main. Domínio passou a servir o novo bundle com as correções (não apenas uma alteração local/Git).
- Conta autenticada pelo próprio usuário; navegação Perfil → Histórico, lista real, detalhe, resumo, metas e fontes foi exercitada sem gravar avaliações, pagamentos ou preferências da conta.
- Autoavaliações ficaram separadas do score oficial; nenhuma avaliação oficial foi inventada para preencher o gráfico. Origem e estado sem comparação apareceram no detalhe.
- Reteste encontrou selos legados incorretos para 1RM guiado: inferência de estimativa agora prevalece sobre esses selos. Exames vazios não exibem mais um bloco com apenas [].
- Metas antigas com início igual ao alvo não são declaradas 100% alcançadas. A métrica/unidade cadastradas ficam explícitas para revisão; objetivos semanticamente incoerentes não são reinterpretados automaticamente.
- A ausência de fotos e tentativas na conta testada impede validar uma imagem/sensor real nessa sessão. Assinatura privada e estados de falha estão implementados; permissões de storage foram inspecionadas sem abrir o bucket publicamente.

## Atualização de 29/10/2026 — score ponderado e referências

O score ponderado passa a ser lido do RPC canônico `fn_assessment_weighted_score`: professor pesa 1; autoavaliações válidas têm peso menor, com decaimento temporal e reset pelo checkpoint master. A projeção de metas e os recordes oficiais continuam usando avaliações oficiais. Confirmação de um 1RM para calcular uma referência de carga não transforma autoavaliação em avaliação oficial. Nenhum teste novo foi criado nesta rodada por solicitação do usuário.
