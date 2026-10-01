# Correções FitPro — roteiro de validação

Implementação de 01/10/2026. Os testes de uso ficam com o responsável pelo aplicativo. A compilação TypeScript, o build de produção e consultas de autorização do banco foram verificados pelo agente.

| Item do pedido | Alteração e teste de uso |
| --- | --- |
| 1 | SYNC usa as mesmas faixas de cor, preserva a última leitura durante atualização e mostra ausência de dados. Conferir anel, detalhe e atualização offline. |
| 2 | Scanner salva no mesmo diário usado pelo registro manual. Salvar foto e conferir refeição e totais imediatamente. |
| 3 | MOVE confirma a meta de corrida cadastrada; NUTRI registra o horário da refeição; TREINO confirma a conclusão diária. Conferir persistência após reabrir. |
| 4 | Treino rápido trata erro e resposta vazia do proxy, usa a RPC canônica e inicia execução ao abrir o player. Gerar e iniciar treino. |
| 5 | Modal do ecossistema resolve rotas internas de Train, Hub, Staff e Protocolos. Abrir cada destino. |
| 6 | FitCopilot recebe exercícios e restrições reais, prepara substituições e intensidade e persiste depois do aceite. Aplicar, salvar e reabrir. |
| 7 | Registro manual e scanner compartilham salvamento e atualização de macros. Criar e remover refeições. |
| 8 | Avaliação física tem tela própria, salva medidas reais e atualiza a ficha usada na ativação. Salvar e conferir Progresso e perfil de treino. |
| 9 | Scanner usa Edge Function autenticada `food-scan`, valida imagem e retorno e não transforma falha em refeição fictícia. Testar prato, rótulo, erro e câmera. |
| 10 — biometria/comportamento | Cards encaminham ao registro real; comportamento usa a RPC diária. Verificar que um clique não fabrica biometria nem XP. |
| 10 — RON | Concierge e página RON usam `ai-coach`, com erro explícito e histórico de conversa. Enviar mensagem nos dois pontos. |
| 11 | Aplicação de protocolo recebeu autorização por propriedade e permissão para authenticated. Aplicar em conta própria. |
| 12 | HealthFlix converte YouTube/Vimeo para player, reproduz arquivos de vídeo e oferece abertura externa. Testar conteúdo disponível. |
| 13 | Recalibração usa a mesma correção de permissão; um treino iniciado não é apagado pela troca de protocolo. |
| 14 | Mesma correção do treino rápido no item 4. |
| 15 | Wizard reinicia ao fechar, permite voltar e descarta respostas assíncronas antigas. Fechar durante geração e reabrir. |
| 16 | Pilares usam registros duráveis de treino, refeições, sono, mobilidade e água. Conferir dados disponíveis e ausência de coleta. |
| 17 | Prime consulta assinatura e validade reais, recuperação recente e próxima prescrição. Conferir conta ativa, expirada e sem dados. |
| 18 | Metas aceitam decimais e têm botão Salvar, com validação. Criar metas de peso e corrida pelo celular. |
| 19 | Banco aceita a origem `peso_avulso`; check-in corporal valida valores e usa a data local. Salvar peso e gordura opcional. |
| 20 | Aulas têm mês de referência e acompanham o mês da data escolhida. Agendar no mês seguinte e conferir contador. |
| 21 | Extrato inclui histórico; agendadas incluem confirmadas/pendentes e restantes descontam realizadas, perdidas e reservas. Conferir mudanças de status. |
| 22 | Comando do dia mostra refeições, calorias e macros atuais e abre a dieta. Registrar refeição e conferir o resumo. |
| 23 | Compartilhamento usa o perfil ativo; captura espera fontes/renderização e datas não recuam um dia. Alternar Mostrar nome e baixar. |
| 24 | Protocolo do dia reflete treino/refeição registrados e atualiza com eventos do aplicativo. Conferir marcações após completar. |
| 25 | ID Card resolve o atleta canônico e atualiza XP/perfil após eventos reais. Editar perfil e concluir treino. |
| 26 | Grid do ecossistema foi restaurado com rotas funcionais. Abrir cada módulo exibido. |
| 27 | Hub escuta alterações e eventos de treino, nutrição, hidratação e SYNC. Conferir atualização sem recarregar a página. |
| 28 | Resumo de treino mostra quantidade semanal real, removendo 5/5 fixo. Conferir histórico de sessões concluídas. |
| 29 | Gráfico consulta `actual_weight` das séries concluídas do atleta; projeção deriva do histórico e datas são temporais. Sem histórico, não inventa pontos. |
| 30 | RON distingue humor, RPE e score na normalização e calcula consistência por dias distintos. Conferir resposta após informar fadiga. |
| 31 | Train inclui a prescrição diária e os ajustes no player, removendo telemetria fixa do resumo. Abrir protocolo/treino de hoje. |
| 32 | Semana mostra todos os exercícios e marca conclusão com base nas séries registradas. Concluir um exercício e conferir. |
| 33 | Calendário respeita o dia da semana, datas locais e prescrições mensais; gráfico preserva lacunas do histórico. Conferir ciclo vigente. |
| 34 | Nova meta e atualização de valor validam dados e persistem; a progressão de carga passou a consumir séries reais. Criar meta de força e registrar carga. |
| 35 | Mesma integração diária dos itens 16 e 24. |
| 36 | Contexto preventivo envia restrições do atleta e PDI; substituto inexistente gera erro em vez de aceite silencioso. Conferir sugestão e salvamento. |
| 37 | Modo Assistido abre a solicitação no Staff; Train consome atribuições e prescrição diária. Conferir atribuição do treinador. |
| 38 | Mesmo fluxo do wizard nos itens 4 e 15. |

## Publicação e dependências

- A migração `20260929220618_fitpro_daily_checkins_and_repairs.sql` foi aplicada no projeto Supabase `mfrydtrzjxscbkaiwfnw`.
- A Edge Function `food-scan` foi publicada com JWT obrigatório e validação de usuário. Usa o mesmo provedor configurado para `ai-coach`: `OPENAI_API_KEY` ou `LOVABLE_API_KEY`. A inferência com uma foto real será validada nos testes de uso.
- O front-end depende da publicação da branch/PR no ambiente do aplicativo. Criar o PR não publica automaticamente a versão de produção.
- Serviços externos como Staff, HealthFlix e SmartPeriodizer continuam dependendo do catálogo, das credenciais e da disponibilidade dos respectivos provedores.
- O advisor do Supabase apontou um alerta anterior na view `vw_athlete_periodizacao_ativa`; esta tarefa não alterou a política dessa view. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
