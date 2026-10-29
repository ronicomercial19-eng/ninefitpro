# Plano de entrega — aluno e professor

Atualizado em 29/10/2026. Ordem aprovada por impacto na experiência. Nenhum checkpoint é concluído somente pela existência de código.

## Fase 1 — Entrada e ativação
- [ ] 1. Identidade e carregamento consistentes. Em andamento: identidade canônica, cache compartilhado, espera limitada e retry. Ainda falta validação integrada e publicação.
- [ ] 2. Onboarding persistido e retomável; perfil completo, coleta de sexo e preparação da confirmação do PDI.

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
