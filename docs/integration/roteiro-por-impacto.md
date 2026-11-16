# Integração por impacto — professor, aluno e resultado

Data: 8 de outubro de 2026. Este é o roteiro prioritário da integração. O [roteiro técnico anterior](roteiro-fases-periodizer-smarttreino-fitpro.md) continua como inventário de tarefas e dependências, sem orientar a ordem de entrega.

## Correção de direção

O Smart Periodizer **já cria e atribui planos**. Não há uma fase para reinventar o planejamento. A tarefa é fazer o SmartTreino obedecer ao plano existente, o FitPro entregar uma sessão utilizável e o realizado voltar como evidência para ajustes científicos. Revisão e identificação técnica são parte do contrato de integração, apenas na medida necessária para proteger o histórico.

O critério principal de prioridade é o efeito percebido pelo professor e pelo aluno. Segurança e integridade acompanham cada entrega como condição de entrada e saída; não precisam esperar uma fase distante para funcionar.

**Ordem real de execução:** primeiro comprovar um ciclo completo em um aluno sintético — atribuição do plano existente, sessão dentro da fase, leitura no FitPro, execução, feedback, ajuste seguinte e confirmação de entrega. As fases 1–4 abaixo descrevem as frentes desse mesmo corte, não uma fila que deixa o ajuste para depois. Depois ampliar para modalidades, caminhos legados e escala.

## Fase 1 — O professor atribui; o aluno encontra e consegue treinar

**Professor:** atribui o plano já produzido pelo Periodizer ou um protocolo/conteúdo existente no perfil do aluno; vê estado de publicação, visibilidade e falha.

**Aluno:** abre o FitPro e encontra o planejamento e a sessão correta em Início/Train, com HTML/PDF e treinos manuais do professor preservados quando atribuídos.

**Microfases**

1. Seguir uma atribuição real da interface do professor até `athlete_periodizations` ou `student_training_assignments`; deixar claro ao professor qual tipo foi atribuído.
2. Resolver o mesmo `athletes.id` nas três interfaces e testar autogestão, professor vinculado e aluno vindo do roteamento.
3. Fazer a leitura FitPro mostrar estado útil: plano atribuído, sessão disponível, geração pendente ou erro concreto. Abrir a semana não deve esconder falha de geração.
4. Corrigir a exposição entre alunos e as funções que escrevem para alvo informado pelo cliente, antes de ativar o fluxo novo.

**Pronto quando:** professor A atribui a um aluno sintético; esse aluno vê o conteúdo e inicia a sessão no FitPro; professor B e outro aluno não conseguem ler nem alterar essa prescrição. Sem telas de “sucesso” para algo que só foi enfileirado.

## Fase 2 — A sessão respeita a ciência do plano existente

**Professor:** confia que a sessão gerada segue a fase, modalidade, carga, frequência e restrições decididas pelo Periodizer; identifica o que foi ajustado manualmente.

**Aluno:** recebe treino coerente com seu objetivo e condição, sem dose absurda ou exercício incompatível.

**Microfases**

1. Ler a atribuição e a fase vigentes do Periodizer por uma única regra de resolução. Adicionar somente o identificador/revisão necessários para associar a sessão à decisão usada.
2. Passar limites e modalidade estruturados ao SmartTreino; manter o modo comercial independente explícito para quem usa o SmartTreino sozinho.
3. Validar unidades: repetições, metros, tempo, pace, carga e descanso; impedir que um protocolo de corrida seja convertido em séries de força.
4. Mostrar origem e fase na sessão do FitPro, sem substituir treinos e conteúdos manuais existentes.

**Pronto quando:** três casos sintéticos — força, corrida e misto — geram sessões dentro dos limites da fase; “400 m” permanece distância; o profissional consegue explicar de qual regra veio a dose.

## Fase 3 — Treinar e ajustar sem perder o realizado

**Professor:** vê o que o aluno realmente fez, o que ficou pendente e por que um ajuste foi proposto. Pode aprovar exceções; não precisa reconstruir o treino após uma falha de geração.

**Aluno:** retoma a sessão iniciada com suas séries intactas. Feedback e execução produzem uma adaptação útil na próxima sessão ou fase, com explicação simples.

**Microfases**

1. Fazer todos os caminhos de geração, treino rápido e ajuste respeitarem sessão iniciada/concluída e exercícios executados.
2. Ligar execução e séries à prescrição efetivamente vista pelo aluno; registrar feedback, RPE, adesão e sinais críticos com origem e data.
3. Aplicar regras científicas do Periodizer para propor o próximo ajuste dentro dos limites; escalar dor, lesão, sobrecarga ou mudança relevante ao professor quando houver vínculo.
4. Registrar evidência, decisão e responsável por cada ajuste. Preservar a prescrição anterior e o realizado.

**Pronto quando:** um aluno sintético inicia treino, registra parte das séries e envia feedback; a geração seguinte preserva esse treino e propõe uma mudança justificável. Professor e aluno enxergam o mesmo resultado.

## Fase 4 — Entrega verdadeira e recuperação de falhas

**Professor:** sabe se o aluno já pode acessar o treino e recebe um erro acionável quando não pode. Pode repetir o envio sem duplicar sessão.

**Aluno:** não recebe promessa de treino inexistente; encontra o mesmo treino após recarregar ou voltar ao aplicativo.

**Microfases**

1. Separar `salvo`, `visível`, `entrega confirmada`, `iniciado` e `concluído` no produto e nos logs.
2. Reconciliar as duas fontes de `fitpro-api`. A versão publicada não tem `/v1/fitpro/events`; a versão Periodizer registra evento sem provar leitura da sessão. Criar um recibo que confirme atleta, sessão e acesso recuperável.
3. Corrigir credencial/escopo da conexão e retentar com idempotência. Não considerar HTTP 200 isolado como sucesso.
4. Exibir pendência e repetição segura no painel do professor, com alerta para falhas acumuladas.

**Pronto quando:** entrega bem-sucedida é aberta pelo aluno; falha de chave, rota, rede ou leitura gera estado pendente; retry preserva a sessão e termina com recibo verificável.

## Fase 5 — Produto confiável para uso diário

**Professor:** pode atender vários alunos sem investigar banco ou logs para saber o que aconteceu. **Aluno:** entende o treino de hoje, seu progresso e o motivo dos ajustes. **Cliente comercial:** vê uma experiência contínua mesmo quando entra por produtos separados.

**Microfases**

1. Validar ponta a ponta os caminhos de professor, autogestão e uso independente dos Smarts, inclusive login e roteamento para o FitPro.
2. Testar concorrência, repetição, IA indisponível, plano expirado, falta de perfil e múltiplas sessões no mesmo dia com dados sintéticos.
3. Instrumentar visibilidade, entrega, execução e adaptação por atleta, com alertas agregados sem expor dados pessoais.
4. Publicar gradualmente por coorte, após revisão de diff, migrations, typecheck/build e testes em ambiente isolado. Reverter comportamento por flag quando necessário, preservando todos os dados.

**Pronto quando:** o fluxo principal e os casos de falha são compreensíveis na interface, os indicadores mostram resultados reais e professor/aluno continuam operando nos três modos.

## Primeiro corte de valor

Uma atribuição existente do Periodizer chega a um aluno sintético no FitPro; o SmartTreino gera uma sessão dentro daquela fase; o aluno inicia e registra o realizado; o próximo ajuste usa esse realizado sem alterar o treino já iniciado; professor e aluno veem o estado verdadeiro. Esse corte atravessa as fases 1–4 antes de ampliar cobertura para todos os caminhos legados.

**Estado atual:** há correções locais de autorização, publicação sem sobrescrita e mensagens de entrega. Ainda não existe esse corte completo. O [checkpoint da etapa de segurança](../../../../outputs/etapa-1-integracao-seguranca-2026-10-08.md) distingue o que foi implementado do que falta validar. Nenhuma mudança deste trabalho foi publicada em produção.
