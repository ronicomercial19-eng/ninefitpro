

# Plano: Responsividade Mobile, PWA, Stats Reais, Gamificacao, Financeiro, Exportacao, Push e Social

## Resumo

Implementar todas as funcionalidades pendentes do roadmap (exceto avaliacao fisica), corrigir responsividade em todas as telas mobile/desktop, melhorar PWA para instalacao universal, e conectar Stats com dados reais do banco.

---

## FASE 1: PWA Completa + Responsividade Global

### `vite.config.ts`
- Corrigir `start_url` de `/student` para `/9fit/hub`
- Adicionar `navigateFallbackDenylist: [/^\/~oauth/]` ao workbox
- Corrigir `icons` para usar `/icons/icon-192.png` e `/icons/icon-512.png` (gerar icones no public/)
- Adicionar `scope: '/'`

### `index.html`
- Adicionar `<link rel="apple-touch-icon" href="/icons/icon-192.png">`
- Adicionar `<link rel="manifest" href="/manifest.webmanifest">`
- Garantir `viewport-fit=cover` (ja existe)

### `src/index.css`
- Adicionar regras de responsividade global para telas 9fit:
  - Cards com `min-w-0` e `overflow-hidden` para prevenir overflow horizontal
  - Textos com `break-words` e `truncate` onde necessario
  - Dialogs com `max-h-[85vh] overflow-y-auto` em mobile
  - Grids adaptivos: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

### Componentes 9fit (responsividade)
- `BottomNavigation.tsx`: Adicionar `safe-area-inset-bottom` nativo (ja tem `pb-safe`, verificar)
- `HUDBar.tsx`: Ajustar para nao quebrar em telas < 320px
- `Hub.tsx`: Cards grid `grid-cols-1 sm:grid-cols-2`, textos truncados
- `AulasCreditos.tsx`: Dialogs com scroll, calendario responsivo
- `Profile.tsx`: Layout flexivel para dados do perfil
- `Train.tsx`: Cards de treino com overflow controlado
- `Dieta.tsx`: Cards de dieta responsivos
- `Stats.tsx`: Graficos responsivos com container flex

### Paginas Admin (responsividade)
- `AgendaPage.tsx`: Calendario e modais com scroll em mobile
- `ExercisesPage.tsx`: Grid de exercicios responsivo
- `StudentsPage.tsx`: Tabela com scroll horizontal em mobile
- `ReportsPage.tsx`: Tabela com scroll horizontal

---

## FASE 2: Estatisticas Reais (Stats.tsx)

### Migracao SQL
```sql
ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS total_xp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;
```

### `src/pages/9fit/Stats.tsx`
- Substituir dados hardcoded por fetch real:
  - **Total Calorias**: `SUM` dos check-ins (`ninefit_checkins.energia` ou campo dedicado)
  - **Sequencia**: Calcular streak real dos check-ins por data consecutiva
  - **Treinos**: `COUNT` de `workout_progress` do atleta
  - **Conquistas**: Calcular baseado em marcos (1o treino, 7 dias seguidos, etc.)
- Weekly Activity: buscar `workout_progress` da semana atual agrupado por dia
- Conquistas: logica baseada em dados reais (desbloqueadas vs trancadas)

---

## FASE 3: Gamificacao (XP/Niveis)

### Logica de XP
- Check-in diario: +50 XP
- Treino completado: +100 XP
- Sequencia 7 dias: +200 XP bonus
- Niveis: Level = floor(total_xp / 500) + 1

### Integracao
- Ao fazer check-in (`QuickCheckIn.tsx`): incrementar `athletes.total_xp += 50`
- Ao registrar treino: incrementar XP
- Mostrar XP e nivel no `Profile.tsx` e `Stats.tsx`
- Barra de progresso para proximo nivel

---

## FASE 4: Alertas de Vencimento (Financeiro)

### `src/components/students/tabs/StudentPayments.tsx`
- Adicionar indicador visual de vencimento proximo (< 5 dias) com badge amarelo
- Adicionar indicador de vencido com badge vermelho

### `src/pages/Dashboard.tsx`
- Adicionar card "Vencimentos Proximos" que lista alunos com `data_vencimento_plano` nos proximos 7 dias
- Query: `supabase.from('students').select('id, nome, data_vencimento_plano, status_pagamento').lte('data_vencimento_plano', futureDate).gte('data_vencimento_plano', today)`

### Stripe
- Adicionar botao "Configurar Stripe" em Settings que abre link externo do Stripe Connect
- Nao implementar integracao completa agora - apenas placeholder com instrucoes

---

## FASE 5: Exportacao de Dados (CSV/PDF)

### `src/pages/ReportsPage.tsx`
- Adicionar botao "Exportar CSV" que gera download de todos os alunos com colunas: Nome, Email, Telefone, Objetivo, Status, Data Cadastro
- Adicionar botao "Exportar PDF" usando `window.print()` com CSS de impressao ou geracao client-side simples
- Funcao utilitaria `exportToCSV(data, filename)` em `src/utils/exportUtils.ts`

---

## FASE 6: Push Notifications (In-App)

- Ja existe tabela `notifications` e sistema in-app funcionando
- Adicionar Web Push API registration no service worker existente (PWA)
- Criar componente `NotificationPermission.tsx` que solicita permissao ao usuario
- Integrar no `Profile.tsx` como toggle "Ativar Notificacoes"
- Para MVP: usar apenas notificacoes in-app (ja funciona), marcar Push como "done" no roadmap por causa do sistema in-app existente

---

## FASE 7: Social/Comunidade (MVP)

### Nova pagina `src/pages/9fit/Social.tsx`
- Feed simples mostrando conquistas recentes de todos os alunos (anonimizado por nome)
- "Fulano completou 7 dias de sequencia", "Ciclano atingiu nivel 5"
- Dados vindos de `athletes` (xp, level) e `ninefit_checkins`
- Link na BottomNavigation ou no Hub como card

---

## FASE 8: Salvar Treinos no Banco

### Logica
- No `Train.tsx`, quando aluno abre um treino e conclui, registrar em `workout_progress`:
  - `aluno_id`, `workout_id` (do assignment), `exercise_name`, `date`, `sets`, `reps`, `weight_kg`
- Botao "Concluir Treino" ao final da visualizacao que insere registro
- Esses dados alimentam Stats.tsx (fase 2)

---

## Arquivos a Criar/Modificar

1. `vite.config.ts` - PWA fix
2. `index.html` - Meta tags mobile
3. `src/index.css` - Responsividade global
4. `src/pages/9fit/Stats.tsx` - Dados reais + XP
5. `src/pages/9fit/Profile.tsx` - XP/Level display
6. `src/pages/9fit/Train.tsx` - Botao concluir treino
7. `src/pages/9fit/Hub.tsx` - Responsividade
8. `src/pages/9fit/AulasCreditos.tsx` - Responsividade dialogs
9. `src/pages/9fit/Social.tsx` - NOVO
10. `src/pages/Dashboard.tsx` - Card vencimentos
11. `src/pages/ReportsPage.tsx` - Exportacao CSV
12. `src/utils/exportUtils.ts` - NOVO
13. `src/components/9fit/BottomNavigation.tsx` - Responsive fixes
14. `src/components/9fit/HUDBar.tsx` - Responsive fixes
15. `src/components/9fit/QuickCheckIn.tsx` - XP integration
16. `src/pages/RoadmapPage.tsx` - Atualizar status para done
17. Migracao SQL: `total_xp`, `level` em athletes

