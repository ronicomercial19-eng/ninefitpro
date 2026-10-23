# Auditoria funcional — Planejamento, Ajuste de treino e Histórico

Escopo: diagnóstico aprofundado. Sem correção funcional, publicação, chamada de sincronização externa ou alteração persistente em dados de usuário. Escritas diagnósticas executadas com JWT/role authenticated em transação e ROLLBACK. Histórico apenas revisado.

## Resposta: dá para cadastrar metas?

Sim. No app publicado, abrir Resumo > Metas e projeções > Gerenciar minhas metas > Nova meta exibe formulário e botão Criar meta. O formulário real grava metas_progresso. Teste no banco da conta auditada confirmou INSERT, UPDATE, SELECT e retorno da nova meta em fn_get_assessment_hub.goals, com can_manage=true. Nenhum registro QA ficou gravado. Não cliquei em Criar meta na conta real.

O botão de metas não existe na aba Histórico nem no rodapé compartilhado; está no Resumo. Isso é falta de atalho, não inexistência do cadastro.

## Achados priorizados

### A1 — P1 — segundo salvamento do ajuste usa versão antiga

- src/pages/9fit/AjusteTreino.tsx: onSave envia p_expected_updated_at e espera data.updated_at para atualizar a versão local.
- Função publicada fn_publicar_ajuste_treino_dia atualiza daily_workouts.updated_at mas devolve apenas success, daily_workout_id e exercises.
- Reproduzido: primeiro salvamento success=true; returns_updated_at=false; segundo salvamento com a versão mantida pelo cliente falha com “A prescrição mudou desde a abertura da tela. Recarregue antes de publicar.”
- Correção proposta: retornar a versão efetivamente salva ou reler a prescrição antes de permitir novo ajuste; testar concorrência de duas sessões sem perder a proteção de versão.

### A2 — P1 — snapshot complementar do ajuste tem contrato incompatível

- src/services/training/trainingAgent.ts: persistAcceptedAdjustment envia snapshot_type e payload a ai_context_snapshots.
- Schema publicado: id, user_id, captured_at, context, sync_score, created_at. snapshot_type e payload não existem.
- Além disso, o resultado {error} do insert não é inspecionado; try/catch não detecta sozinho erros retornados pelo supabase-js.
- Consequência: publicação principal e workout_adjustment_versions podem funcionar, mas a memória complementar não é persistida como a interface sugere.

### A3 — P1 — regras de bloqueio não são repetidas integralmente no servidor

- A tela bloqueia revisão por dor/red flag e limita o seletor à data atual/futura.
- A RPC publicada protege proprietário, treino/data, versão, exercícios pertencentes à sessão e execução já iniciada.
- A RPC não contém verificação de data passada nem consulta a regra de revisão por dor. São proteções de interface, não um contrato autoritativo completo.
- Achado de código/definição SQL, não simulação de dor nem recomendação clínica. Não alterei check-ins ou restrições reais para testar.

### A4 — limitação funcional — sugestão nessa tela é local, não IA remota

- Sempre há prescription na chamada do AjusteTreino. requestAdaptiveAdjustment retorna decideContextualAdjustment antes de invocar training-ai-adjust.
- Regras: manter sem pedido específico; reduzir/enxugar até 20% das séries mediante solicitação; sem aumentar carga automaticamente; dor pede revisão; substituição depende da seleção do usuário.
- training-ai-adjust está publicado e há duas respostas POST 200 nos logs da janela consultada, mas isso não comprova que esta tela o chamou. Não vender este caminho como IA remota integral.

### P1 — P1 — sincronização tem contratos/caminhos diferentes

- Caminho principal: smartperiodizer-proxy com /v1/fitpro/planejamento/sync, header de parceiro x-api-key. O proxy repassa a resposta; não grava o plano local nesse handler.
- Fallback: smartperiodizer-sync usa /plan?athlete=... e Authorization Bearer; grava periodization_plans_remote.
- O cliente só executa fallback se o principal lançar erro; não valida o corpo de sucesso do principal nem compara versão/updated_at do plano exibido.
- Não há chamadas SmartPeriodizer na janela de logs consultada; conector ativo com endpoint e referência de segredo não comprova segredo válido ou serviço respondendo.
- A validação externa precisa de leitura segura/contrato do parceiro e teste de sincronização autorizado; não executei POST que alterasse periodização real nesta auditoria.

### P2 — P1/P2 — retorno remoto pode não virar o plano mostrado

- A view vw_athlete_periodizacao_ativa prioriza periodization_annual_plans sobre periodization_plans_remote, independentemente de qual seja mais recente.
- Fallback grava somente a fonte remota; seu único trigger é updated_at. Não há trigger nessa tabela materializando plano anual/sessões diárias.
- O ramo remoto da view fornece macrocycle=NULL. PlanejamentoPro só considera mapa de plano existente quando há semanas derivadas do macrocycle. Receber somente waves não garante renderizar o mapa; pode marcar first_plan sem mapa anual.
- Dados atuais: 10 planos selecionados, todos anuais; zero registros remotos. Portanto é uma lacuna estrutural do caminho de sincronização, não uma alegação de que todos os planos atuais estejam vazios.

### P3 — P2 — durações de um plano divergem

- Um registro da view possui macro_weeks=32 e meso_weeks=24. A interface já possui aviso e não preenche artificialmente as semanas ausentes.
- Exige revisar o plano de origem, não fabricar semanas. Demais planos auditados têm durações alinhadas de 12 ou 48 semanas.

### P4 — P2 — progressão de força pode misturar variações e data de cadastro

- loadCarryProjection usa ilike('%Agachamento%') e agrupa por created_at da série.
- Pode juntar Smith/livre/outras variações e organizar importações retroativas pela data de inserção, não pela data de execução.
- Corrigir futura comparação por identidade/protocolo do exercício e workout_date. Não significa que medidas existentes foram inventadas; o agrupamento é permissivo.

### H1 — P2 — cadastro de meta não implica projeção automática compatível

- Formulário oferece peso, gordura, carga e distância. Não pergunta o exercício específico e não grava exercicio.
- goalHistory reconhece peso/gordura e aliases de exercícios. A métrica genérica carga sem exercicio não encontra teste; distancia não encontra métrica de avaliação correspondente.
- Reprodução com avaliações oficiais sintéticas em memória: peso=1 ponto, gordura=1 ponto, carga=0, distancia=0.
- Cadastro e atualização manual funcionam. Força/carga e distância não devem prometer data projetada até mapear fontes/métrica/exercício/unidade. Mesmo peso/gordura exigem quatro avaliações oficiais compatíveis para estimar uma data.

### H2 — P2 — acesso ao gerenciamento pouco evidente

- Gerenciador fica recolhido em detalhes; Nova meta só aparece ao expandir.
- Sem atalho direto a metas na aba Histórico. Proposta: expor o acesso, sem refazer o visual aprovado.
- Suspeita inicial de falta de atualização do resumo NÃO confirmada: MetasSection emite 9fit:sync_updated; useHub escuta o evento e o serviço invalida o cache. Não é listada como defeito confirmado.

## O que passou

- Banco: meta criada, atualizada, lida e incluída no hub sob permissões de aluno; ROLLBACK.
- Banco: leitura da view do próprio plano sob authenticated passou.
- Banco: primeiro ajuste de parâmetros persistiu e devolveu exercícios; ROLLBACK. Versionamento principal existe.
- Tabelas de treinos, exercícios, execuções e versões existem. Campos sets, reps_range e rest_seconds não estão nulos nos registros auditados.
- student_training_assignments.student_id referencia athletes(id), compatível com o cliente.
- View de planejamento está security_invoker=true. Tabelas principais auditadas estão com RLS.
- 23 testes existentes de métricas/planejamento/regras de ajuste/metas passaram. Não cobrem as lacunas de integração acima.
- Navegador: gerenciamento de metas expandiu; modal de cadastro abriu. Sem salvar teste na conta real.

## Ordem de correção sugerida

1. Contrato de publicação do ajuste: versão nova, segundo salvamento e logs compatíveis com schema.
2. Regras de bloqueio no servidor e teste de permissões/concorrência.
3. Definir uma fonte canônica do planejamento e normalizar sincronização principal/fallback, conferindo o dado salvo e exibido.
4. Corrigir o plano com duração divergente e o agrupamento da curva de força.
5. Histórico apenas: acesso a metas e descrição honesta das métricas com projeção disponível.

Sem declarar sincronização externa ou fluxo completo de compra/ativação como aprovados nesta auditoria.

## Correção autorizada e executada

- Migração `20261023001841`: publicação do ajuste devolve a versão atual; salva novamente com essa versão e rejeita versão obsoleta. Mantidos bloqueios de execução iniciada e de acesso. Data passada e revisão por dor agora são verificadas no servidor (o treinador explicitamente responsável pode revisar a dor).
- Contexto complementar usa `ai_context_snapshots.context` e verifica o erro. Se somente esse registro falhar, a tela informa que o treino principal já foi salvo.
- Metas: acesso direto no Histórico e gerenciamento expandido. Carga exige identificar o teste/exercício; unidade compatível. Distância fica com progresso manual, sem prometer projeção automática sem medições oficiais compatíveis.
- Curva de força usa nome exato do exercício e data da execução, sem misturar variações por substring ou data de lançamento das séries.
- Planejamento tem um único caminho de atualização. A conexão hoje configurada é a própria `fitpro-api` deste projeto: nesse caso, relê a view canônica com RLS, sem duplicar o plano anual como remoto nem regenerar uma prescrição. A interface informa atualização dos dados da equipe, não sincronização externa.
- Para uma conexão externa FitPro API, rota e autenticação foram alinhadas a `GET /v1/fitpro/planejamento?fitpro_student_id=...`, `x-api-key`; aceita o envelope snapshot documentado. Duração precisa ser explicitamente declarada ou somada dos macrociclos declarados; fases contraditórias são rejeitadas. Retorna sucesso apenas após persistência e leitura canônica verificadas. Esse caminho externo não foi homologado com outro servidor/credencial nesta rodada.
- View preserva o mapa remoto e seleciona a fonte anual/remota pela atualização efetiva, mantendo atribuição legada como fallback.

### Verificação

- 27 testes automatizados passaram (metas, métricas, planejamento, contexto de ajuste e contratos reparados).
- Testes SQL pré e pós-migração passaram com autenticação simulada e ROLLBACK: primeiro e segundo salvamento, conflito de versão, data passada, dor, anônimo, contexto e seleção/leitura de plano remoto sintético. Nenhum dado de teste foi mantido.
- Edge `smartperiodizer-sync` versão 47 publicada com autenticação própria; requisição sem sessão rejeitada. Migration aplicada no banco.

### Pendência que exige decisão profissional

Um plano anual existente declara 32 semanas no macro e 24 no meso. Mantida a sinalização visual e os valores originais: não há evidência para decidir qual duração é a correta. Revisão de Rony necessária; nenhuma prescrição foi inventada para fechar essa diferença.
