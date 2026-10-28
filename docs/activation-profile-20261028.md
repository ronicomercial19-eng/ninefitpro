# Ativação com perfil persistido

A rota `/9fit/ativacao` confirma as nove respostas do PDI: objetivo, recuperação, tolerância a volume, horário, sensibilidade ao estresse, tolerância a desconforto, prazo, lesões e restrições alimentares. Ela não simula treino, avaliação física ou pagamento.

Cada confirmação grava uma etapa por `fn_save_pdi` na conta autenticada, em `user_parameters` e `user_context_settings.declared_keys`. O modal lê os dados novamente ao abrir e retoma a primeira pergunta ainda não confirmada. Escolhas não recebem resposta padrão implicitamente. Nas escalas, o aluno confirma o valor exibido. A opção “Nenhuma” é salva como lista vazia.

Somente a confirmação final das nove respostas atribui `pdi_completed_at`. Falhas de gravação mantêm a etapa aberta e exibem erro; não há sucesso otimista. O contexto diário é relido antes de sair para `/9fit/os`. O controle de pagamento continua separado do preenchimento da ficha.

Fichas antigas preservam valores e datas. Uma ficha antiga com apenas cinco respostas passa a aparecer como incompleta e pode confirmar as perguntas restantes. A ativação legada de alunos de consultoria continua reconhecida no acesso existente; ao abrir explicitamente a rota de ativação, o aluno pode completar o PDI. Não se fabrica histórico de treino, XP ou avaliação física.

## Verificação técnica

- 29 verificações em PostgreSQL/PGlite: gravação, conclusão, repetição, edição parcial, listas, valores inválidos, conta anônima, permissões e isolamento entre contas.
- Testes de rota lógica distinguem ficha parcial, rascunho completo ainda não confirmado e perfil confirmado.
- Validação no banco de produção sob papel `authenticated`: salvar rascunho, recusar conclusão parcial, concluir e reler a ficha pelo contexto diário. Todas as alterações de teste foram revertidas por `ROLLBACK`.
- Migração aplicada: `20261028084328_complete_activation_profile.sql`.

## QA da experiência, pelo usuário

1. Em uma conta com ficha incompleta, abrir `/9fit/ativacao`, responder duas perguntas e fechar.
2. Reabrir: a ficha deve retomar a primeira pergunta não respondida. Conferir as respostas anteriores com “Voltar”.
3. Concluir as nove perguntas, incluindo “Nenhuma” quando aplicável. Deve abrir a jornada diária após a confirmação do banco.
4. Sair e entrar novamente: os dados devem continuar na ficha. Editar uma resposta e conferir que as demais foram preservadas.
5. Interromper a conexão ao confirmar uma resposta: deve exibir erro, permanecer na pergunta e permitir tentar novamente.

O QA visual e de usabilidade fica com o usuário, conforme solicitado.
