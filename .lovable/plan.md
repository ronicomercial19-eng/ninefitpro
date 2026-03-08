

# Plano de Implementacao Completa - Auditoria e Correcoes

## Problemas Identificados

### CRITICOS (Bloqueiam funcionalidade)

1. **Dashboard com dados falsos** (Dashboard.tsx:99-100): `studentsWithoutTraining` e `overdueTraining` usam `Math.floor(totalClients * 0.15)` em vez de queries reais
2. **Hub com dados hardcoded** (Hub.tsx:106-107): `exerciseCount: 4` e `estimatedDuration: 45` sao fixos, `~150 kcal` hardcoded na linha 269
3. **AulasCreditos teacher_id errado** (AulasCreditos.tsx:309): `teacher_id: user.id` atribui o ID do ALUNO como teacher
4. **Rota orfã `/9fit/aulas`**: Duplicada com `/9fit/aulas-creditos`, nao linkada em nenhum lugar

### ALTOS (UX quebrada)

5. **Profile.tsx - 4 links mortos**: Notificacoes, Privacidade, Assinatura, Suporte mostram `toast.info("Em breve!")` mas prometem navegacao
6. **AppSidebar.tsx - nome hardcoded**: "Rony Trainer" (linha 118) deveria usar dados do perfil autenticado
7. **AuthContext.tsx - `.single()` no fetchStudentProfile** (linha 146 do original): Retorna erro 406 para admins que nao tem perfil em `students`
8. **Progresso duplicado**: Hub usa `progresso_aluno` (linha 161), Stats/Train usam `workout_progress` - dados inconsistentes
9. **Weekly Progress no Hub** (linhas 312-334): Dados randomicos com `Math.random()` em vez de dados reais

### MEDIOS (Melhorias)

10. **Edit3 button no Profile** (linha 172-174): Botao de editar perfil sem funcionalidade
11. **Camera button no Profile** (linha 161-163): Upload de foto sem implementacao
12. **RecoveryMission**: Sempre visivel quando nao tem treino, sem persistencia de conclusao

---

## Implementacao por Arquivo

### FASE 1: Correcoes Criticas de Dados

**`src/pages/Dashboard.tsx`**
- Substituir `Math.floor(totalClients * 0.15)` por query real: contar athletes sem `student_training_assignments` ativo
- Substituir `Math.floor(totalClients * 0.05)` por query real: contar assignments com `end_date < today`
- Mudar `expiringPlans` de `alunos` para `athletes` (tabela correta)

**`src/pages/9fit/Hub.tsx`**
- Remover hardcoded `exerciseCount: 4`, `estimatedDuration: 45`, `~150 kcal`
- Substituir `progresso_aluno` por `workout_progress` para consistencia
- Weekly Progress: usar dados reais de `workout_progress` da semana (mesma logica do Stats.tsx)

**`src/pages/9fit/AulasCreditos.tsx`**
- Corrigir `teacher_id: user.id` para buscar o `coach_id` do atleta primeiro

### FASE 2: Correcoes de Navegacao e Auth

**`src/App.tsx`**
- Remover rota orfã `/9fit/aulas` (linha 170)

**`src/contexts/AuthContext.tsx`**
- Mudar `fetchStudentProfile` de `.single()` para `.maybeSingle()` (ja esta correto no codigo atual - confirmar)

**`src/components/layout/AppSidebar.tsx`**
- Importar `useAuth` e substituir "Rony Trainer" / "RT" por `profile?.full_name` e iniciais dinamicas

**`src/pages/9fit/Profile.tsx`**
- Substituir `menuItems` com links mortos por opcoes funcionais:
  - "Minha Dieta" -> `/9fit/dieta` (ja funciona)
  - "Notificacoes" -> remover ou apontar para `/9fit/mensagens`
  - "Privacidade" -> remover (nao existe pagina)
  - "Assinatura" -> remover (nao existe pagina)
  - "Ajuda & Suporte" -> link WhatsApp ou `/suporte`
- Botao Edit3: abrir dialog de edicao de nome/telefone
- Botao Camera: implementar upload de foto via storage bucket

### FASE 3: Consistencia de Dados

**`src/pages/9fit/Hub.tsx`** (continuacao)
- Unificar fonte de dados: usar `workout_progress` em todo lugar
- Calcular streak real (copiar logica do Stats.tsx)
- Calorias: somar `calories_burned` de `workout_progress`

**`src/pages/9fit/Train.tsx`**
- Verificar se ja existe `workout_progress` para hoje antes de permitir "Concluir Treino" (evitar duplicatas)

### FASE 4: Melhorias UX

**`src/components/9fit/BottomNavigation.tsx`**
- Verificar se `pb-safe` funciona (pode precisar de `env(safe-area-inset-bottom)` explicito)

**`src/pages/9fit/Profile.tsx`**
- Adicionar upload real de avatar usando bucket `assessments` (publico)

---

## Secao Tecnica

### Dashboard - Queries Reais

```typescript
// Alunos sem treino ativo
const { count: withoutTraining } = await supabase
  .from('athletes')
  .select('id', { count: 'exact', head: true })
  .eq('coach_id', currentUser.id)
  .eq('activated', true)
  .not('id', 'in', 
    supabase.from('student_training_assignments')
      .select('student_id')
      .eq('is_active', true)
  );
// Nota: Supabase JS nao suporta subqueries, entao buscar IDs primeiro
```

Alternativa pratica:
```typescript
const { data: allAthletes } = await supabase.from('athletes').select('id').eq('coach_id', currentUser.id).eq('activated', true);
const { data: withTraining } = await supabase.from('student_training_assignments').select('student_id').eq('is_active', true);
const trainingIds = new Set(withTraining?.map(t => t.student_id));
const withoutTraining = allAthletes?.filter(a => !trainingIds.has(a.id)).length || 0;
```

### AulasCreditos - Fix teacher_id

```typescript
// Buscar coach_id do atleta
const { data: athleteData } = await supabase
  .from('athletes')
  .select('coach_id')
  .eq('id', athleteId)
  .single();

// Usar athleteData.coach_id como teacher_id
```

### Arquivos a Modificar

| # | Arquivo | Mudanca |
|---|---------|---------|
| 1 | `src/pages/Dashboard.tsx` | Queries reais para stats, migrar de `alunos` para `athletes` |
| 2 | `src/pages/9fit/Hub.tsx` | Remover hardcoded, unificar workout_progress, weekly real |
| 3 | `src/pages/9fit/AulasCreditos.tsx` | Fix teacher_id |
| 4 | `src/App.tsx` | Remover rota `/9fit/aulas` |
| 5 | `src/components/layout/AppSidebar.tsx` | Nome dinamico do perfil |
| 6 | `src/pages/9fit/Profile.tsx` | Fix links mortos, edit profile, upload foto |
| 7 | `src/pages/9fit/Train.tsx` | Prevenir duplicata de workout_progress |

Total: 7 arquivos, 0 migracoes SQL necessarias.

