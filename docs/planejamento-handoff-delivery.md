# Planejamento do aluno

Implementação baseada no handoff Word e no ZIP fornecidos em 21/10/2026, no repositório `ronicomercial19-eng/ninefitpro`.

## Entrega

- `PlanejamentoPro` e CSS escopado preservam a marca Nine Pro: mapa anual, fase atual, progresso, missão semanal, abas e explicações locais.
- Abas Carga e Esforço exigem pelo menos duas semanas com valores. Força exige uma carga real. Ausência de plano, ausência de sessões e erro de consulta são estados distintos.
- O mapa usa a duração dos macrociclos, aceitando `weeks` e `duration_weeks`. Ondas são expandidas por `start_week`/`end_week`, com fallback legado para `week`. Semanas não cobertas não recebem cargas inventadas.
- O calendário mantém navegação mensal, datas programadas tracejadas e sessões concluídas coloridas pelo esforço. Duas ou mais sessões no mesmo dia são contabilizadas, com volume e duração somados e RPE médio ponderado pela duração disponível.
- PDI, sincronização com fallback, ativação, próximo treino e entrada no Train foram preservados. O roadmap deixou de marcar conquistas com constantes de exemplo.
- Realtime acompanha as fontes do plano e as execuções; eventos de treino atualizam presença, força e roadmap.
- O RON recebe tópico de até 80 caracteres, sem quebras de linha e renderizado como texto. A abertura é local e gratuita; o envio à IA usa `withCredit('ron_chat')`.

## Banco

A consulta de produção confirmou os campos normalizados e realtime de `workout_executions`. Em 21/10/2026 havia dez planos com semana e orientações atuais preenchidas, dois com percentual de 1RM e um com durações diferentes entre macros e mesociclos. A divergência é sinalizada na tela, sem alterar o plano do aluno.

A migration `20261021092727_versionar_view_planejamento_producao.sql` contém a definição exportada de produção, preservando `security_invoker=true` e leitura autenticada. Nenhum DDL remoto foi executado. A reprodução local da migration não foi realizada: não há Postgres local disponível na porta configurada.

## Verificação

- Testes de intervalos, formato legado, durações, agrupamento de sessões, medidas ausentes e tópico do RON passaram.
- Regressão dos testes de projeção das avaliações passou.
- Verificação autenticada na prévia local: troca para Carga; navegação Outubro → Setembro; explicação do RPE; agrupamento de duas sessões; abertura contextual do RON com saldo de fichas inalterado. Nenhuma pergunta de IA foi enviada como teste.
- Build e TypeScript fazem parte da validação antes da publicação.

Não foram criadas sessões nem prescrições de exemplo. A implementação não altera as durações divergentes nem regenera planos existentes.
