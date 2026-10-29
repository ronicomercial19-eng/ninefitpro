# Implementação das fases — Sync, capacidade e operação

Atualizado em 29/10/2026. Este documento descreve implementação, não resultado de QA. O usuário assumiu o QA; nesta rodada não foram criados testes nem executados testes manuais ou ensaios de carga. Compilação e verificações obrigatórias do repositório continuam pertencendo à entrega técnica.

## Aluno

- Perfil/ativação persistidos e identidade compartilhada: PRs #122 e #123.
- Histórico: score ponderado lido de `fn_assessment_weighted_score`; removida a fórmula duplicada do navegador. Metas, projeções e recordes oficiais continuam separados de autoavaliações.
- Capacidade: referências com origem/data; cálculo de carga somente com 1RM do professor ou confirmado explicitamente pelo usuário. O percentual é informado conforme a prescrição; o cálculo não altera o treino.
- Sync: consentimento explícito, decisão persistida por versão das regras, motivos, dados utilizados, modo, proposta e alteração efetiva. É possível consultar o original e restaurá-lo antes de iniciar a sessão.
- O check-in registra o local quando há desconforto e mantém horário de atualização real. Sono, energia, humor, motivação e conforto corporal continuam com as cinco perguntas existentes.
- O início do player e o treino rápido consultam o mesmo ponto de aplicação e recarregam as doses persistidas. Estimativa de duração reconhece doses explícitas em segundos/minutos; descanso zero é preservado.

## Professor

- Painel existente mantém busca/paginação, agenda mensal e contexto do aluno; PRs #117/#118/#123.
- Fila de revisões da Sync no Dashboard, com paginação de 25 alunos, total real e atualização a cada minuto enquanto a tela estiver aberta. Sinais: desconforto, dor alta persistente, recuperação baixa e prescrição alterada.
- Contexto do aluno exibe a decisão compartilhada, permite confirmar a ficha de recuperação e autorizar aumentos somente quando a periodização permitir.
- Ênfase por capacidade: core, cardio ou mobilidade abaixo de 50 permitem ao professor confirmar um único exercício de preparação. Ele escolhe o exercício, a dose com unidade e o descanso; o servidor valida compatibilidade e preserva o bloco principal. Sessão iniciada, bloqueios e dor impedem essa inclusão automática pela ferramenta.
- A confirmação do perfil de recuperação guarda o retrato efetivamente confirmado e quem confirmou. Mudanças nos nove parâmetros invalidam a confirmação anterior. Valores legados não são confirmados em lote.

## Motor no banco

Objetos: `readiness_rule_sets`, `readiness_rules`, `readiness_context_modifiers`, `readiness_preferences`, `daily_readiness_decisions`, `injury_zone_contraindications`, `confirmed_strength_references`.

- Matriz v2 de 25 respostas, contexto, regras versionadas e três variantes de mensagem por regra.
- Reduções combinadas com teto de 30%; aumento de até 10% e no máximo uma série no principal, com confirmação da periodização pelo professor. O exercício de preparação não é tratado como principal.
- Recuperação/PDI somente após confirmação; retorno após inatividade, esforço recente, tendência, repetição de respostas e idade do check-in entram na decisão.
- Sem empilhar ajustes: recalcula a partir do treino-base e mantém antes/depois. Alteração posterior do professor exige revisão, em vez de ser sobrescrita.
- Cardio/corrida com doses de tempo explícitas ajusta duração, preservando séries e respeitando o tempo disponível. Sem unidade clara ou orçamento suficiente, mantém a prescrição e pede revisão. Ritmo numérico não é inventado quando não existe referência prescrita.
- Aprendizado individual: só usa execuções reais concluídas e válidas; após dez sessões com decisões aplicadas e RPE, o multiplicador permanece entre 0,8 e 1,25.
- Mapeamento de regiões é conservador e serve ao encaminhamento; não substitui exercícios automaticamente em uma região dolorida.

### Implantação da Sync

O conjunto `sync-v2-2026-10` começa com **sete dias de observação**, conforme o handoff. As decisões ficam registradas, mas não alteram as doses nesse período. Depois da janela, o mesmo ponto de aplicação passa a aplicar decisões elegíveis, com consentimento e todas as travas. A UI distingue proposta de alteração realmente aplicada. Isso é a implantação operacional definida no handoff, não uma alegação de calibração concluída.

## Visual

Tokens compartilhados e feedback de toque independentes da cor literal de classes, nas superfícies do aluno e do professor, inclusive portais. CTA laranja chapado, status teal, cards com raio do padrão e remoção de efeitos neon. Atualizados os componentes secundários de treino, histórico, nutrição, metas, métricas, modal comercial e telas que ainda usavam destaques verdes/âmbar.

## Segurança e integrações

- Escrita nos catálogos globais restrita a papéis canônicos de professor/admin; leitura preservada.
- Helpers de acesso deixam de aceitar coincidência de e-mail como vínculo de propriedade.
- Proxy `exercise-video` implantado: autenticação, acesso pago, orçamento de solicitações, cache e credenciais externas no servidor. Removida a chave opcional de vídeo do bundle do navegador.
- A integração externa opcional usa secrets `EXERCISE_VIDEO_API_URL` e `EXERCISE_VIDEO_API_KEY`. Sem configuração, usa os vídeos existentes no catálogo; não foi inventada uma conexão com provedor.

## Pendências externas e limites

- Cobrança oferecida permanece avulsa por 1 ou 12 meses, com confirmação, validade e expiração automáticas. Links recorrentes legados não foram reativados como se estivessem integrados. Recorrência exige uma integração de eventos do provedor identificada e configurada.
- Backups gerenciados, retenção/PITR e configurações administradas de Auth dependem de acesso ao painel/API de gestão; o conector atual não oferece essas operações. Não foi criado projeto, contratado plano ou copiado o banco pessoal para o workspace.
- Não há comprovação nova de 3.000 sessões simultâneas; o usuário pediu para não executar ensaios. A implementação usa as consultas paginadas, índices, limites e monitoramento já entregues.
- Core OS permanece fora deste trabalho.

## Relato explícito de sinal de alerta

O aluno pode registrar um sinal de alerta sem completar as cinco perguntas. O início e a retomada são bloqueados no servidor e no player; o relato aparece prioritariamente na fila do professor. A aplicação não tenta diagnosticar uma emergência a partir de texto livre. A orientação exibida segue a [Linha de Cuidado de Dor Torácica do Ministério da Saúde](https://linhasdecuidado.saude.gov.br/portal/dor-toracica/sou-paciente/). Registrar ausência de um sinal é uma declaração do usuário, não liberação médica.

## Horários independentes

O relato de sinal de alerta tem horário próprio. Registrar/retirar esse relato, ou informar apenas o local da dor, não renova a idade das cinco respostas da calibração. Reconfirmar as respostas, mesmo com os mesmos valores, registra uma nova observação. A fila do professor ordena relatos de alerta pelo momento em que foram registrados.
