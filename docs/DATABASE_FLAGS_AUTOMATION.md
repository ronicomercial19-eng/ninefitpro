# 📊 Flags Críticas do NineFitPro — Guia de Automações

**Última atualização:** 2026-07-03  
**Schema version:** v1.0  
**Status:** DOCUMENTAÇÃO OFICIAL

---

## 1️⃣ FLAGS PRINCIPAIS DO ATLETA (Tabela `athletes`)

Estrutura geral do atleta — **CORE da plataforma**.

### Campos Críticos para Automações

| Campo | Tipo | Relevância | Descrição | Usa em |
|-------|------|-----------|-----------|--------|
| `activated` | BOOLEAN | 🔴 **ALTA** | Se atleta pode acessar app | Gate de acesso |
| `onboarding_completed_at` | TIMESTAMPTZ | 🔴 **ALTA** | Data/hora que finalizou onboarding; NULL = pendente | Desbloquear PDI |
| `password_changed` | BOOLEAN | 🟡 **MÉDIO** | Já trocou a senha inicial (gerada auto) | First-access flow |
| `user_id` | UUID | 🔴 **ALTA** | FK para `auth.users` | Autenticação |
| `coach_id` | UUID | 🟡 **MÉDIO** | FK para treinador | Permissões |
| `sync_score` | INT4 (0-100) | 🔴 **ALTA** | Score de sincronização (Radar 5D) | Radar + IA |
| `total_xp` | INT4 | 🟡 **MÉDIO** | XP acumulado (gamificação) | Level-up |
| `level` | INT4 | 🟡 **MÉDIO** | Nível atual (gamificação) | Badges |
| `email` | TEXT | 🟡 **MÉDIO** | Email do atleta | Notificações |
| `sleep_quality` | INT2 | 🟡 **MÉDIO** | Qualidade de sono (1-10) | Radar 5D |
| `stress_level` | INT2 | 🟡 **MÉDIO** | Nível de estresse (1-10) | Radar 5D |
| `preferences` | JSONB | 🟢 **BAIXO** | Preferências do usuário | UI/UX |

### SQL para Verificar Status

```sql
-- Atletas que precisam ativar onboarding
SELECT id, name, email, activated, onboarding_completed_at
FROM athletes
WHERE activated = false OR onboarding_completed_at IS NULL
ORDER BY created_at DESC;

-- Atletas com sync_score baixo (< 50)
SELECT id, name, sync_score
FROM athletes
WHERE sync_score < 50 AND activated = true
ORDER BY sync_score ASC;
```

---

## 2️⃣ FLAGS DE ATIVAÇÃO (Tabela `athlete_activation`)

**Estrutura confirmada** — 13 colunas, **Realtime: ENABLED** ✅

Esta é a **tabela mais importante para Tela 8 (Missões) e automações de gamificação**.

### Campos Confirmados

| Campo | Tipo | Descrição | Prioridade |
|-------|------|-----------|-----------|
| `id` | UUID | PK | — |
| `athlete_id` | UUID | FK para `athletes` | 🔴 CRÍTICO |
| `days_active` | INT4 | Dias ativos (streak) | 🔴 ALTA |
| `missions_completed` | INT4 | Total de missões feitas | 🔴 ALTA |
| `consistency_score` | INT4 | Score 0-100 | 🔴 ALTA |
| `last_active_at` | TIMESTAMPTZ | Último check-in/treino | 🟡 MÉDIO |
| `activated_at` | TIMESTAMPTZ | Data de ativação | 🟢 BAIXO |
| `created_at` | TIMESTAMPTZ | Criado em | — |
| `updated_at` | TIMESTAMPTZ | Atualizado em | — |
| `[6 colunas adicionais]` | — | Ainda não documentadas | ⚠️ |

### Uso em Tela 8 (Missões/Gamificação)

```typescript
// Hook para ler dados de ativação
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

const useAthleteActivation = (athleteId: string) => {
  const { data, isLoading } = useRealtimeSubscription(
    'athlete_activation',
    { athlete_id: athleteId }
  );

  return {
    missionsCompleted: data?.missions_completed ?? 0,
    daysActive: data?.days_active ?? 0,
    consistencyScore: data?.consistency_score ?? 0,
    lastActive: data?.last_active_at,
  };
};

// Incrementar missões ao completar
async function completeMission(athleteId: string) {
  const { data } = await supabase
    .from('athlete_activation')
    .select('missions_completed')
    .eq('athlete_id', athleteId)
    .single();

  await supabase
    .from('athlete_activation')
    .update({
      missions_completed: (data?.missions_completed ?? 0) + 1,
      consistency_score: Math.min(100, (data?.consistency_score ?? 0) + 5),
      last_active_at: new Date().toISOString(),
    })
    .eq('athlete_id', athleteId);
}
```

### Índices Recomendados

```sql
CREATE INDEX idx_athlete_activation_athlete_id 
  ON athlete_activation(athlete_id);
CREATE INDEX idx_athlete_activation_consistency_score 
  ON athlete_activation(consistency_score DESC);
CREATE INDEX idx_athlete_activation_last_active 
  ON athlete_activation(last_active_at DESC);
```

---

## 3️⃣ PERIODIZAÇÕES (Tabela `athlete_periodizations`)

Conecta atleta → modelo de treino com scoring de compatibilidade.

### Campos

| Campo | Tipo | Descrição | Uso |
|-------|------|-----------|-----|
| `id` | UUID | PK | — |
| `athlete_id` | UUID | FK `athletes` | Filter principal |
| `periodization_model_id` | TEXT | FK `periodization_models` | Qual modelo? |
| `status` | TEXT | `'active'`, `'archived'`, `'inactive'` | Gate |
| `match_percentage` | INT4 | 0-100, % compatibilidade | Smart match |
| `match_factors` | JSONB | Detalhes (goal, exp, duration, env) | Debug |
| `assigned_by` | UUID | FK treinador que atribuiu | Auditoria |
| `assigned_at` | TIMESTAMPTZ | Data da atribuição | Timeline |
| `notes` | TEXT | Observações | Interno |
| `annual_plan_id` | UUID | FK `periodization_annual_plans` | Agrupamento |

### SQL para Periodizações Ativas

```sql
-- Periodização ativa de um atleta
SELECT 
  ap.id, ap.status, ap.match_percentage,
  pm.title, pm.goal, pm.duration,
  ap.match_factors
FROM athlete_periodizations ap
JOIN periodization_models pm ON ap.periodization_model_id = pm.id
WHERE ap.athlete_id = $1 AND ap.status = 'active'
ORDER BY ap.assigned_at DESC
LIMIT 1;
```

---

## 4️⃣ SYNC SCORE (Tabela `sync_score_logs` + função `get_athlete_scores()`)

**Radar 5D** — Sincronização de 5 eixos em tempo real.

### Tabela `sync_score_logs`

```sql
CREATE TABLE sync_score_logs (
  id UUID PRIMARY KEY,
  athlete_id UUID NOT NULL,
  source TEXT,  -- 'workout_execution', 'checkin', 'ninefit_report'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Realtime: ENABLED** ✅ — triggers em `workout_executions` e `ninefit_checkins`

### Função Calcula Score

```sql
SELECT get_athlete_scores(athlete_id) → JSONB
```

**Retorna:**
```json
{
  "sync_score": 75,      // Score composto (0-100)
  "treino": 80,          // Execução de treinos (eixo treino * 25)
  "nutri": 60,           // Nutrição logs (eixo nutri * 5)
  "sono": 70,            // Sleep logs (eixo sono)
  "mob": 75,             // Mobilidade/recovery (eixo recovery)
  "hidr": 68,            // HRV/hidratação (eixo hrv)
  "updated_at": "2026-07-03T..."
}
```

### Hook React para Radar

```typescript
import { useRealtimeData } from '@/hooks/useRealtimeData';

const useRadar5D = (athleteId: string) => {
  const { data: scores } = useRealtimeData(
    'sync_score_logs',
    { athlete_id: athleteId }
  );

  // Subscreve mudanças em tempo real
  useEffect(() => {
    const channel = supabase
      .channel(`scores:${athleteId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'sync_score_logs',
          filter: `athlete_id=eq.${athleteId}`
        },
        (payload) => {
          console.log('Score atualizado:', payload);
          recalculateRadar();
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [athleteId]);

  return scores;
};
```

---

## 5️⃣ AVALIACÕES UNIFICADAS (Tabela `avaliacoes_unificadas`)

**Todas as avaliações físicas em um lugar.**

⚠️ **Status: RLS DISABLED** — Revisar segurança!

### Campos Críticos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `athlete_id` | UUID | FK `athletes` |
| `aluno_id` | UUID | Legacy FK (ainda usado) |
| `data_avaliacao` | DATE | Data da avaliação |
| `peso`, `altura`, `imc` | NUMERIC | Métricas básicas |
| `gordura_corporal`, `massa_muscular`, `massa_magra` | NUMERIC | Composição corporal |
| `circunferencia_*` | NUMERIC | Circunferências (braço, peito, cintura, etc) |
| `rml_*`, `rm1_*` | INT4/NUMERIC | Testes de força (RML = reps max load) |
| `flags_inteligentes` | JSONB | **VAZIO NO BANCO — Precisa integração IA** |
| `score_*` | NUMERIC | Scores compostos (força, resistência, cardio, etc) |
| `origem` | TEXT | `'manual'`, `'integrada'`, `'api'` | Rastreabilidade |

### Formato Esperado de `flags_inteligentes`

```json
{
  "injury_risk": "high",           // low, moderate, high
  "injury_type": "knee",
  "hormonal_window": "follicular", // ovulatory, luteal, follicular
  "fatigue_level": "moderate",     // low, moderate, high, critical
  "overreaching_detected": false,
  "recovery_needed": true,
  "sleep_debt": 8,                 // horas de déficit
  "ai_recommendation": "rest_day_recommended",
  "confidence_score": 0.87
}
```

⚠️ **Ação necessária:** Criar migration para popular este campo com IA.

---

## 6️⃣ CREDITS SYSTEM (Tabela `athlete_credits`)

**Premium features + IA gates.**

```sql
CREATE TABLE athlete_credits (
  id UUID PRIMARY KEY,
  athlete_id UUID UNIQUE NOT NULL,
  credits_total INT4,           -- Total já carregado
  credits_used INT4,            -- Total já gasto
  credits_remaining INT4,       -- Saldo disponível
  plan_type TEXT,               -- 'base_2990', 'premium_9990'
  updated_at TIMESTAMPTZ
);
```

**Realtime: ENABLED** ✅

### Funções Atômicas

```sql
-- Debitar créditos (chamado antes de IA)
fn_consume_credit(athlete_id, amount=1, reason='ai_action') 
  → JSONB { ok: bool, remaining: int, error?: text }

-- Recarregar créditos (checkout success)
fn_add_credits(athlete_id, amount, reason='recharge') 
  → JSONB { ok: bool }
```

### Uso no Frontend

```typescript
// Verificar saldo antes de IA
const checkCredit = async (athleteId: string) => {
  const result = await supabase.rpc('fn_consume_credit', {
    p_athlete_id: athleteId,
    p_amount: 1,
    p_reason: 'ai_training_gen'
  });

  if (!result.ok) {
    // Mostrar modal de recarga
    return showCreditModal();
  }
};
```

---

## 7️⃣ CHECK-INS DIÁRIOS (Tabela `ninefit_checkins`)

**Radar 5D input — Dados subjetivos do atleta.**

### Campos

| Campo | Tipo | Descrição | Intervalo |
|-------|------|-----------|-----------|
| `id` | UUID | PK | — |
| `athlete_id` | UUID | FK `athletes` | — |
| `data_checkin` | DATE | Data do check-in | DATE |
| `treinos_semana` | INT4 | Treinos nesta semana | 0-7 |
| `energia` | NUMERIC | Nível de energia | 1-10 |
| `sono` | NUMERIC | Qualidade de sono | 1-10 |
| `alimentacao` | NUMERIC | Qualidade alimentação | 1-10 |
| `dor` | NUMERIC | Nível de dor | 0-10 |
| `dor_local` | TEXT | Onde dói? | Free text |
| `vitoria_mes` | TEXT | Vitória do mês | Free text |
| `dificuldade_mes` | TEXT | Dificuldade do mês | Free text |
| `medida_chave` | TEXT | Métrica principal | Free text |
| `fator_consistencia` | TEXT | O que ajudou? | Free text |
| `fator_atrapalhou` | TEXT | O que atrapalhou? | Free text |
| `meta_proximo_mes` | TEXT | Meta para próximo mês | Free text |

**Realtime: ENABLED** ✅ — Triggers para atualizar `sync_score_logs`

---

## 8️⃣ EXECUÇÃO DE TREINOS (Tabela `workout_executions`)

**Log de cada treino realizado.**

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `athlete_id` | UUID | FK `athletes` |
| `periodization_id` | UUID | Qual período? |
| `workout_date` | DATE | Dia do treino |
| `week_number`, `day_number` | INT4 | Posição na periodização |
| `phase_name` | TEXT | Nome da fase (ex: "Hipertrofia") |
| `status` | TEXT | `'in_progress'`, `'completed'`, `'cancelled'` |
| `started_at`, `completed_at` | TIMESTAMPTZ | Timestamps |
| `duration_minutes` | INT4 | Quanto tempo treinou |
| `total_volume_kg` | NUMERIC | Volume total levantado |
| `avg_rpe` | NUMERIC | RPE médio (0-10) |
| `notes` | TEXT | Observações |
| `rating` | INT4 | Autoavaliação (1-5) |

**Realtime: ENABLED** ✅ — Trigger atualiza `sync_score_logs`

---

## 9️⃣ DAILY WORKOUTS (Tabela `daily_workouts`)

**Treino do dia — com suporte a override.**

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `athlete_id` | UUID | FK `athletes` |
| `workout_date` | DATE | Data do treino |
| `weekly_structure_id` | UUID | Semana da periodização |
| `day_number` | INT4 | D1-D7 |
| `day_name` | TEXT | "Segunda", "Terça", etc |
| `focus_muscles` | TEXT[] | Array de músculos |
| `workout_type` | TEXT | `'strength'`, `'hypertrophy'`, `'cardio'` |
| `estimated_duration_minutes` | INT4 | Duração prevista |
| `override_locked` | BOOLEAN | Treino foi customizado? |
| `changes_json` | JSONB | Customizações aplicadas |

**Realtime: ENABLED** ✅

---

## 🔟 PERIODIZATION MODELS (Tabela `periodization_models`)

**Templates de periodização — o "cardápio" disponível.**

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | TEXT | PK (ex: "hyp_12w_advanced") |
| `title` | TEXT | Nome (ex: "Hipertrofia 12 semanas") |
| `goal` | TEXT | Objetivo (ex: "hipertrofia") |
| `duration` | TEXT | Duração (ex: "12m", "6m", "3m") |
| `description` | TEXT | Descrição detalhada |
| `macrocycle`, `mesocycle`, `microcycle` | JSONB | Estrutura do treino |
| `recommended_for` | JSONB | Quem se encaixa? |
| `graph_data` | JSONB | Dados para visualização |

### Recomendação IA

**Função:** `match_periodizations_for_profile(user_profile_id)`

Retorna TOP 3 modelos com % match.

---

## 1️⃣1️⃣ RESUMO — FLAGS POR PRIORIDADE

### 🔴 CRÍTICO (Must-have para automações)

| Flag | Tabela | Usa em | SQL |
|------|--------|--------|-----|
| `activated` | `athletes` | Gate de acesso | `WHERE activated = true` |
| `onboarding_completed_at` | `athletes` | Desbloquear PDI | `WHERE onboarding_completed_at IS NOT NULL` |
| `athlete_id` | `athlete_activation`, `athlete_periodizations`, etc | Join principal | FK em todas as tabelas |
| `status` (periodizations) | `athlete_periodizations` | Qual fase está ativa? | `WHERE status = 'active'` |
| `missions_completed` | `athlete_activation` | Tela 8 | Counter de missões |
| `credits_remaining` | `athlete_credits` | Gate IA | Antes de `fn_consume_credit` |

### 🟡 MÉDIO (Usar em lógicas específicas)

| Flag | Tabela | Usa em |
|------|--------|--------|
| `sync_score` | `athletes` | Radar 5D display |
| `match_percentage` | `athlete_periodizations` | Mostrar compatibilidade |
| `consistency_score` | `athlete_activation` | Gamificação |
| `energy`, `sleep`, `pain` | `ninefit_checkins` | Radar 5D cálculo |
| `status` (workouts) | `workout_executions` | Timeline de treinos |

### 🟢 BAIXO (Informativo)

| Flag | Tabela | Usa em |
|------|--------|--------|
| `total_xp`, `level` | `athletes` | Badges |
| `password_changed` | `athletes` | First-access UX |
| `notes`, `rating` | `workout_executions` | Histórico/feedback |

---

## 1️⃣2️⃣ ÍNDICES CRÍTICOS

```sql
-- Athlete lookup (PRIMARY)
CREATE INDEX idx_athletes_user_id ON athletes(user_id);
CREATE INDEX idx_athletes_coach_id ON athletes(coach_id);
CREATE INDEX idx_athletes_activated ON athletes(activated) WHERE activated = true;
CREATE INDEX idx_athletes_onboarding ON athletes(onboarding_completed_at) 
  WHERE onboarding_completed_at IS NULL;

-- Activation (Tela 8)
CREATE INDEX idx_athlete_activation_athlete_id ON athlete_activation(athlete_id);
CREATE INDEX idx_athlete_activation_consistency ON athlete_activation(consistency_score DESC);

-- Periodizations (Fase ativa)
CREATE INDEX idx_athlete_periodizations_athlete_id ON athlete_periodizations(athlete_id);
CREATE INDEX idx_athlete_periodizations_status ON athlete_periodizations(athlete_id, status);

-- Sync score (Realtime)
CREATE INDEX idx_sync_score_logs_athlete ON sync_score_logs(athlete_id, created_at DESC);

-- Check-ins (Radar daily)
CREATE INDEX idx_ninefit_checkins_athlete_date ON ninefit_checkins(athlete_id, data_checkin DESC);

-- Workouts (Timeline)
CREATE INDEX idx_workout_executions_athlete_date ON workout_executions(athlete_id, workout_date DESC);

-- Daily workouts (Customizações)
CREATE INDEX idx_daily_workouts_athlete_date ON daily_workouts(athlete_id, workout_date);
```

---

## 1️⃣3️⃣ RLS POLICIES — STATUS SEGURANÇA

| Tabela | RLS | Status | Ação |
|--------|-----|--------|------|
| `athletes` | ✅ | OK | Verificar policies |
| `athlete_activation` | ✅ | OK | Realtime ready |
| `athlete_periodizations` | ✅ | OK | Verificar FK |
| `avaliacoes_unificadas` | ❌ | ⚠️ DESABILITADO | **CRÍTICO: Ativar RLS** |
| `sync_score_logs` | ✅ | OK | Realtime ready |
| `ninefit_checkins` | ✅ | OK | Realtime ready |
| `workout_executions` | ✅ | OK | Realtime ready |
| `daily_workouts` | ✅ | OK | Realtime ready |
| `athlete_credits` | ✅ | OK | Proteger `fn_consume_credit` |

---

## 1️⃣4️⃣ PRÓXIMAS AÇÕES

- [ ] **Documento 1:** Criar migration para `athlete_activation` (confirmar 6 colunas faltantes)
- [ ] **Documento 2:** Integração IA → preenchimento de `flags_inteligentes`
- [ ] **Documento 3:** RLS em `avaliacoes_unificadas` (URGENTE)
- [ ] **Documento 4:** Webhook para webhook_events em `credit_transactions`
- [ ] **Documento 5:** Índices de performance (query tuning)

---

## 📞 Contato / Dúvidas

Para dúvidas sobre a estrutura ou implementação, consulte:
- **Schema completo:** `/supabase/migrations/`
- **Views:** `v_athletes`, `vw_athlete_status`, `vw_radar_5d`
- **Functions:** `get_athlete_scores()`, `match_periodizations_for_profile()`, `fn_consume_credit()`, `fn_add_credits()`
