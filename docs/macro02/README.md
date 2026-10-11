# Macro 02 — contexto do aluno, PDI e jornada diária

Escopo completo: Meso 2.1 (entrada/PDI vivo), 2.2 (calibração/SYNC amplo), 2.3 (Comando do Dia e encerramento). As novas prescrições, periodização e calendário continuam na Macro 03.

## Meso 2.1 · Minha ficha dinâmica
- Ativação com cinco confirmações: objetivo, horário, horizonte, lesões e restrições alimentares. Edição detalhada mantém as nove perguntas existentes, com retorno e tratamento de falha de leitura.
- A entrada reconhece a ficha confirmada para liberar o Hub. O aluno novo não precisa gerar/executar o treino genérico da ativação antiga; os registros anteriores dessa ativação permanecem preservados.
- Primeiro acesso local separado por usuário; identificação de aluno vinculado usa a identidade canônica. Diálogo do PDI com foco/teclado e leitura acessível.
- PDI acessível no Perfil, com valores declarados identificados, preferências de tempo/ambiente e resumo de 30 dias de treino, calibração, alimentação, hidratação e balanços.
- Preferência de assistência sincronizada com Solo/Guiado/Assistido; fallback local informado quando a gravação falha.
- Sugestão de horário somente após pelo menos cinco sessões registradas naquele horário; precisa de confirmação para virar preferência. Não altera o treino atribuído.
- Uma RPC salva preferências no usuário autenticado, serializa atualizações, valida campos/valores e marca conclusão. Valores padrão legados não se tornam declarações automaticamente.
- Um único trigger mantém o histórico de alterações efetivas do PDI. Removida a segunda inserção do wizard; snapshots não são editáveis pelo navegador.

## Meso 2.2 · Calibração e SYNC
- Calibração tem uma fonte: daily_checkins. Humor isolado ou RPE de pós-treino não concluem a calibração.
- Cinco sinais: sono, energia, humor, motivação e dor. A escala de dor é invertida explicitamente no cálculo; podem ser atualizados quando os sinais mudarem.
- SYNC v2 = 60% percepção diária + 40% média de cobertura de registros nos últimos sete dias. Sem calibração completa de hoje, o score permanece sem leitura.
- Sete dimensões de cobertura: treino/descanso registrado, nutrição, sono, mobilidade, hidratação, calibração e balanço do dia. Zero cobertura não comprova que a atividade não ocorreu.
- Cobertura de refeições/água significa dias com registros; não significa dieta adequada, meta cumprida ou dose recomendada. Descanso planejado/declarado não vira treino concluído.
- XP, recordes, medidas clínicas e adequação da prescrição permanecem separados. Um SYNC alto não libera carga nem supera dor/restrições.
- Hub/OS usam a mesma leitura; diagnóstico mostra a composição. Estados adaptativos e dicas usam a calibração real, sem converter logs de esforço em prontidão.
- Compatibilidade de fn_increment_streak implementada com dias de calibração completa/treino concluído; chamar novamente não incrementa o contador. Janela de leitura limitada aos últimos 31 dias.

## Meso 2.3 · Comando do Dia
1. Completar calibração.
2. Revisar dor/restrições antes de executar atividade, quando houver.
3. Confirmar PDI na ativação inicial.
4. Retomar/iniciar treino em Train, ou registrar descanso sem alterar a prescrição.
5. Registrar refeição na Dieta.
6. Registrar água realmente consumida na Dieta.
7. Fazer balanço do dia com emojis próprios.
8. Encerrar: a jornada registrada permite parar; a evolução e os módulos continuam disponíveis.

O card existe no Hub e no OS. A próxima ação é determinada pelo dia em America/Sao_Paulo, nunca por totais da semana. Estados de carregamento, falha e desconexão não geram conclusão fictícia.

## Backend e RON
- Duas migrations registradas: contexto diário e restrição de acesso anônimo às novas tabelas/RPCs.
- Novas tabelas com RLS, chaves únicas por usuário ou aluno/dia e concessões explícitas. A identidade é resolvida no servidor; o cliente não escolhe o aluno do read-model.
- RPCs novas são SECURITY INVOKER. O trigger de histórico é SECURITY DEFINER, com search_path vazio e sem execução direta por clientes.
- ai-coach publicado no Supabase com validação de sessão via getUser, contexto diário autenticado e separação de declarado/observado/inferido. Históricos enviados pelo cliente não podem criar mensagens system.
- RON recebe resumo limitado; não diz que salvou preferência, ajustou treino ou reservou aula sem confirmação. As entregas clicáveis e execução de serviços Prime permanecem nas Macros 06/07.
- Mantida a configuração verify_jwt=false preexistente da função; a autenticação é realizada explicitamente no corpo, e contas anônimas são negadas.

## Escala e limites
Uma ficha compacta, agregações limitadas a 7/30/31 dias e sem gravação por clique. React Query compartilha contexto por usuário; atualização por eventos, foco e virada do dia, sem polling contínuo nem chamadas de IA para calcular o SYNC. Realtime do Hub filtra eventos pelo aluno/usuário.

Esta implementação não certifica capacidade para 3.000 usuários. Carga/custos e testes integrados permanecem na Macro 09. O score legado athletes.sync_score continua disponível para rotas antigas; consumidores de leitura migrados na Macro 03 usam o read-model v2 e exibem ausência como “Sem leitura”.

Checklist técnico e QA: [verification.md](verification.md).
