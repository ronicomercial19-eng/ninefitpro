# Avaliação e histórico — contrato compartilhado v2

Fontes revisadas integralmente: `dossie-ponte-progress-tracker-fitpro.md`, `prompt-avaliacao-guiada-lovable (1).md`, `conectar-design-avaliacao-no-fitpro.md` e as 13 pranchas do HTML `FitPro — Minhas Avaliações.html`. Números do desenho não foram transformados em dados de produção.

## Preservação e identidade

As seções anteriores de Progresso e Histórico continuam disponíveis. O módulo Minhas avaliações foi acrescentado. O FitPro mantém seu layout, navegação e tokens de cor; o Progress Tracker recebe os mesmos componentes com seus próprios tokens. Os dois produtos continuam com builds e publicação independentes, usando o mesmo Supabase e `athlete_id`. `aluno_id` só é usado por vínculo real.

## Cobertura das telas

| Referência | Implementação |
|---|---|
| Resumo | Score oficial, Primeira/Anterior, períodos 30/90/Tudo, indicadores reais, menor pilar avaliado e acesso a metas/reavaliação/fontes. |
| Capacidades | Radar e acordeão dos cinco pilares existentes: Força, Resistência, Core, Cardio e Mobilidade. Assimetria de prancha calculada sem classificação clínica inventada. |
| Histórico | Filtros Todas/Professor/Autoavaliação, gráfico oficial separado, lista navegável e contagem de medidas. Treinos e cargas permanecem no histórico integrado anterior. |
| Detalhe | Medidas não nulas, comparação, confiança, origem, avaliador/CREF, recordes verificáveis, referência quando compatível, observações/exames e exportação pelo diálogo de impressão/PDF. |
| Primeira avaliação | Estado sem avaliação oficial, primeiro ponto e estados com múltiplas avaliações. Autoavaliação não ocupa o lugar de avaliação oficial. |
| Fontes | Origens reais, status persistido, escopo de compartilhamento no novo painel e solicitação de exclusão. A instrução humana de preservar dados prevalece: nenhuma rotina de exclusão foi habilitada ou executada. Solicitações são registradas para atendimento. |
| Reavaliação | Intervalo configurável de 2–52 semanas, padrão 8; data sugerida, preparação e lembrete opcional 3 dias antes na central de notificações. Cron diário e envio idempotente. |
| 1RM | Resultados finais existentes; tabela de tentativas reais e origem do sensor preparada. Não há tentativas simuladas ou conexão fictícia de hardware. |
| Composição por métodos | Séries separadas de dobras e bioimpedância; só identifica o método principal quando `metodo_gordura_score` foi informado. Não presume o método das avaliações antigas. |
| Cardio | Repouso, máxima, sprint, recuperação de 1 minuto e VO₂ quando presentes. VO₂ sempre estimado, com linha tracejada e fora de recordes/score. |
| Metas | Metas existentes e projeção linear apenas com pelo menos 4 datas oficiais distintas do mesmo teste; faixa de incerteza e limitação de extrapolação. Não altera score ou recordes. |
| Avaliação guiada | Mantidas as seis medidas, data, vírgula decimal, validação por campo, estados de perfil, RPC autenticada, eventos e retorno para Progresso. |

## Dependências de dados preservadas

`ref_faixas` foi criada vazia: preencher exige fonte publicada, protocolo, unidade, sexo e faixa etária. A interface não cria faixas ou percentis. Nível 7/Elite, idade física e top percentual eram exemplos sem regra; não foram inventados. As cinco capacidades válidas substituem os pilares ilustrativos conforme a recomendação do documento.

VO₂, recuperação, gordura por bioimpedância, protocolo e confiança podem ser recebidos em `dados_adicionais`, conforme o contrato. Nenhuma medição antiga foi alterada para presumir método ou confiança adicional. Tentativas/velocidade e dispositivos dependem de hardware real (H2, conforme o documento). Exames continuam no fluxo existente do professor e são apresentados quando vinculados; Storage não foi alterado.

## Banco e segurança

- `fn_get_assessment_hub`: uma leitura autenticada por módulo, compartilhada pelo leitor do histórico integrado e deduplicada no cliente.
- `fn_get_avaliacao_detalhe`: avaliação vinculada ao atleta, referência e testes com confiança/delta/recorde/faixa; nega URL de outro perfil.
- `fn_save_assessment_preferences`: somente dono altera fontes e reavaliação. O compartilhamento se aplica ao novo painel, sem prometer revogar permissões independentes de outros módulos.
- Leituras legadas mantêm os formatos anteriores, com autoavaliações fora do score oficial. Histórico antigo sem autorização e escrita legada `salvar_avaliacao` receberam checagens de acesso. A escrita oficial legada exige vínculo real de professor/aluno.
- O trigger de PR não promove autoavaliações/estimativas. Registros antigos ficam preservados; entradas que correspondem apenas a autoavaliação não são apresentadas como recordes oficiais.
- Tabelas novas têm RLS; funções expostas têm acesso limitado e autorização explícita. O lembrete interno não é executável por `anon` ou `authenticated`.
- As mesmas migrations são versionadas nos dois repositórios e aplicadas uma vez ao banco compartilhado. Não reaplicar pelo segundo produto.

## Validação

Typecheck/build dos dois produtos, regras de aceite em `scripts/qa-assessment-hub.cjs`, consultas autenticadas de leitura/detalhe e recusa de outro atleta, confiança e preferências com rollback. Publicação explícita e conferência dos bundles publicados. Safari privado depende de dispositivo Safari disponível; não equivale a uma verificação por HTTP ou Chrome.

## Ajustes dos fluxos anteriores

O autoatendimento antigo do Progress usa a RPC autenticada e não envia `athlete_id` como `aluno_id`. A avaliação oficial usa uma única gravação completa e não cria uma cópia como autoavaliação. O escritor oficial aceita todas as medidas suportadas e o contexto de métodos/protocolo; as telas anteriores foram preservadas. O formulário do professor no Progress recebeu campos complementares opcionais, incluindo massa muscular, dois métodos de gordura, VO₂ estimado e recuperação. Nada foi preenchido retroativamente.

Os blocos antigos de score, sessões e metas do FitPro compartilham a resposta do hub. A cache é limpa na troca de usuário e nos eventos existentes de sincronização. O PDF só aplica suas regras de impressão ao detalhe da avaliação.
