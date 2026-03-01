

# Plano de Correcao: Primeiro Acesso, Agenda Admin, Relatorios e Mais

## Problemas Identificados e Causa Raiz

### 1. GARGALO CRITICO: Loop no Primeiro Acesso
**Causa raiz confirmada**: A tabela `athletes` NAO tem politica RLS de **UPDATE** para o aluno. Quando `FirstAccess.tsx` executa:
```
.update({ password_changed: true }).eq('id', link.athlete_id)
```
O update **falha silenciosamente** (retorna 0 rows affected). Quando o usuario navega para `/9fit/hub`, o `NineFitLayout` verifica `password_changed` que continua `false`, e redireciona de volta para `/9fit/first-access`.

**Solucao**: Adicionar politica RLS UPDATE na tabela `athletes` para `user_id = auth.uid()`, restrita aos campos `password_changed` e `auto_password_temp`.

### 2. Relatorios - Lista de Alunos Vazia
**Causa raiz**: `ReportsPage.tsx` linha 23: `const studentsData: any[] = []` - array hardcoded vazio, sem fetch do Supabase.

### 3. Agenda Admin - Agendamento Incompleto
**Situacao atual**: Botao "Novo agendamento" existe mas nao faz nada. Precisa de modal com selecao de aluno + tipo (avaliacao fisica / aulas / consultoria).

### 4. Super Series e Series de Referencia - Sem Persistencia
**Causa raiz**: Ambas as paginas usam arrays vazios hardcoded (`const superSets: any[] = []`), sem integracao com Supabase.

### 5. Check-in de Aula do Aluno
**Situacao atual**: O `handleCheckIn` ja existe em `AulasCreditos.tsx` mas precisa ficar mais visivel e debitar creditos automaticamente.

---

## Fases de Implementacao

### FASE 1: Corrigir Loop do Primeiro Acesso (CRITICO)

**Migracao SQL**:
- Adicionar politica RLS UPDATE em `athletes` para alunos atualizarem `password_changed` e `auto_password_temp` do proprio registro
- A politica sera: `UPDATE ON athletes FOR authenticated USING (user_id = (select auth.uid()))`

**Arquivo `src/pages/9fit/FirstAccess.tsx`**:
- Adicionar verificacao de erro no update do `password_changed`
- Se o update via `athlete_auth_link` falhar, tentar update direto via `user_id`
- Adicionar `auto_password_temp = null` ao update (limpar senha temporaria)
- Log de erro explicito se update falhar

**Arquivo `src/components/9fit/NineFitLayout.tsx`**:
- Adicionar fallback: se `password_changed` nao puder ser lido, nao redirecionar para first-access (evitar loop)

### FASE 2: Relatorios com Dados Reais

**Arquivo `src/pages/ReportsPage.tsx`**:
- Substituir array vazio por fetch da tabela `athletes`
- Buscar dados com join em `student_training_assignments` e `class_bookings`
- Mapear campos: nome, email, telefone, objetivo, ultimo treino, dias sem agendar
- Manter filtro de busca existente

### FASE 3: Agenda Admin - Fluxo de Agendamento

**Arquivo `src/pages/AgendaPage.tsx`**:
- Criar modal "Novo Agendamento" com:
  - Select de aluno (busca da tabela `athletes`)
  - Select de tipo: Avaliacao Fisica / Aula / Consultoria
  - Date/time picker
  - Campo de observacoes
- Ao salvar, inserir em `class_bookings` (para aulas) ou tabela de agendamentos generica
- Tipo "Avaliacao Fisica" pode linkar ao 9Progress ou criar registro em `avaliacoes_unificadas`

**Migracao SQL**:
- Criar tabela `appointments` (se nao existir) para agendamentos genericos (consultoria, avaliacao)
- Campos: id, athlete_id, coach_id, type (enum: avaliacao/aula/consultoria), datetime, notes, status

### FASE 4: Super Series e Series de Referencia com Persistencia

**Migracao SQL**:
- Criar tabela `super_sets` (id, name, difficulty, exercises jsonb, created_by, created_at)
- Criar tabela `reference_series` (id, name, difficulty, exercises jsonb, created_by, created_at)
- RLS: trainers/admins podem CRUD, alunos podem SELECT

**Arquivos `SuperSetsPage.tsx` e `ReferenceSeriesPage.tsx`**:
- Substituir arrays vazios por fetch do Supabase
- CRUD completo: criar, editar, excluir
- Salvar exercicios como JSONB com detalhes (nome, series, repeticoes)

### FASE 5: Check-in e Creditos do Aluno

**Arquivo `src/pages/9fit/AulasCreditos.tsx`**:
- Tornar botao de check-in mais proeminente (destaque visual quando aula esta no horario)
- Garantir que check-in debita creditos automaticamente (ja faz via `handleBookClass`, validar)
- Adicionar badge visual "Check-in disponivel" quando aula esta dentro do horario

---

## Secao Tecnica

### Politica RLS Critica (Fase 1)
```sql
-- Permitir que atletas atualizem campos especificos do proprio registro
CREATE POLICY "Athletes can update own password fields"
  ON public.athletes
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
```

### Tabela de Agendamentos (Fase 3)
A tabela `appointments` ja existe no schema. Verificar se tem os campos necessarios e adicionar RLS. Se nao existir, criar com:
- `id` uuid PK
- `athlete_id` uuid FK athletes
- `coach_id` uuid FK auth.users
- `appointment_type` text (avaliacao_fisica, aula, consultoria)
- `scheduled_at` timestamptz
- `notes` text
- `status` text (pendente, confirmado, cancelado, concluido)

### Fetch de Alunos para Relatorios (Fase 2)
```typescript
const { data } = await supabase
  .from('athletes')
  .select('id, name, email, phone, goal, created_at')
  .order('name');
```

### Prioridades

| Prioridade | Item | Impacto |
|------------|------|---------|
| CRITICA | Fix loop primeiro acesso (RLS UPDATE) | App inacessivel para novos alunos |
| ALTA | Relatorios com dados reais | Feature basica quebrada |
| ALTA | Agenda admin com agendamento | Operacional admin |
| MEDIA | Super series / series referencia | Features sem persistencia |
| MEDIA | Check-in mais visivel | UX do aluno |

### Ordem de Execucao

1. Migracao SQL: politica UPDATE em athletes + tabela appointments (se necessario)
2. Fix FirstAccess.tsx e NineFitLayout.tsx (resolve loop)
3. ReportsPage.tsx com fetch real
4. AgendaPage.tsx com modal de agendamento
5. SuperSetsPage.tsx e ReferenceSeriesPage.tsx com persistencia

**Nota**: Fluxo de pagamento para compra de creditos e um feature maior que requer integracao Stripe e sera tratado separadamente apos estas correcoes.

