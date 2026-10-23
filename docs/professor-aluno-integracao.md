# Integração professor e aluno — 23/10/2026

## Entrega implementada

| Frente | Resultado |
| --- | --- |
| Identidade e navegação | Seleção compartilhada de aluno em `/app`, preservada nos links; troca de aluno remonta o contexto e descarta respostas antigas. Vínculo ativo validado no servidor. |
| Acompanhamento | Contexto diário canônico do aluno, treinos, avaliações, dor, Move, hábitos, protocolos e agenda, com origem e ausência de dados explícitas. |
| Prescrição | Catálogo real, parâmetros editáveis, rascunhos recuperáveis e revisão explícita. Publicação transacional em `daily_workouts`/`workout_exercises`, versões, autor e notificação no aluno. Repetição da requisição não duplica entrega. |
| Ciclos | Publicação de 1–12 semanas a partir de rascunhos revisados, visível no planejamento do aluno. Repete a estrutura semanal aprovada; não inventa progressão fisiológica ou cargas. |
| Ajustes | Prévia de antes/depois, revisão e alteração efetiva de séries para redução de volume suportada. Intensidade/recuperação seguem para edição manual revisada. Entrega confirmada por registro nativo; estados legados sem prova são identificados. |
| Histórico de execução | Bloqueio transacional preserva prescrições de sessões iniciadas, concluídas ou puladas, inclusive contra caminhos legados de ajuste. |
| IA profissional | RON, análise e assistente usam aluno selecionado e contrato JSON. Histórico privado por professor/aluno. Sugestões não executam ações nem acessam conversas pessoais do aluno. |
| Mensagens | Conversa humana bidirecional, paginação, tentativa repetida sem duplicação e notificações com destino correto. RON e Equipe/9ZAP continuam acessíveis em canais separados. |
| Indicadores | Dashboard, Estatísticas e Relatórios compartilham coorte, período e fonte; contagem por pessoa e distinção entre prescrição e conclusão. Exportação CSV real com proteção contra fórmulas. |
| Agenda e créditos | Conflitos de horário impedidos no banco; créditos incrementados de forma atômica, sem zerar saldo usado, com recibo de requisição. |
| Postura e arquivos | Professor atua no aluno autorizado; resultado apenas quando concluído. Aluno vê avaliação vinculada. Fotos e PDFs usam acesso privado e URLs assinadas. |
| Perfil e acesso comercial | Dados pessoais gravados na tabela canônica com confirmação. Assinatura consultada no servidor sem presumir pagamento. Configurações usam `user_id`; Skills e conectores globais mantêm escrita administrativa. |

## Backend publicado

Projeto Supabase `mfrydtrzjxscbkaiwfnw`, migração `20261023222926_professor_student_workspace.sql` aplicada.

| Função | Versão ativa |
| --- | --- |
| ai-coach | 62 |
| postura-pro-scan | 48 |
| training-adjustment-analytics | 13 |
| training-adjustment-review | 7 |
| training-adjustment-apply | 8 |
| training-adjustment-deliver | 8 |

Fontes publicadas conferidas com os arquivos locais. Autenticação interna preservada; todas rejeitam POST sem autenticação com 401 e respondem OPTIONS com 200.

## Validação executada

- TypeScript e build de produção aprovados. Build mantém avisos de tamanho de bundle e importação de html2canvas.
- Lock npm sincronizado com os três pacotes Capacitor já declarados no projeto. Verificações estáticas legadas atualizadas para o hub de avaliações, feedback transacional e calendário de histórico atuais; cenários não foram desativados. Suítes adicionais de primeiro acesso/login/protocolos (16 testes), fase 2, Macro 02, QA Master, Macro 03 e integração 19 (3 testes) aprovadas localmente.
- 34 testes Node aprovados, incluindo seleção, identidade, contratos de IA e contagem de pessoas.
- 11 testes PostgreSQL/PGlite da entrega anterior do aluno aprovados.
- 26 verificações SQL aprovadas antes e depois da publicação: escopo, autorização, anonimato, publicação, ciclo, mensagens, créditos, agenda, arquivos privados, postura, ajustes e histórico de IA. Fixtures sintéticas executadas em transação com ROLLBACK; nenhuma mensagem real enviada.
- 8 verificações Playwright aprovadas com rede simulada: contexto e links, resposta tardia de IA, publicação revisada, repetição de mensagem e conversa do aluno em largura mobile. Sem erros de página. Evidências em `../output/qa-professor/`, fora do Git.
- Advisors revistos: RPCs SECURITY DEFINER intencionalmente expostas apenas a authenticated validam identidade/vínculo; recibos privados mantêm RLS sem política para negar acesso direto. O analisador sinaliza anonimato em políticas com helper, mas o helper rejeita contas anônimas e os testes confirmam bloqueio. Não constitui certificação global dos avisos históricos do projeto. Referências: [SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [contas anônimas](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins).

## Fechamento operacional

Publicar o frontend pelo Lovable e executar QA autenticado com contas reais continuam sob responsabilidade do usuário, conforme combinado. Conferir professor → prescrição/ciclo → aluno → execução → acompanhamento; mensagens nos dois sentidos; agenda; Postura e PDF; troca de aluno e de conta.

Provedores externos dependem de credenciais e disponibilidade próprias. Health check só confirma resposta explícita válida; transferência de repositórios não implementa SSO. Não foram disparados pagamentos, emails ou mensagens externas, nem validada inferência clínica real de IA/Postura. Esta entrega cobre os fluxos implementados e os testes descritos, sem declarar todo o aplicativo certificado.
