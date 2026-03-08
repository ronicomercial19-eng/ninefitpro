

# Plano: Modulo de Agendamento Completo com Logica de Disponibilidade e WhatsApp

## Causa Raiz do Erro FK

**Confirmado**: `appointments.student_id` tem FK para `auth.users(id)`, mas o codigo insere `athletes.id` (UUID diferente). Isso causa o erro `violates foreign key constraint "appointments_student_id_fkey"`.

**Correcao**: Alterar FK de `auth.users(id)` para `athletes(id)`.

---

## Implementacao

### FASE 1: Correcao FK + Tabela de Grade Horaria (SQL)

**Migracao**:
- DROP FK `appointments_student_id_fkey` e recriar apontando para `athletes(id)`
- Criar tabela `class_schedules` (grade horaria): `id`, `day_of_week` (int 0-6), `start_time` (time), `end_time` (time), `max_slots` (int), `class_name` (text), `instructor` (text), `is_active` (bool)
- Esta tabela define quais horarios estao na grade para a logica de auto-confirmacao

### FASE 2: Tela do Aluno - Agendamento Inteligente

**`src/pages/9fit/AulasCreditos.tsx`**:
- Adicionar botao "Solicitar Agendamento" proeminente
- Dialog de agendamento com selecao de multiplos dias/horarios no calendario
- **Logica de validacao**:
  - Buscar `class_schedules` para verificar se dia/horario selecionado esta na grade
  - **Cenario A (disponivel na grade + vagas)**: Confirma automaticamente, debita credito, insere em `appointments` com status `confirmed`
  - **Cenario B (fora da grade ou lotado)**: Redireciona para WhatsApp SAC com mensagem pre-preenchida: `Olá, sou [NOME], gostaria de agendar aula no dia [DATA] às [HORA].`
- Verificacao de creditos antes de permitir agendamento
- Modal "Como Funciona" atualizado com os 5 topicos da especificacao

### FASE 3: Painel Admin - Gestao de Creditos e Notificacoes

**`src/pages/AgendaPage.tsx`**:
- Apos selecionar aluno no modal, mostrar saldo atual de creditos + campo para enviar creditos
- Botao "Enviar Creditos": faz upsert em `student_credits` (soma ao total existente)
- Secao de notificacoes/solicitacoes pendentes: listar `appointments` com status `scheduled` em destaque
- Cada solicitacao fora da grade mostra badge "Via WhatsApp" e dados do aluno

### FASE 4: Notificacao WhatsApp Automatica

- Toda solicitacao de agendamento (especialmente fora da grade) gera redirect para WhatsApp com mensagem formatada
- No painel admin, log de solicitacoes com dados do aluno visivel
- Numero do WhatsApp SAC configuravel (hardcoded inicialmente, pode ser variavel)

---

## Secao Tecnica

### FK Fix
```sql
ALTER TABLE public.appointments DROP CONSTRAINT appointments_student_id_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.athletes(id) ON DELETE CASCADE;
```

### Tabela class_schedules
```sql
CREATE TABLE public.class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  max_slots integer DEFAULT 10,
  class_name text DEFAULT 'Aula',
  instructor text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### Logica WhatsApp (aluno)
```typescript
const whatsappNumber = '5511999999999'; // SAC
const msg = encodeURIComponent(`Olá, sou ${athleteName}. Gostaria de agendar aula: ${selectedDates.join(', ')}`);
window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank');
```

### Enviar Creditos (admin)
```typescript
await supabase.from('student_credits').upsert({
  student_id: athleteId,
  total_credits: currentCredits + newCredits,
}, { onConflict: 'student_id' });
```

### Arquivos

1. Migracao SQL: FK fix + `class_schedules`
2. `src/pages/9fit/AulasCreditos.tsx` - Agendamento inteligente com validacao grade/WhatsApp
3. `src/pages/AgendaPage.tsx` - Gestao creditos + notificacoes pendentes

