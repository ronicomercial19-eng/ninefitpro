# Cards acionáveis do atleta — implementação e QA

## Entregue no código
- [x] Painel nutricional compartilhado: refeições, edição, hidratação, metas reais, dieta e solicitação de ajuste profissional.
- [x] Parte superior de Treinos preservada; prescrições anteriores e histórico de sessões na parte inferior.
- [x] Assistência Solo/Guiado/Assistido integrada ao RON durante execução e foco; descanso prescrito e pausa persistente por dor.
- [x] Treinos semanais apresentados um dia por vez; aderência calculada por sessões devidas e concluídas.
- [x] Botão Prime central oculto temporariamente; código e rotas mantidos.
- [x] Card RON com rotação de 20 segundos, pausa e resultados calculados a partir de registros reais.
- [x] NUTRI e módulo Dieta direcionados à alimentação; calibração diária permanece em seu módulo.
- [x] Próximos compromissos mensais, avaliações agendadas, novas prescrições com data e saldo de créditos de serviços.
- [x] Sincronização Google por reserva com identificador estável, repetição sem duplicação e cancelamento com nova tentativa.
- [x] Migração aplicada no Supabase: edição própria de refeições, leitura de dieta vinculada, crédito com validade e vínculo exato da execução semanal.

## Verificação técnica
- [x] TypeScript sem erros na revisão final.
- [x] ESLint dos arquivos alterados: zero erros; avisos de dependências de hooks registrados no log técnico.
- [x] Testes de regras: metas ausentes, validade dos créditos, prescrições anteriores, aderência e evolução comparável.
- [x] Testes simulados Google: identificador estável, repetição, concorrência, autorização e cancelamento.
- [x] SQL: proprietário, bloqueio de leitura anônima, bloqueio de débito direto pelo cliente e validade dos créditos.

## QA do usuário
- [ ] Registrar e editar refeições e água; conferir atualização no início, Hub e Dieta.
- [ ] Testar usuário sem dieta/meta, dados ausentes e falha de conexão.
- [ ] Consultar prescrição anterior e sessão feita; verificar séries, cargas e repetições.
- [ ] Executar treino nos três modos e no foco; conferir timer e respostas contextualizadas do RON.
- [ ] Sinalizar dor, recarregar e confirmar que o registro segue pausado até retomada explícita.
- [ ] Navegar por todos os dias da semana; concluir treino e conferir aderência sem marcar outro treino.
- [ ] Conferir rotação de 20 segundos, pausa, navegação manual e ausência de resultados inventados.
- [ ] Conferir navegação NUTRI/Dieta e ausência temporária do botão central Prime.
- [ ] Reservar serviços, conferir saldo e vencimento; repetir agendamentos com créditos restantes.
- [ ] Conferir conflitos de horário, confirmação, cancelamento e regras de reposição/devolução.
- [ ] Conectar Google com conta real; sincronizar duas vezes, alterar/cancelar e testar reconexão.
- [ ] Conferir compromissos de meses diferentes, aulas em grupo e avaliações com data marcada.
- [ ] Conferir pedido de ajuste nutricional chegando às observações do agendamento.

## Configurações e limitações pendentes
- [ ] Cadastrar ofertas ativas de créditos/aulas/avaliações e validar o pagamento e a concessão de saldo. Nenhuma oferta desse tipo estava ativa na consulta; a interface oferece atendimento quando não há catálogo.
- [ ] Integrar confirmação/disponibilidade do provedor Staff externo. O adaptador atual registra solicitações; a interface não considera esse envio uma confirmação externa.
- [ ] Publicar a versão no Lovable e validar o domínio publicado. A última tentativa disponível exigia login; merge no GitHub não comprova publicação.
- [ ] Avaliar separadamente alertas gerais já existentes no Supabase: views com security definer, configuração de autenticação, extensões e versão Postgres. Não foram tratados como parte desta alteração.

Não foram criados agendamentos, pagamentos ou eventos Google reais para testar. A aprovação funcional depende da QA acima.
