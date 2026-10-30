# Revisão FitPro ↔ Smart Treino — 30/10/2026

Escopo: ajuste de treino, treino rápido, semana, ajuste pela Sync e Treino de Hoje no smartreino.

## Caminhos canônicos
- Prescrição normal: fn_get_saved_prescription → prescrever_treino apenas se não houver sessão salva.
- Semana: fn_generate_periodized_week chama o mesmo motor e preserva sessões já existentes.
- Treino rápido: fn_treino_rapido; endpoint generate-quick-workout usa este motor, recebe recursos reais e não encaminha um treino normal como rápido.
- Ajuste manual: fn_publicar_ajuste_treino_dia, com sessão/data/versão e alterações físicas nas doses. Adapter aplicar_ajuste_treino_dia preservado para o Smart.
- Sync: fn_refresh_daily_readiness / fn_apply_readiness_to_workout → private.apply_readiness; consentimento, limites e bloqueios de execução permanecem.
- Execução: fn_start_daily_workout_execution / workout_exercise_sets / fn_complete_workout_execution.

## Correções
1. Ajuste bloqueia a sessão selecionada quando iniciada, sem bloquear outra sessão apenas por compartilhar a data. Execuções legadas sem vínculo são tratadas conservadoramente.
2. Treino rápido concluído não impede gerar/preservar uma prescrição normal da mesma data.
3. Início, prescrição, rápido, Sync e ajuste compartilham o lock por atleta/data, evitando corridas entre sessões.
4. Retomada de status started/paused atualiza para in_progress; sessão dispensada não pode ser reiniciada.
5. Escritor Smart não escolhe um treino rápido como destino de publicação normal, não substitui silenciosamente uma sessão existente e rejeita dose ausente/ambígua.
6. Sinais Smart usam a identidade de usuário vinculada ao atleta; PDI não usa athlete_id como user_id, não exibe defaults como declarações e aceita recovery_rate=slow.
7. Sync de outro dia não é exibida como sinal atual; sinais atualizam ao focar e a cada minuto apenas com página visível. Prescrição atualiza por evento e Realtime.
8. Smart valida confirmação de sucesso do ajuste e confirma a sessão persistida para entrega, sem depender da antiga chave HTTP para ler o mesmo banco.
9. Plano JSON legado salvo não é anunciado como publicado no FitPro. Ele não substitui uma periodização ativa diferente; sessões precisam ser revisadas/publicadas pelo professor antes de serem executáveis.
10. Datas usam America/Sao_Paulo; endpoint rápido retorna doses efetivamente persistidas após a Sync e duração estimada dessas doses.

## Verificação
Sem execução prática das funções de negócio ou dados de QA: o proprietário fará a QA. Migrations aplicadas e metadados conferidos; compilação/build e checks do GitHub devem ser registrados na entrega. Lovable do Smart sincroniza pelo GitHub, conforme orientação do proprietário; confirmação de publicação separada não é presumida.
