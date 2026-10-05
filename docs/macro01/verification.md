# Verificação da Macro 01

## Concluído tecnicamente
- [x] Inventário do catálogo SQL e pesquisa de referências frontend/Edge Functions.
- [x] Migrations criadas pelo CLI e aplicadas no projeto mfrydtrzjxscbkaiwfnw.
- [x] TypeScript e build de produção passaram.
- [x] ESLint direcionado: zero erros; warning legado de handleSend em Ron.
- [x] Contrato: aprovação de revisão antiga não executa; confirmação sem entidade não conclui; bloqueio/cancelamento não executam.
- [x] Autenticação de webhook: segredo ausente, cabeçalho ausente/ambíguo/incorreto negados; correto aceito.
- [x] SQL com rollback: valor de share servidor, duplicação, copy sem XP e RPC antiga sem segundo crédito.
- [x] SQL com rollback: vínculo de aluno, PDI alheio negado, assinatura não editável e share XP direto negado.
- [x] SQL com rollback: leitura própria permanece, prescrição/regeneração iniciada/concluída bloqueada.
- [x] SQL com rollback: thresholds alheios negados; crédito negativo negado; duas assinaturas quick exigem calibração.
- [x] Snapshot do fallback Nine/Lima em migration; não apagadas assinaturas.
- [x] Advisors de segurança consultados; alertas gerais documentados em audit.md.

Os testes SQL simulam sessão autenticada com identidade existente em transação revertida. Nenhum XP, calibração ou registro do teste é mantido. Não constituem QA com conta real, teste concorrente de carga ou confirmação de serviços externos.

## QA do usuário
- [ ] Compartilhar via Web Share e confirmar somente o XP retornado pelo servidor.
- [ ] Repetir mesmo conteúdo; conferir ausência de novo prêmio.
- [ ] Copiar link/baixar imagem; conferir texto correto e ausência de prêmio de publicação.
- [ ] Cancelar compartilhamento ou falhar o registro; nenhum sucesso de XP.
- [ ] Conferir leitura de assinatura existente, sem exigir compra nova.
- [ ] Completar PDI em aluno vinculado via athlete_auth_link.
- [ ] Informar dor ao RON; não aparece afirmação de ajuste já aplicado.
- [ ] Conferir treino rápido sem calibração, com restrição e após alteração dos sinais.
- [ ] Conferir treino rápido normal e retomada de treino atribuído.
- [ ] Aplicar Nine/Lima em data elegível e conferir treino em Train.

## Pendências externas
- [ ] Confirmar providers/chaves e contratos sem expor segredos.
- [ ] Confirmar hospedagem do Express/webhook e formato de evento InfinitePay.
- [ ] Publicar frontend no Lovable; merge não comprova publicação.
- [ ] Teste de capacidade de 3.000 usuários na Macro 09.
