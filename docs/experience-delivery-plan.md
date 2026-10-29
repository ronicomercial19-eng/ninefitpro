# Plano de entrega — aluno e professor

Atualizado em 29/10/2026. Ordem aprovada por impacto na experiência. Nenhum checkpoint é concluído somente pela existência de código.

## Fase 1 — Entrada e ativação
- [ ] 1. Identidade e carregamento consistentes. Identidade compartilhada entregue no PR #122 e publicada. Complemento nesta rodada: view canônica, gates com espera limitada e descarte de navegação antiga. QA visual pendente.
- [ ] 2. Onboarding persistido e retomável. Nesta rodada: sexo opcional gravado no atleta e nas respostas; leitura após recarga; confirmação visível de gravação, mensagens acionáveis e recuperação da ficha. Confirmação adicional do PDI aguarda definição de quem confirma; QA visual pendente.

## Fase 2 — Treino e acesso
- [ ] 3. Carregar, iniciar, registrar, retomar e concluir sem perda ou duplicação; histórico coerente; treino rápido e descanso.
- [ ] 4. Checkout, confirmação, vínculo comprador/plano, validade mensal/anual, renovação, vencimento e distinção avulso/recorrente. Regra comercial dos alunos da consultoria pendente; preservar acesso atual.

## Fase 3 — Operação do professor
- [ ] 5. Lista, busca, filtros, paginação, situação do aluno e agenda coerentes e rápidos.
- [ ] 6. Prescrição versionada sincronizada, conclusões, avaliações, ajustes e feedback; autoridade e bloqueios do professor preservados.

## Fase 4 — Visual, histórico e Sync
- [ ] 7. Executar integralmente trilhas A e B do handoff: tokens, feedback, todas as telas e componentes pendentes, impacto no painel, checkpoint master, score ponderado canônico, plausibilidade, origem/data, capacidade, 1RM confirmado, tipos, documentação e testes.
- [ ] 8. Executar integralmente trilha C e dependências: confirmação PDI, contraindicações, escala da dor, consentimento, regras/contextos versionados, decisão única, modo sombra, aplicação idempotente/reversível, versões, travas, semanal/rápido, fluxo da dor, devolutiva, RON/Hub, alertas e calibração por RPE após amostra suficiente.

Especificação detalhada e checklist de celular: [handoff integral](handoff-visual-history-sync-2026-10-29.md). Todas as seções 1–9 integram este plano, incluindo telas secundárias, matriz v2, tabelas/funções propostas, sequência dos sprints, dependências, riscos, deploy e validações. Estados “entregue” no handoff são relatos a verificar, não confirmação desta auditoria.

Decisões abertas: tabela v2 como regra oficial; ênfase por pilar fraco; quem confirma PDI; eventual inclusão de autoavaliação em metas/projeções (até decisão, somente oficiais). Parâmetros não são considerados calibrados. Não usar dados irreais de teste para calibração. Core OS fora do escopo.

## Fase 5 — Consolidação
- [ ] 9. Desempenho, consultas, integrações, tarefas, recuperação, monitoramento e evidências de capacidade para 3.000 usuários; build/testes/deploy e QA aluno/professor.
- [ ] 10. Segurança: isolamento, RLS, autorização canônica, funções privilegiadas, catálogos, secrets, proteção e recuperação de dados.

Segurança geral por último conforme preferência do usuário. Consentimento e travas que condicionam ajuste de treino acompanham a própria funcionalidade.

## Critério por entrega
Registrar problema, alteração, verificação técnica, estado da publicação e pendências do QA do usuário. Não marcar uma fase concluída parcialmente.

## Rodada de ativação e carregamento — 29/10/2026
- Migrações `20261029105218_onboarding_profile_persistence` e `20261029105935_canonical_identity_view` aplicadas e verificadas com transações revertidas no banco real.
- Testes isolados: 37 verificações de onboarding e 10 de identidade (vínculo legado divergente, dono direto, vínculo único, ausência de atleta e ausência de sessão).
- Treino: leituras independentes em paralelo, cancelamento ao trocar aluno/tela, aviso de falha parcial de protocolos, atribuição sem data inicial disponível e atualização por Realtime de daily_workouts (publicação verificada).
- Professor: resumo do onboarding mostra sexo e medidas declaradas, com atualização manual e cancelamento da consulta anterior.
- Sem alteração de parâmetros de Sync, prescrição automática, carga ou regra comercial dos alunos atuais.
- Checklist de QA: salvar sexo e nascimento; recarregar; escolher não informar; conferir resumo no professor; simular conexão indisponível e recuperar; abrir treino rápido antes de a identidade terminar de carregar; trocar aluno/conta sem reaproveitar dados anteriores.
- Esta rodada não encerra as cinco fases nem comprova capacidade para 3.000 usuários.

## Implementação consolidada das cinco frentes — 29/10/2026

Detalhamento de código e configurações: [entrega das fases](experience-phases-implementation.md). QA é responsabilidade do usuário e não será usado como substituto de implementação.

- Fases 1–3: base implementada nos PRs #106–#123; esta rodada acrescenta Sync compartilhada, fila de revisões no Dashboard, confirmação do perfil e bloco de capacidade escolhido pelo professor.
- Fase 4: motor versionado, consentimento, modo persistido, aplicação/reversão, doses por tempo, contexto e aprendizado condicionado a registros reais; score canônico no banco; referências de carga confirmadas; tokens compartilhados e componentes secundários alinhados.
- Fase 5: catálogos protegidos, propriedade sem fallback por e-mail e proxy de vídeo com segredo no servidor. Consultas paginadas, índices, limites de API e monitoramento permanecem em operação.
- Pendências externas continuam explícitas: configuração/validação operacional de backups e Auth no provedor; recorrência legada sem integração identificada. A Sync segue a observação inicial de sete dias prevista no handoff. Não confundir implementação disponível com comprovação de capacidade/calibração.
