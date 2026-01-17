# CONTRATO CANÔNICO DE DADOS - 9FIT Evolution Platform

## 📊 ANÁLISE DE DUPLICIDADES ENCONTRADAS

### 🔴 CRÍTICO: Entidades de Aluno/Atleta (4 tabelas redundantes)
| Tabela | Colunas | Status | Uso Atual |
|--------|---------|--------|-----------|
| `athletes` | 33 | ✅ **CANÔNICA** | 9FIT, vinculação auth |
| `alunos` | 26 | ⚠️ LEGADO | Sistema professor |
| `estudantes` | 7 | ❌ DEPRECATED | Versão antiga |
| `students` | 25 | ❌ DEPRECATED | Versão inglês |

### 🔴 CRÍTICO: Entidades de Avaliação Física (5 tabelas redundantes)
| Tabela | Colunas | Status | Uso Atual |
|--------|---------|--------|-----------|
| `avaliacoes_unificadas` | 46 | ✅ **CANÔNICA** | Consolidação completa |
| `avaliacoes` | 42 | ⚠️ LEGADO | Migrar para unificadas |
| `avaliacoes_fisicas` | 27 | ❌ DEPRECATED | Versão simplificada |
| `historico_avaliacoes` | 42 | ❌ DEPRECATED | Cópia de avaliacoes |
| `physical_assessments` | 17 | ❌ DEPRECATED | Versão inglês |

### 🔴 CRÍTICO: Entidades de Exercício (3 tabelas redundantes)
| Tabela | Colunas | Status | Uso Atual |
|--------|---------|--------|-----------|
| `exercises` | 17 | ✅ **CANÔNICA** | Biblioteca principal |
| `exercicios_novos` | 5 | ❌ DEPRECATED | Versão simplificada |
| `exercise_library` | 3 | ❌ DEPRECATED | Versão JSON |

### 🔴 CRÍTICO: Entidades de Treino/Workout (12+ tabelas redundantes)
| Tabela | Colunas | Status | Uso Atual |
|--------|---------|--------|-----------|
| `workout_templates` | 7 | ✅ **CANÔNICA** | Templates base |
| `workout_assignments_new` | 9 | ✅ **CANÔNICA** | Atribuições |
| `workout_logs` | 7 | ✅ **CANÔNICA** | Logs de execução |
| `workout_exercises` | 12 | ✅ **CANÔNICA** | Exercícios do treino |
| `modelos_de_treino` | 11 | ⚠️ LEGADO | Migrar |
| `planos_de_treino_gerados` | 13 | ⚠️ LEGADO | Migrar |
| `planos_treino_aluno` | 17 | ⚠️ LEGADO | Migrar |
| `workouts` | 18 | ❌ DEPRECATED | Versão antiga |
| `workouts_new` | 10 | ❌ DEPRECATED | Tentativa migração |
| `training_programs` | 14 | ❌ DEPRECATED | Programa inglês |

### 🔴 CRÍTICO: Entidades de Periodização (7+ tabelas redundantes)
| Tabela | Colunas | Status | Uso Atual |
|--------|---------|--------|-----------|
| `periodization_models` | 12 | ✅ **CANÔNICA** | Modelos base |
| `athlete_periodizations` | 10 | ✅ **CANÔNICA** | Atribuições atleta |
| `periodization_history` | 7 | ✅ **CANÔNICA** | Histórico mudanças |
| `periodizations` | 19 | ⚠️ LEGADO | Migrar |
| `periodizacoes_novas` | 6 | ❌ DEPRECATED | Versão simplificada |
| `aluno_periodizacao` | 7 | ❌ DEPRECATED | Versão PT |
| `saved_periodizations` | 10 | ❌ DEPRECATED | Duplicado |

---

## 📋 CONTRATO CANÔNICO DE DADOS

### 1. DOMÍNIO: USUÁRIO/ATLETA

**Entidade Canônica: `athletes`**

```sql
-- Campos obrigatórios
id UUID PRIMARY KEY
coach_id UUID NOT NULL REFERENCES auth.users(id)
name TEXT NOT NULL
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()

-- Campos opcionais padronizados
phone TEXT
birthdate DATE
gender TEXT CHECK (gender IN ('male', 'female', 'other'))
altura_cm INTEGER
peso_kg NUMERIC(5,2)
training_level TEXT CHECK (training_level IN ('beginner', 'intermediate', 'advanced'))
training_environment TEXT CHECK (training_environment IN ('home', 'gym', 'outdoor', 'mixed'))
primary_goal TEXT
sessions_per_week INTEGER CHECK (sessions_per_week BETWEEN 1 AND 7)
injuries_limitations TEXT
```

**Enum de Status:**
```sql
CREATE TYPE athlete_status AS ENUM (
  'pending_onboarding',
  'active',
  'inactive',
  'suspended',
  'archived'
);
```

### 2. DOMÍNIO: AVALIAÇÃO FÍSICA

**Entidade Canônica: `avaliacoes_unificadas`**

```sql
-- Identificação
id UUID PRIMARY KEY
aluno_id UUID NOT NULL REFERENCES athletes(id)
data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE
origem TEXT NOT NULL CHECK (origem IN ('manual', 'import', 'device', 'api'))

-- Medidas antropométricas (padronizadas)
peso NUMERIC(5,2)
altura INTEGER
imc NUMERIC(4,2) GENERATED ALWAYS AS (peso / (altura/100.0)^2) STORED

-- Composição corporal
gordura_corporal NUMERIC(4,2)
massa_magra NUMERIC(5,2)
massa_gorda NUMERIC(5,2)
massa_muscular NUMERIC(5,2)

-- Circunferências (em cm)
circunferencia_* NUMERIC(5,2)

-- Dobras cutâneas (em mm)
dobra_* NUMERIC(4,2)

-- Força (1RM em kg)
rm1_* NUMERIC(5,2)

-- Resistência (repetições)
rml_* INTEGER

-- Metadados
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### 3. DOMÍNIO: EXERCÍCIO

**Entidade Canônica: `exercises`**

```sql
id UUID PRIMARY KEY
name TEXT NOT NULL UNIQUE
description TEXT
target_muscles TEXT[] NOT NULL
equipment TEXT
difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'))
video_url TEXT
image_url TEXT
instructions TEXT
phase TEXT CHECK (phase IN ('warmup', 'main', 'cooldown'))
created_by UUID REFERENCES auth.users(id)
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### 4. DOMÍNIO: TEMPLATE DE TREINO

**Entidade Canônica: `workout_templates`**

```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
description TEXT
created_by UUID NOT NULL REFERENCES auth.users(id)
difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'))
estimated_duration INTEGER -- minutos
focus_muscles TEXT[]
is_public BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### 5. DOMÍNIO: ATRIBUIÇÃO DE TREINO

**Entidade Canônica: `workout_assignments`**

```sql
id UUID PRIMARY KEY
template_id UUID NOT NULL REFERENCES workout_templates(id)
athlete_id UUID NOT NULL REFERENCES athletes(id)
assigned_by UUID NOT NULL REFERENCES auth.users(id)
assigned_at TIMESTAMPTZ DEFAULT NOW()
starts_at DATE NOT NULL
ends_at DATE
status assignment_status NOT NULL DEFAULT 'pending'
notes TEXT
```

**Enum de Status:**
```sql
CREATE TYPE assignment_status AS ENUM (
  'pending',      -- Aguardando início
  'active',       -- Em execução
  'completed',    -- Finalizado com sucesso
  'cancelled',    -- Cancelado
  'expired'       -- Expirado sem conclusão
);
```

### 6. DOMÍNIO: EXECUÇÃO/SESSÃO DE TREINO

**Entidade Canônica: `workout_sessions`**

```sql
id UUID PRIMARY KEY
assignment_id UUID NOT NULL REFERENCES workout_assignments(id)
athlete_id UUID NOT NULL REFERENCES athletes(id)
started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
ended_at TIMESTAMPTZ
duration_seconds INTEGER GENERATED ALWAYS AS (
  EXTRACT(EPOCH FROM (ended_at - started_at))
) STORED
status session_status NOT NULL DEFAULT 'in_progress'
rpe_score INTEGER CHECK (rpe_score BETWEEN 1 AND 10)
notes TEXT
```

**Enum de Status:**
```sql
CREATE TYPE session_status AS ENUM (
  'in_progress',  -- Sessão ativa
  'completed',    -- Finalizada
  'abandoned',    -- Abandonada
  'paused'        -- Pausada
);
```

### 7. DOMÍNIO: LOG DE EXERCÍCIO

**Entidade Canônica: `exercise_logs`**

```sql
id UUID PRIMARY KEY
session_id UUID NOT NULL REFERENCES workout_sessions(id)
exercise_id UUID NOT NULL REFERENCES exercises(id)
set_number INTEGER NOT NULL
reps_completed INTEGER
weight_used NUMERIC(6,2)
rpe INTEGER CHECK (rpe BETWEEN 1 AND 10)
tempo TEXT
notes TEXT
logged_at TIMESTAMPTZ DEFAULT NOW()
```

### 8. DOMÍNIO: PERIODIZAÇÃO

**Entidade Canônica: `periodization_models`**

```sql
id TEXT PRIMARY KEY -- ex: 'linear-hypertrophy-12w'
title TEXT NOT NULL
description TEXT
goal TEXT NOT NULL
duration TEXT NOT NULL
macrocycle JSONB
mesocycle JSONB
microcycle JSONB
graph_data JSONB
recommended_for JSONB
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

---

## 🔄 SISTEMA DE NÍVEIS

```
┌─────────────────────────────────────────────────────────────┐
│                    BIBLIOTECA/TEMPLATE                       │
│  (exercises, workout_templates, periodization_models)       │
│  • Reutilizáveis                                            │
│  • Criados pelo Admin                                        │
│  • Versionados                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      ATRIBUIÇÃO                              │
│  (workout_assignments, athlete_periodizations)              │
│  • Vincula template → atleta                                 │
│  • Define período de execução                               │
│  • Registra quem atribuiu                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   EXECUÇÃO/SESSÃO                            │
│  (workout_sessions)                                         │
│  • Instância única de uma atribuição                        │
│  • Registra início/fim                                      │
│  • Captura RPE e notas                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      LOG/MÉTRICA                             │
│  (exercise_logs, user_metrics, audit_log)                   │
│  • Dados granulares imutáveis                               │
│  • Base para análises                                       │
│  • Histórico completo                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 FLUXO ADMIN (Fonte da Verdade)

```
Admin
  │
  ├──► Criar Template (workout_templates)
  │         │
  │         ▼
  ├──► Atribuir a Atleta (workout_assignments)
  │         │
  │         ├──► Evento: ASSIGNMENT_CREATED
  │         └──► Notificação: "Novo treino disponível"
  │
  ├──► Aprovar/Revisar Execução
  │         │
  │         ├──► Evento: SESSION_REVIEWED
  │         └──► Notificação: "Feedback do seu treino"
  │
  └──► Dashboard de Gestão
            │
            ├── Fila de Pendências
            ├── Atletas Ativos
            ├── Sessões Hoje
            └── Alertas de Inatividade
```

---

## 👤 FLUXO USUÁRIO (Execução)

```
Atleta
  │
  ├──► Ver Atribuições Pendentes
  │         │
  │         ▼
  ├──► Iniciar Sessão (workout_sessions)
  │         │
  │         ├──► Evento: SESSION_STARTED
  │         └──► Status: in_progress
  │
  ├──► Registrar Exercícios (exercise_logs)
  │         │
  │         └──► Logs imutáveis
  │
  └──► Finalizar Sessão
            │
            ├──► Evento: SESSION_COMPLETED
            ├──► Notificação Admin: "Treino finalizado"
            └──► Atualiza métricas
```

---

## 📢 SISTEMA DE EVENTOS

### Eventos Críticos

| Evento | Trigger | Ações |
|--------|---------|-------|
| `ATHLETE_CREATED` | Insert athletes | Criar profile, enviar welcome |
| `ASSIGNMENT_CREATED` | Insert assignments | Notificar atleta |
| `SESSION_STARTED` | Insert session | Atualizar status assignment |
| `SESSION_COMPLETED` | Update session.status | Notificar admin, calcular métricas |
| `ASSESSMENT_RECORDED` | Insert avaliação | Analisar tendências |
| `INACTIVITY_ALERT` | Cron 48h sem sessão | Notificar admin e atleta |

### Tabela de Eventos

```sql
CREATE TABLE system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 UPGRADES PREMIUM

### 1. Análises Automáticas
- Volume semanal por grupo muscular
- Tendência de carga ao longo do tempo
- Aderência ao plano (% sessões completadas)
- Comparativo com período anterior

### 2. Alertas Inteligentes
- Inatividade > 48h
- Queda de performance > 15%
- Assimetria de treino (push/pull ratio)
- Overtraining (volume excessivo)

### 3. Sugestões Assistidas (Copilot)
- Próximo exercício baseado em histórico
- Ajuste de carga baseado em RPE
- Substituições por lesão/equipamento
- Deload automático

### 4. Gamificação Real
- XP por sessão completada
- Streaks de consistência
- Achievements por marcos (100 sessões, 1000kg volume)
- Leaderboard entre atletas do mesmo coach

---

## 🧹 GOVERNANÇA E LIMPEZA

### Migrations Necessárias

1. **Criar Views de Compatibilidade**
   - `v_alunos` → SELECT * FROM athletes
   - `v_estudantes` → SELECT * FROM athletes
   - `v_students` → SELECT * FROM athletes

2. **Marcar Tabelas Deprecated**
   - Adicionar trigger que loga warning em INSERT

3. **Migrar Dados Existentes**
   - Script de migração incremental
   - Validação de integridade

4. **Criar Enums Padronizados**
   - athlete_status
   - assignment_status
   - session_status
   - event_type

### Checklist de Saúde

- [ ] Todas as FKs apontam para entidades canônicas
- [ ] Todos os timestamps são TIMESTAMPTZ
- [ ] Todos os status usam ENUM
- [ ] RLS habilitado em todas as tabelas
- [ ] Índices em campos de busca frequente
- [ ] Triggers de updated_at em todas as tabelas

---

## 📊 OBSERVABILIDADE

### Dashboard de Saúde

```sql
-- Últimas ações
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;

-- Últimos eventos
SELECT * FROM system_events ORDER BY created_at DESC LIMIT 10;

-- Últimos erros
SELECT * FROM logs_sincronizacao WHERE status = 'error' ORDER BY created_at DESC LIMIT 10;
```

### Métricas Chave

- Sessões/dia
- Tempo médio de sessão
- Taxa de conclusão
- Atletas ativos (sessão nos últimos 7 dias)
- Templates mais usados

---

**Documento criado em:** 2026-01-17
**Versão:** 1.0
**Status:** Proposta para aprovação
