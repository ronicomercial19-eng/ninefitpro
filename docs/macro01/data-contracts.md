# Fontes, identidade e dados

## Identidade
- auth.users.id = identidade autenticada; athletes.id = aluno. Não são intercambiáveis.
- fn_current_athlete_id resolve aluno próprio por athletes.user_id e athlete_auth_link; cliente não escolhe arbitrariamente o alvo.
- Profissional acessa aluno efetivamente vinculado por coach_id; administrador tem papel validado no servidor.
- Integração privilegiada exige credencial servidor, nunca service_role no navegador.
- Autor e fonte acompanham futuras entregas; inferência do RON não substitui dado declarado.

| Domínio | Fonte atual | Regra |
|---|---|---|
| Perfil | athletes + athlete_auth_link | Informações pessoais por vínculo; mudança registrada |
| Preferências/PDI | user_parameters + athlete_pdi_history | Snapshot não é preferência confirmada; evitar duplicar trigger e wizard |
| Calibração | daily_checkins | Chave aluno + data, escalas documentadas; dor maior = mais dor |
| Prescrição atribuída | student_training_assignments | Plano do profissional; documento/training_data preservados |
| Prescrição diária executável | daily_workouts + workout_exercises | Identificar pelo id da sessão, não somente pela data |
| Execução | workout_executions + workout_exercise_sets | Conclusão, séries e medidas reais independem do plano atual |
| Periodização | athlete_periodizations + planos/ondas vinculados | Calendário é projeção; não cria outra prescrição silenciosa |
| Nutrição | nutrition_logs + student_diet_assignments | Sem metas inventadas; porção/estimativa distinguida |
| Água | hydration_logs | Volume real; mesmo registro entre telas |
| Avaliações/evolução | avaliacoes_unificadas + personal_records + séries | Comparação exige compatibilidade e proveniência |
| Recuperação | bio_recovery_state + fontes recentes disponíveis | Não fabricar medição; contratos legados usam campos distintos a conciliar |
| Conteúdo | library_items + student_library_assignments + proxies | Atribuição, autorização e consumo são estados distintos |
| Compromissos | appointments + class_bookings + gym_classes | Confirmação backend; sugestão não é reserva |
| Créditos de serviço | student_credits | Validade e saldo; distinto de fichas IA |
| Fichas IA | athlete_credits + credit_transactions | Apenas transação validada; quantidade positiva |
| Assinatura | user_subscriptions | Fonte escolhida para direitos futuros; fulfillment servidor |
| XP | athletes.total_xp e recibos validados | xp_total legado requer conciliação; não representa saúde |
| Eventos de domínio | system_events via mutação/trigger validado | Proveniência e entidade são necessárias |
| Projeções de jornada | master_registry | Telemetria/projeção; não autoriza nem comprova pagamento/execução |
| Compartilhamento | share_events | Immutable receipt; native handoff não comprova publicação externa |

## Tempo e formatos
Timestamps ISO UTC; dia de negócio America/Sao_Paulo. Não usar toISOString().slice(0,10) como dia local. Datas de prescrição e calendários são datas, não timestamps artificiais. Conversão gradual por jornada, sem migrar datas antigas implicitamente.

## Aprovações e versões
Aprovação aponta para entrega + revisão + autor. Edição relevante invalida aprovação anterior. Documentos históricos não são sobrescritos. O contrato de dados de preferência deve distinguir declared/observed/inferred com fonte e confiança.

## Escala
Índices por aluno, data e identidade de evento; paginação; resumo incremental; fila para tarefas remotas. IA recebe contexto relevante. Meta de 3.000 usuários exige teste de carga, não é certificado por este inventário.
