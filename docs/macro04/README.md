# Macro 04 — nutrição, protocolos e evolução

## Escopo

- **Meso 4.1 — Nutrição na vida real:** registrar água, carboidratos e proteínas no diário já existente; permitir que o aluno identifique uma refeição como dentro ou fora do plano, sem julgar ou inferir aderência; refletir os mesmos dados na Dieta e no Hub.
- **Meso 4.2 — Protocolos acionáveis e radar honesto:** transformar intervenções do dia em experiências guiadas que gravam conclusão real; atualizar as dimensões sustentadas por esses registros; deixar eixos sem dados visualmente indisponíveis, sem convertê-los em zero.
- **Meso 4.3 — Progress, Postura e Move contextuais:** destacar pequenas evoluções com fonte e comparação compatível; exibir a análise postural e recomendações existentes de mobilidade; sugerir a próxima corrida com base no histórico persistido, mantendo os controles da atividade.

## Guardrails

- O histórico da Dieta permanece em `nutrition_logs`; a água continua em `hydration_logs`. Nenhum registro paralelo de nutrição será criado.
- Meta só aparece quando foi prescrita. Estimativas do scanner permanecem identificadas como estimativas e editáveis.
- Refeição fora do plano é autodeclarada pelo aluno. Registro ausente não significa descumprimento.
- Conclusão de respiração, protocolo ou hidratação não será representada como medição de prontidão ou de saúde. O radar usa apenas eixos com sinal real.
- Fotos e resultados posturais seguem as permissões existentes; recomendações posturais são educativas e não diagnóstico médico.
- Sugestão de corrida usa atividades reais salvas; não altera nem inicia atividade automaticamente.

## Verificação

QA e build serão registrados por meso após implementação. A validação autenticada dos registros será feita pelo usuário; não usar dados de outro aluno para smoke tests.

## Execução

- Migração aditiva 20261005221050_macro04_nutrition_adherence_context aplicada ao Supabase; coluna opcional, NULL preservado para os 45 registros existentes sem classificação.
- TypeScript e QA Macro 02/03 passaram localmente.
- Build local depende de corrigir o binding SWC no cache Windows; a CI Linux deve confirmar o build do branch.
- QA autenticado visual/registro pelo usuário permanece pendente antes de integrar em produção.

