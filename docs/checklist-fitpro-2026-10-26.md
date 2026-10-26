# Checklist FitPro — execução em 26/10/2026

Backend aplicado nos projetos FitPro `mfrydtrzjxscbkaiwfnw` e Staff `xtexysqtfsofdohujtfr`. Frontend preparado na branch `codex/fitpro-checklist-safety`, integrada sobre `bfb36b0`, preservando os dez commits recentes de main. Não equivale a frontend publicado ou teste no celular.

## Decisões adotadas

- Conclusão válida exige pelo menos uma série concluída e 300 segundos entre início e fim persistidos. Sessões menores ficam salvas e não contam; totais históricos de XP não são apagados.
- SYNC é a prontidão percebida de hoje. Engajamento conserva o indicador anterior em campo separado. Ausência de calibração completa produz valor ausente, sem inventar zero.
- Profissionais são os da equipe Staff. O gateway valida a sessão FitPro, confirma a propriedade do agendamento e usa o cadastro da equipe. Nenhuma lista paralela foi criada.
- Leitor de gordura por foto excluído desta entrega, conforme decisão do usuário.

## Situação dos 33 itens

| Item | Resultado e limite |
|---|---|
| 1 | Rastreado: SQL `prescrever_treino`, montadores de blocos e publicadores escrevem as linhas. A edge `smartperiodizer-sync` sincroniza planejamento. Os montadores tinham fallback para exercício arbitrário. A hipótese de exatamente três IDs em todos os treinos não foi comprovada. |
| 2 | Resolução conservadora por nome real; correspondência ausente ou ambígua retorna revisão. Removido fallback aleatório dos montadores. |
| 3 | Nome salvo na linha nova; trigger bloqueia nome incompatível, foco incompatível e ordem duplicada. Linhas históricas já executadas não são reescritas para preencher o nome. |
| 4 | Auditoria persistida de 65 treinos/9 alunos, com snapshots privados. Nomes e IDs estão em relatório local fora do Git. Na sessão solicitada, três linhas incompatíveis foram retiradas da prescrição executável; histórico preservado. Preparação e reset ainda exigem revisão profissional, com sessão bloqueada. |
| 5 | 613 registros originais preenchidos a partir de target_muscles, com normalização e expansão hierárquica de membros inferiores. 266 rótulos são modalidade/equipamento: preservados e marcados para revisão anatômica, sem inferir músculos. |
| 6 | Adicionados bracing abdominal, ponte isométrica de quadril, rolo para membros inferiores e drill de quadril. Sem vídeo substituto ou dose inventada. |
| 7 | Status era texto com CHECK. Acrescentado abandoned; 40 sessões encerradas, zero antigas restantes; cron a cada 15 minutos. Séries preservadas. |
| 8 | Regra de uma série + cinco minutos aplicada no servidor e indicada no player. |
| 9 | Hub, estatísticas agregadas, resumo de atividades, aderência semanal e leituras de progresso filtram completion_valid. Sete sessões históricas possuem evidência suficiente para essa regra. As demais permanecem registradas. |
| 10 | Train oferece Retomar ou finalizar para sessão de dia anterior ainda aberta. Sessões acima de 12 h são encerradas pela rotina. |
| 11 | SYNC diário e Engajamento separados; fórmula diária consistente com o contexto; painel do professor mostra ambos. Não foi encontrado ranking ativo baseado nesse campo para alterar. |
| 12 | Calibração atualiza o cache de contexto e dispara nova leitura do Hub; erro anterior é limpo pelo resultado canônico. |
| 13 | Treino rápido mostra a restrição cadastrada e oferece Ajuste de Treino ou profissional. |
| 14 | Snapshot contém peso, sequência e Engajamento. Perfil e Hub usam esses campos. RON já recebe fn_get_hub_snapshot no contexto, incluindo os campos adicionais. |
| 15 | Progress/avaliações e Prime Pass têm consultas limitadas a 15 s; botões de nova tentativa existentes preservados. |
| 16 | OpenStreetMap como fallback; rastreamento independente de Google Maps. Loader inclui correção preexistente de singleton/retry. Restrições e faturamento da chave no Google Cloud não foram conferidos. |
| 17 | Precisão em metros, espera sem sinal, expiração após 20 s, permissão negada tratada; removida velocidade fixa fictícia de 10,2 km/h. |
| 18 | Próxima referência usa atividade com ao menos 200 m e 120 s; registros menores permanecem no histórico. |
| 19 | Player/cards com bordas laranja e cantos arredondados; tokens respeitam a paleta já existente. Falta validação visual autenticada. |
| 20 | Título quebra linha, seta tem espaço próprio e banner usa proporção responsiva. Falta conferir visualmente no celular. |
| 21 | Nome persistido, instrução e cadência passam ao player diário e semanal. Dose formata segundos e lateralidade e reconhece isometria explicitamente prescrita. |
| 22 | Semana passa pela visão geral antes da execução; série marcada inicia descanso. O treino suspenso não foi liberado para usar como teste real. |
| 23 | Fonte Staff identificada e gateway publicado no banco da equipe. |
| 24 | Seleção/match usam cadastro real; booking é vinculado a appointments.staff_* e à reserva Staff, com recibo restrito a service_role. RLS de agendamentos e acesso à sessão preservados. |
| 25 | Débito de aula permanece na função atômica fn_class_credit_debit, chamada pelo trigger da reserva. Recibo de integração não debita novamente. Sino notifica mudança de status, sem repetir em retry idêntico. Não foi criada reserva real para teste. |
| 26 | Página Staff nativa apresenta Staff Sync, Gateway e Crédito dos agendamentos reais, com reenvio/consulta de status. Prévia demonstrativa retirada dessa rota. |
| 27 | Introdução/métodos, elevação pélvica e abdominal de um minuto já existiam no formulário guiado; conferidos no código. |
| 28 | Bucket já era privado. Novo consentimento separa guarda e compartilhamento; professor só consegue ler com permissão explícita, revogável. URLs assinadas previamente emitidas podem durar até cinco minutos. |
| 29 | Degrau, equilíbrio unipodal e sentar/alcançar já existiam no fluxo; conferidos no código. |
| 30 | Pulado por decisão do usuário. |
| 31 | Paleta aplicada em Train, Perfil, Staff e Ajuste, preservando correções visuais recentes de main. Falta QA visual. |
| 32 | Mensagens e RON unificados no ModuleGrid; abre sheet existente. Atalho pós-corrida já usa o mesmo evento do sheet. |
| 33 | GitHub conferido e dez commits recentes integrados na branch. Lovable informa projeto publicado e plano free, sem saldo de créditos no conector. Publicação desta revisão e QA móvel continuam pendentes. |

## Verificação

- 38 testes principais; 3 de integração; 20 de entrada, autenticação, protocolo e Maps/GPS passaram.
- Gates fase 2, macro 02, master18 e macro 03 passaram.
- Typecheck e build de produção passaram no checkout final integrado, incluindo os ajustes de apresentação e contrato semanal. Build mantém avisos preexistentes de tamanho do bundle e html2canvas.
- SQL testado com BEGIN/ROLLBACK no esquema real: foco, ordem, nome, ausência de correspondência, 44 s, zero séries, sessão válida, stale cleanup, SYNC, snapshot, isolamento de fotos, revogação e idempotência de notificação.
- Gateways publicados responderam 401 sem sessão. Não houve reserva real nem mensagem enviada a profissionais durante os testes.
- Navegação foi interrompida porque a ferramenta não conseguiu determinar com confiança a URL atual do Chrome no Windows. Não há validação visual autenticada, confirmação de saldo Lovable ou restrições Google Cloud.

## Implantação e compatibilidade

As cinco migrações FitPro e a migração separada em staff-provider têm versões alinhadas ao histórico real dos respectivos bancos. A edge `staff-api` do FitPro é um adaptador para `fitpro-staff-gateway` no banco Staff, sem compartilhar chaves de serviço. A chave embutida desse gateway é a chave pública FitPro.

O frontend novo traz os controles separados de consentimento e a interface Staff usa os novos recibos. O formulário publicado anteriormente já exigia checkbox de guarda, mas não enviava booleano: sua compatibilidade foi preservada com provenance legacy_wizard_checkbox, sempre sem compartilhamento com profissionais. Só o contrato novo com consentimento e permissão explícitos pode ativar compartilhamento. Recusa explícita é rejeitada no servidor. A conclusão do checklist depende ainda da revisão profissional da prescrição suspensa, da classificação anatômica pendente e da publicação/validação móvel.
