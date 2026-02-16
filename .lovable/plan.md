

# Plano de Correcao: Dieta, Aulas e Treinos por Dia

## Diagnostico dos Problemas

### 1. Dieta NAO aparece para o aluno (CRITICO)
**Causa raiz encontrada**: A tabela `athletes` NAO tem uma politica RLS que permita ao aluno ler seu proprio registro. As politicas existentes so permitem `coach_id = auth.uid()` ou roles de admin.

Quando a politica de `student_diet_assignments` faz:
```
EXISTS (SELECT 1 FROM athletes WHERE athletes.user_id = auth.uid())
```
Essa subquery retorna vazio porque o aluno nao consegue ler a tabela `athletes`. Logo, o resultado final e vazio.

**Prova**: A requisicao de rede mostra `student_id=eq.876a6316...` retornando `[]` mesmo com 2 dietas ativas no banco para esse aluno. O console mostra `Found diets: 0`.

Esse mesmo bug afeta `student_credits` e `vacation_requests` (mesma subquery).

### 2. Sistema de Aulas nao funciona
**Causa raiz**: As unicas aulas em `gym_classes` sao de dezembro de 2024. Nao existem aulas em 2026. O calendario mostra vazio porque nao ha dados.

Alem disso, as politicas de `class_bookings` usam `user_email` para match, o que funciona, mas `student_credits` e `vacation_requests` dependem da subquery em `athletes` que esta bloqueada (mesmo bug do item 1).

### 3. Treinos por dia da semana
O usuario quer que apos o admin criar treinos, eles aparecam organizados por dia da semana (Seg/Ter/Qua...) na view do aluno, nao apenas como lista flat.

---

## Solucao

### Bloco 1: Corrigir RLS da tabela `athletes` (resolve dieta + creditos + ferias)

Adicionar uma politica SELECT que permite ao atleta ler seu proprio registro:

```sql
CREATE POLICY "Athletes can view own profile"
  ON public.athletes FOR SELECT
  USING (user_id = (select auth.uid()));
```

Isso desbloqueia automaticamente:
- Dietas (`student_diet_assignments`)
- Creditos (`student_credits`)  
- Ferias (`vacation_requests`)

### Bloco 2: Criar aulas de exemplo para fevereiro 2026

Inserir aulas recorrentes para que o calendario tenha dados para testar:
- Aulas variadas (Musculacao, Funcional, Pilates, etc.)
- Distribuidas ao longo de fevereiro 2026
- Com slots e creditos configurados

### Bloco 3: Treinos por dia da semana

Modificar `Train.tsx` para:
- Ao clicar em um dia da semana no calendario, filtrar treinos atribuidos para aquele dia
- Adicionar campo `training_days` (array de dias: ["segunda", "terca"...]) ao assignment
- Se nao houver dia especifico, mostrar o treino em todos os dias

---

## Arquivos a Modificar

1. **Migracao SQL** - Nova politica RLS em `athletes` + aulas de exemplo
2. `src/pages/9fit/Train.tsx` - Filtrar treinos por dia selecionado no calendario
3. `src/pages/9fit/Dieta.tsx` - Nenhuma mudanca necessaria (o fix de RLS resolve)
4. `src/pages/9fit/AulasCreditos.tsx` - Nenhuma mudanca necessaria (o fix de RLS resolve)

## Secao Tecnica

### Politica RLS Critica

O problema e que a tabela `athletes` tem ~20 politicas redundantes, todas baseadas em `coach_id = auth.uid()`. Nenhuma permite `user_id = auth.uid()`. A nova politica e simples e resolve toda a cadeia de dependencias.

### Treinos por dia

A estrategia e usar o campo `training_data` (JSONB) ja existente para armazenar os dias da semana. No `Train.tsx`, ao clicar em "Segunda", filtramos os treinos que incluem "segunda" no array de dias. Se o treino nao tiver dias especificados, ele aparece em todos os dias (comportamento atual mantido como fallback).

### Aulas de teste

Inserir 15-20 aulas distribuidas em fevereiro/marco 2026 para validar o fluxo completo de agendamento, multi-selecao e checkout.

