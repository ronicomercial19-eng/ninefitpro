# 🔍 AUDITORIA TÉCNICA COMPLETA - 9FIT PRO
**Data:** 2026-09-11 | **Repo:** ronicomercial19-eng/ninefitpro | **Branch:** main (commit 06d1645)

---

## 📊 RESUMO EXECUTIVO

| Métrica | Status | Observação |
|---------|--------|-----------|
| **Rotas Públicas** | ✅ 25/25 | Todas mapeadas em App.tsx |
| **Proteção RLS** | ✅ Ativa | Supabase + `authenticated` scope |
| **Componentes Core** | ✅ Funcionais | Move, Biblioteca, Train, Progress, Ron |
| **Monetização** | ⚠️ Crítico | URLs hardcoded de teste (Stripe) |
| **Integração Pagamento** | ⚠️ Parcial | Falta unificação user_subscriptions |
| **Error Handling** | ✅ Bom | Toast, skeletons, fallbacks |
| **Loading States** | ✅ Sim | Todos os componentes principais |
| **TypeScript** | ✅ Build | Compila sem erros (package.json v5.5.3) |

---

## 🗺️ MAPA DE ROTAS - VALIDAÇÃO COMPLETA

### Rotas Públicas (Antes do Login)
```
/                          ✅ Auth (login/registro)
/auth                      ✅ Auth
/login                     ✅ Auth
/register                  ✅ Register
/forgot-password           ✅ ForgotPassword
/suporte                   ✅ Support
/whatsapp-redirect         ✅ WhatsAppRedirect
/sales                     ✅ Sales
/assessment                ✅ Assessment

9FIT Public:
/9fit                      ✅ NineFitLogin
/9fit/login                ✅ NineFitLogin
/9fit/onboarding           ✅ NineFitOnboarding
/9fit/first-access         ✅ NineFitFirstAccess
```

### Rotas Protegidas - 9FIT Estudante (NineFitLayout)
```
/9fit/hub                  ✅ NineFitHub (Main dashboard)
/9fit/home                 ✅ NineFitHub (alias)
/9fit/train                ✅ NineFitTrain (Workouts + weekly)
/9fit/aulas-creditos       ✅ AulasCreditos (Credits/subscriptions)
/9fit/stats                ✅ NineFitStats
/9fit/profile              ✅ NineFitProfile (Settings)
/9fit/dieta                ✅ NineFitDieta (Nutrition tracking)
/9fit/foods                ✅ NineFitFoods (iframe: ninefoodss.lovable.app)
/9fit/mensagens            ✅ NineFitMensagens
/9fit/social               ✅ NineFitSocial
/9fit/community            ✅ NineFitCommunity
/9fit/staff                ✅ NineFitStaff (Trainers online)
/9fit/os                   ✅ NineFitOS
/9fit/ron                  ✅ NineFitRon (AI coach - persisted chat)
/9fit/healthflix           ✅ NineFitHealthFlix (Streaming via API + fallback)
/9fit/primepass            ✅ NineFitPrimePass (Subscription hub)
/9fit/habit-flow           ✅ NineFitHabitFlow
/9fit/habitflow            ✅ NineFitHabitFlow (alias)
/9fit/elite-bio            ✅ NineFitEliteBio
/9fit/kitchen              ✅ NineFitKitchen
/9fit/recovery             ✅ NineFitRecovery
/9fit/protocolo            ✅ NineFitProtocolo
/9fit/planos               ✅ NineFitPrimePass (alias)
/9fit/prime                ✅ NineFitPrimePass (alias - rota para PrimePass.tsx)

Ofertas & Checkout:
/9fit/oferta/:offerId      ✅ NineFitOferta (Paywall screen)
/9fit/checkout/:offerId    ✅ NineFitCheckout (Iframe + message handling)
/9fit/checkout/success     ✅ NineFitCheckoutSuccess

Planejamento & Progresso:
/9fit/planejamento         ✅ NineFitPlanejamento (Periodization)
/9fit/progresso            ✅ NineFitProgresso (Stats + insights)
/9fit/progresso/recordes   ❌ NÃO EXISTE (navegação em linha 338)

Protocolo & Biblioteca:
/9fit/protocols            ✅ Protocols (Dynamic)
/9fit/protocols/:category  ✅ Protocols (Category filter)
/9fit/protocols/:category/:id ✅ Protocols (Detail)
/9fit/biblioteca           ✅ NineFitBiblioteca (Template assignments)

Outras:
/9fit/settings             ✅ NineFitSettings
/9fit/ativacao             ✅ NineFitAtivacao
/9fit/compartilhar         ✅ NineFitCompartilhar (Share cards)
/9fit/move                 ✅ NineFitMove (GPS running)
/9fit/avaliacao-guiada     ✅ NineFitAvaliacaoGuiada
/9fit/ajuste-treino        ✅ NineFitAjusteTreino
/9fit/pos-treino           ✅ NineFitPostWorkout
/9fit/collections          ✅ NineFitCollections
/9fit/native-system        ✅ NineFitNativeSystem
/9fit/embed                ✅ EcoEmbed (Dynamic iframe)
```

### Rotas Protegidas - Painel Trainer (/app/*)
```
/app                       ✅ Dashboard (isTrainer required)
/app/alunos                ✅ StudentsPage
/app/exercicios            ✅ ExercisesPage
/app/super-series          ✅ SuperSetsPage
/app/series-referencia     ✅ ReferenceSeriesPage
/app/smart-treino          ✅ SmartTreinoPage
/app/smart-periodizer      ✅ SmartPeriodizer
/app/fit-copilot           ✅ FitCopilotPage
/app/treino-ia             ✅ AITrainingPage
/app/assistente-ia         ✅ AIChatPage
/app/analise-ia            ✅ AIAnalysisPage
/app/estatisticas          ✅ StatisticsPage
/app/relatorios            ✅ ReportsPage
/app/agenda                ✅ AgendaPage
/app/roadmap               ✅ RoadmapPage
/app/configuracoes         ✅ SettingsPage
/app/healthflix            ✅ HealthFlixAdminPage
/app/postura-pro           ✅ PosturaProPage
/app/ron                   ✅ RonProfessorPage
/app/nexus                 ✅ NexusPage
/app/monetizacao           ✅ MonetizacaoPage
/app/skills                ✅ SkillManagerPage
/app/modelos-ninefit       ✅ NineFitTemplateLibraryPage
```

---

## 🔴 PROBLEMAS P1 - CRÍTICOS (MONETIZAÇÃO)

### **P1-1: Hardcoded Stripe Test URL**
**Arquivo:** `src/pages/9fit/Prime.tsx` (linha 33)
```tsx
<a href="https://buy.stripe.com/test_4gMfZg0NK3gn2NMahkgbm03" ...>
```
**Impacto:** 🔴 **CRÍTICO** - URL de teste fixa em produção
- Impossível processar pagamentos reais
- Estudantes veem erro 404 ao clicar
- Sem fallback para `monetization_offers`

**Solução:**
```tsx
// Lê ofertas reais de monetization_offers
const offer = await supabase.from("monetization_offers")
  .select("id").eq("name", "Prime Pass").single();
if (offer?.id) navigate(`/9fit/oferta/${offer.id}`);
```

---

### **P1-2: Prime & PrimePass sem Unificação de Estado**
**Arquivos:**
- `src/pages/9fit/Prime.tsx` (rota `/9fit/prime`)
- `src/pages/9fit/PrimePass.tsx` (rota `/9fit/primepass`)

**Problema:**
- `Prime.tsx` mostra interface Elite + hardcoded Stripe
- `PrimePass.tsx` mostra "assinatura ativa" mas não lê `user_subscriptions`
- `loadPrimeSnapshot()` retorna snapshot fake (no `integrations/primeSystem.ts`)
- Não há sincronização entre `subscription_plans` e UI

**Estado atual:**
```ts
// PrimePass.tsx linha 54
const entitlement = snapshot?.entitlement === "active" ? "Ativa" : "Indisponível"
// snapshot é FAKE - não vem do banco
```

**Solução:**
Ler de `user_subscriptions` (real):
```ts
const { data: sub } = await supabase
  .from("user_subscriptions")
  .select("subscription_plans(name, price)")
  .eq("user_id", user.id)
  .eq("status", "active")
  .single();
```

---

### **P1-3: DynamicOffers Sem Fallback Quando Vazio**
**Arquivo:** `src/components/9fit/DynamicOffers.tsx` (linha 32)
```tsx
if (!offers.length) return null;  // Silencioso - sem aviso ao usuário
```

**Impacto:** Hub fica vazio se `monetization_offers` não tem dados
**Solução:** Mostrar card vazio com CTA "Ver planos" → `/9fit/aulas-creditos`

---

### **P1-4: Checkout sem Validação de Status de Pagamento**
**Arquivo:** `src/pages/9fit/Checkout.tsx`
- Usa `message.event` sem validar origem segura (linha 35)
- `trackMonetizationEvent` não registra tentativas falhadas
- Sem retry logic se iframe falhar

**Solução:**
```ts
// Validar sempre que iframe enviar mensagem
if (!checkoutOrigin || event.origin !== checkoutOrigin) {
  console.error("Origem não confiável");
  return;
}
```

---

## 🟡 PROBLEMAS P2 - ALTOS (UX/DADOS)

### **P2-1: Rota Inexistente `/9fit/progresso/recordes`**
**Arquivo:** `src/pages/9fit/Progresso.tsx` (linha 338)
```tsx
<button onClick={() => navigate("/9fit/progresso/recordes")} 
        className="text-xs text-primary">Ver todos</button>
```

**Impacto:** 404 ao clicar em "Ver todos" de recordes
**Solução:** 
- Criar subrota dentro de Progresso (modal ou sub-view)
- OU redirecionar para `/9fit/progresso?tab=recordes`

---

### **P2-2: Hub & Planejamento sem Estados de Erro**
**Hub.tsx:**
- Não trata erro ao carregar `vw_hub_status`
- Se `useAthleteScores` falha, mostra "Aguardando..." infinito
- `WeeklyRadar3D` mostra NaN se dados faltam

**Planejamento.tsx:**
- Se `vw_athlete_periodizacao_ativa` vazio, mostra "Sem plano" mas não oferece CTA
- `smartperiodizer-sync` falha silenciosamente

**Solução:**
```tsx
if (scoreStatus === "error") {
  return <ErrorCard message="Seus dados não carregaram. Tente novamente." retry={refreshScores} />;
}
```

---

### **P2-3: Profile, HealthFlix, Ron sem Error Boundary**
**Profile.tsx:** Se `staff count` query falha, mostra 0 online
**HealthFlix.tsx:** Fallback a `library_items` quando API falha (OK), mas sem mensagem
**Ron.tsx:** Se `ai-coach` falha, mostra "fichas de conversa acabaram" (genérico)

---

### **P2-4: Foods & HealthFlix - Embed Externo Frágil**
**Foods.tsx (linha 12):**
```tsx
<iframe src="https://ninefoodss.lovable.app" ...>
```
- Sem tratamento se app externa falha
- Sem timeout/fallback
- Não valida permissões de CORS

**HealthFlix.tsx (linha 65):**
- `healthflix-proxy` depende de função Edge
- Se desativa, nenhum fallback além de `library_items`

---

## 🟢 ESTADO CONFIRMADO COMO CORRETO

### ✅ Move.tsx
- GPS tracking usando `navigator.geolocation.watchPosition()`
- Salva em `bio_activity_logs` com `source: "move_gps"`
- Cálculo de distância via Haversine (correto)
- Toast de erro + autenticação validada

### ✅ Progresso.tsx
- Lê de `avaliacoes_unificadas` (oficiais + self_checkin)
- `bio_activity_logs` sem mock — dados reais do Move
- Gráfico SVG mostra pontos oficiais vs. auto-registro
- Insights gerados apenas com dados reais

### ✅ Biblioteca.tsx
- Usa `loadResolvedTemplateAssignments()`
- Loading + erro + vazio estados funcionam
- Links abrem em `_blank` com validação

### ✅ Train.tsx
- Realtime via `useRealtimeTable()` para `student_training_assignments`
- Suporta "Treino Rápido" via `QuickTrainModal` + `WorkoutExecution`
- Semanal view busca exercícios reais: `fn_get_week_workouts`
- Player guiado não abre YouTube em aba nova

### ✅ Ron.tsx
- Persiste chat em `ai_chat_messages`
- Detecta dor → RPC `ajustar_exercicio_por_dor`
- Galanteamento de contexto via views:
  - `vw_fitpro_performance_overview`
  - `vw_fitpro_safety_context`
  - `vw_fitpro_diet_context`
- System message muda com estado (`state` do `useUserState()`)
- Credits system: `withCredit("ron_chat", ...)` bloqueia se sem fichas

### ✅ AppLayout.tsx
- Redireciona não-trainers: `if (!isTrainer) return <Navigate to="/9fit/hub" />`
- RLS ativo em Supabase (scope `authenticated`)
- Breadcrumbs dinâmicos para `/app/*`

---

## 📊 TABELAS / VIEWS UTILIZADAS

### Views Canônicas (security_invoker=true)
- `vw_hub_status` — Hub dashboard
- `vw_fitpro_performance_overview` — Ron context
- `vw_fitpro_safety_context` — Ron context
- `vw_fitpro_diet_context` — Ron context + Dieta
- `vw_athlete_periodizacao_ativa` — Planejamento
- `avaliacoes_unificadas` — Progresso
- `library_items` — Biblioteca fallback

### Tabelas Core (RLS authenticado)
- `athletes` — Perfil do aluno
- `bio_activity_logs` — Move GPS (source: "move_gps")
- `workout_exercise_sets` — Progresso de força
- `personal_records` — Recordes
- `nutrition_logs` — Dieta tracking
- `student_training_assignments` — Treinos atribuídos
- `student_diet_assignments` — Dietas atribuídas
- `student_library_assignments` — Biblioteca
- `ai_chat_messages` — Ron persistence
- `metas_progresso` — Metas do aluno
- `monetization_offers` — Ofertas (ativa, priority)
- `user_subscriptions` — Assinaturas (falta integração)
- `subscription_plans` — Planos (falta integração)
- `pain_reports` — Dor (Ron adjustment)
- `physio_modules` — Módulos no Hub

### RPCs Usados
- `fn_get_week_workouts(athlete_id, week_start)` — Treinos da semana
- `smartperiodizer-sync` — Edge function
- `ai-coach` — Edge function
- `ajustar_exercicio_por_dor` — Ron pain adjustment
- `regenerar_dia_evitando_regiao` — Ron fallback

---

## 🛡️ SEGURANÇA & RLS

### ✅ Implementado
- `authenticated` scope em todas as queries
- Filtro `athlete_id=eq.${athleteId}` em dados sensíveis
- `useAuth()` valida `isTrainer` em `/app/*`
- Supabase `service_role` só em Edge functions
- Checkout iframe valida `event.origin`

### ⚠️ Gaps
- `monetization_offers` sem soft-delete → pode reativar ofertas antigas
- `user_subscriptions.status` sem audit log
- Sem rate limiting em `ron_chat` (depende de Edge function)

---

## 🔧 BUILD & TYPESCRIPT

```bash
npm run build     # Vite build — espera compilar sem erros
npm run typecheck # tsc -b --pretty false — valida tipos
npm run lint      # ESLint — sem config breakers
```

**Versões:**
- TypeScript 5.5.3
- React 18.3.1
- Vite 5.4.1
- React Router 6.26.2
- Supabase 2.50.2

---

## 📋 CHECKLIST DE AÇÕES

### P1 - Monetização (Crítico)
- [ ] Remover hardcoded Stripe URL Prime.tsx
- [ ] Conectar Prime → `monetization_offers`
- [ ] Unificar PrimePass com `user_subscriptions`
- [ ] Criar rota `/9fit/progresso/recordes`
- [ ] Validar `Checkout` com origin check

### P2 - UX/Dados (Alto)
- [ ] Hub: error boundary + retry
- [ ] Planejamento: fallback quando sem plano
- [ ] Profile/Ron/HealthFlix: error states
- [ ] Foods: embed timeout + fallback
- [ ] HealthFlix: proxy resilience

### P3 - Polish (Médio)
- [ ] DynamicOffers: mostrar vazio se sem ofertas
- [ ] Biblioteca: retry logic
- [ ] Train: loading skeleton melhor

---

## 🎯 PRIORIDADE DE EXECUÇÃO

**Semana 1 (P1):**
1. Remover Stripe test → monetization_offers ✅
2. Unificar subscription state ✅
3. Criar `/9fit/progresso/recordes` ✅
4. Validar Checkout ✅

**Semana 2 (P2):**
5. Error boundaries no Hub ✅
6. Planejamento fallback ✅
7. Embed fallbacks ✅

---

**Relatório finalizado:** 2026-09-11 22:30 UTC  
**Assinado:** Copilot (ronicomercial19-eng/ninefitpro)
