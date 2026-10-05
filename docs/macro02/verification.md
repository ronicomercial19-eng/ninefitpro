# Verificação da Macro 02

## Verificações técnicas
- [x] TypeScript e build de produção.
- [x] QA fases 2/3/4 e contratos da Macro 01 preservados. Corrigido falso negativo da fase 3: a consulta canônica tinha cast TypeScript e o teste exigia texto sem cast.
- [x] QA Macro 02: dia de negócio, prioridade da calibração, PDI, dor mesmo com SYNC alto, retomada, descanso, alimentação, água, balanço ruim e encerramento.
- [x] SQL com rollback: gravação declarada, uma alteração/um histórico, repetição sem novo snapshot, campos observados não editáveis pela RPC, tempo negativo negado.
- [x] SQL com rollback: calibração parcial não gera score, completa gera percepção 100, Hub e contexto concordam, descanso e balanço persistem.
- [x] SQL com rollback: perfil/balanço/streak de outro aluno negados, data futura negada, sessão anônima não lê o contexto novo.
- [x] RON publicado no Supabase; requisições sem autenticação e com token inválido retornam 401, antes do consumo de IA.
- [x] Advisors de segurança e performance consultados. Revisão das novas políticas inclui bloqueio explícito de anonymous sign-ins, sem mudar a configuração global.

O banco foi testado com uma identidade existente dentro de transação revertida. Nenhum dado do teste é mantido. A geração de resposta com conta real, serviços de IA e a apresentação visual serão validados pelo usuário.

ESLint direcionado às peças novas: zero erros. Existem warnings legados de dependências/refs em QuickTrainModal e useAthleteScores. O lint global continua informativo no workflow existente.

## Checklist de QA do usuário
- [ ] Abrir Hub/OS sem calibração e completar os cinco emojis.
- [ ] Aluno novo: primeiro acesso → ficha de cinco confirmações → Hub/OS, sem executar treino genérico.
- [ ] Atualizar os sinais no mesmo dia; conferir nova leitura.
- [ ] Confirmar o PDI inicial; abrir Perfil e conferir os campos declarados.
- [ ] Editar tempo/ambiente e conferir persistência após recarregar.
- [ ] Trocar assistência no treino; conferir a preferência após voltar ao app.
- [ ] Com dor/restrição, ver revisão antes do treino mesmo com score alto.
- [ ] Com treino em andamento, ver Retomar; treino feito ontem não conclui hoje.
- [ ] Registrar descanso; conferir que nenhuma execução virou treino concluído.
- [ ] Registrar refeição e água na Dieta; voltar ao card e conferir progressão.
- [ ] Responder balanço do dia, inclusive péssimo; conferir encerramento.
- [ ] Reabrir após meia-noite de São Paulo; calibração de ontem não vale hoje.
- [ ] Alternar contas; ficha e contexto não exibem dados da conta anterior.
- [ ] Desconectar/reconectar; não aparece sucesso de gravação ou conclusão sem confirmação.
- [ ] Conversar com RON; conferir referências corretas à ficha/sinais, sem afirmações de ações não executadas.
- [ ] Conferir composição do SYNC no Hub e comparar com os registros reais.

## Pendências fora desta macro
- [ ] Confirmar publicação do frontend no Lovable depois do merge.
- [ ] QA real de IA/provider, preferências e experiência visual.
- [ ] Adequação/prescrição, semanas, periodização/calendário e conciliação dos consumidores legados de score: Macro 03.
- [ ] Cards nutricionais novos, protocolos e radar: Macro 04.
- [ ] Player/aulas: Macro 05; entregas e chat clicável: Macro 06; serviços Prime: Macro 07.
- [ ] Teste de carga/custos de 3.000 usuários: Macro 09.

Persistem alertas gerais do projeto relativos a views privilegiadas, funções legadas, políticas e configuração de autenticação. Esta macro não certifica segurança global. Referência de remediação: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
