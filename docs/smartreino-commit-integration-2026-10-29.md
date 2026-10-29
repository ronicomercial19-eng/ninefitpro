# Integração dos quatro commits Smart Treino → FitPro

29/10/2026. Inspeção de código e metadados reais; sem execução de treino, alteração de respostas ou QA manual.

## Repositórios e banco

O patch pertence a ronicomercial19-eng/smartreino (main f094774 antes desta entrega), não ao repositório distinto treino-smart-periodizer que está no diretório smart-treino. O FitPro usa ronicomercial19-eng/ninefitpro. Os dois apps usam mfrydtrzjxscbkaiwfnw. Mudanças em RPCs desse banco afetam os dois.

## Os quatro commits

| Commit recebido | Situação encontrada | Tratamento |
| --- | --- | --- |
| 9fed6e3 | Ordem corrigida já estava na generate-smart-treino v46. Orquestrador v19 já usava prescrever_treino, porém com outro código. O patch prescrevia sete dias; produção prescrevia os primeiros N dias, enquanto o FitPro distribuía a frequência na semana. | Ordem sequencial salva no git do Smart Treino. Orquestrador v20 passa por fn_generate_periodized_week, a mesma RPC do FitPro; sem substituição cega da função por um patch mais antigo. |
| 9d6e2f6 | Aviso específico de revisão ausente no Smart Treino. FitPro já escondia a execução de sessões com prescription_issue. | Mensagem de revisão incluída na página realmente roteada TreinoHoje. Atualização da tela reutiliza prescrição salva. |
| 22a10a4 | JSON do package-lock anterior/posterior é semanticamente e textualmente igual após normalizar quebras de linha. | Ruído não reaplicado; dependências não alteradas. |
| 8ca9e5c | Card útil, mas título confundia falta de automação com falta de treino; hook carregava roster/histórico inteiro e ocultava erros. | Fila paginada e autorizada no banco, erros visíveis e distinção entre atribuição manual e periodização. Integrada aos dois painéis. |

## Evidência atual do banco

38 atletas, sete marcados como teste, 31 não-teste, 24 sem regra automática ativa e oito com periodização ativa. Entre os 24, 16 têm atribuição manual vigente (isso não comprova executabilidade do conteúdo). Portanto, não afirmar que 24 alunos estão sem qualquer treino. O handoff menciona quatro contas de teste, mas o estado atual marca sete.

O lote de 26/10 está registrado com nove atletas gerados e um bloqueado, contra um gerado/nove bloqueados nos dois lotes anteriores consultados. Isso demonstra a mudança de motor registrada; não constitui teste novo nem comprovação de execução pelo aluno. Há 47 linhas históricas com prescription_issue: não foram liberadas em lote.

## Mapa de impacto e implementação

| Fluxo | Via canônica | Resultado desta entrega |
| --- | --- | --- |
| Treino atual no Smart Treino | fn_get_saved_prescription → prescrever_treino apenas se não existir sessão | Consulta não apaga doses nem Sync; identificadores de linhas e updated_at reais. |
| Player do FitPro | Prescrição salva/gerada → diário → execução | Ordem neural/integracao/bloco9/reset; data de São Paulo; espera a resolução e vincula a execução ao diário retornado. |
| Ajuste no Smart Treino | aplicar_ajuste_treino_dia → fn_publicar_ajuste_treino_dia | Edições passam a atualizar workout_exercises, com travas, auditoria e conferência de timestamp quando fornecido. |
| Ajuste no FitPro | fn_publicar_ajuste_treino_dia | Preserva metadados de Sync/tempo ao publicar; não substitui changes_json inteiro. |
| Treino rápido | fn_treino_rapido | Continua sessão separada com objetivo/tempo/equipamento; prescrever_treino não seleciona nem reescreve linhas quick. Não é o mesmo motor da prescrição periodizada. |
| Semana manual e automática | fn_generate_periodized_week | Mesma frequência e distribuição; falhas diárias retornam resultado parcial sem descartar os dias que puderam ser gerados. Sessões existentes/iniciadas preservadas. |
| Sync diária | Doses reais da sessão | Reabrir prescrição salva preserva doses aplicadas. As regras de consentimento, revisão e execução permanecem. |
| Entrega ao FitPro | Banco compartilhado | Página Smart confirma a sessão persistida; deixa de depender da entrega HTTP legada para dizer que o treino está disponível. |
| Professor | fn_coach_training_setup_queue | Paginação de 20, total real, escopo de responsável e flags separadas de atribuição manual/periodização. |

## Detalhes importantes

- Prescrições novas guardam contexto/parametros em prescription_snapshot; leitura das doses usa workout_exercises, incluindo os ajustes atuais. Contexto histórico ausente é indicado, não inventado.
- Prescrição já salva é devolvida sem regerar exercícios; a exceção é o fluxo explícito de força já existente, que ainda respeita execução iniciada. Múltiplas prescrições periodizadas no mesmo dia pedem revisão.
- A proteção de requires_approval do catálogo encontrada no banco foi preservada e incorporada à definição versionada da RPC.
- Metadados da wave agora também exigem periodização Smart ativa, como o seletor de foco já exigia.
- O rótulo de intensidade do Smart é orientação: não inventa multiplicadores de dose ou RPE. Trocas/edições usam o id da linha prescrita para distinguir o mesmo exercício em blocos diferentes.
- Itens parciais/bloqueados não ficam ocultos como entrega completa; o orquestrador não considera lotes concluídos com bloqueios como definitivamente idempotentes.
- Não foram criadas macro_rules padrão para os 24 alunos. O professor precisa decidir quem deve usar automação, pois parte recebe atribuição manual.

## Limites que permanecem explícitos

- A projeção de fases por datas futuras ainda depende do modelo de periodização. O seletor atual usa a wave current; esta entrega não inventa datas para waves planejadas.
- O orquestrador legado ainda processa o roster em um lote e usa triagem textual histórica; isso não é garantia de capacidade para 3.000 alunos nem substitui os relatos explícitos de segurança.
- Configuração e acesso do CORE OS são uma integração distinta deste patch.
- Compilação do FitPro e build do Smart são verificações técnicas. O typecheck do Smart com dependências emprestadas encontrou erros fora dos arquivos alterados, por isso não é declarado limpo. CI do próprio repositório é acompanhado separadamente; QA manual continua com o responsável.

O treino rápido também passa a preservar estados started/paused/skipped, além de in_progress/completed, antes de substituir uma sessão quick ainda não iniciada.

O ajuste no FitPro permite escolher a sessão quando há treino rápido e periodizado na mesma data. O player filtra overrides pelo id da sessão e normaliza exercise_name/reps_range do JSON canônico, evitando misturar doses de outra sessão.
