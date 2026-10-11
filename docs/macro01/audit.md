# Auditoria de loops — situação atual

Referência: origin/main d986526 ao iniciar; inclui o webhook InfinitePay adicionado após o PR 64. A lista recebida é histórico, não diagnóstico atual.

| Loop / pendência antiga | Evidência atual | Tratamento |
|---|---|---|
| Compartilhamento / XP | ShareButton e Collections pediam XP além do trigger; useShareEvent também grava receipts | Corrigido nos três pontos: trigger único, valor servidor, dedupe, teto 3/dia, recibo e distinção export/handoff |
| Gerar semana | fn_gerar_treino_semana existe; sem chamador frontend, podia selecionar exercícios aleatórios e reescrever a semana | Macro 03: geração orientada à periodização sem remover registros existentes; navegação e “pular” persistidos |
| Navegação semanal | WeeklyTrainingView apresenta um dia; fn_get_week_workouts tem âncora, frontend não expõe mudança de semana | Macro 03: semanas/dias navegáveis e calendário abre a data escolhida |
| Iniciar/finalizar | RPCs e séries persistidas existem; status DB in_progress/completed/skipped | Macro 03: “Não vou treinar” grava `skipped`; a prescrição fica no calendário |
| Calibração | EmojiCalibrationQuiz lê a calibração completa e grava dor invertida corretamente | Nova experiência, respostas parciais e SYNC amplo na Macro 02 |
| Planejamento m04/m06 | Tela lê periodização, ondas e assignments; planner local é projeção de assignments, não a fonte da prescrição | Macro 03 conecta dias do calendário a Train; edição/unificação completa do read-model fica fora do escopo |
| RON sem chave | Há frontend autenticado para ai-coach; configuração de segredo/provider em produção não comprovada | Não inferir ausência pelo frontend; validar serviço sem expor segredos na Macro 06/07 |
| Nine/Lima | Protocolo chama fn_aplicar_nine_lima e navega Train; RPC aplica protocolo e nível com fallback | Snapshot da função versionado; QA da entrega gerada na Macro 03 |
| Assistência | Solo/Guiado/Assistido e RON contextual existem; pause marker persistente | Não recriar; validar e integrar na Macro 03 |
| Streaming “0 linhas” | HealthFlix usa proxy e fallback library_items; há 1 item local de vídeo nos tipos consultados | Informação antiga desatualizada; catálogo remoto e player na Macro 05 |
| Infoproduto | Há 22 atribuições em student_library_assignments; player não possui posição/consumo integrado no trecho inspecionado | Macro 05 |
| PDI depois do wizard | user_parameters possui triggers de histórico; wizard também insere athlete_pdi_history | Política ampla corrigida; dedupe e ficha dinâmica na Macro 02 |
| Contrato único | system_events e master_registry têm papéis diferentes; eventos UI não são recibos backend | Contrato estabelecido; migração dos emissores por macro |
| Funções duplicadas | Treino rápido tem 2 assinaturas; antiga devolvia NULL; wrappers HTML/partner distintos | Alias agora delega ao canônico. Restantes mantidos, inventariados e sem remoção |
| Blocos órfãos | daily_protocol_blocks tem 0 linhas; gerar_blocos_protocolo_dia sem referência frontend localizada | Não remover: Macro 04 decide reuso após contrato de protocolos |
| Migration Nine/Lima | Função com fallback existia no banco, sem definição localizada nas migrations | Corrigido: migration preserva definição live |
| Fernanda / dado real | Este trabalho não fez QA funcional com Fernanda | Usuário valida; SQL usa identidade existente em transação revertida, sem alterar dados permanentemente |

## Pontos encontrados além da lista
- user_subscriptions permitia INSERT/UPDATE do próprio usuário: privilégios e políticas de escrita removidos; leitura própria preservada.
- Política de INSERT de PDI aceitava qualquer auth.uid(): substituída por vínculo real, com leitura do aluno vinculado.
- RPCs SECURITY DEFINER de leitura/ajuste/prescrição sem guarda própria: guardas adicionadas preservando assinatura; publicação anônima revogada.
- fn_consume_credit aceitava quantidade negativa: validação de intervalo adicionada antes de mutações.
- RON chamava ajuste por dor com exercise_id NULL e dizia ter modulado mesmo sem confirmação: removeu-se essa afirmação e ação automática.
- Webhook aceitava ausência de segredo quando ambiente/header estavam ambos ausentes: agora responde indisponível.
- Há chamador de fn_increment_streak no frontend, mas nenhuma assinatura correspondente foi encontrada no catálogo consultado: tratar no loop de consistência da Macro 02.
- fn_activate_prime_reward diz “7 dias”, mas usa 30 dias: resolver ao unificar benefícios, sem modificar direitos atuais nesta fase.
- total_xp e xp_total coexistem; triggers antigos usam cálculo diferente de level. Não somar nem migrar sem conciliação.
- fn_award_xp continua compatível para outros emissores; valores fornecidos pelo cliente precisam ser migrados para recibos de domínio por loop. Bloqueado especificamente o bypass de compartilhamento.
- locks de geração, início e ajustes não são todos iguais: a Macro 03 deve padronizar concorrência e versão antes de prometer alteração/execução simultânea.
- fn_gerar_treino_semana e geradores legados ainda usam random(): não foram promovidos a geração oficial pela UI.
- Funções de dor legadas não constituem comprovação de troca segura; RON não as usa automaticamente.
- O proxy Biblioteca deriva tier pelo nome do plano, sem validar expiração/status nesse trecho. Mapping e autorização na Macro 07.
- Webhook escreve profiles.plan_status; Prime lê user_subscriptions. Confirmar evento/assinatura/idempotência/fulfillment e ambiente Express realmente hospedado na Macro 07.

## Segurança geral fora da alteração
Advisors ainda reportam view SECURITY DEFINER, extensões em public, funções executáveis, configurações de autenticação e versão Postgres. Não se afirma auditoria de segurança integral.
Referência de remediação: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
