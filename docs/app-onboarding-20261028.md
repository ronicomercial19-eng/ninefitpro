# Onboarding de ativação do app

Rota: `/9fit/ativacao`. Seis etapas, retomadas a partir dos dados salvos na conta:

1. Boas-vindas: apresenta a configuração do app e a assinatura ativa realmente registrada, com validade quando existente. Não presume pagamento por URL.
2. Perfil: nome confirmado; nascimento, peso e altura opcionais. Medidas ficam como declaração no onboarding, sem criar avaliação física. Nome e nascimento atualizam a ficha canônica do aluno.
3. Rotina: experiência, dias disponíveis (ISO: segunda=1, domingo=7), tempo, local e equipamentos, incluindo a opção explícita sem equipamentos. Frequência e experiência alimentam a ficha; tempo e local também alimentam as preferências existentes. Não substitui uma prescrição.
4. Limitações: dor atual e movimentos que causam desconforto. Informações ficam disponíveis ao professor responsável no acompanhamento. O aluno pode solicitar revisão; o botão abre o fluxo existente para ele enviar a solicitação. Não se declara uma revisão já enviada ou atendimento garantido.
5. Ficha: reaproveita o PDI de nove respostas, com sua gravação e retomada existentes.
6. Revisão: permite editar os grupos anteriores antes de confirmar a configuração.

A conclusão tem um próximo passo: conferir sessão realmente disponível, ver planejamento quando a sessão é futura ou solicitar a primeira prescrição quando não há treino executável. Dor atual ou limitações declaradas priorizam solicitar orientação. O histórico de primeiro treino só é reconhecido quando existe execução concluída com `completion_valid=true`; preencher onboarding não cria execução, XP, pagamento ou prontidão clínica.

Notificações do app são opcionais, oferecidas somente na tela de conclusão por ação explícita do aluno, usando o fluxo de push existente. Não há novo agendador de lembretes por horário nesta alteração.

## Persistência e acesso

- `app_onboarding` guarda respostas, revisão e conclusão com horário do servidor. É possível editar a configuração novamente.
- Clientes têm somente leitura autorizada. A escrita usa RPC autenticada vinculada à identidade atual, com validação e controle de revisão para evitar sobrescrita por outra aba.
- O aluno lê sua ficha; professor responsável/admin autorizado consulta por RLS. Outro aluno não lê as respostas.
- Novas entradas após pagamento precisam concluir a configuração. Contas legadas sem onboarding iniciado mantêm seu fluxo anterior; quem iniciar a configuração pode retomá-la até a revisão final.
- Migração aplicada: `20261028090752_app_activation_onboarding.sql`.
- Complemento aplicado: `20261028091426_harden_app_onboarding_reads.sql`, com índice por aluno, bloqueio de leitura anônima e escrita privilegiada em schema privado.

## Verificação

29 verificações de PostgreSQL/PGlite cobrem persistência, dados inválidos, concorrência, conclusão, conta anônima e isolamento. Testes de decisão cobrem retomada, limitação atual, prescrição vazia e sessão futura. A suíte existente também passa.

Validação no banco de produção sob papel `authenticated`: salvar, concluir, reler as respostas e confirmar que nenhuma execução foi criada. Todas as alterações desse teste foram revertidas por `ROLLBACK`.

QA visual e da experiência será realizado pelo usuário: interromper e retomar; editar na revisão; concluir sem equipamento; informar limitação e conferir destino; sair/entrar; consultar resumo no acompanhamento do professor; permitir ou ignorar notificações.
