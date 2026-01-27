
# Plano de Correção: Fluxo Admin-Aluno para Treinos

## Resumo do Problema

Foram identificados 4 bugs críticos que quebram o fluxo de criação de treinos:

1. **Foreign Key Incorreta**: A tabela `student_training_assignments.student_id` referencia `students.id`, mas o admin passa IDs da tabela `athletes` (que é a tabela ativa com dados reais)
2. **Constraint de Tipo Violada**: O campo `training_type` só aceita `['json', 'html']`, mas o código tenta inserir `'link'`
3. **Fontes de Dados Inconsistentes**: `StudentsPage.tsx` busca de `athletes`, mas `StudentsList.tsx` busca de `students` (vazia)
4. **Componentes Duplicados**: Duas listas de alunos acessando tabelas diferentes

---

## Correções Necessárias

### Fase 1: Correção do Banco de Dados

**1.1 Alterar Foreign Key para apontar para `athletes`**
```text
- Remover FK atual: student_training_assignments_student_id_fkey
- Criar nova FK: student_training_assignments -> athletes(id)
```

**1.2 Atualizar Check Constraint do `training_type`**
```text
- Alterar constraint para aceitar: ['json', 'html', 'link']
```

**Migração SQL necessária:**
```sql
-- Remover FK antiga
ALTER TABLE student_training_assignments
DROP CONSTRAINT IF EXISTS student_training_assignments_student_id_fkey;

-- Criar nova FK para athletes
ALTER TABLE student_training_assignments
ADD CONSTRAINT student_training_assignments_student_id_fkey
FOREIGN KEY (student_id) REFERENCES athletes(id) ON DELETE CASCADE;

-- Atualizar check constraint do training_type
ALTER TABLE student_training_assignments
DROP CONSTRAINT IF EXISTS student_training_assignments_training_type_check;

ALTER TABLE student_training_assignments
ADD CONSTRAINT student_training_assignments_training_type_check
CHECK (training_type IN ('json', 'html', 'link'));
```

---

### Fase 2: Unificação das Fontes de Dados

**2.1 Remover/Deprecar `StudentsList.tsx`**
- O arquivo `src/components/students/StudentsList.tsx` busca da tabela `students` (vazia)
- Será removido pois `StudentsPage.tsx` já faz o trabalho correto buscando de `athletes`

**2.2 Atualizar `StudentsManagement.tsx`**
- Redirecionar para usar a estrutura de `StudentsPage.tsx` que busca de `athletes`

**2.3 Arquivos Afetados:**
- `src/components/students/StudentsList.tsx` - REMOVER
- `src/components/students/StudentsManagement.tsx` - ATUALIZAR

---

### Fase 3: Correção do Componente de Upload

**3.1 Atualizar `TrainingContentUpload.tsx`**
- Linha 271: Garantir que `training_type` use valores válidos
- Adicionar validação para o tipo 'link'

**Mudanças no código:**
```typescript
// Antes (linha 191):
trainingType = 'link';  // ERRO - não aceito pelo banco

// Depois:
// Manter 'link' mas banco será atualizado para aceitar
trainingType = 'link';
```

---

### Fase 4: Correção do Fluxo do Aluno

**4.1 Atualizar `Train.tsx`**
- O componente já busca corretamente o `athlete_id` vinculado ao usuário
- Com a correção da FK, vai funcionar automaticamente

**4.2 Validar fluxo completo:**
```text
Admin -> Seleciona Aluno (athletes.id)
      -> Cria Treino (student_training_assignments.student_id = athletes.id)
      
Aluno -> Login
      -> Busca athlete_auth_link ou athletes.user_id
      -> Busca treinos via student_training_assignments
      -> Renderiza HTML/Link em fullscreen
```

---

### Fase 5: Limpeza de Código Duplicado

**Arquivos a remover:**
- `src/components/students/StudentsList.tsx`

**Arquivos a atualizar:**
- `src/components/students/StudentsManagement.tsx` - simplificar para usar estrutura correta

---

## Diagrama do Fluxo Corrigido

```text
+------------------+     +------------------+     +-------------------------+
|    ADMIN         |     |    athletes      |     | student_training_       |
|  (coach)         |---->|  (tabela ativa)  |<----|  assignments            |
+------------------+     +------------------+     +-------------------------+
                              ^                            |
                              |                            |
                         coach_id                     student_id (FK)
                              |                            |
                         +----+----+                       |
                         |  AUTH   |                       v
                         | USERS   |              +------------------+
                         +---------+              |  storage bucket  |
                              ^                   |  training-html   |
                              |                   +------------------+
                         user_id                           |
                              |                            |
                    +------------------+                   |
                    |  athlete_auth_   |                   |
                    |  link            |                   |
                    +------------------+                   |
                              |                            |
                              v                            v
                    +------------------+          +------------------+
                    |     ALUNO        |--------->|  Train.tsx       |
                    |  (9FIT App)      |          |  (visualizar)    |
                    +------------------+          +------------------+
```

---

## Resumo Técnico das Mudanças

| Arquivo/Recurso | Ação | Motivo |
|----------------|------|--------|
| `student_training_assignments` FK | Alterar para `athletes` | FK atual aponta para tabela vazia |
| `training_type` constraint | Adicionar 'link' | Código usa 'link' mas DB não aceita |
| `StudentsList.tsx` | Remover | Busca de tabela `students` vazia |
| `StudentsManagement.tsx` | Simplificar | Usar fluxo do `StudentsPage.tsx` |
| RLS policies | Verificar | Garantir que coach veja seus athletes |

---

## Ordem de Execução

1. Executar migração SQL (FK + constraint)
2. Remover `StudentsList.tsx`
3. Atualizar `StudentsManagement.tsx`
4. Testar fluxo completo:
   - Login como admin
   - Ir para /app/alunos
   - Selecionar aluno
   - Atribuir treino (link/HTML/arquivo)
   - Login como aluno
   - Verificar treino em /9fit/train
