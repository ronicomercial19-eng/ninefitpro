

# Plano de Implementacao Completa - 9FIT PRO + 9FIT Wear

## Estado Atual vs Requisitado

| Funcionalidade | Estado | Problema |
|---|---|---|
| PSE pos-treino | NAO EXISTE | `calories_burned: 150` hardcoded, sem modal |
| Log nutricional | MOCK | `consumed` sempre `{0,0,0,0}`, sem tabela |
| Notificacoes preditivas | NAO EXISTE | Sem Edge Function |
| Feedback pos-treino | TOAST SIMPLES | Apenas `toast.success("Treino concluido!")` |
| Hub dinamico | ESTATICO | Mesmo conteudo 24h/dia |
| Previsao de resultados | NAO EXISTE | Sem calculo em Stats |
| Relatorios PDF | NAO EXISTE | Sem geracao client-side |
| Wearable | NAO EXISTE | Novo componente |
| UI/UX Train/Dieta/Hub | INCOMPLETO | Cards fracos, CTAs ruins |

---

## FASE 1 — PSE + Feedback Pos-Treino (Train.tsx)

**Arquivo:** `src/pages/9fit/Train.tsx` (linhas 419-476)
**Novo componente:** `src/components/9fit/PostWorkoutModal.tsx`

Substituir o bloco "Concluir Treino" por um fluxo de 2 etapas:

1. Clicar "Concluir Treino" abre `PostWorkoutModal` com:
   - Slider RPE (1-10) com labels visuais (Facil/Moderado/Intenso/Exaustivo)
   - Input duracao (minutos)
   - Textarea notas
   - Calculo automatico: `calories = duration * (rpe * 1.2)`

2. Ao confirmar, salvar em `workout_progress`:
   - `rpe`, `duration_minutes`, `calories_burned` (calculado), `notes`

3. Exibir tela de resumo pos-treino:
   - XP ganho, calorias estimadas, RPE vs media
   - Mensagem dinamica: RPE > 8 = "Superacao!", RPE 5-7 = "Consistencia!", RPE < 4 = "Aumente a intensidade!"
   - Comparacao com ultimo treino (se houver)

**Admin (Dashboard.tsx):** Adicionar card "Alertas RPE" que consulta `workout_progress` para media RPE > 8 ou < 4 nos ultimos 7 dias.

---

## FASE 2 — Log Nutricional (Dieta.tsx)

**Migration SQL:** Criar tabela `nutrition_logs`:
```sql
CREATE TABLE nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  meal_name TEXT NOT NULL,
  calories NUMERIC DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: aluno ve so o proprio, coach ve do aluno atribuido
```

**Arquivo:** `src/pages/9fit/Dieta.tsx`
- Substituir mock `consumed` por query real a `nutrition_logs` filtrada por `date = today`
- Adicionar botao "Registrar Refeicao" com Dialog contendo: nome, calorias, proteina, carboidrato, gordura
- Barra de progresso diaria comparando consumo vs meta (da diet assignment ou default 2500 kcal)

---

## FASE 3 — Hub Dinamico (Hub.tsx)

**Arquivo:** `src/pages/9fit/Hub.tsx`

Adicionar logica de periodo do dia:
```text
hora < 12  → Manha: "Bom dia! Seu treino de hoje:", card treino em destaque, motivacao
hora 12-18 → Tarde: "Boa tarde!", lembrete hidratacao, aulas agendadas
hora > 18  → Noite: "Boa noite!", resumo do dia, dica de recuperacao
```

Regra de reativacao: se ultimo `workout_progress.date` > 2 dias atras, exibir card "Recuperacao de Habito" no topo com CTA "Treino Rapido".

Reorganizar hierarquia visual:
- Treino do Dia com botao grande "Iniciar Treino" (destaque maximo)
- Depois: Quick Check-in, Ecosystem cards, Weekly chart
- Social feed compacto estilo "Gym Rats" (ranking com avatares)

---

## FASE 4 — Notificacoes Preditivas

**Novo arquivo:** `supabase/functions/smart-notifications/index.ts`

Logica:
- Consulta `workout_progress` agrupado por `aluno_id`
- >3 dias sem treino → insere em `notifications` para aluno + coach
- Media RPE > 8 nos ultimos 5 treinos → alerta sobrecarga
- Queda de frequencia (semana atual < 50% da media mensal) → alerta

**Dashboard.tsx:** Card "Alertas Inteligentes" listando notificacoes geradas.

---

## FASE 5 — Previsao de Resultados (Stats.tsx)

**Arquivo:** `src/pages/9fit/Stats.tsx`

- Buscar historico de `student_measurements` (peso, medidas) e `avaliacoes_unificadas`
- Calcular regressao linear simples (slope) nos ultimos N pontos de peso
- Exibir card "Previsao": "Neste ritmo, voce atingira X kg em Y dias"
- Se sem dados suficientes (<3 medicoes), mostrar "Continue registrando para ver sua previsao"

---

## FASE 6 — WearableConnectBox

**Novo componente:** `src/components/9fit/WearableConnectBox.tsx`

Estados do componente:
```text
disconnected → Botao "Conectar Wearable" (icone relogio)
connecting   → Spinner + "Buscando dispositivo..."
connected    → Status verde + BPM em tempo real
active       → Timer de treino + zona de intensidade
```

**Integracao com Train.tsx:**
- Renderizar acima do iframe de treino
- Conexao via Web Bluetooth API (navigator.bluetooth)
- Dados coletados: heart_rate, timestamp
- Ao finalizar treino: incluir dados de HR no feedback pos-treino
- Comparar RPE percebido vs HR real: "Seu coracao registrou intensidade ALTA, mas voce marcou RPE 5"

**Integracao com Dieta:**
- Treino intenso (RPE > 7 ou HR media > 75% max) → sugerir aumento calorico (+200kcal)
- Treino leve → manter
- Sem treino no dia → sugerir reducao (-100kcal)

**Nota:** Conexao Bluetooth e experimental e opcional. O fluxo NUNCA trava sem wearable.

---

## FASE 7 — Correcoes UI/UX

### Train.tsx
- Cards de treino: inteiro clicavel (nao so botao "Ver")
- Adicionar badges: tempo estimado, nivel, status (Novo/Em andamento/Concluido hoje)
- Botao principal grande "Iniciar Treino" em destaque

### Dieta.tsx
- Barra de calorias no topo da pagina
- Lista de refeicoes registradas hoje com totais
- Botao flutuante "+" para registrar refeicao

### Hub.tsx
- Treino do Dia com destaque visual (border neon, icone grande)
- Botao de acao principal no centro
- Social feed compacto com scroll horizontal

---

## FASE 8 — Relatorios PDF + Memoria

### PDF (admin)
**Novo componente:** `src/components/reports/AssessmentPDFGenerator.tsx`
- Usar jspdf + html2canvas
- Compilar dados de `avaliacoes_unificadas` + `student_measurements` + `student_photos`
- Botao "Gerar PDF" na aba de avaliacoes do aluno

### Memoria do Usuario
**Migration:** Criar tabela `user_memory`:
```sql
CREATE TABLE user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  value JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(athlete_id, key)
);
```
Uso: armazenar preferencias, horario preferido, ultima interacao, etc.

---

## Ordem de Implementacao

| Fase | Descricao | Arquivos | Dependencia |
|------|-----------|----------|-------------|
| 1 | PSE + Feedback | Train.tsx, PostWorkoutModal.tsx, Dashboard.tsx | Nenhuma |
| 2 | Log Nutricional | Migration, Dieta.tsx | Nenhuma |
| 3 | Hub Dinamico | Hub.tsx | Fase 1 (usa RPE) |
| 4 | Notificacoes | Edge Function, Dashboard.tsx | Fase 1 |
| 5 | Previsao | Stats.tsx | Nenhuma |
| 6 | Wearable | WearableConnectBox.tsx, Train.tsx | Fase 1 |
| 7 | UI/UX | Train, Dieta, Hub | Fases 1-3 |
| 8 | PDF + Memoria | Migrations, componentes | Nenhuma |

**Total:** 2 migrations SQL, 1 Edge Function nova, 3 componentes novos, 6 arquivos editados.

