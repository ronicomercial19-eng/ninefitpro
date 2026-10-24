# Checklist integral: app do aluno → profissional → devolutiva

Referência: matriz anexada pelo usuário, cruzada com `src/App.tsx` e os componentes reais. Este checklist separa rotas, componentes internos, atos profissionais e dependências externas. A lista de rotas é do código atual, incluindo aliases e rotas adicionais à matriz original.

## Critério de conexão completa

- [x] Identidade e vínculo validados no backend; seleção do aluno preservada.
- [x] Solicitação explícita com módulo, assunto, autor e histórico.
- [x] Fila profissional com filtro de quem precisa responder e carteira autorizada.
- [x] Devolutiva com destino para execução no módulo profissional.
- [x] Retorno visível ao aluno, notificação interna e leitura separada da confirmação.
- [x] Confirmação explícita do aluno e possibilidade de reabrir o acompanhamento.
- [x] Controle de versão e repetição idempotente da operação.
- [ ] Associação automática de cada devolutiva à versão de uma prescrição, avaliação ou outro registro canônico.
- [ ] Conversão dos sinais importantes em fila automática sem depender de solicitação manual.
- [ ] Permissões de compartilhamento por área/equipe, além do vínculo atual.

Os itens marcados descrevem a primeira entrega implementada, não QA com contas reais. Uma solicitação por módulo não prova que todos os processos internos desse módulo estejam automatizados.

## Todas as rotas atuais do aluno

| Rota | Componente efetivo | Profissional executa em | Retorno / limite |
| --- | --- | --- | --- |
| `/9fit` | `NineFitLogin` | `Auth e suporte` | Sessão válida e entrada correta. Login não é solicitação de acompanhamento. |
| `/9fit/acompanhamento` | `StudentCarePage` | `/app/mensagens` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Pergunta contextual, resposta, visualização e confirmação em fluxos separados. |
| `/9fit/ajuste-treino` | `NineFitAjusteTreino` | `/app/treino-ia` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Sessão, exercícios, impedimento e substituição; publicar revisão preservando execução. |
| `/9fit/ativacao` | `NineFitAtivacao` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Perfil e preferências declarados; confirmar objetivo e orientar configuração. |
| `/9fit/aulas` | `Navigate` | `Redirecionamento/alias definido em App.tsx` | Preservar destino e identidade; não criar entrega ou indicador duplicado. |
| `/9fit/aulas-creditos` | `AulasCreditos` | `/app/agenda` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Confirmação, cancelamento, reagendamento e presença; saldo reconciliado. |
| `/9fit/avaliacao` | `Navigate` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Auto-relato e avaliação com origem; comparar protocolos compatíveis e devolver interpretação. |
| `/9fit/avaliacao-guiada` | `NineFitAvaliacaoGuiada` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Auto-relato e avaliação com origem; comparar protocolos compatíveis e devolver interpretação. |
| `/9fit/avaliacao/:id` | `NineFitAssessmentPages` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Auto-relato e avaliação com origem; comparar protocolos compatíveis e devolver interpretação. |
| `/9fit/avaliacao/:id/:section` | `NineFitAssessmentPages` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Auto-relato e avaliação com origem; comparar protocolos compatíveis e devolver interpretação. |
| `/9fit/biblioteca` | `NineFitBiblioteca` | `/app/exercicios` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Dúvida técnica sobre conteúdo; devolver instrução ou prescrição pertinente. |
| `/9fit/billing` | `NineFitPrimePass` | `/app/monetizacao ou gestão de assinatura / equipe` | Confirmação do provedor e suporte administrativo; sem copiar dados completos de pagamento ao professor. |
| `/9fit/checkout/:offerId` | `NineFitCheckout` | `/app/monetizacao ou gestão de assinatura / equipe` | Confirmação do provedor e suporte administrativo; sem copiar dados completos de pagamento ao professor. |
| `/9fit/checkout/success` | `NineFitCheckoutSuccess` | `/app/monetizacao ou gestão de assinatura / equipe` | Confirmação do provedor e suporte administrativo; sem copiar dados completos de pagamento ao professor. |
| `/9fit/collections` | `NineFitCollections` | `/app/smart-periodizer` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Programa escolhido e dúvidas; orientar uso e programação. |
| `/9fit/community` | `NineFitCommunity` | `/app/community` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Solicitação compartilhada voluntariamente; não importar feed privado ou afirmar SSO. |
| `/9fit/compartilhar` | `NineFitCompartilhar` | `Escolha explícita do aluno` | Compartilhamento social não deve enviar informação privada automaticamente ao profissional. |
| `/9fit/dieta` | `NineFitDieta` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Plano e dificuldades compartilhadas; orientação pelo responsável com acesso à área. |
| `/9fit/elite-bio` | `NineFitEliteBio` | `/app/acompanhamento` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Sinais registrados com origem e data; orientar sem tratar score como diagnóstico. |
| `/9fit/embed` | `EcoEmbed` | `Configuração / suporte / conector correspondente` | Permissões técnicas e destino externo; sem enviar tokens nem inferir SSO. Encaminhamento técnico não automatizado para a fila profissional. |
| `/9fit/entrada` | `CustomerEntry` | `/app/monetizacao ou gestão de assinatura / equipe` | Confirmação do provedor e suporte administrativo; sem copiar dados completos de pagamento ao professor. |
| `/9fit/events` | `NineFitCommunity` | `/app/community` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Solicitação compartilhada voluntariamente; não importar feed privado ou afirmar SSO. |
| `/9fit/first-access` | `NineFitFirstAccess` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Perfil e preferências declarados; confirmar objetivo e orientar configuração. |
| `/9fit/foods` | `NineFitFoods` | `/app/acompanhamento` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Refeições e dificuldades; não inferir adequação a partir de quantidade de registros. |
| `/9fit/habit-flow` | `NineFitHabitFlow` | `/app/acompanhamento` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Conclusões e barreiras; acordar frequência e revisar evolução. |
| `/9fit/habitflow` | `NineFitHabitFlow` | `/app/acompanhamento` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Conclusões e barreiras; acordar frequência e revisar evolução. |
| `/9fit/healthflix` | `NineFitHealthFlix` | `/app/healthflix` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Dificuldade e consumo de conteúdo; devolver indicação e objetivo. |
| `/9fit/home` | `Navigate` | `Redirecionamento/alias definido em App.tsx` | Preservar destino e identidade; não criar entrega ou indicador duplicado. |
| `/9fit/hub` | `NineFitHub` | `/app/acompanhamento` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Check-in, SYNC, dor e registros do dia; devolver orientação contextual. |
| `/9fit/kitchen` | `NineFitKitchen` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Preferências e dificuldades; devolver orientação pertinente ao plano. |
| `/9fit/login` | `NineFitLogin` | `Auth e suporte` | Sessão válida e entrada correta. Login não é solicitação de acompanhamento. |
| `/9fit/mensagens` | `NineFitMensagens` | `/app/mensagens` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Pergunta contextual, resposta, visualização e confirmação em fluxos separados. |
| `/9fit/modules` | `NineFitModules` | `Configuração / suporte / conector correspondente` | Permissões técnicas e destino externo; sem enviar tokens nem inferir SSO. Encaminhamento técnico não automatizado para a fila profissional. |
| `/9fit/move` | `NineFitMove` | `/app/acompanhamento` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Distância, duração e percepção compartilhadas; considerar no acompanhamento. |
| `/9fit/native-system` | `NineFitNativeSystem` | `Configuração / suporte / conector correspondente` | Permissões técnicas e destino externo; sem enviar tokens nem inferir SSO. Encaminhamento técnico não automatizado para a fila profissional. |
| `/9fit/notificacoes` | `NineFitNotificacoes` | `/app/acompanhamento e origem da notificação` | Abrir item autorizado; lido não significa executado ou confirmado. |
| `/9fit/oferta/:offerId` | `NineFitOferta` | `/app/monetizacao ou gestão de assinatura / equipe` | Confirmação do provedor e suporte administrativo; sem copiar dados completos de pagamento ao professor. |
| `/9fit/onboarding` | `NineFitOnboarding` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Perfil e preferências declarados; confirmar objetivo e orientar configuração. |
| `/9fit/onboarding-pro` | `Navigate` | `Redirecionamento/alias definido em App.tsx` | Preservar destino e identidade; não criar entrega ou indicador duplicado. |
| `/9fit/os` | `NineFitOS` | `/app/acompanhamento` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Check-in, SYNC, dor e registros do dia; devolver orientação contextual. |
| `/9fit/pagamento/retorno` | `CustomerEntry` | `/app/monetizacao ou gestão de assinatura / equipe` | Confirmação do provedor e suporte administrativo; sem copiar dados completos de pagamento ao professor. |
| `/9fit/planejamento` | `NineFitPlanejamento` | `/app/smart-periodizer` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Rotina, semanas e disponibilidade; devolver ciclo revisado. |
| `/9fit/planos` | `NineFitPrimePass` | `/app/monetizacao ou gestão de assinatura / equipe` | Confirmação do provedor e suporte administrativo; sem copiar dados completos de pagamento ao professor. |
| `/9fit/pos-treino` | `NineFitPostWorkout` | `/app/acompanhamento` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Execução e esforço percebido; devolver orientação e acompanhar a próxima sessão. |
| `/9fit/postura-pro` | `NineFitPosturaPro` | `/app/postura-pro` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Imagem privada e resultado concluído; devolver análise e acompanhamento. |
| `/9fit/premium` | `NineFitPrimePass` | `/app/monetizacao ou gestão de assinatura / equipe` | Confirmação do provedor e suporte administrativo; sem copiar dados completos de pagamento ao professor. |
| `/9fit/prime` | `NineFitPrimePass` | `/app/monetizacao ou gestão de assinatura / equipe` | Confirmação do provedor e suporte administrativo; sem copiar dados completos de pagamento ao professor. |
| `/9fit/primepass` | `NineFitPrimePass` | `Redirecionamento/alias definido em App.tsx` | Preservar destino e identidade; não criar entrega ou indicador duplicado. |
| `/9fit/profile` | `NineFitProfile` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Objetivo, limitações, contato e rotina; atualizar dados sem sobrescrever respostas pessoais. |
| `/9fit/progresso` | `NineFitProgresso` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Auto-relato e avaliação com origem; comparar protocolos compatíveis e devolver interpretação. |
| `/9fit/progresso/:view` | `NineFitAssessmentPages` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Auto-relato e avaliação com origem; comparar protocolos compatíveis e devolver interpretação. |
| `/9fit/progresso/recordes` | `NineFitProgresso` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Auto-relato e avaliação com origem; comparar protocolos compatíveis e devolver interpretação. |
| `/9fit/protocolo` | `NineFitProtocolo` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Atribuição, conclusão e resposta percebida; revisar continuidade. |
| `/9fit/protocols` | `Protocols` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Atribuição, conclusão e resposta percebida; revisar continuidade. |
| `/9fit/protocols/:category` | `Protocols` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Atribuição, conclusão e resposta percebida; revisar continuidade. |
| `/9fit/protocols/:category/:id` | `Protocols` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Atribuição, conclusão e resposta percebida; revisar continuidade. |
| `/9fit/recovery` | `NineFitRecovery` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Atribuição, conclusão e resposta percebida; revisar continuidade. |
| `/9fit/ron` | `NineFitRon` | `/app/ron` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Compartilhar somente o texto escolhido pelo aluno; conversas pessoais com IA ficam privadas. |
| `/9fit/settings` | `NineFitSettings` | `Configuração / suporte / conector correspondente` | Permissões técnicas e destino externo; sem enviar tokens nem inferir SSO. Encaminhamento técnico não automatizado para a fila profissional. |
| `/9fit/social` | `NineFitSocial` | `/app/community` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Solicitação compartilhada voluntariamente; não importar feed privado ou afirmar SSO. |
| `/9fit/staff` | `NineFitStaff` | `/app/alunos` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Solicitação sobre responsável e acompanhamento; não conceder acesso a profissional sem vínculo. |
| `/9fit/stats` | `Navigate` | `Redirecionamento/alias definido em App.tsx` | Preservar destino e identidade; não criar entrega ou indicador duplicado. |
| `/9fit/store` | `Navigate` | `Configuração / suporte / conector correspondente` | Permissões técnicas e destino externo; sem enviar tokens nem inferir SSO. Encaminhamento técnico não automatizado para a fila profissional. |
| `/9fit/train` | `NineFitTrain` | `/app/treino-ia` | Solicitação por módulo → devolutiva em `/9fit/acompanhamento` → confirmação. Sessão, exercícios, impedimento e substituição; publicar revisão preservando execução. |

## Componentes internos e checklist profundo

| Área interna | Aluno registra / recebe | Profissional revisa e executa | Fechamento que ainda precisa de conexão específica |
| --- | --- | --- | --- |
| Primeiro acesso, PDI e ativação | Objetivo, rotina, limitações, preferências | Ficha declarada e divergências | [ ] Aceite de acompanhamento e registro de revisão de cada mudança relevante |
| EmojiCalibrationQuiz / daily_checkins | Sono, energia, humor, motivação e dor | Contexto diário e revisão da sessão | [ ] Caso automático com responsável, data e motivo; não usar apenas score |
| Registro de dor e restrições | Região, intensidade e evolução | Orientação e revisão contextual | [ ] Referência ao pain_report, seguimento e encerramento justificado |
| WorkoutOverview / WorkoutHome | Sessão disponível, dúvida e impedimento | Prescrição nativa e exercícios | [ ] Vincular dúvida ao exercício/versão, não apenas ao módulo |
| WorkoutExecution | Início, séries, cargas, repetições e interrupção | Histórico real e revisão da próxima sessão | [ ] Abrir automaticamente revisão quando houver informação que exija decisão |
| PostWorkoutModal | Esforço, duração, dor e comentário | Devolutiva pós-treino | [ ] Vincular care_thread ao execution_id e comparar a sessão posterior |
| WeeklyTrainingView / PlanejamentoPro | Semana, programação, descanso e sessões | Ciclos revisados e versões | [ ] Relacionar devolutiva ao ciclo e ao período acordado |
| AjusteTreino / RON operacional | Solicitação e ajustes permitidos | Aceitar/rejeitar e publicar ajuste real | [ ] Mostrar ao aluno o motivo e a relação entre recomendação, versão e devolutiva |
| AssessmentWorkspace / AvaliacaoGuiada | Auto-relato, testes e dados com origem | Revisão, interpretação e próxima coleta | [ ] Caso de revisão de avaliação específica, com protocolo e versão |
| StudentMeasurements / AssessmentPhotos | Medidas e fotos compartilhadas | Comparação compatível e comentários | [ ] Devolutiva vinculada ao arquivo privado e consentimento por finalidade |
| PosturaPro / scan | Foto privada e resultado concluído | Revisão do resultado e orientação | [ ] Estado profissional revisado separado do processamento da IA |
| MetasSection / AssessmentGoalCard | Objetivo e percepção de avanço | Meta acordada e critérios | [ ] Aceite, responsável, prazo e revisão conjunta da meta |
| Move | Distância, duração, GPS e percepção | Considerar atividade extra na programação | [ ] Compartilhar resumo necessário; evitar exposição indiscriminada do trajeto |
| HabitFlow | Hábito, meta e conclusões | Barreiras e orientação de rotina | [ ] Prescrição/acordo de hábito e revisão semanal vinculada |
| NutritionLogForm / Dieta / Foods | Refeições, plano e dificuldades | Plano e registros autorizados | [ ] Compartilhamento por área, devolutiva ligada à refeição/plano e revisão |
| Hidratação no OS | Água registrada e rotina | Contexto e meta pertinente | [ ] Meta acordada versionada e resposta do aluno |
| EliteBio / sono / recuperação | Sinais registrados e origem | Acompanhamento e orientação | [ ] Contexto mínimo por área e motivo documentado da decisão |
| AssignedProtocols / DailyProtocol / Recovery | Atribuição, execução e resposta | Revisar continuidade e orientações | [ ] Relacionar protocolo, completion e devolutiva; conclusão não é resultado clínico |
| Kitchen | Receitas e dificuldades práticas | Orientação compatível com o plano | [ ] Referência à receita e confirmação da adaptação |
| Biblioteca / TrackedLibraryVideo / HealthFlix | Consumo, progresso e dúvida técnica | Indicação e orientação | [ ] Indicação individual com objetivo, prazo e retorno de compreensão |
| Collections | Programa e dúvidas | Programação e revisão | [ ] Vincular coleção, prescrição vigente e execução sem duplicar programa |
| AulasCreditos / QuickCheckIn | Horário, presença e solicitações | Agenda, cancelamento e créditos | [ ] Associar caso ao appointment_id e ao recibo da operação |
| Mensagens humanas | Texto compartilhado com o profissional | Resposta humana | [x] Nova área estruturada de solicitações separada da conversa; [ ] anexos privados e referência contextual |
| RON aluno / RON profissional | Conversas e sugestões em espaços separados | Análise contextual autorizada | [x] Só texto escolhido explicitamente vira solicitação; [ ] compartilhamento seletivo de uma sugestão com origem |
| Staff | Profissional responsável e pedido sobre vínculo | Gestão de vínculo | [ ] Convite, aceite, troca de responsável, pausa e revogação rastreáveis |
| Community / Social / compartilhar | Conteúdo e interações escolhidos | Gestão externa e orientação pertinente | [ ] Contrato externo explícito; não importar feed privado para acompanhamento |
| PrimePass / ofertas / checkout | Compra, retorno e acesso | Gestão administrativa | [ ] Fila administrativa separada da orientação profissional e provedor como confirmação |
| Notifications | Avisos internos | Origem da entrega e pendências | [x] Notificações do novo acompanhamento; [ ] preferências e resumo para evitar excesso |
| Settings / NativeSystem / EcoEmbed | Preferências, permissões e módulo externo | Suporte técnico e configuração | [ ] Encaminhamento técnico estruturado; sem repassar senha, token ou localização detalhada |

## Execução iniciada nesta rodada

- [x] Registro compartilhado de módulos com destinos reais e regra de não copiar conversas pessoais.
- [x] Nova rota `/9fit/acompanhamento`, com solicitações e histórico de devolutivas.
- [x] Entrada contextual nos módulos operacionais via NineFitLayout.
- [x] `/app/acompanhamento` reúne fila da carteira ou do aluno selecionado, além dos dados canônicos.
- [x] Profissional pode orientar, pedir informações e solicitar confirmação do aluno.
- [x] Abertura registra leitura; confirmação exige ação distinta do aluno.
- [x] Links levam à tela onde o profissional executa a ação e ao módulo relacionado no aluno.
- [x] Notificação genérica leva ao caso correto, sem expor conteúdo sensível no aviso.
- [x] RLS, autor derivado da sessão, idempotência e revisão otimista no banco.
- [ ] Automatizar ligação a registros e casos por evento: começar por dor, feedback e avaliação.
- [ ] Revisão semanal e metas acordadas como ciclos próprios.
- [ ] Equipe, compartilhamento por área, encaminhamento técnico e contratos externos.

## Relações e estados da primeira entrega

`student_care_threads` identifica aluno, módulo, assunto, revisão e estado. `student_care_events` preserva autor e histórico. O dado original continua em prescrição, execução, avaliação, agenda ou outro registro canônico.

Fluxo: `awaiting_professional` → devolutiva → `awaiting_student` → confirmação do aluno → `closed`. Uma resposta posterior reabre o caso. Ler não encerra. A confirmação significa recebimento da orientação, sem registrar treino ou tratamento como concluído.

Não há retrospectiva automática que converta todos os registros antigos em pendências, nem exposição automática de conversas, notas internas, dados financeiros ou trilhas GPS.

## Verificação e publicação

Migração `20261024002833_student_professional_care_loop.sql` aplicada ao Supabase `mfrydtrzjxscbkaiwfnw`. As 18 verificações SQL novas passaram antes e depois da publicação, junto à suíte anterior, com fixtures sintéticas e ROLLBACK. Não foram enviadas mensagens reais nem persistidos usuários de teste.

TypeScript, build de produção, 36 testes Node da suíte principal, 19 de acesso/protocolos/integração e as suítes Fase 2/Macro 02/QA Master/Macro 03 aprovados. O build mantém os avisos anteriores de bundle grande e html2canvas.

Os advisors novos apontam as duas RPCs SECURITY DEFINER expostas a authenticated: exposição intencional, protegida por sessão, vínculo, autor e papel no corpo. [Referência do advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

QA manual autenticado e publicação visual Lovable permanecem com o usuário. O merge depende do CI aprovado.
