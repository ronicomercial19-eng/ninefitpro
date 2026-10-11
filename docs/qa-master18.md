# 9FIT PRO — correções QA MASTER

Os 18 achados foram tratados no código. Publicação e reteste autenticado ainda são necessários para confirmar o comportamento em produção.

| Achado | Alteração |
|---|---|
| QA001 | Água abre Dieta na seção de hidratação. |
| QA002 | HRV e BPM abrem formulários próprios; valores reais são persistidos com usuário e data. |
| QA003 | RON recebe snapshot atual e XP canônico; perguntas fisiológicas exigem sinais recentes. |
| QA004 | Identidade, Sync e XP usam fontes canônicas; atualização entre telas por eventos e consultas compartilhadas. |
| QA005 | /9fit/home redireciona ao painel /9fit/os. |
| QA006 | Perfil e Equipe consultam o mesmo diretório de profissionais ativos autorizado por RLS. |
| QA007 | Staff nativo direciona à página funcional de Equipe. |
| QA008 | Histórico exibe execuções confirmadas e rotina diária em modo de leitura. |
| QA009 | Planejamento informa a origem registrada e diferencia plano salvo de alteração de objetivo. |
| QA010 | Ajuste distingue prescrição diária salva de treino disponível; oferece destinos para treino/equipe. |
| QA011 | Aderência exige execução confirmada e conta somente prescrições vencidas até hoje. |
| QA012 | Rotina exclui bônus opcional do denominador; conclusão não simula biometria ou XP. |
| QA013 | Calibração diária abre questionário; painel explica cobertura e dados ausentes. |
| QA014 | Compartilhamento usa os mesmos registros do Histórico; opções sem evidência ficam indisponíveis. |
| QA015 | Assinatura diferencia ativo, teste, vencido e ausente; prazo de acesso não é chamado de próxima cobrança. |
| QA016 | HealthFlix tem busca, filtros combinados e paginação de 24 itens; metadados ausentes não são inventados. |
| QA017 | Rótulos de estado, módulos e ações revisados em português; marcas preservadas. |
| QA018 | Formulário do perfil carregado com os valores persistidos antes da edição. |

## Validação

- QA MASTER, QA fase 2 e Macro 02 passaram.
- ESLint dos arquivos alterados: zero erros, cinco avisos de dependências de hooks existentes.
- SQL do snapshot testado em função temporária com papel authenticated: identidade, Sync, semana de segunda-feira até hoje, calorias alimentares, hidratação e bloqueio sem autenticação passaram. Transação revertida; dados e schema de produção preservados.
- TypeScript e build: resultado final registrado na revisão GitHub. Build local limitado por permissões do cache nativo SWC; validação de build em CI Linux.

## Publicação e reteste

1. Aplicar a migração `20261011151524_qa_master_snapshot_consistency.sql`, publicar `ai-coach` e publicar o frontend, nesta ordem.
2. Usar conta atleta autorizada: registrar água, refeição, HRV, BPM e calibração; comparar o painel e RON após cada registro e após recarregar. Não usar dados de exemplo como sinais medidos.
3. Concluir uma execução de treino e conferir contadores, aderência, Histórico e Compartilhar no mesmo dia/semana. Verificar conta sem histórico e indisponibilidade da rede.
4. Conferir Perfil/Equipe sob RLS com profissionais ativos e inativos e rota Staff nativa.
5. Comparar plano salvo, prescrição diária, protocolo atribuído e treino rápido; confirmar os destinos de Ajuste e a origem do Planejamento.
6. Testar assinatura ativa, teste, vencida e ausente e conferir os termos reais do provedor de pagamento.
7. Combinar filtros de catálogo; confirmar reprodução, metadados ausentes, formulário pré-preenchido e navegação direta em /9fit/home.

A coleta manual de HRV/BPM registra medidas fornecidas pelo usuário; não integra dispositivos automaticamente. O diretório respeita as permissões existentes e não torna perfis privados públicos.

## Observação preexistente

O assessor de segurança aponta `vw_athlete_periodizacao_ativa` como view SECURITY DEFINER. Esta alteração não cria nem amplia essa permissão. A revisão desse item está fora dos 18 achados funcionais: [documentação do linter](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view).
