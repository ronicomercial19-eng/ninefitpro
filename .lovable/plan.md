

# Plano de Limpeza do Banco de Dados Supabase - 9FIT PRO

## Diagnostico Resumido

Analisei os 5 CSVs de lints. O banco tem problemas reais mas todos sao corrigiveis **sem migrar** para outro lugar. Migrar para Lovable Cloud nao e possivel pois o projeto ja esta conectado a um Supabase externo, e migrar significaria perder todos os dados e reconfigurar tudo do zero.

A solucao mais rapida e uma **unica migracao SQL massiva** que resolve tudo de uma vez.

## Resumo dos Problemas

| Nivel | Tipo | Quantidade | Descricao |
|-------|------|-----------|-----------|
| ERROR | RLS desabilitado na tabela `students` | 1 | Tabela publica sem protecao |
| ERROR | Security Definer Views | 6 | Views que ignoram permissoes do usuario |
| WARN | Funcoes sem search_path fixo | ~10 | Risco de SQL injection via search_path |
| WARN | Politicas RLS "always true" | ~25 | Tabelas com seguranca efetivamente desligada |
| WARN | auth_rls_initplan (performance) | ~150 | `auth.uid()` sem `(select ...)` causa lentidao |
| INFO | Foreign keys sem indice | ~115 | Queries lentas em JOINs |
| INFO | RLS habilitado sem politicas | 5 | Tabelas bloqueadas sem acesso |

## Estrategia: Uma Unica Migracao

Em vez de dezenas de alteracoes pequenas, criaremos **uma migracao SQL unica** dividida em 4 blocos logicos executados em sequencia.

### Bloco 1: Correcoes CRITICAS (Errors)

1. **Habilitar RLS na tabela `students`**
   - `ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;`
   - As politicas ja existem, so falta ativar o RLS

2. **Recriar 6 views SEM security_definer**
   - `v_system_health`, `v_periodizations_canonical`, `v_periodizations_catalog`, `v_students_canonical`, `v_assessments_canonical`, `v_assignments_canonical`
   - Recriar com `SECURITY INVOKER` (padrao) para respeitar permissoes do usuario logado

### Bloco 2: Correcoes de SEGURANCA (Warnings)

1. **Fixar search_path em ~10 funcoes**
   - Adicionar `SET search_path TO 'public'` nas funcoes vulneraveis:
     - `match_periodizations_for_profile`
     - `atualizar_timestamp`
     - `audit_alunos_changes`
     - `update_saved_periodizations_updated_at`
     - `generate_invitation_token`
     - `atualizar_avaliacoes_timestamp`
     - `log_periodization_changes`
     - `salvar_avaliacao`
     - `calculate_periodization_match`

2. **Corrigir ~25 politicas RLS "always true"**
   - Substituir `USING (true)` e `WITH CHECK (true)` por regras reais baseadas em `(select auth.uid())`
   - Tabelas afetadas incluem: `aluno_periodizacao`, `estruturas_de_treinamento`, `estudantes`, `exercicios_novos`, `gym_classes`, `modelos_de_treino`, etc.
   - Para tabelas de log/auditoria (audit_log, logs_sincronizacao): manter INSERT aberto mas restrito a `authenticated`

### Bloco 3: Correcoes de PERFORMANCE (Warnings)

1. **Otimizar ~150 politicas RLS com auth_rls_initplan**
   - Padrão: trocar `auth.uid()` por `(select auth.uid())` em todas as politicas
   - Trocar `auth.email()` por `(select auth.email())`
   - Isso evita que a funcao seja recalculada para cada linha da tabela
   - Afeta praticamente todas as tabelas: athletes, alunos, appointments, class_bookings, exercises, etc.

### Bloco 4: Correcoes de PERFORMANCE (Info)

1. **Criar ~115 indices em foreign keys**
   - Gerar `CREATE INDEX IF NOT EXISTS` para cada FK sem indice
   - Exemplo: `CREATE INDEX IF NOT EXISTS idx_athletes_user_id ON public.athletes(user_id);`

2. **Adicionar politicas basicas em 5 tabelas com RLS sem politicas**
   - `exercise_logs`, `link_de_video`, `products`, `workout_exercises_new`, `workout_logs`
   - Adicionar politica SELECT para authenticated e ALL para admins/trainers

## Secao Tecnica

### Estrutura da Migracao

A migracao sera um unico arquivo SQL com comentarios separando os blocos:

```text
-- =============================================
-- BLOCO 1: CORRECOES CRITICAS (ERRORS)
-- =============================================

-- 1.1 Habilitar RLS em students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 1.2 Recriar views sem SECURITY DEFINER
-- (DROP + CREATE OR REPLACE para cada view)

-- =============================================
-- BLOCO 2: SEGURANCA - FUNCOES + POLITICAS
-- =============================================

-- 2.1 Fixar search_path nas funcoes
-- (CREATE OR REPLACE FUNCTION ... SET search_path TO 'public')

-- 2.2 Substituir politicas "always true"
-- (DROP POLICY + CREATE POLICY com regras reais)

-- =============================================
-- BLOCO 3: PERFORMANCE - RLS INITPLAN
-- =============================================

-- 3.1 Recriar politicas com (select auth.uid())
-- (DROP POLICY + CREATE POLICY para cada uma)

-- =============================================
-- BLOCO 4: PERFORMANCE - INDICES
-- =============================================

-- 4.1 Indices em foreign keys
-- (CREATE INDEX IF NOT EXISTS para cada FK)

-- 4.2 Politicas para tabelas sem politicas
-- (CREATE POLICY para exercise_logs, link_de_video, etc.)
```

### Logica das Novas Politicas RLS

Para as tabelas com "always true", a logica sera:

- **Tabelas de dados do aluno** (athletes, alunos, etc.): Admins/trainers veem tudo, alunos veem so o proprio
- **Tabelas de referencia** (exercises, periodization_models, etc.): SELECT para todos authenticated, INSERT/UPDATE/DELETE para admins/trainers
- **Tabelas de log** (audit_log, system_events): INSERT para service_role/triggers, SELECT para admins
- **Tabelas de aulas** (gym_classes, class_bookings): SELECT para todos authenticated, gestao para admins

### Impacto Estimado

- **Seguranca**: De ~30 brechas criticas para 0
- **Performance**: Queries RLS ate 10x mais rapidas com `(select auth.uid())`
- **Indices**: JOINs e deletes em cascata significativamente mais rapidos

### Riscos e Mitigacao

- **Risco**: Politicas muito restritivas podem bloquear funcionalidades existentes
- **Mitigacao**: Manter politicas mais permissivas (authenticated) nas tabelas de referencia e apertar gradualmente
- **Rollback**: Se algo quebrar, podemos reverter politicas individuais rapidamente

### Ordem de Execucao

| Passo | Acao | Tempo |
|-------|------|-------|
| 1 | Habilitar RLS em students | 1 min |
| 2 | Recriar views | 2 min |
| 3 | Fixar funcoes (search_path) | 3 min |
| 4 | Recriar politicas RLS (seguranca + performance) | 10 min |
| 5 | Criar indices | 5 min |
| 6 | Testar app end-to-end | 10 min |

**Total estimado: ~30 minutos de implementacao**

