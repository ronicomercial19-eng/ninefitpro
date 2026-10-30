# Progress Tracker ↔ FitPro — entrega de integração

Data: 30/10/2026. Banco compartilhado: mfrydtrzjxscbkaiwfnw.

## Implementação
- Identidade por athlete_id: resolução autorizada, sem inferir vínculo por email/nome. Alunos legados ganham vínculo canônico apenas por ação do professor responsável.
- Avaliações profissionais: salvar_avaliacao encaminha ao escritor canônico; somente medidas enviadas são persistidas; o banco calcula scores. Retorno success=false não é mostrado como sucesso.
- Autoavaliação: formulário mínimo de seis medidas, data, campos opcionais e erros; modo completo continua disponível com fotos/triagem/testes. Não altera PDI ou avança ativação. Atualização de peso/altura do perfil no modo completo exige opção explícita.
- Histórico e gráficos: execuções FitPro concluídas/válidas e registros manuais no mesmo contrato, com origem preservada. Cargas reais vêm de workout_exercise_sets, não apenas das tabelas antigas.
- Treino manual e cargas são gravados em uma transação; request_id torna reenvio idempotente.
- Composição mantém o último valor não nulo de cada medida, com data/origem próprias. Registrar peso não apaga gordura ou massa muscular anteriores.
- Score oficial permanece separado do indicador combinado de acompanhamento. Autoavaliação não vira avaliação oficial.
- Atualização por eventos locais, foco e assinatura Realtime; leituras compartilhadas e limitadas por tempo, proteção contra resposta de sessão anterior.
- Seleção explícita de aluno na avaliação rápida; relatório salvo consulta scores calculados no servidor.
- Removidas estimativas automáticas que presumiam homem de 25 anos ou tratavam massa magra como massa muscular.

- Continuidade legada: leitura por aluno preservada enquanto não existir atleta; primeira gravação autorizada do professor vincula avaliações legadas ao atleta criado na mesma transação. Contagem do painel inclui atletas canônicos.

## Escopo dos quatro arquivos recebidos
Os dois dossiês são cópias do mesmo conteúdo. A implementação preserva as telas já existentes de detalhe, capacidades, cardio, composição, metas, fontes, comparações e preparação. Os cinco pilares são os que existem no motor. Ativacao.tsx e NineFitLayout.tsx não foram alterados.

Referências normativas dependem de fontes reais cadastradas. Sensores e tentativas de velocidade dependem de hardware/dados reais; nenhum resultado, percentil, idade física ou faixa foi fabricado. As interfaces existentes mostram ausência de dados.

## Verificação e publicação
Não foram criadas avaliações nem treinos fictícios, executadas funções de negócio para QA, ou feitos testes de navegação. QA prática permanece com o proprietário. Compilação/build são verificações técnicas; detalhes e limitações devem acompanhar a entrega.
O projeto Lovable do Tracker indicado no README retornou NOT_FOUND na conexão do proprietário. Código no GitHub não comprova publicação deste frontend.
