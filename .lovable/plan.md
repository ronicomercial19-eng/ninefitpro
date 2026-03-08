

# Plano: Check-in, Gestao de Usuarios e Correcao do Primeiro Acesso

## Diagnostico

### 1. Loop do Primeiro Acesso (PERSISTENTE)
**Causa raiz confirmada**: Apesar da politica RLS UPDATE existir na tabela `athletes`, o update do `password_changed` continua falhando silenciosamente. O problema esta no codigo: `supabase.from('athletes').update(...)` sem `.select()` nao retorna erro quando 0 rows sao afetadas. Alem disso, o `Auth.tsx` (rota `/`) redireciona atletas para `/9fit/hub` sem verificar primeiro acesso, e o `NineFitLayout` re-verifica e redireciona para `/9fit/first-access` criando o loop.

**Prova**: Todos os 5+ atletas com `user_id` vinculado ainda tem `password_changed: false` e `auto_password_temp` preenchido, mesmo apos tentativas de alteracao.

### 2. Check-in na Home do Aluno
Nao existe componente de check-in no Hub. O check-in so existe dentro de `AulasCreditos.tsx`.

### 3. Excluir e Alterar Senha de Usuario
Nao existem essas opcoes no painel do admin (`StudentsManagement` / `StudentDetailedView`).

### 4. Agendamento Completo
A `AgendaPage` tem modal de criacao mas falta: exibir appointments no calendario, permitir aluno ver seus agendamentos, e integrar com a agenda do aluno.

---

## Implementacao

### FASE 1: Corrigir Loop do Primeiro Acesso (CRITICO)

**`src/pages/9fit/FirstAccess.tsx`**:
- Adicionar `.select()` ao update para forcar retorno de dados e detectar falha real
- Adicionar log detalhado de erro
- Se ambas tentativas falharem (via `user_id` e via `athlete_auth_link`), mostrar toast explicativo mas permitir continuar (nao bloquear o usuario)
- Armazenar flag em `localStorage` como fallback temporario

**`src/components/9fit/NineFitLayout.tsx`**:
- Checar `localStorage` fallback: se `first_access_completed` === true, nao redirecionar
- Adicionar timeout: se a query falhar ou demorar, nao bloquear

**`src/pages/Auth.tsx`**:
- Adicionar verificacao de primeiro acesso no `handleRedirectByRole` (como ja faz o `Login.tsx`): se atleta com `password_changed === false` e `auto_password_temp`, redirecionar para `/9fit/first-access`

### FASE 2: Check-in na Home do Aluno

**Novo componente `src/components/9fit/QuickCheckIn.tsx`**:
- Card compacto no Hub: mostra a proxima aula agendada do aluno (de `class_bookings` com status "confirmed")
- Botao "Fazer Check-in" proeminente com icone
- Ao clicar: atualiza `check_in_at` no `class_bookings`
- Apos check-in: mostra confirmacao visual com animacao

**`src/pages/9fit/Hub.tsx`**:
- Importar e renderizar `QuickCheckIn` entre o treino do dia e os ecosystem cards

### FASE 3: Relatorio de Check-ins no Painel Admin

**Novo componente `src/components/reports/CheckInReport.tsx`**:
- Fetch de `class_bookings` com join em `gym_classes` e `athletes`
- Tabela com: nome do aluno, aula, data/hora do check-in, status
- Filtros por data e por aluno
- Contadores: total check-ins, taxa de presenca, faltas

**`src/pages/ReportsPage.tsx`**:
- Adicionar nova tab "Presenca / Check-ins" que renderiza o `CheckInReport`

### FASE 4: Excluir Usuario e Alterar Senha

**`src/components/students/StudentDetailedView.tsx`**:
- Adicionar botao "Excluir Aluno" no header com confirmacao via AlertDialog
- Ao confirmar: soft-delete (setar `ativo = false`) ou hard-delete da tabela `athletes`
- Adicionar botao "Resetar Senha" que gera nova senha temporaria e atualiza `auto_password_temp` + `password_changed = false`
- Ambos com confirmacao e feedback via toast

**Migracao SQL** (se necessario):
- Verificar se cascade delete esta configurado em `athlete_auth_link` ao deletar athlete

### FASE 5: Finalizar Sistema de Agendamento

**`src/pages/AgendaPage.tsx`**:
- Buscar tambem da tabela `appointments` (alem de `class_bookings`)
- Exibir appointments no calendario com cores diferentes por tipo (avaliacao=roxo, aula=azul, consultoria=verde)
- Ao clicar no dia, mostrar lista de eventos daquele dia
- Permitir cancelar/concluir agendamento

**`src/pages/9fit/Hub.tsx`** ou **novo `src/pages/9fit/MeusAgendamentos.tsx`**:
- Exibir proximos agendamentos do aluno (fetch de `appointments` onde `student_id` = athleteId)
- Permitir aluno solicitar agendamento (insert em `appointments` com status "pendente")

**`src/pages/9fit/AulasCreditos.tsx`**:
- Adicionar secao "Meus Agendamentos" abaixo do calendario de aulas
- Fetch de `appointments` para o aluno logado
- Exibir tipo, data/hora, status

---

## Secao Tecnica

### Fallback localStorage para Primeiro Acesso

```typescript
// Em FirstAccess.tsx - apos password change bem sucedido:
localStorage.setItem('9fit_first_access_completed', 'true');

// Em NineFitLayout.tsx - antes de redirecionar:
const localCompleted = localStorage.getItem('9fit_first_access_completed');
if (localCompleted === 'true') {
  // Nao redirecionar para first-access
}
```

### QuickCheckIn - Logica

```typescript
// Buscar proxima aula agendada
const { data } = await supabase
  .from('class_bookings')
  .select('*, gym_classes(*)')
  .eq('user_id', user.id)
  .eq('status', 'confirmed')
  .is('check_in_at', null)
  .order('booking_time', { ascending: true })
  .limit(1);
```

### Excluir Aluno

```typescript
// Soft delete
await supabase.from('athletes').update({ ativo: false }).eq('id', athleteId);

// Ou hard delete (remove cascade via FK em athlete_auth_link)
await supabase.from('athletes').delete().eq('id', athleteId);
```

### Resetar Senha do Aluno

```typescript
const newTempPassword = generateRandomPassword();
await supabase.from('athletes').update({
  auto_password_temp: newTempPassword,
  password_changed: false
}).eq('id', athleteId);
// + Chamar edge function para atualizar senha no auth.users
```

### Prioridades

| Prioridade | Item | Impacto |
|------------|------|---------|
| CRITICA | Fix loop primeiro acesso | App inacessivel |
| ALTA | Check-in na home | UX do aluno |
| ALTA | Relatorio check-ins admin | Operacional |
| MEDIA | Excluir/resetar senha | Gestao admin |
| MEDIA | Agendamento completo | Feature admin+aluno |

### Arquivos a Modificar/Criar

1. `src/pages/9fit/FirstAccess.tsx` - Fix update + localStorage fallback
2. `src/components/9fit/NineFitLayout.tsx` - Checar localStorage
3. `src/pages/Auth.tsx` - Verificar primeiro acesso
4. `src/components/9fit/QuickCheckIn.tsx` - NOVO componente
5. `src/pages/9fit/Hub.tsx` - Integrar QuickCheckIn
6. `src/components/reports/CheckInReport.tsx` - NOVO componente
7. `src/pages/ReportsPage.tsx` - Adicionar tab de presenca
8. `src/components/students/StudentDetailedView.tsx` - Excluir + resetar senha
9. `src/pages/AgendaPage.tsx` - Exibir appointments completos
10. `src/pages/9fit/AulasCreditos.tsx` - Meus agendamentos do aluno

