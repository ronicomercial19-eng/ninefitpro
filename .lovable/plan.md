# Plano — 9FIT PRO · Entregas 1, 2 e 3

Execução pragmática, sem quebrar fluxos atuais. Banco híbrido: Supabase local + Hub Supremo (mirror). Nenhuma migração destrutiva.

---

## ENTREGA 1 — Tipografia + Identidade HUD

**Objetivo:** padronizar `font-display` (Syne) e `font-data` (DM Mono) nas páginas internas.

- `HUDBar.tsx`: kcal/streak em `font-mono` (DM Mono); labels em `font-display uppercase`.
- `WeeklyProgressChart.tsx`, `Stats.tsx`, `EcosystemStatusCards.tsx`: números em `font-mono`, headers em `font-display`.
- `WorkoutOverview.tsx` / `WorkoutExecution.tsx`: séries, reps, carga em `font-mono`; títulos em `font-display`.
- `Hub.tsx` saudação e métricas: aplicar nova hierarquia.
- Adicionar utility class `.font-data` em `index.css` (alias para `font-mono` com tracking ajustado).

---

## ENTREGA 2 — Navegação, Hub Supremo & Design Premium

### 2.1 Bottom Navigation (4 tabs canônicas)

`OS · TRAIN · HUB · STAFF` (aluno) — substitui `OS/Train/Social/Data/ID`.

> Para professor mantém-se sidebar atual; nav inferior é exclusiva da experiência aluno (`/9fit/*`).

```
OS    → /9fit/hub      (dash pessoal + tarefas diárias)
TRAIN → /9fit/train    (treino do dia + protocolo + healthflix)
HUB   → /9fit/community (FitCommunity + social + primepass + store + ID)
STAFF → /9fit/staff    (Ron AI + profissionais)
```

### 2.2 Estrutura de cada aba

**OS (Hub pessoal — retém usuário)**

- HomeFeed contextual (manhã/treino/noite) já existe → tornar dinamico, adptar conforme o usuario personaliza o app 
- Card "Objetivos do Dia" (missions) no topo
- HUD widgets: Recovery, Readiness, Performance Trend
- Cards: streak, próxima sessão, alerta Ron

**TRAIN (o produto)**

- Aba 1: **Treino Diário** (WorkoutHome filtrado pelo dia)
- Aba 2: **Protocolo** (protoclo html enviado + periodização + objetivo/método/observações)
- Aba 3: **HealthFlix** (iframe `https://healthflixnine.lovable.app` com SSO via token)

**HUB (engajamento + monetização)**
Bento grid 4 cards principais:

- FitCommunity →Social/Tribos → `https://ninefit-community-flow.lovable.app`
- O Ron ->  [https://9ron.base44.app](https://9ron.base44.app)  (acesso direto autenticado)
- PrimePass (compra) dentro do fitcomunity -> area premium que conecta e disponibilzia os melhores recursos, recomendaçoes
- 9Store → `https://ninefit.lovable.app`
- ID Pessoal (card destacado com nível, badges, pontos)

**Staff +  Ron  ( diferenciais )** 

- Ron AI Assistente (chat + insights [https://9ron.base44.app](https://9ron.base44.app))  
import React, { useState, useMemo } from 'react';
  import { 
    Search, Calendar, MapPin, Users, Activity, ChevronRight, 
    CheckCircle2, Clock, CreditCard, Shield, Star, Info, X
  } from 'lucide-react';
  import { motion, AnimatePresence } from 'framer-motion';
  // --- DESIGN SYSTEM CONSTANTS ---
  const COLORS = {
    black: '#0A0A0A',
    orange: '#FF6B00', // 9FIT ORANGE
    gray: { 900: '#121212', 800: '#1A1A1A', 400: '#A1A1AA' },
    status: { success: '#10B981', warning: '#F59E0B' }
  };
  // --- DATA STRUCTURES ---
  const MACRO_CATEGORIES = [
    { id: 'health', name: '9HEALTH', methods: ['Recovery', 'Mobility', 'Flow', 'Longevity', 'Rehab'], color: '#3B82F6' },
    { id: 'performance', name: '9PERFORMANCE', methods: ['Strength', 'Running', 'Fight', 'Conditioning', 'Hybrid'], color: '#EF4444' },
    { id: 'lifestyle', name: '9LIFESTYLE', methods: ['Family', 'Kids', 'Signature', 'Balance', 'Active Life'], color: '#10B981' }
  ];
  const HUBS = [
    { id: 'maison', name: 'Maison', load: 'High', staffCount: 12, methods: ['Recovery', 'Strength', 'Signature'] },
    { id: 'moema', name: 'Moema', load: 'Medium', staffCount: 8, methods: ['Running', 'Balance', 'Flow'] },
    { id: 'pinheiros', name: 'Pinheiros', load: 'Low', staffCount: 5, methods: ['Fight', 'Conditioning'] }
  ];
  const PROFESSIONALS = [
    { id: 1, name: 'Rony', role: 'Head Coach', hubs: ['Maison', 'Pinheiros'], rating: 5.0, capacity: '90%', retention: '98%', methods: ['Signature', 'Strength'] },
    { id: 2, name: 'Juliana', role: 'Senior Staff', hubs: ['Moema', 'Maison'], rating: 4.9, capacity: '75%', retention: '92%', methods: ['Recovery', 'Flow'] },
    { id: 3, name: 'Marcus', role: 'Staff', hubs: ['Vila Sofia'], rating: 4.8, capacity: '60%', retention: '85%', methods: ['Fight', 'Conditioning'] }
  ];
  // --- COMPONENTS ---
  export default function NineFitEcosystem() {
    const [step, setStep] = useState('container'); // container, category, methods, matching, hub, booking, success
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedHub, setSelectedHub] = useState(null);
    // Filter Logic
    const filteredProfessionals = PROFESSIONALS.filter(p => 
      [p.name](http://p.name).toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.methods.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#FF6B00]/30">
        {/* Header Fixo */}
        <header className="border-b border-white/10 p-4 sticky top-0 bg-black/80 backdrop-blur-md z-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FF6B00] rounded-sm flex items-center justify-center font-bold text-black text-xs">9F</div>
            <span className="font-mono text-[10px] tracking-tighter text-white/50 uppercase">Architecture Base44</span>
          </div>
          <div className="flex gap-4">
              <button onClick={() => setStep('container')} className="text-[10px] uppercase tracking-widest text-[#FF6B00]">Reset Engine</button>
          </div>
        </header>
        <main className="max-w-md mx-auto p-6 pb-24">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: STAFF CONTAINER (HOME) */}
            {step === 'container' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold tracking-tighter">STAFF <span className="text-[#FF6B00]">CONTAINER</span></h1>
                  <p className="text-white/40 text-sm italic">Motor operacional de distribuição inteligente.</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => setStep('category')}
                    className="group bg-[#121212] border border-white/10 p-6 rounded-none flex justify-between items-center hover:border-[#FF6B00] transition-all"
                  >
                    <div className="text-left">
                      <span className="text-[10px] text-[#FF6B00] font-mono block mb-1">EXECUTION ENGINE</span>
                      <span className="text-xl font-bold uppercase">Staff Matching</span>
                    </div>
                    <ChevronRight className="text-white/20 group-hover:text-[#FF6B00]" />
                  </button>
                  <button 
                     onClick={() => setStep('hubs')}
                     className="group bg-[#121212] border border-white/10 p-6 rounded-none flex justify-between items-center hover:border-[#FF6B00] transition-all"
                  >
                    <div className="text-left">
                      <span className="text-[10px] text-white/40 font-mono block mb-1">TERRITORIAL DENSITY</span>
                      <span className="text-xl font-bold uppercase">Hubs Operacionais</span>
                    </div>
                    <MapPin className="text-white/20 group-hover:text-[#FF6B00]" />
                  </button>
                </div>
              </motion.div>
            )}
            {/* STEP 2: MACRO CATEGORIES */}
            {step === 'category' && (
              <motion.div initial={{ x: 20 }} animate={{ x: 0 }} className="space-y-4">
                <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest">Selecione o Pilar</h2>
                {MACRO_[CATEGORIES.map](http://CATEGORIES.map)(cat => (
                  <button 
                    key={[cat.id](http://cat.id)}
                    onClick={() => { setSelectedCategory(cat); setStep('methods'); }}
                    className="w-full bg-[#1A1A1A] border-l-4 border-white/10 p-5 text-left hover:border-[#FF6B00] flex justify-between items-center group"
                  >
                    <div>
                      <h3 className="text-2xl font-bold italic tracking-tighter">{[cat.name](http://cat.name)}</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">{cat.methods.length} Métodos Habilitados</p>
                    </div>
                    <Activity size={18} className="text-white/10 group-hover:text-[#FF6B00]" />
                  </button>
                ))}
              </motion.div>
            )}
            {/* STEP 3: METHOD SELECTION + SEARCH */}
            {step === 'methods' && (
              <motion.div className="space-y-4">
                 <div className="flex items-center gap-2 mb-6">
                  <Search size={16} className="text-[#FF6B00]" />
                  <input 
                    type="text" 
                    placeholder="BUSCAR MÉTODO OU PRO..." 
                    className="bg-transparent border-b border-white/10 w-full py-2 text-xs font-mono focus:outline-none focus:border-[#FF6B00]"
                    onChange={(e) => setSearchTerm([e.target](http://e.target).value)}
                  />
                </div>
                <h2 className="text-xl font-bold uppercase italic">{selectedCategory?.name} <span className="text-white/20">/ METHODS</span></h2>
                
                <div className="grid grid-cols-1 gap-2">
                  {selectedCategory?.[methods.map](http://methods.map)(method => (
                    <button 
                      key={method}
                      onClick={() => setStep('matching')}
                      className="p-4 bg-[#121212] border border-white/5 hover:border-[#FF6B00] text-left text-sm font-medium uppercase tracking-tight"
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            {/* STEP 4: STAFF MATCHING ENGINE */}
            {step === 'matching' && (
              <motion.div className="space-y-6">
                <div className="text-center py-12">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-16 h-16 border-2 border-[#FF6B00] border-t-transparent rounded-full mx-auto mb-6"
                  />
                  <h2 className="text-2xl font-bold tracking-tighter uppercase italic italic">Matching Engine</h2>
                  <p className="text-white/40 text-[10px] font-mono mt-2 uppercase">Analisando Disponibilidade + Território + Créditos</p>
                </div>
                <div className="space-y-3">
                  {[filteredProfessionals.map](http://filteredProfessionals.map)(pro => (
                    <div key={[pro.id](http://pro.id)} className="bg-[#121212] border border-white/10 p-4 rounded-none relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                              <span className="font-bold text-lg uppercase tracking-tighter">{[pro.name](http://pro.name)}</span>
                              <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded text-white/60">{pro.role}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Star size={10} className="fill-[#FF6B00] text-[#FF6B00]" />
                            <span className="text-[10px] font-mono">{pro.rating}</span>
                          </div>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] text-white/40 block">RETENÇÃO</span>
                           <span className="text-xs font-mono text-[#10B981]">{pro.retention}</span>
                        </div>
                      </div>
                      <button 
                         onClick={() => setStep('booking')}
                         className="w-full bg-[#FF6B00] text-black font-bold py-3 text-xs uppercase tracking-widest hover:bg-white transition-colors"
                      >
                          Agendar Atendimento
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {/* STEP 5: BOOKING + CALENDAR + CREDIT CONSUMPTION */}
            {step === 'booking' && (
              <motion.div className="space-y-6">
                   <div className="bg-[#1A1A1A] p-4 border-l-2 border-[#FF6B00]">
                      <h3 className="font-bold text-lg uppercase italic">Confirmar Agenda</h3>
                      <p className="text-[10px] text-white/40 font-mono uppercase">Reserva Operacional via FitPro</p>
                   </div>
                   <div className="grid grid-cols-7 gap-2 text-center">
                      {['D','S','T','Q','Q','S','S'].map((d, i) => (
                          <div key={i} className="text-[10px] text-white/20 font-mono">{d}</div>
                      ))}
                      {[...Array(14)].map((_, i) => (
                          <button key={i} className=`p-2 text-xs font-mono border border-white/5 ${i === 4 ? 'bg-[#FF6B00] text-black' : 'hover:border-white/40'}`}>
                              {10 + i}
                          </button>
                      ))}
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs p-3 bg-white/5">
                          <span className="text-white/40 uppercase">Créditos Disponíveis</span>
                          <span className="font-mono">12 unidades</span>
                      </div>
                      <div className="flex justify-between items-center text-xs p-3 bg-white/5 border border-[#FF6B00]/30">
                          <span className="text-white/40 uppercase">Custo da Sessão</span>
                          <span className="font-mono text-[#FF6B00]">- 1.0 unidade</span>
                      </div>
                   </div>
                   <button 
                      onClick={() => setStep('success')}
                      className="w-full bg-white text-black font-black py-5 uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,107,0,0.2)]"
                   >
                      SOLICITAR AGENDAMENTO <ChevronRight size={16}/>
                   </button>
              </motion.div>
            )}
            {/* STEP 6: SUCCESS (ONBOARDING FLOW) */}
            {step === 'success' && (
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-20">
                  <div className="w-20 h-20 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 size={40} text-black />
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-4">Solicitado!</h2>
                  <div className="space-y-2 text-xs font-mono text-white/40 uppercase tracking-widest max-w-[200px] mx-auto leading-loose">
                      <p>1. Staff Notificado</p>
                      <p>2. Validação FitPro</p>
                      <p className="text-[#FF6B00]">3. Crédito Reservado</p>
                  </div>
                  <button 
                    onClick={() => setStep('container')}
                    className="mt-12 text-[10px] border border-white/20 px-8 py-3 uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                  >
                      Voltar ao Dashboard
                  </button>
               </motion.div>
            )}
          </AnimatePresence>
        </main>
        {/* Footer Status */}
        <footer className="fixed bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-black/90 backdrop-blur-xl flex justify-between items-center">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" />
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-tighter">System: Elisa.OS Active</span>
           </div>
           <div className="text-[9px] font-mono text-white/20 uppercase">
              9FIT © 2024 BASE44
           </div>
        </footer>
      </div>
    );
  }
  &nbsp;
  &nbsp;

### 2.3 Card de ID Pessoal (acesso via Configurações)

Modal/página `/9fit/id` com 7 ícones:

1. Biblioteca de Conteúdo
2. Planejamento (periodização ativa)
3. Progresso Geral → `https://nineprogresstracker.lovable.app`
4. Dieta → `https://9nutrition.base44.app`
5. Staff
6. 9Pay (transações)
7. Suporte

### 2.4 Hub da Nine — fluxo inteligente (visualização do aluno)

Página `/9fit/hub-nine` com diagrama vivo:

```
Smart Periodizer → Smart Treino → FitCopilot → Avaliações → 9flix/9store
     ↑__________________________________________|
```

Cada nó é um card clicável que abre o app correspondente via iframe ou link autenticado.

### 2.5 Design Premium (depth, motion, glow)

**index.css — novos tokens:**

```css
--glass-bg: rgba(20,20,20,.7);
--glass-border: rgba(255,255,255,.06);
--glow-orange: 0 0 24px hsl(20 100% 50% / .35);
--glow-cyan: 0 0 24px hsl(190 100% 55% / .3);
--glow-gold: 0 0 24px hsl(45 100% 55% / .35);
--glow-red: 0 0 24px hsl(0 100% 55% / .35);
--blur-card: blur(20px);
```

**Utility classes:**

- `.glass-card` → bg + backdrop-filter + border sutil + inner shadow
- `.glow-context-{train|premium|ai|mission}` → box-shadow contextual
- `.hover-magnetic` → translate suave em hover
- `.bento-grid` → grid assimétrico (1 grande + 2 médios + 1 mini)

**Framer Motion (já instalado):**

- Page transitions: fade + blur + slide (wrap em `<AnimatePresence>` no `App.tsx` rotas `/9fit/*`)
- Cards: spring on mount, hover scale 1.02
- Bottom nav: floating + blur + glow no item ativo
- Streak badge: partículas suaves quando ≥7 dias

**HUD Intelligence contextual** (já temos `getCurrentContext`):

- Manhã: tons frios, motion lento
- Pré-treino: glow laranja, CTA pulse
- Pós-treino: blur forte, cores suaves
- Noite: UI desaturada

**Bottom Nav redesenhada:**

- Floating (margin-bottom 12px, rounded-full)
- `bg-glass-card` + backdrop-blur
- Item ativo com `glow-orange` e ícone scale 1.1
- 4 itens (OS/TRAIN/HUB/STAFF)

### 2.6 Iframes/links "como parte do app"

Componente `<EcosystemFrame url title />`:

- Header 9FIT padrão por cima
- Loading skeleton com glow
- Iframe com `?access_token={jwt}&user_id={id}` (mesmo padrão do SovereignBootstrap)
- Sem barra de URL, transição cinematográfica entre app interno ↔ iframe

Aplicar em: HealthFlix, Community, Progress Tracker, Smart Periodizer, Postura Pro, 9Nutrition, SmartTreino, NineFit (premium), FitCopilot, 9Store, Ron AI.

---

## ENTREGA 3 — Biblioteca 9FIT (sincronização + atribuição completa)

### 3.1 Sincronização total

Atualizar `supabase/functions/sync-exercise-library/` (proxy local) para consumir:

- `https://bibliteoca9fit.lovable.app/api/library.json` (catálogo completo: 661 itens)
- Persistir em tabela `library_items` (nova) com type/slug/category/payload JSONB

**Migração necessária:**

```sql
create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  type text not null, -- exercise|infoproduto|ebook|protocolo|sistema|app|video|program_week|program_day
  slug text,
  name text not null,
  category text, subcategory text,
  payload jsonb not null default '{}',
  synced_at timestamptz default now(),
  unique(type, external_id)
);

create table public.student_library_assignments (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references athletes(id) on delete cascade,
  content_type text not null,
  content_ref text not null,
  content_title text,
  access_url text, player_url text, download_url text,
  assigned_by uuid, assigned_at timestamptz default now(),
  notes text,
  unique(athlete_id, content_type, content_ref)
);
```

RLS: aluno vê próprias assignments; trainer vê de seus athletes.

### 3.2 UI Professor — `ExercisesPage.tsx` evoluída

- Tabs: **Exercícios · Infoprodutos · Protocolos · Ebooks · Sistemas · Apps · Programas**
- Filtros: categoria/subcategoria/busca livre
- Cada card: thumbnail, nome, badge tipo, botão **"Atribuir a aluno"**
- Modal de atribuição: select aluno + observações + confirma → POST `/student-assignments` (com `x-partner-key`) + insert local em `student_library_assignments`

### 3.3 UI Aluno — Biblioteca recebida

- Nova rota `/9fit/biblioteca` (acesso pelo Card de ID)
- Lista enriquecida (GET `?enrich=1`)
- Cada item abre via `accessUrl` (infoproduto/protocolo/ebook), `playerUrl` (exercise/program_day) ou `downloadUrl` (sistema/app)
- Render dentro do `<EcosystemFrame>` para feeling unificado

### 3.4 Secret necessário

`PARTNER_API_KEY_9FIT` = `798e94d1217ff26748af57576f61d404fc22b7345a1a008e` (sandbox) — usado nas edge functions de atribuição.

---

## Pré-requisito Hub Supremo (já alinhado)

Tabelas `profiles`, `assets`, `asset_assignments`, `intelligence_hub` já existem no Supabase Central. `intelligence-hub-sync` edge function já mirra eventos. Nada a refazer.

---

## Ordem de execução

```text
1. Entrega 1 (tipografia)         → ~5 arquivos, sem migração
2. Entrega 3 (biblioteca)         → migração + 2 edge functions + 2 telas
3. Entrega 2 (nav + hub + design) → tokens, layout, motion, EcosystemFrame                      4. item extra colado sobre a staff
```

&nbsp;

## Riscos & mitigação

- **Iframes com SSO:** se app externo não aceitar token via query, fallback para botão "Abrir externo" (sem quebrar UX)
- **Bottom nav 4 tabs:** rotas antigas (`/9fit/social`, `/9fit/stats`) viram redirects para `/9fit/community` e `/9fit/id` — usuários ativos não perdem links
- **Library sync:** primeira sync pode demorar; usar paginação e cache em `library_items`
- **Motion pesado:** `prefers-reduced-motion` respeitado em todas as animações

## Fora de escopo

- Reescrever sidebar do professor
- Implementar 9Pay real (placeholder no card de ID)
- Chaves API reais dos apps externos (placeholder + fallback iframe)

Confirma a ordem 1→3→2 e aprovo para executar?