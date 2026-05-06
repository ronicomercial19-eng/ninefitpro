# Plano: Satélite 9FIT — SSO Soberano Híbrido + Intelligence Hub + UI 9FIT

## Princípio diretor (pragmático)

O usuário pediu duas coisas que parecem conflitar: "remover login local" **e** "não quebrar nada / manter usuários ativos / modo híbrido". Resolvo com **modo dual**:

- **Modo Soberano** (novo): se a URL trouxer `?access_token=...&refresh_token=...&user_id=...`, o app consome o token, estabelece sessão Supabase, limpa a URL e segue sem tela de login. Sem sessão válida → redireciona para `https://ninelogin.lovable.app`.
- **Modo Legado** (preservado): se o usuário acessar diretamente o domínio publicado/preview e **já tiver sessão Supabase válida** no `localStorage` do projeto atual, continua usando tudo como hoje (login email/senha em `/auth`, fluxos `/9fit/*` e `/app/*` intactos).

Nada do schema atual é removido. Nenhum usuário é deslogado. As tabelas `athletes`, `profiles`, `user_roles`, RLS via `auth.uid()` continuam idênticas.

---

## 1) Bootstrap Soberano + proteção de perímetro

**Novo arquivo:** `src/middleware/SovereignBootstrap.tsx`

Componente montado dentro do `AuthProvider` (em `src/App.tsx`, antes das `Routes`). Responsabilidades:

1. Ao montar, ler `URLSearchParams`:
  - Se houver `access_token` e `refresh_token` → chamar `supabase.auth.setSession({ access_token, refresh_token })`. Salvar `access_token` em `localStorage["ninefit_token"]` e `user_id` (se vier) em `localStorage["ninefit_user_id"]`. Limpar a query string com `window.history.replaceState({}, '', window.location.pathname)`. Mostrar overlay "Validando acesso ao Ecossistema 9FIT..." até `setSession` resolver.
2. Se **não** houver token na URL:
  - Aguardar `supabase.auth.getSession()`. Se houver sessão válida → seguir normalmente (modo legado preservado).
  - Se **não** houver sessão E a rota atual não for pública (`/auth`, `/login`, `/register`, `/forgot-password`, `/9fit/login`, `/sales`, `/suporte`, `/whatsapp-redirect`, `/assessment`, `/`) → redirecionar para `https://ninelogin.lovable.app?return_to=<url-atual>`.
  - **Anti-loop:** antes de redirecionar, verificar `supabase.auth.getSession()` novamente; se já há sessão, abortar redirect. Também armazenar `sessionStorage["ninefit_redirect_attempted"]` com timestamp; se tentativa < 5s atrás, abortar.
3. Estado de transição: enquanto `bootstrapping=true`, renderizar tela minimalista (fundo `#0A0A0A`, fonte Syne 800, cor `#E8571A`, texto "Validando acesso ao Ecossistema 9FIT..." + spinner laranja).

**Logout (em `AuthContext.logout`):** após `supabase.auth.signOut()`, remover `ninefit_token` / `ninefit_user_id` do `localStorage` e redirecionar para `https://ninelogin.lovable.app`. Manter compatível com fluxo atual via flag opcional `{ stayLocal?: boolean }` para não quebrar logouts internos que já existem.

**Login local NÃO é removido fisicamente** (o user pediu para não quebrar nada). Em vez disso:

- A página `/auth` ganha um banner sutil no topo: "Você foi redirecionado? Acesse via [Portal 9FIT](https://ninelogin.lovable.app)".
- Login email/senha continua funcional para usuários legados.

## 2) Sincronização com Banco Supra (Intelligence Hub)

**Novo edge function:** `supabase/functions/intelligence-hub-sync/index.ts`

- Recebe `{ event_type, aluno_email, aluno_id, payload }` do frontend.
- Valida JWT do caller via `auth.getClaims(token)` (padrão do projeto).
- Faz `POST` para `${SUPRA_HUB_URL}/rest/v1/intelligence_hub` com headers:
  - `apikey: SUPRA_HUB_SERVICE_KEY`
  - `Authorization: Bearer SUPRA_HUB_SERVICE_KEY`
  - `Content-Type: application/json`
- Body:
  ```json
  {
    "source_system": "9fit-pro",
    "event_type": "...",
    "aluno_email": "...",
    "aluno_id": "...",
    "payload": { ... },
    "occurred_at": "ISO-8601"
  }
  ```
- CORS conforme padrão do projeto. `verify_jwt = false` (validação manual).
- Secrets `SUPRA_HUB_URL` e `SUPRA_HUB_SERVICE_KEY` já estão configurados.

**Novo helper:** `src/services/intelligenceHub.service.ts`

- Função `mirrorEvent(event_type: string, payload: object, aluno_id?: string, aluno_email?: string)`.
- Chama `supabase.functions.invoke('intelligence-hub-sync', { body })`.
- **Fire-and-forget** com try/catch silencioso — falha no Hub **nunca** quebra a UX local.

**Pontos de instrumentação inicial** (sem invasividade):

- `AuthContext.login` sucesso → `mirrorEvent('login', { mode: 'legacy' })`.
- `SovereignBootstrap` sucesso → `mirrorEvent('login', { mode: 'sovereign' })`.
- Workout completion (`WorkoutExecution.tsx` ao finalizar) → `mirrorEvent('workout_completed', { duration, volume })`.
- Atribuição de treino (`CreateWorkoutForm` submit) → `mirrorEvent('workout_assigned', { athlete_id, training_type })`.
- Atribuição de periodização (`PeriodizationAssignDialog`) → `mirrorEvent('periodization_assigned', { ... })`.
- Upload de avaliação (`StudentAssessmentsUpload`) → `mirrorEvent('assessment_uploaded', { ... })`.

Cobertura adicional pode ser feita iterativamente; o helper é central.

## 3) Padronização UI 9FIT (Syne 800 / DM Mono / #E8571A)

`**index.html`:** adicionar `<link>` para Google Fonts:

- `Syne:wght@800`
- `DM+Mono:wght@400;500`

`**tailwind.config.ts`:** adicionar

```ts
fontFamily: {
  display: ['Syne', 'sans-serif'],
  mono: ['"DM Mono"', 'monospace'],
}
```

`**src/index.css`:** sob `@layer base` adicionar tokens CSS (NÃO sobrescrevendo o tema `9fit` existente, apenas adicionando):

```css
:root {
  --ninefit-orange: 18 86% 51%;     /* #E8571A em HSL aproximado */
  --ninefit-black: 0 0% 4%;         /* #0A0A0A */
}
.font-display { font-family: 'Syne', sans-serif; font-weight: 800; }
.font-data    { font-family: 'DM Mono', monospace; }
```

Aplicar `font-display` em `<h1>/<h2>` dos headers principais (`AppLayout`, `NineFitLayout`, `Hub`, `Train`) e `font-data` em métricas/números (XP, peso, reps, BPM em `HUDBar`, `WeeklyProgressChart`, `Stats`).

**Cabeçalho do profissional:** `AppLayout` header passa a exibir `9FIT · 9FIT PRO` (logo + tipografia Syne 800). Cards com pendências (alunos pendentes, alertas de risco) ganham borda esquerda `border-l-4` na cor `#E8571A` quando `priority='high'`.

**Visão do Aluno:** rodar varredura textual leve em `src/pages/9fit/*` e `src/components/9fit/*` para padronizar "Atleta" → "Aluno" onde aparecer voltado ao usuário final (preserva variáveis e tipos `athlete_id` etc., só strings de UI).

## 4) Estado/UX e ajustes finais

- `App.tsx` envolve as `Routes` com `<SovereignBootstrap>` que controla a tela de "Validando acesso..." e libera children quando `bootstrapping=false`.
- `PrivateRoute` continua igual (delega ao `AuthContext`). Como o bootstrap roda antes, qualquer rota privada já encontrará a sessão pronta.
- Sem migrations de schema. Nenhuma tabela alterada. RLS atual mantida.

---

## Detalhes técnicos

### Arquivos novos


| Arquivo                                             | Função                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/middleware/SovereignBootstrap.tsx`             | Captura `access_token`/`refresh_token` da URL, `setSession`, limpa URL, redireciona para portal se necessário, anti-loop. |
| `src/services/intelligenceHub.service.ts`           | Helper `mirrorEvent()` fire-and-forget.                                                                                   |
| `supabase/functions/intelligence-hub-sync/index.ts` | Edge function que envia payload ao `SUPRA_HUB_URL`.                                                                       |


### Arquivos modificados


| Arquivo                                                                                                                              | Mudança                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `src/App.tsx`                                                                                                                        | Envolve `Routes` em `<SovereignBootstrap>`.                                                |
| `src/contexts/AuthContext.tsx`                                                                                                       | `logout()` limpa `ninefit_token` e dispara `mirrorEvent`. `login()` dispara `mirrorEvent`. |
| `src/pages/Auth.tsx`                                                                                                                 | Banner discreto apontando para portal central.                                             |
| `index.html`                                                                                                                         | `<link>` Google Fonts (Syne / DM Mono).                                                    |
| `tailwind.config.ts`                                                                                                                 | `fontFamily.display` e `fontFamily.mono`.                                                  |
| `src/index.css`                                                                                                                      | Tokens `--ninefit-orange`, `--ninefit-black`, classes utilitárias.                         |
| `src/components/layout/AppLayout.tsx`                                                                                                | Header `9FIT · 9FIT PRO`, fonte display.                                                   |
| `src/components/9fit/NineFitLayout.tsx`                                                                                              | Tela de loading reformulada com tipografia/cor 9FIT.                                       |
| `src/components/9fit/HUDBar.tsx`, `WeeklyProgressChart.tsx`, `Stats.tsx`                                                             | `font-data` em números.                                                                    |
| `src/pages/9fit/*` (textos)                                                                                                          | "Atleta" → "Aluno" em strings voltadas ao usuário final.                                   |
| `src/components/9fit/WorkoutExecution.tsx`, `CreateWorkoutForm.tsx`, `PeriodizationAssignDialog.tsx`, `StudentAssessmentsUpload.tsx` | Chamadas a `mirrorEvent()` em pontos-chave.                                                |


### Anti-loop (regra crítica)

```text
boot:
  if URL has tokens:
    setSession → store → cleanURL → done
  else:
    session = await getSession()
    if session: done
    else if route is public: done
    else:
      last = sessionStorage["ninefit_redirect_attempted"]
      if last && now - last < 5000: done (não redireciona)
      else: store now → window.location.href = portal
```

### Compatibilidade

- Login email/senha em `/auth` permanece operacional para usuários legados.
- Sessões já existentes no `localStorage` do Supabase (`sb-...-auth-token`) **não** são tocadas.
- RLS via `auth.uid()` segue funcionando — `setSession` apenas hidrata a sessão local com o JWT do portal central, e como ambos os projetos compartilham o mesmo Supabase (ou JWKS compatível), as policies continuam validando.

### Riscos & mitigações

- **JWT do portal não compatível com este Supabase:** se `setSession` falhar, fazemos fallback para `/auth` legado (não loop para portal). Logamos warning.
- **Hub indisponível:** `mirrorEvent` é fire-and-forget; nunca bloqueia UI.
- **Fontes não carregarem:** fallback `sans-serif` / `monospace` no Tailwind.

### Fora de escopo (não faremos agora)

- Remover fisicamente o formulário de login (preservado para legado).
- Migrar dados para o Banco Supra (apenas espelhamento de eventos novos).
- Reescrever todas as telas com nova tipografia — aplicamos nos headers e métricas principais; o resto evolui iterativamente.

Aprovação: ao confirmar, executo na ordem 1 → 2 → 3 → 4 -> 4.5 secaçao extra ao final reforço do design : SEÇÃO 3 EXPANDIDA: PADRONIZAÇÃO UI/UX 9FIT COMPLETA

## Design System + Componentes + Aplicações Práticas

---

## RESUMO DO PLANO (Pré-existente)

```
Syne 800        → Títulos, cabeçalhos, display
DM Mono         → Números, métricas, dados técnicos
#E8571A (Laranja) → Primário, destaque, CTAs
#0A0A0A (Preto)  → Background
Cinza           → Textos secundários, cards

```

---

## 1. CONFIGURAÇÃO TÉCNICA (Detalhada)

### 1.1 Fonte Google Fonts — index.html

```html
<!-- Em <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

```

**Por quê:** Garante que fontes carregam antes do primeiro paint. `display=swap` previne "invisible text" durante carregamento.

---

### 1.2 Tailwind Config — tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ✅ CORES 9FIT
      colors: {
        ninefit: {
          black: '#0A0A0A',
          orange: '#E8571A',
          'orange-light': '#FF8534',
          'orange-dark': '#D64914',
          gray: {
            50: '#F5F5F5',
            100: '#E5E5E5',
            200: '#CCCCCC',
            300: '#AAAAAA',
            400: '#8A8A8A',
            500: '#6A6A6A',
            600: '#4A4A4A',
            700: '#3A3A3A',
            800: '#2A2A2A',
            900: '#1A1A1A',
          },
        },
      },
      
      // ✅ TIPOGRAFIA
      fontFamily: {
        // Display: Syne 800 para títulos
        display: ['Syne', ...defaultTheme.fontFamily.sans],
        // Mono: DM Mono para números/dados
        mono: ['DM Mono', ...defaultTheme.fontFamily.mono],
        // Sans: DM Sans para corpo
        sans: ['DM Sans', ...defaultTheme.fontFamily.sans],
      },
      
      // ✅ ESPAÇAMENTO (8px base)
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      
      // ✅ BORDER RADIUS
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      
      // ✅ SOMBRAS
      boxShadow: {
        sm: '0 2px 8px rgba(0, 0, 0, 0.1)',
        md: '0 4px 16px rgba(0, 0, 0, 0.2)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.3)',
        glow: '0 0 20px rgba(232, 87, 26, 0.3)',
      },
    },
  },
  plugins: [],
}

export default config

```

---

### 1.3 Tokens CSS — src/index.css

```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap');

@layer base {
  :root {
    /* ✅ CORES PRIMÁRIAS */
    --ninefit-black: #0A0A0A;
    --ninefit-orange: #E8571A;
    --ninefit-orange-light: #FF8534;
    --ninefit-orange-dark: #D64914;
    
    /* ✅ ESCALA DE CINZA */
    --ninefit-gray-50: #F5F5F5;
    --ninefit-gray-100: #E5E5E5;
    --ninefit-gray-200: #CCCCCC;
    --ninefit-gray-300: #AAAAAA;
    --ninefit-gray-400: #8A8A8A;
    --ninefit-gray-500: #6A6A6A;
    --ninefit-gray-600: #4A4A4A;
    --ninefit-gray-700: #3A3A3A;
    --ninefit-gray-800: #2A2A2A;
    --ninefit-gray-900: #1A1A1A;
    
    /* ✅ TIPOGRAFIA */
    --font-display: 'Syne', sans-serif;
    --font-mono: 'DM Mono', monospace;
    --font-sans: 'DM Sans', sans-serif;
  }
  
  /* ✅ CLASSES UTILITÁRIAS */
  .font-display {
    font-family: var(--font-display);
    font-weight: 800;
  }
  
  .font-display-semibold {
    font-family: var(--font-display);
    font-weight: 700;
  }
  
  .font-display-medium {
    font-family: var(--font-display);
    font-weight: 600;
  }
  
  .font-data {
    font-family: var(--font-mono);
    font-weight: 500;
  }
  
  .text-ninefit-primary {
    color: var(--ninefit-orange);
  }
  
  .bg-ninefit-dark {
    background-color: var(--ninefit-black);
  }
  
  /* ✅ BODY */
  body {
    @apply bg-ninefit-dark text-ninefit-gray-100 font-sans;
  }
  
  /* ✅ HEADLINES */
  h1 {
    @apply font-display text-5xl font-bold;
  }
  
  h2 {
    @apply font-display text-3xl font-bold;
  }
  
  h3 {
    @apply font-display text-2xl font-semibold;
  }
  
  h4 {
    @apply font-display text-xl font-semibold;
  }
  
  h5, h6 {
    @apply font-display font-semibold;
  }
  
  /* ✅ PARAGRAPHS */
  p {
    @apply text-base leading-relaxed;
  }
  
  small {
    @apply text-sm;
  }
}

@layer components {
  /* ✅ BOTÕES PADRÃO */
  .btn-primary {
    @apply px-6 py-3 bg-ninefit-orange text-white font-display font-bold rounded-lg hover:bg-ninefit-orange-dark transition-colors shadow-glow;
  }
  
  .btn-secondary {
    @apply px-6 py-3 bg-ninefit-gray-800 text-ninefit-gray-100 border border-ninefit-gray-700 font-display font-bold rounded-lg hover:bg-ninefit-gray-700 transition-colors;
  }
  
  .btn-ghost {
    @apply px-6 py-3 text-ninefit-orange border border-ninefit-orange font-display font-bold rounded-lg hover:bg-orange-50/10 transition-colors;
  }
  
  /* ✅ CARDS */
  .card {
    @apply bg-ninefit-gray-900 border border-ninefit-gray-800 rounded-lg p-6;
  }
  
  .card-hover {
    @apply card hover:border-ninefit-orange hover:shadow-glow transition-all;
  }
  
  /* ✅ INPUTS */
  .input {
    @apply w-full bg-ninefit-gray-800 border border-ninefit-gray-700 rounded-lg px-4 py-2 text-ninefit-gray-100 placeholder-ninefit-gray-500 focus:outline-none focus:border-ninefit-orange focus:ring-2 focus:ring-ninefit-orange/10 transition-colors;
  }
  
  /* ✅ BADGES */
  .badge {
    @apply inline-block px-3 py-1 text-xs font-bold rounded-full;
  }
  
  .badge-primary {
    @apply badge bg-ninefit-orange text-white;
  }
  
  .badge-secondary {
    @apply badge bg-ninefit-gray-800 text-ninefit-gray-100;
  }
  
  .badge-success {
    @apply badge bg-green-500/20 text-green-400;
  }
  
  .badge-warning {
    @apply badge bg-yellow-500/20 text-yellow-400;
  }
  
  /* ✅ DIVIDERS */
  .divider {
    @apply h-px bg-ninefit-gray-800;
  }
}

```

---

## 2. COMPONENTES BASE (Que precisam ser 9FIT)

### 2.1 AppLayout (Header Principal)

**Arquivo:** `src/components/layout/AppLayout.tsx`

```tsx
interface AppLayoutProps {
  title?: string;
  showHero?: boolean;
  children: React.ReactNode;
}

export function AppLayout({ title, showHero = false, children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-ninefit-dark">
      {/* ✅ HEADER 9FIT */}
      <header className="border-b border-ninefit-gray-800 sticky top-0 z-50 bg-ninefit-dark/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ninefit-orange rounded flex items-center justify-center">
              <span className="text-white font-display font-bold">9</span>
            </div>
            <h1 className="font-display text-xl font-bold text-ninefit-gray-100">
              9FIT · 9FIT PRO
            </h1>
          </div>
          
          {/* Right: User Menu, Settings */}
          <nav className="flex items-center gap-6">
            {/* ... navigation items ... */}
          </nav>
        </div>
      </header>

      {/* ✅ HERO SECTION (Opcional) */}
      {showHero && (
        <section className="bg-gradient-to-b from-ninefit-black to-ninefit-gray-900 py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display text-5xl font-bold mb-4">
              {title || "Bem-vindo"}
            </h2>
            <p className="text-ninefit-gray-300 max-w-2xl">
              Acesso central ao seu ecossistema de saúde integrado.
            </p>
          </div>
        </section>
      )}

      {/* ✅ MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  );
}

```

---

### 2.2 NineFitLayout (Para telas 9FIT específicas)

**Arquivo:** `src/components/layout/NineFitLayout.tsx`

```tsx
interface NineFitLayoutProps {
  title: string;
  subtitle?: string;
  tab?: 'home' | 'train' | 'social' | 'data' | 'profile';
  children: React.ReactNode;
}

export function NineFitLayout({
  title,
  subtitle,
  tab,
  children,
}: NineFitLayoutProps) {
  return (
    <div className="min-h-screen bg-ninefit-black flex flex-col">
      {/* ✅ HEADER COM TIPOGRAFIA 9FIT */}
      <header className="bg-ninefit-gray-900 border-b border-ninefit-gray-800 px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-6 h-6 bg-ninefit-orange rounded flex items-center justify-center text-white text-sm font-bold">
            9
          </div>
          <h1 className="font-display text-2xl font-bold text-ninefit-gray-100">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-ninefit-gray-400 text-sm ml-9">
            {subtitle}
          </p>
        )}
      </header>

      {/* ✅ TABS NAVIGATION (Para Home/Train/Social/Data/Profile) */}
      {tab && (
        <nav className="bg-ninefit-gray-900 border-b border-ninefit-gray-800 px-6">
          <div className="flex gap-8">
            {[
              { id: 'home', label: '🏠 HOME' },
              { id: 'train', label: '💪 TRAIN' },
              { id: 'social', label: '👥 SOCIAL' },
              { id: 'data', label: '📊 DATA' },
              { id: 'profile', label: '👤 ID' },
            ].map(({ id, label }) => (
              <button
                key={id}
                className={`py-4 px-2 font-display font-semibold text-sm border-b-2 transition-colors ${
                  tab === id
                    ? 'border-ninefit-orange text-ninefit-orange'
                    : 'border-transparent text-ninefit-gray-400 hover:text-ninefit-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* ✅ MAIN CONTENT */}
      <main className="flex-1 px-6 py-8">
        {children}
      </main>

      {/* ✅ BOTTOM NAVIGATION (Mobile) */}
      <nav className="sticky bottom-0 border-t border-ninefit-gray-800 bg-ninefit-gray-900 px-4 py-2 md:hidden">
        <div className="flex justify-around">
          {[
            { id: 'home', icon: '🏠', label: 'Home' },
            { id: 'train', icon: '💪', label: 'Train' },
            { id: 'social', icon: '👥', label: 'Social' },
            { id: 'data', icon: '📊', label: 'Data' },
            { id: 'profile', icon: '👤', label: 'ID' },
          ].map(({ id, icon, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`flex flex-col items-center gap-1 py-2 px-3 text-xs font-bold transition-colors ${
                tab === id
                  ? 'text-ninefit-orange'
                  : 'text-ninefit-gray-400 hover:text-ninefit-gray-100'
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}

```

---

### 2.3 HUDBar (Métricas com DM Mono)

**Arquivo:** `src/components/ui/HUDBar.tsx`

```tsx
interface Metric {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  highlight?: boolean;
}

interface HUDBarProps {
  metrics: Metric[];
  compact?: boolean;
}

export function HUDBar({ metrics, compact = false }: HUDBarProps) {
  return (
    <div className={`bg-ninefit-gray-900 border border-ninefit-gray-800 rounded-lg ${
      compact ? 'p-3' : 'p-6'
    }`}>
      <div className={`grid grid-cols-${metrics.length < 4 ? metrics.length : 4} gap-4`}>
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className={`text-center p-3 rounded transition-colors ${
              metric.highlight
                ? 'bg-ninefit-orange/10 border border-ninefit-orange'
                : 'bg-ninefit-gray-800'
            }`}
          >
            {metric.icon && <span className="text-2xl mb-2">{metric.icon}</span>}
            <div className={`font-data text-2xl font-bold ${
              metric.highlight ? 'text-ninefit-orange' : 'text-ninefit-gray-100'
            }`}>
              {metric.value}
              {metric.unit && <span className="text-sm ml-1">{metric.unit}</span>}
            </div>
            <div className="text-xs text-ninefit-gray-400 mt-1">
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ✅ EXEMPLO DE USO:
/*
<HUDBar
  metrics={[
    { icon: '❤️', label: 'Frequência', value: 142, unit: 'bpm' },
    { icon: '🔥', label: 'Calorias', value: 450, unit: 'kcal' },
    { icon: '⚡', label: 'Intensidade', value: 90, unit: '%', highlight: true },
  ]}
/>
*/

```

---

### 2.4 Card com Estados Visuais

**Arquivo:** `src/components/ui/Card.tsx`

```tsx
interface CardProps {
  title: string;
  subtitle?: string;
  badge?: { label: string; color: 'primary' | 'secondary' | 'success' | 'warning' };
  children: React.ReactNode;
  action?: React.ReactNode;
  highlight?: boolean;
  onClick?: () => void;
}

export function Card({
  title,
  subtitle,
  badge,
  children,
  action,
  highlight = false,
  onClick,
}: CardProps) {
  return (
    <div
      className={`card-hover transition-all cursor-pointer ${
        highlight
          ? 'border-ninefit-orange shadow-glow'
          : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-display font-semibold text-lg text-ninefit-gray-100">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-ninefit-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {badge && (
          <span className={`badge badge-${badge.color} ml-2`}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="text-ninefit-gray-300 mb-4">
        {children}
      </div>

      {/* Action */}
      {action && (
        <div className="border-t border-ninefit-gray-800 pt-4 mt-4">
          {action}
        </div>
      )}
    </div>
  );
}

```

---

## 3. APLICAÇÕES PRÁTICAS (Onde aplicar 9FIT)

### 3.1 AppLayout Header — Profissional

**Onde:** `src/components/layout/AppLayout.tsx` (já acima)

```tsx
<header className="border-b border-ninefit-gray-800 sticky top-0 z-50">
  <div className="max-w-7xl mx-auto px-6 py-4">
    <h1 className="font-display text-xl font-bold">9FIT · 9FIT PRO</h1>
  </div>
</header>

```

---

### 3.2 HUDBar — Métricas em Números

**Onde:**

- `src/pages/9fit/Home.tsx` (stats do dashboard)
- `src/components/9fit/HUDBar.tsx` (reutilizável)
- `src/components/9fit/WeeklyProgressChart.tsx` (valores numéricos)

```tsx
<HUDBar
  metrics={[
    { icon: '🏋️', label: 'Treinos', value: 4, highlight: true },
    { icon: '🔥', label: 'Calorias', value: 2450, unit: 'kcal' },
    { icon: '⭐', label: 'XP', value: 1240, unit: 'pts', highlight: true },
  ]}
/>

```

---

### 3.3 Headlines — Font Display (Syne 800)

**Onde:** Todos os h1, h2, h3 principais

```tsx
// ❌ ANTES
<h1 className="text-3xl font-bold">Seu Treino de Hoje</h1>

// ✅ DEPOIS
<h1 className="font-display text-3xl font-bold">Seu Treino de Hoje</h1>

```

---

### 3.4 Números/Dados — Font Mono (DM Mono)

**Onde:**

- Weights (kg)
- Reps
- Heart rate (bpm)
- Calories (kcal)
- Tempos
- Percentuais

```tsx
// ❌ ANTES
<span className="text-2xl font-bold">{weight} kg</span>

// ✅ DEPOIS
<span className="font-data text-2xl font-bold">{weight} kg</span>

```

---

### 3.5 Laranja (#E8571A) — Destaque & CTAs

**Onde:**

- Botões primários
- Badges importantes
- Barras de progresso ativo
- Bordas de cards em alta prioridade
- Links de ação

```tsx
// ❌ ANTES
<button className="bg-blue-500">Iniciar Treino</button>

// ✅ DEPOIS
<button className="btn-primary">Iniciar Treino</button>

```

---

### 3.6 Refactoring de Textos: "Atleta" → "Aluno"

**Onde:** Qualquer página voltada ao usuário final (não admin)

```typescript
// ❌ ANTES
"Qual é seu objetivo como atleta?"

// ✅ DEPOIS
"Qual é seu objetivo como aluno?"

// ✅ Mantém interno:
athlete_id, athlete_data, type Athlete (não muda)

```

**Checklist de refactoring:**

- [ ] Home page: "Bem-vindo, {aluno}"
- [ ] Profile: "Seu progresso como aluno"
- [ ] Train: "Próximo treino do aluno"
- [ ] Data: "Histórico do aluno"
- [ ] Social: "Outros alunos"

---

## 4. DARK MODE PALETTE (Completa)

**Background:**

- Primário: `#0A0A0A` (ninefit-black)
- Secundário: `#1A1A1A` (ninefit-gray-900)
- Terciário: `#2A2A2A` (ninefit-gray-800)

**Text:**

- Primário: `#E5E5E5` (ninefit-gray-100) em backgrounds escuros
- Secundário: `#AAAAAA` (ninefit-gray-300) para hints
- Terciário: `#6A6A6A` (ninefit-gray-500) para disabled/muted

**Accents:**

- Primário: `#E8571A` (laranja)
- Hover: `#D64914` (laranja-escuro)
- Light: `#FF8534` (laranja-claro)

**Status:**

- Success: `#00FF88` (verde)
- Warning: `#FFB800` (amarelo)
- Error: `#FF3B30` (vermelho)
- Info: `#00C2FF` (azul)

---

## 5. SPACING & SIZING SYSTEM

```css
/* 8px base unit */
--space-xs: 4px;    /* inputs pequeninhos */
--space-sm: 8px;    /* padding padrão */
--space-md: 16px;   /* gaps entre cards */
--space-lg: 24px;   /* gaps principais */
--space-xl: 32px;   /* seção spacing */
--space-2xl: 48px;  /* hero sections */
--space-3xl: 64px;  /* página margins */

/* Radius */
--radius-sm: 8px;   /* inputs, small buttons */
--radius-md: 12px;  /* cards */
--radius-lg: 16px;  /* larger cards */
--radius-xl: 24px;  /* modals */
--radius-full: 9999px; /* badges, avatars */

```

---

## 6. COMPONENTES CRÍTICOS (Que precisam de 9FIT)


| Componente       | Arquivo                    | Mudança                      | Prioridade |
| ---------------- | -------------------------- | ---------------------------- | ---------- |
| AppLayout Header | `layout/AppLayout.tsx`     | Font display, Logo 9FIT      | 🔴 P0      |
| HUDBar (Metrics) | `ui/HUDBar.tsx`            | Font mono para números       | 🔴 P0      |
| Card Principal   | `ui/Card.tsx`              | Border-left orange highlight | 🟡 P1      |
| Button Primary   | `ui/Button.tsx`            | Orange #E8571A               | 🔴 P0      |
| NineFitLayout    | `layout/NineFitLayout.tsx` | Tabs, Font display           | 🟡 P1      |
| Headlines        | All `h1/h2/h3`             | Font display 800             | 🟡 P1      |
| Badges           | `ui/Badge.tsx`             | Colors, Font semibold        | 🟡 P1      |


---

## 7. CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Setup (1 hora)

- [ ] Adicionar Google Fonts link em `index.html`
- [ ] Atualizar `tailwind.config.ts` com fontFamily
- [ ] Atualizar `src/index.css` com tokens

### Fase 2: Componentes Base (2 horas)

- [ ] Refatorar `AppLayout.tsx` com header 9FIT
- [ ] Criar `HUDBar.tsx` com font-data
- [ ] Refatorar `Card.tsx` com border-orange
- [ ] Refatorar `Button.tsx` com orange primário

### Fase 3: Aplicações (3 horas)

- [ ] Aplicar font-display em todos h1/h2/h3
- [ ] Aplicar font-data em números (weights, reps, HR, cals, %)
- [ ] Aplicar orange em botões CTAs e highlights
- [ ] Refactor "Atleta" → "Aluno" em strings de UI

### Fase 4: Testes (1 hora)

- [ ] Verificar que fontes carregam em dev/preview/production
- [ ] Verificar contraste de cores (WCAG AA mínimo)
- [ ] Verificar responsividade mobile (HUDBar, NineFitLayout)
- [ ] Verificar que fallbacks funcionam se fontes falham

---

## 8. FALLBACKS & ROBUSTEZ

**Se Syne 800 não carregar:**

```css
font-display {
  font-family: 'Syne', 'Helvetica', sans-serif;
  /* fallback automático para sans */
}

```

**Se DM Mono não carregar:**

```css
font-data {
  font-family: 'DM Mono', 'Courier New', monospace;
  /* fallback automático para mono */
}

```

**Se #E8571A não renderizar:**

```css
/* Ainda temos hover, focus estados via Tailwind */
btn-primary:hover {
  @apply bg-ninefit-orange-dark;
}

```

---

**Pronto pra colocar no Lovable junto com o resto?** 🚀  
me reporte pendências, se houver.