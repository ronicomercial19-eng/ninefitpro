# 🔍 PONTOS EM ABERTO - AUDITORIA DETALHADA

## 1️⃣ ECOSYSTEM GRID & NATIVE SYSTEM

### ✅ EcosystemGrid.tsx - STATUS OPERACIONAL

**O que está correto:**
- Lê `physio_modules` (status='active') + `api_connectors` (status check)
- Mostra pulse animado (verde online, âmbar waiting)
- Filtra por `category` se fornecido
- Expand/collapse para >2 itens
- Navega para `/9fit/embed?url=...` para URLs externas
- Fallback route para módulos internos
- Images do `MODULE_IMAGES` (asset mapping)

**Gaps encontrados:**

### 🔴 GAP-1: MODULE_IMAGES não existe
**Arquivo referenciado:** `src/assets/modules.ts` (linha 88)
```tsx
const src = MODULE_IMAGES[m.key] || m.hero_image;
```

**Problema:**
- `MODULE_IMAGES` é importado mas arquivo não existe
- Build falha em import: `Cannot find module '@/assets/modules'`
- Fallback a `m.hero_image` funciona, mas MAP fica vazio

**Solução necessária:**
Criar `src/assets/modules.ts`:
```ts
export const MODULE_IMAGES: Record<string, string> = {
  "fitness-core": "https://...",
  "bio-hacking": "https://...",
  // ... mapeamento de keys → URLs de imagens
};
```

### 🔴 GAP-2: STATUS Logic Incorreta (Linha 48)
```tsx
map[m.key] = !/^https?:\/\//i.test(m.cta_route || "") || c?.status === "active" ? "online" : "waiting";
```

**Lógica confusa:**
- Se `cta_route` é URL externa E connector não ativo → "online"? (inverted logic)
- Deveria ser: `c?.status === "active" ? "online" : "waiting"`

**Impacto:** Módulos mostram status incorreto

### 🟡 GAP-3: Error Handling em Supabase Query
```tsx
.then(async ({ data }) => {
```
Sem `.catch()` — se query falha, `items` fica vazio silenciosamente.

**Solução:** Adicionar tratamento de erro:
```tsx
.then(async ({ data, error }) => {
  if (error) { console.error("[EcosystemGrid]", error); return; }
  // ...
})
```

---

## 2️⃣ NATIVE SYSTEM

### ✅ O que está OK:
- Fallback WhatsApp quando sem URL
- Header com back + external link
- Iframe com permissões configuráveis
- Parametrizado via `?app=<key>`

### 🔴 GAP-4: ecosystemApps.ts Hardcoded
**Arquivo:** `src/data/ecosystemApps.ts`

Todas as URLs são estáticas (não lidas do banco):
```ts
EMBEDDED_APPS: {
  store: { url: "https://fitnessplace.lovable.app", ... },
  staff: { url: "https://stevent.lovable.app/fitpro-staff", ... },
  // ... etc
}
```

**Problema:**
- Se URL muda no banco, app fica desatualizado
- Não sincroniza com `api_connectors.iframe_url`
- Novo app requer redeploy

**Solução:** Ler de `api_connectors`:
```ts
useEffect(() => {
  const { data: conn } = await supabase
    .from("api_connectors")
    .select("iframe_url")
    .eq("key", appKey)
    .single();
  setAppUrl(conn?.iframe_url || fallback.url);
}, [appKey]);
```

### 🟡 GAP-5: NativeSystem.tsx sem Error Boundary
Se iframe falha a carregar, nenhum feedback ao usuário.

---

## 3️⃣ HUB SEQUENTIAL CAROUSEL

### ✅ Status:
- 7 módulos mapeados (stats, habit, tribos, intell, play, elite, habits)
- Auto-play 4s, manual skip
- Dot progress bar
- Rotas corretas (exceto alguns typos)

### 🟡 GAP-6: Hardcoded Routes sem Validação
```tsx
const MODULES: ModuleDef[] = [
  { id: "stats",  label: "Performance",    route: "/9fit/stats",         ... },
  { id: "habit",  label: "Daily Protocol", route: "/9fit/os",            ... },
  { id: "tribos", label: "Comunidade",     route: "/9fit/community",     ... },
  { id: "intell", label: "SmartTreino",    route: "/9fit/train",         ... },
  { id: "play",   label: "HealthFlix",     route: "/9fit/healthflix",    ... },
  { id: "elite",  label: "Bio-Hacking",    route: "/9fit/elite-bio",     ... },
  { id: "habits", label: "Habit Flow",     route: "/9fit/habit-flow",    ... },
];
```

**Possíveis problemas:**
- `/9fit/os` ← rota existe?
- `/9fit/stats` ← rota existe?
- Se alguém renomear rota, carousel quebra
- Sem fallback se rota 404

**Solução:** Validar rotas em App.tsx ou usar suporte dinâmico.

---

## 4️⃣ UPSELL BANNER

### 🔴 GAP-7: Logic Invertida (Linha 56)
```tsx
if (!visible) return <ContextualPaywall ... />;  // ← ERRADO!
```

**Bug:** Se banner NÃO está visível, retorna... paywall? Deveria ser:
```tsx
if (!visible) return null; // Sem retornar paywall sempre
return (
  <>
    <AnimatePresence>
      <motion.button>...</motion.button>
    </AnimatePresence>
    <ContextualPaywall ... />  {/* Fora do condicional */}
  </>
);
```

---

## 5️⃣ DYNAMIC OFFERS & MONETIZATION

### 🔴 GAP-8: DynamicOffers Sem Fallback Visual
```tsx
if (!offers.length) return null;  // Silenciosamente vazio
```

Se `monetization_offers` não tem registros, seção desaparece do Hub sem avisar.

### 🔴 GAP-9: ContextualPaywall sem Validação de Ofertas
Se `monetization_offers` está vazio, paywall mostra... nada? Sem fallback.

---

## 6️⃣ AULAS-CREDITOS (Subscription Hub)

### 🟡 GAP-10: Rota Existe?
**Referências em:**
- Ron.tsx (linha 207): `navigate("/9fit/aulas-creditos")`
- Profile.tsx (linha 51): `route: "/9fit/primepass"` (alias)

**Verificar:** Existe `AulasCreditos.tsx`?

---

## 7️⃣ EMBED COMPONENT

### 🟡 GAP-11: Embed Dinâmico Sem Validação
**Usado por:** EcosystemGrid.tsx (linha 101)
```tsx
navigate(`/9fit/embed?url=${encodeURIComponent(target)}&title=${...}`);
```

**Possível vulnerabilidade:**
- URL não validada (pode ser maliciosa)
- Sem whitelist de origens permitidas

---

## 📋 CHECKLIST DE PONTOS ABERTOS

| # | Gap | Componente | Severidade | Ação |
|---|-----|-----------|-----------|------|
| 1 | MODULE_IMAGES não existe | EcosystemGrid | 🔴 | Criar src/assets/modules.ts |
| 2 | Status logic invertida | EcosystemGrid | 🔴 | Corrigir linha 48 |
| 3 | Sem .catch() em Supabase | EcosystemGrid | 🟡 | Adicionar error handling |
| 4 | ecosystemApps hardcoded | NativeSystem | 🔴 | Ler de api_connectors |
| 5 | Sem error boundary | NativeSystem | 🟡 | Tratamento iframe fail |
| 6 | Routes hardcoded | HubSequentialCarousel | 🟡 | Validar rotas existem |
| 7 | Logic invertida | UpsellBanner | 🔴 | Corrigir linha 56 |
| 8 | Sem fallback visual | DynamicOffers | 🟡 | Mostrar card vazio com CTA |
| 9 | Paywall vazio | ContextualPaywall | 🟡 | Validar ofertas existem |
| 10 | Rota existe? | AulasCreditos | 🟡 | Confirmar arquivo |
| 11 | URL não validada | Embed | 🟡 | Whitelist origens |

---

## 🚀 ORDEM DE CORREÇÃO RECOMENDADA

**Imediato (P1 - Bloqueadores):**
1. ✅ Criar MODULE_IMAGES
2. ✅ Corrigir status logic (EcosystemGrid)
3. ✅ Corrigir UpsellBanner logic (linha 56)
4. ✅ Ler ecosystemApps de api_connectors

**Hoje (P2 - UX):**
5. Adicionar .catch() em queries
6. Error boundary em NativeSystem
7. Validar rotas do Carousel
8. Fallback visual em DynamicOffers

**Semana que vem (P3 - Polish):**
9. Whitelist URLs no Embed
10. Confirmar AulasCreditos existe

---

**Total de pontos abertos:** 11
**Bloqueadores:** 4 🔴
**Importantes:** 4 🟡

