# Correção de histórico e ajuste — 01/11/2026

Código atualizado no checkout fitpro, preservando alterações preexistentes. Banco e função de IA atualizados no Supabase mfrydtrzjxscbkaiwfnw em 01/11/2026. QA visual e funcional a cargo do usuário, conforme solicitado.

## Comportamento
- Progresso e Histórico usam a mesma entrada por métrica, sem seleção obrigatória de origem. O último valor considera a data do registro; medidas anteriores aparecem no splash da métrica. Registros estimados continuam identificados.
- Sessões e cargas ficam sob consulta explícita. O histórico de prescrições do Train abre em splash e mantém o componente de consulta já existente.
- RON abre por ação explícita no cabeçalho; dicas e botão flutuantes deixaram de cobrir a navegação. Os dois sistemas de mensagens temporárias ficam abaixo do conteúdo principal, acima da navegação inferior.
- Topo do Train e painel Sync/contexto no ajuste ocupam menos altura. Cabeçalho sólido e cores do tema existente.
- Ajuste consulta a IA com solicitação e prescrição. A resposta só pode reduzir séries ou RPE conhecidos; dose, descanso e movimentos ficam preservados. Regras locais conservadoras são usadas se o serviço estiver indisponível.
- Restrição conhecida e estável, sem dor atual e sem orientação de suspensão, admite confirmação e análise conservadora. Dor importante, dor na execução, novo relato de dor ou sessão iniciada não são liberados pela confirmação.
- Prévia → aplicar → recibo de gravação. A publicação não dispara outra alteração automática por causa do refresh.

## Validação
- 10 testes: regras de ajuste, precedência dos alertas, consolidação entre origens, ordem de datas e histórico vazio.
- Typecheck e lint dos arquivos revisados.
- Build de produção concluído; avisos de tamanho de bundle preexistentes.
- Migração conservative_adjustment_review aplicada no projeto correto, versão 20261101220515. Confirmadas a regra conservadora, a preservação de changes_json e as permissões: anon sem EXECUTE, authenticated com EXECUTE. Nenhum registro de aluno foi alterado.
- training-ai-adjust publicada, versão 65, preservando withPaidAccess, validação de identidade/alvo e limitação de requisições. A API também filtra a resposta para aceitar somente reduções.
- Verificada a inicialização da função: requisição sem credenciais retorna 401/account_required. Comparação dos advisors antes/depois sem novos achados.

## Entrega e QA
- Migração local sincronizada com a versão aplicada: supabase/migrations/20261101220515_conservative_adjustment_review.sql.
- Backend pronto e ativo. Frontend atualizado no código; a publicação do frontend não foi realizada nesta etapa.
- QA visual, navegação autenticada e exercício completo de aplicar/abrir player ficam com o usuário. Não foram realizadas alterações em registros de alunos para testar esses fluxos.
- Dependências de controle de acesso usadas em produção foram sincronizadas em supabase/functions/_shared/paidAccess.ts e accessGuard.ts.

A migração preserva correções presentes no banco para identidade da sessão e merge de changes_json, além de autorização, concorrência e versionamento existentes.
