# Roteiro de integração — Smart Periodizer, SmartTreino e FitPro

> A ordem de entrega foi revista pelo impacto no professor e no aluno. Consulte o [roteiro prioritário por impacto](roteiro-por-impacto.md). Este documento permanece como inventário técnico das dependências e verificações.

Data: 8 de outubro de 2026. Base: auditoria dos três produtos, código publicado, consultas agregadas de leitura ao Supabase compartilhado e [contrato de integração](periodizer-smarttreino-fitpro.md). Este roteiro organiza trabalho futuro; as mudanças locais descritas no contrato ainda não foram publicadas.

## Resultado pretendido

O Smart Periodizer decide **por que, quando e dentro de quais limites** o atleta treina. O SmartTreino transforma a fase vigente em **sessões executáveis**. O FitPro mostra a prescrição, permite atuação do profissional ou autogestão e registra **o que foi realizado**. O realizado alimenta uma nova decisão científica rastreável, sem reescrever sessões ou histórico.

Cada produto mantém seu uso comercial independente. No modo integrado, compartilham identidade, plano, revisão, sessão, execução e recibos. O conteúdo HTML/PDF e os treinos manuais atribuídos pelo profissional continuam como caminhos próprios. Nenhuma tabela, rota, histórico, protocolo ou produto será eliminado para estabelecer o contrato.

## Regras transversais e estados

**Identidade:** `auth.users.id` é a pessoa autenticada; `athletes.id` é o atleta canônico. Toda ação privilegiada confere vínculo no servidor, inclusive quando chega por portal, proxy ou chave de integração. Profissional genérico não ganha acesso a todos os atletas.

**Proveniência:** uma sessão integrada deve carregar `athlete_id`, `annual_plan_id`, `plan_revision_id`, fase, semana, origem (`periodizer_smarttreino`, `professor`, `autogestao`, `independente`), `workout_date` no fuso do atleta, `prescription_revision` e autor/decisão. Campos novos são aditivos e inicialmente opcionais para registros legados.

**Estados distintos:** `planejado` → `gerado` → `publicado_no_banco` → `visível_ao_aluno` → `entrega_confirmada` → `iniciado` → `concluído`. Uma falha em qualquer transição tem motivo, instante, correlação e tentativa segura. Um treino gravado em `daily_workouts` não equivale a um evento HTTP confirmado. A execução deve apontar para a revisão exibida ao aluno.

**Preservação:** publicação e ajustes só alteram uma prescrição ainda não iniciada, segundo uma regra única; após início, criam proposta ou revisão futura. O histórico realizado, os exercícios vistos, conteúdos do professor e sessões legadas permanecem consultáveis. Migrações devem ser aditivas, reversíveis em comportamento por feature flag e executadas primeiro em ambiente isolado.

## Fase 0 — Congelar o mapa real e a base de validação

| Microfase | Trabalho | Critério de saída |
| --- | --- | --- |
| 0.1 Inventário publicado | Comparar commits, migrations, versões de Edge Functions, `verify_jwt`, políticas, secrets configurados por nome e rotas efetivas nos três produtos. | Matriz código × produção datada; diferenças classificadas antes de deploy. |
| 0.2 Dados sintéticos | Preparar atleta autogerido, atleta de professor A, professor B sem vínculo, plano ativo, sessão iniciada e sessão legada em ambiente isolado. | Testes repetíveis sem modificar alunos reais. |
| 0.3 Observabilidade de base | Medir planos ativos, duplicidades, perfis ausentes, treinos visíveis, execuções e entregas falhas, sem expor dados pessoais. | Baseline e consultas de verificação salvos. |
| 0.4 Integridade do build | Recuperar dependências nativas do ambiente e corrigir erros preexistentes de typecheck do SmartTreino. | Typecheck e build dos três repositórios executáveis antes de qualquer publicação. |

**Estado em 8/10:** inspeção e baseline parcial concluídos; o build local Vite/SWC está impedido no Windows e o SmartTreino tem erros anteriores de tipos/dependências. Não usar essa limitação como validação positiva.

## Fase 1 — Fechar as fronteiras de autorização

| Microfase | Trabalho | Critério de saída |
| --- | --- | --- |
| 1.1 Leitura FitPro | Aplicar `security_invoker` à view ativa e corrigir RLS das tabelas base; testar acesso direto, sem depender do filtro da interface. | Atleta A não lê plano de B; profissional A não lê B; aluno e profissional vinculados continuam lendo. |
| 1.2 Escrita Periodizer | Validar `deliver_periodization_to_athlete`, `generate-workouts`, `fitpro-api` e `api-periodization`: alvo, plano, professor e chave de conexão. | Nenhum JWT válido ou conector consegue alterar atleta fora do seu escopo. |
| 1.3 Escrita SmartTreino | Cobrir `generate-full-plan`, `generate-workout`, `generate-smart-treino`, entregas, retry, treino rápido e ajustes. | Todas as escritas com service role têm autorização de objeto demonstrada. |
| 1.4 Proxies FitPro | Verificar alvo único, plano pertencente ao atleta e escopo de rota em `smartperiodizer-proxy`, `smartperiodizer-sync` e `smartreino-proxy`. | Proxy não permite trocar atleta por query/body nem repassar rota privilegiada sem vínculo. |
| 1.5 Regressão de papéis | Rodar matriz aluno autogerido, aluno vinculado, professor vinculado, profissional não vinculado, administrador e serviço. | Autogestão e trabalho do professor preservados; acesso cruzado negado. |

**Estado:** há correções locais, sem deploy, para a view, proxy/sync Periodizer, proxy SmartTreino, RPC de atribuição, geradores dos dois Smarts, as duas versões de `fitpro-api`, rotas parceiras SmartTreino e entregas. Ainda faltam testes integrados em banco isolado, revisão de todas as RPCs de ajuste e reconciliação das versões divergentes de `fitpro-api`. A fase só termina após testar que chave de integração, JWT e vínculo atuam juntos sem interromper os fluxos comerciais.

## Fase 2 — Identidade do plano e decisão científica versionada

| Microfase | Trabalho | Critério de saída |
| --- | --- | --- |
| 2.1 Plano vigente único | Definir uma resolução transacional por `athlete_id`: atribuição `in_progress` + plano anual `active`, com conflitos explícitos. | Cada atleta recebe zero ou um plano vigente; nenhum “último registro” arbitrário decide prescrição. |
| 2.2 Revisão imutável | Criar revisão/snapshot aditivo de plano com fase, calendário, objetivo, parâmetros, limites, versão do algoritmo e justificativa. | Alteração cria nova revisão e mantém a anterior legível. |
| 2.3 Calendário científico | Corrigir duração selecionada, soma de semanas, mesociclos e expiração; uma função calcula fase/semana para data local. | Wizard, view, API e geração retornam mesma fase para datas de borda e plano expirado. |
| 2.4 Ajuste fundamentado | Ligar realizado/feedback a proposta de ajuste com evidências, limites, motivo e aprovação automática ou do profissional conforme política. | Ajuste fora dos limites é bloqueado ou escalado; não há mutação silenciosa da revisão ativa. |
| 2.5 Modos de operação | Registrar `profissional`, `autogestao` ou `independente` no contexto do plano, sem inferir pelo produto de origem. | Direitos de aprovação e interface correspondem ao modo escolhido. |

## Fase 3 — Contrato de sessão entre Periodizer e SmartTreino

| Microfase | Trabalho | Critério de saída |
| --- | --- | --- |
| 3.1 Entrada estruturada | SmartTreino recebe revisão, fase, semana, frequência, modalidade, dose e limites via contrato validado. | Gerador rejeita plano de outro atleta ou revisão desatualizada. |
| 3.2 Compatibilidade de unidade | Séries/repetições, distância, duração, pace, carga e descanso ficam tipados por modalidade; preservar HTML/PDF como conteúdo. | “400 m” nunca vira “400 repetições”; testes cobrem corrida, força e sessão mista. |
| 3.3 Composição | Resolver exercícios e distribuição respeitando disponibilidade, lesões, equipamento, dose e limites da fase; registrar defaults usados. | Saída explica de qual regra veio cada parâmetro e sinaliza pré-requisito ausente. |
| 3.4 Caminhos paralelos | `generate-smart-treino`, `generate-full-plan`, treino rápido e ajuste usam o mesmo envelope de proveniência. O modo independente continua explícito. | Nenhuma rota integrada cria plano concorrente sem decisão do Periodizer. |
| 3.5 Testes determinísticos | Fixtures de revisão e catálogo; avaliação de consistência da sessão antes de publicar. | Mesma entrada/versionamento produz sessão válida e rastreável, ou erro legível. |

## Fase 4 — Publicação segura e proteção do realizado

| Microfase | Trabalho | Critério de saída |
| --- | --- | --- |
| 4.1 Publicação atômica | Gravar `daily_workouts` e `workout_exercises` em transação com recibo por dia e chave de idempotência por atleta/data/revisão. | Falha não deixa dia parcialmente prescrito. |
| 4.2 Trava de execução | Conferir `workout_executions`, séries, `started_at`, estado, `override_locked` e concorrência em todos os geradores/RPCs de ajuste. | Sessão iniciada ou concluída mantém exercícios e revisão originais após geração/retry. |
| 4.3 Conflitos existentes | Tratar múltiplos `daily_workouts` no mesmo dia por resolução explícita; preservar todas as linhas legadas. | Leitura mostra uma sessão principal inequívoca sem apagar histórico. |
| 4.4 Revisão futura | Ajuste após início vira proposta ou nova sessão de data futura, ligada à revisão e decisão de origem. | Atleta não perde o treino em execução; profissional vê a pendência. |
| 4.5 Falha parcial semanal | Publicar por dia com recibos; repetir apenas dias faltantes, sem alterar dias confirmados. | Reexecução é idempotente e relatório discrimina publicado, preservado e bloqueado. |

**Estado:** a RPC local `fn_publish_smart_treino_day` e a geração local já preservam dia existente e publicam um dia atomicamente. Ainda faltam revisão, todos os outros escritores e validação SQL em ambiente isolado.

## Fase 5 — Apresentação coerente no FitPro

| Microfase | Trabalho | Critério de saída |
| --- | --- | --- |
| 5.1 Início e Train | Exibir plano/fase e sessão com origem, revisão e estado; manter atribuições manuais do professor ao lado da sessão automática. | Aluno entende qual treino é vigente e por quem foi prescrito. |
| 5.2 Professor | No perfil do aluno, mostrar plano, conteúdos atribuídos, sessões, execução e alertas; aprovar proposta quando necessária. | Professor não confunde atribuir HTML/PDF com ativar plano anual. |
| 5.3 Autogestão | Permitir ao atleta iniciar planejamento/geração sob política própria e ver limites e decisões. | Fluxo funciona sem professor associado, com mesmas proteções de identidade. |
| 5.4 Leituras com efeito de escrita | Tornar explícita a geração hoje acionada por `fn_get_week_workouts`, ou separar leitura de comando com estado visível. | Abrir a semana não mascara erro de geração. |
| 5.5 Registro do realizado | `workout_executions` e séries apontam para `daily_workout_id` e revisão apresentada. | Recarregar ou ajustar não muda a interpretação do realizado. |

## Fase 6 — Entrega, recibo e repetição confiável

| Microfase | Trabalho | Critério de saída |
| --- | --- | --- |
| 6.1 Contrato do evento | Definir `/v1/fitpro/events` ou substituir por recibo de leitura no banco compartilhado, com autenticação, escopo de atleta, ID idempotente e payload mínimo. | Um evento não pode alegar entrega de treino inexistente ou de outro atleta. |
| 6.2 Estados persistidos | Separar gravação, visibilidade e entrega em log; erro de chave/rota vira pendência com causa. | UI/orquestrador nunca mostram “entregue” após 401, 404, timeout ou resposta `success:false`. |
| 6.3 Retry | Retentar com mesma chave e recibo, somente para atleta autorizado; lote exige serviço/admin. | Retry não duplica evento nem altera treino iniciado. |
| 6.4 Alarme operacional | Métricas por causa, backlog, idade da pendência e aviso para professor/operador quando for acionável. | Falha de entrega detectada antes de relato do aluno. |
| 6.5 Reconciliação | Comparar `daily_workouts`, leitura recuperável no FitPro e log de evento; corrigir estados sem inventar recibo. | Registros antigos falhos são classificados sem manipular dados reais durante o teste. |

**Estado:** o caminho local já evita anunciar sucesso quando a resposta falha. A rota `/v1/fitpro/events` está ausente no FitPro publicado; a conexão ativa não tem professor e `fitpro_student_map` está vazio. Esse desenho de identidade precisa ser fechado antes da implementação do recibo. Os 114 logs de evento falhos medidos não provam invisibilidade de todos os treinos.

## Fase 7 — Circuito de adaptação e robustez operacional

| Microfase | Trabalho | Critério de saída |
| --- | --- | --- |
| 7.1 Sinais | Consolidar realizado, RPE, aderência, dor/lesão e feedback com data, origem e qualidade. | Algoritmo não interpreta ausência de dado como melhora ou piora confirmada. |
| 7.2 Regras e revisão | Periodizer propõe ajuste nos limites científicos; profissional revisa exceções, atleta autogerido vê decisão e motivo. | Toda adaptação tem evidência, versão, autor e possibilidade de auditoria. |
| 7.3 Simulação | Reexecutar semanas sintéticas de adesão, falta, sobrecarga, lesão e mudança de objetivo. | Sem oscilação instável de carga nem alteração retroativa do realizado. |
| 7.4 Resiliência | Timeout, indisponibilidade de IA, conectores, replay, duplicidade e concorrência; fallback seguro com estado pendente. | Serviço volta sem publicar prescrições divergentes ou esconder falhas. |
| 7.5 Segurança contínua | Testes RLS, contratos e verificação de secrets/roles em CI; revisão periódica de funções publicadas. | Uma mudança em produto isolado não reabre acesso entre alunos. |

## Fase 8 — Implantação progressiva e manutenção

1. Publicar migrações aditivas em ambiente isolado; aplicar funções por dependência, começando por autorização e contrato. Exercitar fluxos sintéticos completos e registrar evidência de typecheck/build.
2. Ativar leitura do contrato em modo observação, comparar saída antiga e nova sem trocar prescrição do aluno.
3. Ativar por coorte pequena de contas de teste e depois por professores/atletas selecionados, com feature flag por produto e modo. Revisar métricas de autorização, visibilidade, sessões preservadas e entrega.
4. Expandir somente após critérios de cada fase. Em falha, desativar comportamento novo pela flag e preservar dados/revisões criados para análise. Nenhuma limpeza automática de legado.
5. Documentar operação: responsáveis por plano, sessão, entrega, incidentes e evolução independente dos três produtos.

**Regra de publicação:** apresentar diff, migrations, testes, risco e resultado de ambiente isolado para revisão do proprietário antes de qualquer alteração em produção. Esta regra se aplica a cada fase, não só ao lançamento final.

## Caminho crítico e primeiro incremento utilizável

`Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5/6 → Fase 7 → Fase 8`. Observabilidade, testes e interface podem avançar em paralelo depois que seus contratos estiverem estáveis.

O primeiro incremento útil reúne autorização fechada, um plano vigente versionado, uma sessão SmartTreino vinculada a ele, publicação que preserve execução, exibição no Train e estado de entrega honesto. O ciclo adaptativo completo vem depois que essa cadeia for comprovada. Assim cada passo entrega valor verificável sem transformar a integração em uma reescrita dos três produtos.
