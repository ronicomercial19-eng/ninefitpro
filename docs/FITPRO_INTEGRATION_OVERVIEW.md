# Integração FitPro — Planejamento + Ajuste + Histórico

**Status:** 🚧 Estrutura Final  
**Data:** 2026-07-06

Documentação consolidada das 3 integrações que fecham o loop de **Treinamento** no FitPro:

```
FitPro (Aluno)
  ↓
├─ Planejamento (SmartPeriodizer) → Periodização Anual (7 Ondas) → Treino do Dia
├─ Ajuste de Treino (RON/AI) → SmartReino API → Treino Ajustado em Tempo Real
├─ Histórico (Execução + XP) → Realtime → Progresso Visual
└─ Streaming (HealthFlix) → Vídeos Contextualizados → IA Cataloga Conteúdo
```

---

## 1. Planejamento (SmartPeriodizer)

### Fluxo
1. Admin/Professor sobe periodização anual (7 ondas) no SmartPeriodizer
2. FitPro → `/v1/fitpro/planejamento?fitpro_student_id=...`
3. Backend retorna:
   ```json
   {
     "planejamento": {
       "month_label": "Julho 2026",
       "today": "2026-07-06",
       "is_synced": true,
       "ondas": [
         { "nome": "Onda 1: Adaptação", "status": "done", "semanas": 4 },
         { "nome": "Onda 2: Hipertrofia I", "status": "in_progress", "semanas": 4 },
         { "nome": "Onda 3: Hipertrofia II", "status": "pending", "semanas": 4 }
       ]
     },
     "ondas_ativas": [
       { "onda": 2, "fase": "Transição", "semana_atual": 2, "semanas_totais": 4 }
     ]
   }
   ```

### Tabelas de Origem
- `periodization_annual_plans` (plano anual com macrocycles/mesocycles)
- `fitpro_smartperiodizer_periodizations` (snapshot sincronizado do planejamento)
- `athlete_periodizations` (atribuição ativa ao aluno)

### Auditoria
- Falha ao atribuir/sincronizar → `periodization_generation_failures`
- origem: `trigger` (BD) | `edge` (API) | `manual` (admin)

---

## 2. Ajuste de Treino (RON/SmartReino)

### Fluxo
1. Aluno em `/train/ajuste-treino` digita: "Trocar agachamento por leg press, diminui 10 min"
2. FitPro → `POST /fitpro-adjust-workout` (SmartReino)
3. IA processa → retorna treino ajustado com 4 blocos (neural, integration, block9, reset)
4. Persiste em `workout_executions` com flag `override_locked=true`
5. `GET /v1/fitpro/planejamento` continua refletindo o plano original (não toca)

### Dados Reais Envolvidos
- `workout_executions` (execução do dia com `override_locked`)
- `workout_exercises` (exercícios com `load_percentage`, `sets`, `reps_range` ajustados)
- `exercises` (catálogo com `video_url`, `gif_url`)
- `athlete_periodizations` (contexto da periodização em background)

### Erro Capturado
- Aluno sem periodização → `409 no_active_periodization` → CTA: "Suba uma periodização primeiro"
- IA falha → `422 generation_failed` → log em `periodization_generation_failures` com `origin='edge'`

---

## 3. Histórico (Realtime)

### Fluxo
1. Aluno completa treino → `POST /fitpro-complete-workout`
2. Backend marca `workout_executions.status = 'completed'` + calcula XP
3. Realtime → aba **Histórico** atualiza com:
   ```json
   {
     "execucoes": [
       {
         "data": "2026-07-06",
         "treino_id": "uuid",
         "titulo": "Peito + Tríceps (Onda 2)",
         "duration_min": 48,
         "exercises_completed": 8,
         "volume_total_kg": 12500,
         "xp_earned": 100,
         "status": "completed",
         "nota_rpe": 7.5
       }
     ],
     "stats_semana": {
       "treinos_completados": 4,
       "xp_total": 400,
       "volume_total": 50000,
       "duracao_total_min": 240
     }
   }
   ```

### Dados Reais
- `workout_executions` (treino individual com timestamps + XP)
- `workout_exercises` (exercícios executados com load/reps/rpe registrados)
- `athletes` (atualização de `total_xp`, `level`)
- `athlete_activation` (streak + missions_completed)

---

## 4. Streaming (HealthFlix)

### Fluxo
1. Aluno em `/train/streaming` → abre iframe HealthFlix
2. Backend chama `hf.studentContext({ fitpro_student_id, role: "student" })`
3. HealthFlix retorna `embed_url` com token assinado (15 min expiry)
4. App abre iframe → aluno assiste vídeos 9FIT
5. Webhook HealthFlix → FitPro registra em `share_events` / `sync_score_logs`

### Dados Reais
- `sync_score_logs` (log de conteúdo consumido)
- `social_share_templates` (templates de compartilhamento já cadastrados)
- `share_events` (registro de assistência)

---

## 5. Endpoints (Resumo)

| Método | Path | Retorna | Uso |
|---|---|---|---|
| GET | `/v1/fitpro/health` | status ok | Healthcheck |
| POST | `/v1/fitpro/connect` | connection_id | Registra webhook |
| POST | `/v1/fitpro/sync` | { synced: n } | Sincroniza atletas |
| **GET** | **`/v1/fitpro/planejamento`** | planejamento block | **Tela Planejamento** |
| GET | `/v1/fitpro/planejamento/ativa` | ondas ativas | Card Onboarding |
| POST | `/v1/fitpro/periodization/generate` | plan_id | Cria plano (não usar direto) |
| PATCH | `/v1/fitpro/periodization/update` | status | Atualiza plano (não usar direto) |
| POST | `/v1/fitpro/periodization/adjust` | status | Ajusta volume/intensity |
| POST | `/fitpro-quick-workout` | blocos + XP | Treino Rápido |
| POST | `/fitpro-adjust-workout` | treino_ajustado | Ajuste RON |
| POST | `/fitpro-plan-workout` | blocos | Treino do Dia |
| GET | `/library-full` | biblioteca | Exercícios + Protocolos |
| POST | `/fitpro-complete-workout` | status + XP | Finalizar Treino |

---

## 6. Dados Reais vs Fakes

| Antes (Fake) | Depois (Real) |
|---|---|
| Ondas hardcoded ("Onda 1", "Onda 2") | Nomes do `mesocycles` do plano anual |
| Status sempre "pending" | Calculado por semana atual vs `cycle_week` |
| Sem histórico de execução | `workout_executions` com timestamps reais |
| XP fictício | Cálculo real: quick=50, plano=100, bonus=streaks |
| Sem auditoria de erro | `periodization_generation_failures` registra tudo |
| Sem progresso visual | Realtime em `athletes.total_xp`, `athlete_activation.days_active` |

---

## 7. Checklist de Implementação

- [ ] Migration: `periodization_generation_failures` + `sync_fitpro_planejamento()`
- [ ] Trigger em `athlete_periodizations` com error handling
- [ ] Edge Function `fitpro-api`: auditoria em `generate`/`adjust`
- [ ] Edge Function: enriquecer `/v1/fitpro/planejamento` com bloco `planejamento`
- [ ] SDK SmartReino: 4 endpoints (quick, adjust, plan, library)
- [ ] SDK HealthFlix: `studentContext()` com token assinado
- [ ] App FitPro: tela Planejamento (já implementada) + aba Histórico (Realtime)
- [ ] Testes E2E: criar plano → ajustar → completar → validar histórico

---

## 8. Referências

- ✅ `docs/DATABASE_SCHEMA_CONTRACT.md` — Schema confirmado
- ✅ `docs/HEALTHFLIX_API_INTEGRATION.md` — Integração HealthFlix
- ✅ `sdk/healthflix-sdk.ts` — SDK oficial
- 🚧 `docs/SMARTPERIODIZER_API_INTEGRATION.md` (próximo)
- 🚧 `sdk/smartreino-sdk.ts` (próximo)

---

**Status:** Pronto para implementação estruturada com dados reais. 🚀
