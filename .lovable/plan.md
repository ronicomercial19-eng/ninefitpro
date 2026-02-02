
# Plano: Adicionar Dieta ao Perfil do Aluno

## Objetivo
Implementar um sistema de atribuição de dietas no perfil do aluno que permita ao admin (coach) enviar planos nutricionais via **Link**, **Código HTML** ou **Upload de arquivo HTML**. O aluno visualiza as dietas na página de Dieta com um botão "Ver Completo" que renderiza o conteúdo em fullscreen.

---

## Arquitetura do Sistema

```text
ADMIN (Coach)                         ALUNO (Athlete)
+----------------------------+        +----------------------------+
| StudentDetailedView        |        | /9fit/dieta                |
| └── Tab: Dieta (NOVA)     |        |                            |
|     └── DietContentUpload  |        | Lista dietas atribuídas    |
|         • Link            --|-----→ | Botão "Ver Completo"       |
|         • Código HTML     --|-----→ | Dialog Fullscreen          |
|         • Upload Arquivo  --|-----→ | Renderiza HTML/Link        |
+----------------------------+        +----------------------------+
            ↓                                     ↑
     student_diet_assignments ←-------------------+
     (NOVA TABELA)
```

---

## Fase 1: Banco de Dados

### 1.1 Criar Tabela `student_diet_assignments`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| student_id | uuid | FK → athletes(id) |
| diet_name | text | Nome do plano alimentar |
| diet_description | text | Descrição opcional |
| diet_type | varchar | 'link', 'html', 'json' |
| diet_file_url | text | URL do arquivo/link |
| diet_file_path | text | Path no storage |
| diet_data | jsonb | Metadados (source, etc) |
| start_date | date | Data início |
| end_date | date | Data fim (opcional) |
| is_active | boolean | Visível para aluno |
| created_by | uuid | Coach que criou |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

### 1.2 Criar Storage Bucket `diet-html-files`
- Bucket público para arquivos de dieta HTML
- RLS permitindo coaches fazer upload e alunos visualizarem

---

## Fase 2: Componentes Admin

### 2.1 Criar `DietContentUpload.tsx`
Componente baseado no `TrainingContentUpload.tsx`:
- 3 tabs: Link / Código HTML / Upload Arquivo
- Validação de URL, arquivo .html, tamanho máx 10MB
- Upload para bucket `diet-html-files`
- Campos: nome, descrição, data início/fim, ativar
- Preview antes de enviar

### 2.2 Criar `StudentDiet.tsx` (nova tab)
Componente para a tab "Dieta" no perfil do aluno:
- Lista dietas atribuídas (ativas/inativas)
- Cards com badges de tipo (Link/HTML/Código)
- Botões: Visualizar, Editar, Ativar/Desativar, Excluir
- Dialog para preview do admin
- Estatísticas: total dietas, ativas, por tipo

### 2.3 Atualizar `StudentDetailedView.tsx`
- Adicionar nova tab "Dieta" com ícone de utensílios
- Importar e renderizar `StudentDiet` component

---

## Fase 3: Página do Aluno

### 3.1 Atualizar `Dieta.tsx` (/9fit/dieta)
Transformar de mock data para dados reais:

1. **Fetch de dietas atribuídas:**
   - Buscar athlete_id do usuário logado
   - Query `student_diet_assignments` filtrado por athlete_id e is_active
   - Filtrar por data válida (start_date ≤ hoje ≤ end_date)

2. **Nova seção: Meus Planos Alimentares**
   - Card para cada dieta atribuída
   - Informações: nome, descrição, validade
   - Badge de tipo (Link/HTML/Código)
   - Botão **"Ver Completo"** destaque

3. **Dialog Fullscreen ao clicar "Ver Completo":**
   - Cabeçalho com nome e tipo
   - Fetch do conteúdo HTML (mesma lógica do Train.tsx)
   - Renderização via iframe srcDoc
   - Botão para abrir em nova aba (links externos)
   - Botão fechar

---

## Fase 4: Fluxo de Dados

```text
1. Coach abre StudentDetailedView
2. Clica na tab "Dieta"
3. Clica "Atribuir Dieta"
4. Modal DietContentUpload abre
5. Coach cola link/código ou faz upload
6. Preenche nome, descrição, datas
7. Clica "Enviar Dieta"
8. Sistema:
   - Upload do arquivo (se necessário) → storage
   - Insert em student_diet_assignments
9. Aluno abre /9fit/dieta
10. Página busca student_diet_assignments
11. Exibe lista com botão "Ver Completo"
12. Aluno clica → Dialog fullscreen renderiza
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/students/DietContentUpload.tsx` | Upload de dieta (3 métodos) |
| `src/components/students/tabs/StudentDiet.tsx` | Tab dieta no admin |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/students/StudentDetailedView.tsx` | Adicionar tab Dieta |
| `src/pages/9fit/Dieta.tsx` | Integrar com Supabase, adicionar "Ver Completo" |

---

## Seção Técnica

### Migração SQL
```sql
-- Criar tabela de atribuição de dietas
CREATE TABLE IF NOT EXISTS public.student_diet_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  diet_name TEXT NOT NULL,
  diet_description TEXT,
  diet_type VARCHAR(20) CHECK (diet_type IN ('link', 'html', 'json')),
  diet_file_url TEXT,
  diet_file_path TEXT,
  diet_data JSONB DEFAULT '{}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_diet_assignments_student ON student_diet_assignments(student_id);
CREATE INDEX idx_diet_assignments_active ON student_diet_assignments(is_active);

-- RLS
ALTER TABLE student_diet_assignments ENABLE ROW LEVEL SECURITY;

-- Coaches podem gerenciar dietas dos seus alunos
CREATE POLICY "Coaches can manage diet assignments"
ON student_diet_assignments FOR ALL
USING (created_by = auth.uid() OR EXISTS (
  SELECT 1 FROM athletes WHERE id = student_id AND coach_id = auth.uid()
));

-- Alunos podem ver suas próprias dietas
CREATE POLICY "Athletes can view own diets"
ON student_diet_assignments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM athletes WHERE id = student_id AND user_id = auth.uid()
));

-- Criar bucket de storage para dietas
INSERT INTO storage.buckets (id, name, public)
VALUES ('diet-html-files', 'diet-html-files', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Anyone can view diet files"
ON storage.objects FOR SELECT
USING (bucket_id = 'diet-html-files');

CREATE POLICY "Authenticated users can upload diet files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'diet-html-files' AND auth.role() = 'authenticated');

CREATE POLICY "Owners can delete diet files"
ON storage.objects FOR DELETE
USING (bucket_id = 'diet-html-files' AND owner = auth.uid());
```

### Estrutura do DietContentUpload
- Reutilizar 90% do código de TrainingContentUpload
- Mudar referências: "treino" → "dieta"
- Mudar bucket: `training-html-files` → `diet-html-files`
- Mudar tabela: `student_training_assignments` → `student_diet_assignments`
- Manter mesma lógica de validação e upload

### Integração na Dieta.tsx
```typescript
// Buscar athlete_id
const { data: athlete } = await supabase
  .from("athletes")
  .select("id")
  .eq("user_id", user.id)
  .single();

// Buscar dietas atribuídas
const { data: diets } = await supabase
  .from("student_diet_assignments")
  .select("*")
  .eq("student_id", athlete.id)
  .eq("is_active", true);
```

---

## Resultado Final

**Admin:**
- Nova aba "Dieta" no perfil do aluno
- Pode atribuir dietas via link, código ou upload
- Gerencia dietas ativas/inativas

**Aluno:**
- Vê dietas atribuídas em /9fit/dieta
- Botão "Ver Completo" abre fullscreen
- Conteúdo renderizado igual ao treino
- Experiência consistente com o sistema de treinos
