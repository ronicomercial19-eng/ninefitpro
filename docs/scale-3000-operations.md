# Operação e critérios de escala

## Evidência disponível em 28/10/2026

- Código e migrações versionados; funções de acesso/cobrança aplicadas; rotinas agendadas com heartbeat consultável em `/app/monetizacao`.
- Ensaios isolados: 3.000 contas fictícias, 60.000 notificações, 2.900 alunos paginados, 2.901 compromissos/reservas no mês e 181.120 linhas de histórico. Não são 3.000 sessões reais concorrentes.
- Smoke HTTP: duas contas de teste já autorizadas, 60 leituras por perfil, no máximo três requisições simultâneas por execução, todas HTTP 200 e zero respostas inválidas. Sem mensagens, pagamentos ou IA. As sessões criadas pelo teste foram encerradas com `scope=local`.
- Aluno: P95 acesso 113,93 ms; notificações 136,20 ms. Profissional: carteira 236,82 ms; agenda 214,45 ms; contexto 228,76 ms. São amostras pequenas no volume atual, não um SLA.
- Relatórios agregados em `docs/reports/http-read-student-20261028.json` e `http-read-professor-20261028.json`, sem credenciais, respostas pessoais ou identificadores de conta.

## Executar novamente o smoke

`scripts/qa-http-read-smoke.mjs` exige `QA_RUN_HTTP_SMOKE=1`, `QA_EMAIL`/`QA_PASSWORD` ou token de sessão de teste em variável de ambiente. Nunca colocar credenciais no arquivo, relatório, comando compartilhado ou CI. Para professor, informar também `QA_MODE=professor` e `QA_ATHLETE_ID` da própria carteira; `QA_MONTH` define o mês consultado. Limites: até 120 leituras e cinco requisições simultâneas. `QA_REPORT_PATH` salva somente métricas agregadas. O padrão é 60 leituras e concorrência três. A conta de aluno consulta apenas seu acesso e suas notificações; o profissional consulta carteira paginada, agenda e contexto autorizado. Nenhum endpoint de escrita, IA ou pagamento faz parte do script.

## Ensaio de capacidade ainda necessário

Antes de declarar suporte a 3.000 sessões simultâneas, usar ambiente separado com o mesmo plano de computação, índices, políticas e limites da produção. Não copiar dados pessoais: gerar 3.000 contas sintéticas e uma distribuição plausível de histórico e de professores. Usar sessões distintas para medir autenticação, RLS e caches corretamente.

Medir rampas de 10, 25, 50 e 100 sessões, depois subir conforme a concorrência esperada do produto. Três mil contas não determinam o pico simultâneo. Para cada etapa, registrar P50/P95/P99, erros/timeouts, conexões/CPU/IO, custo de provedores e tamanho de resposta. Uma meta inicial para avaliar é P95 <1,5 s e erros <1%, sujeita à experiência desejada e ao orçamento. Interromper a rampa se erros ultrapassarem 2% ou houver pressão sustentada no banco. Não incluir cobranças reais, mensagens reais, push ou chamadas pagas de IA no gerador.

## Recuperação e backup: item ainda aberto

A API confirmou a organização Fit evolution no plano Free. O conector disponível não expõe listagem/configuração de backups. O painel do projeto abriu pedindo login, e o acesso foi solicitado ao usuário. Não foi comprovada frequência, retenção, sucesso recente, PITR nem restauração. A ferramenta `restore_project` do conector não deve ser tratada como restauração de backup.

Com acesso ao painel, registrar plano, última cópia bem-sucedida, retenção e recursos de recuperação disponíveis. Definir RPO e RTO com o responsável; não apresentar metas como garantidas sem ensaio. Verificar separadamente objetos do Storage, código de Edge Functions, variáveis/segredos, autenticação e integrações: um backup do banco não deve ser presumido como cobertura completa de todos esses componentes. Referência: [backups do Supabase](https://supabase.com/docs/guides/platform/backups).

O ensaio deve restaurar uma cópia em projeto isolado, mantendo integrações externas e jobs financeiros/mensagens desativados nesse destino. Confirmar migrações, contagens, amostras por conta, relacionamentos, arquivos, isolamento e login de teste; então verificar que um recibo repetido não duplica acesso. Registrar tempos de recuperação e divergências. Nunca restaurar por cima da produção para testar. A criação de um destino pago depende de orçamento autorizado; não foi provisionado nesta execução.

Se houver incidente, preservar evidências técnicas sem credenciais, limitar novas escritas pela funcionalidade afetada, identificar o último estado íntegro e preparar a recuperação isolada. Antes da troca definitiva, comparar assinaturas/pagamentos recebidos depois da cópia com o provedor para evitar liberar prazo em dobro ou perder uma compra. Usar a conciliação atual como evidência, não como cobrança nova.

## Capacidade e orçamento do plano atual

Leitura de catálogo/Storage em 28/10/2026: banco 62.647.443 bytes (~62,65 MB decimais), tabelas públicas com índices 23.035.904 bytes e arquivos armazenados 22.681.831 bytes (~22,68 MB). Não usar a divisão desse volume pelo número atual de alunos como previsão: há dados legados/compartilhados e pouco histórico.

A [página oficial de planos](https://supabase.com/pricing), consultada nesta data, lista no Free: 50.000 usuários ativos/mês, banco de 500 MB, 1 GB de arquivos, 5 GB de egress e 500.000 invocações de Edge Functions/mês. São franquias diferentes; 3.000 contas não significam que todos os recursos cabem automaticamente. A documentação recomenda exportação pelo CLI e cópia externa no Free; não presumir backups diários gerenciados ou restauração testada.

Exemplos de planejamento, não previsão observada: duas fotos de 0,5 MB por aluno/mês × 3.000 alunos geram 3 GB novos por mês; cinco invocações Edge/aluno/dia × 3.000 × 30 dias somam 450.000 chamadas. A conciliação atual agendada por minuto acrescenta até 43.200 invocações em um mês de 30 dias, inclusive execuções ociosas. É necessário medir uso real, histórico retido e tamanho de fotos, e reservar margem antes de promover o lançamento nesse volume. Nenhum plano ou limite financeiro foi alterado.

A cotação de ambiente separado aguarda a confirmação da organização exigida pelo conector. O painel de backups permanece sem autenticação, e o CLI local também não possui token de administração; não foram solicitadas senhas no chat. As próximas ações dependem dessas respostas, não do esgotamento da cota do Codex.
