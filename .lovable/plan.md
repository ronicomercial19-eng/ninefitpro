# Plano de Refinamento — Fit OS Vanguarda (Fase Final)

## 1. Biblioteca de Conteúdo — Bug de Sync e Atribuição

**Sintomas:**

cbiblioteca esta com erro , nao mais sincronizando completa comoo estava antes e nao consigo atriburir os conteudos apra os alunos   
em os   
  
Alterar:  
  
staff :  equipe -> apresentar profissionais que representam equipe -> selecionar algum -> apresenta serviços disponiveis -> agendamento . /   
  
 dashboard pessoal -> CARD ID DO USUARIO   
Daily protocol -> Marca uma opção e apos vem a proxima  ( unificar em uma linha a marcaçao seguida das micrometas diarias e apos marcar uma ja atualizar o historico do usuario )    
 train -> o html ainda esta sendo exibido em train , transfirir  para protocol / ao acessar train as subcategorias sao para : train -> treino montado manual ou pela ia para usuario / protocol -> html , infoproduto , ebook enviado atraves da bibliteoca de conteudo ou colado/upload  direto no perfil do usuario realizado pelo  professor / healhtflix -> conteudos do streaming via api   
  
no painel do professor adicione no navbar principal os seguintes componentes : Healthflix  / Postura pro analizer  /  RON  / NEXUS   
  
Em hub matenha todos componentes porem a exibiçao será alterada , irei colar um exemplo de print no anexo e gostaria de altear mantenha toda estrutura, atualize de forma pragmatica os compoenntes variados em um unico ,que rola automatico apresentando todos em sequencia , sendo Descrição Técnica da Interface

Composição em Camadas (Layered UI): Estrutura baseada na sobreposição de elementos para criar profundidade visual.

Efeito de Profundidade com Máscara de Camada (Masking Effect): Técnica onde elementos do primeiro plano (como imagens de produtos ou ícones de módulos) se sobrepõem parcialmente à tipografia.

Tipografia de Grande Escala (Display Typography): Uso de fontes em tamanhos expandidos que servem tanto como conteúdo quanto como elemento gráfico de fundo.

Interatividade Parallax: Comportamento onde os elementos de fundo, texto e primeiro plano se deslocam em velocidades diferentes durante a rolagem (scrolling).

Hierarquia Visual por Z-Index: Gerenciamento da ordem de empilhamento dos módulos para garantir que elementos interativos permaneçam acessíveis sobre a camada de design.

Termos para Especificação de Projeto

Caso precise colocar isso em um documento de requisitos ou briefing:

Visual Style: Overlap Design (Design de sobreposição).

Layout: Grid-based com elementos Floating (flutuantes).

Assets: Imagens com canal alfa (PNG transparente ou WebP) para os elementos de primeiro plano.

Responsividade: Implementação de Viewpoint-relative units (vw/vh) para garantir que o corte do texto seja mantido em diferentes telas.

📌 Ponto de Atenção: Para um hub de ferramentas, certifique-se de que a sobreposição não prejudique a legibilidade dos nomes dos módulos nem a área de clique (hitbox) dos botões.  
Hub Sequencial 9FIT (Estilo Renner)

1. Conceito Visual (The Layered Look)

O objetivo é criar profundidade através de um "sanduíche" de três camadas principais:

Camada 0 (Fundo): Plano neutro/escuro (conforme o tema Dark do app).

Camada 1 (Tipografia): Texto em escala gigante (Display) com fonte Extra-Bold. Deve ocupar cerca de 70% da largura da tela.

Camada 2 (Destaque): Ícones 3D ou elementos de interface (PNG transparente/WebP) que ficam à frente do texto, sobrepondo letras para criar o efeito de máscara.

2. Roteiro de Exibição (Apresenta e Troca)

A visualização deve ser 1 por 1, com transição automática (Auto-play) a cada 4 segundos.

OrdemMódulo (9FIT)Texto de Fundo (Camada 1)Elemento Frontal (Camada 2)01PerformanceSTATS (Outline Laranja)Gráfico de barras "Aderência 7D"02Daily ProtocolHABIT (Bold Sólido)Ícones: Gota, Haltere e Prato (3D)03ComunidadeTRIBOS (Outline Branco)Badge de Ranking #1 ou Avatar Atleta04SmartTreinoINTELL (Bold Sólido)Ícone de Cérebro/Neural Coach flutuando05HealthFlixPLAY (Outline Laranja)Thumbnail de vídeo com bordas arredondadas

3. Checklist de Implementação Técnica

Efeito Parallax: O elemento frontal deve se deslocar ligeiramente mais rápido que o texto de fundo durante o scroll/troca.

Animação de Transição:

Entrada: Fade-in do texto + Zoom-in suave do elemento frontal.

Saída: Slide-out lateral sincronizado de ambas as camadas.

Barra de Progresso: Incluir uma linha de carregamento (Linear Progress) na base do card para indicar o tempo até a próxima "troca".

Z-Index: O elemento frontal deve ter o índice de empilhamento mais alto para garantir que a sombra projetada caia sobre o texto de fundo.

Performance: Utilizar Lazy Loading para os assets de cada módulo, garantindo que o hub carregue rápido mesmo com "muitos" itens.

4. Requisitos de Estilo (UI Specs)

Cores: Preto absoluto (fundo), Laranja vibrante (detalhes), Cinza médio (textos secundários).

Tipografia: Fontes sans-serif geométricas (ex: Montserrat ou Inter) para suportar o peso extra-bold do efeito.

Interatividade: Ao tocar no elemento frontal, o hub deve pausar a troca e navegar para a rota específica (Ex: /data, /social, /train).  
  
  


 Biblioteca não sincroniza completa e não consegue atribuir conteúdo a alunos.

**Investigação a executar:**

- Ler `src/components/students/LibraryAssignDialog.tsx`, `HTMLTemplateManager.tsx`, `TrainingContentUpload.tsx`, `DietContentUpload.tsx`
- Verificar políticas RLS de `content_library`, `student_training_assignments`, `student_diet_assignments`
- Conferir se `content_library` está no publication `supabase_realtime`

**Correções:**

- Adicionar tabela ao realtime (`ALTER PUBLICATION supabase_realtime ADD TABLE content_library`) se faltar
- Criar hook `useContentLibraryRealtime` invalidando queries em INSERT/UPDATE/DELETE
- Revisar policies INSERT/UPDATE no `student_*_assignments` para garantir que professor consegue atribuir (USING + WITH CHECK por `created_by = auth.uid()` ou via `has_role('admin'|'trainer')`)
- Garantir que paginação não corte resultados (remover `.limit(50)` se aplicável; usar `.range()`)

---

## 2. OS (Dashboard Pessoal)

**Atualizar `src/pages/9fit/OS.tsx`:**

- Reforçar `PersonalIDCard` como "CARD ID DO USUÁRIO" no topo (já existe, ajustar visual com flip-3d e dados reais e remover " DASHBOARD PESSOAL " )
- **DailyProtocol unificado de uma linha por vez:** mostrar apenas a próxima micrometa pendente; ao marcar, animar saída e revelar a próxima; salvar no histórico (`master_registry` event `daily_protocol_step`) imediatamente; atualizar XP do atleta em tempo real
- Refatorar `src/components/9fit/DailyProtocol.tsx` para modo "single-step sequential" com progresso (1/4, 2/4...)

---

## 3. Train — Separar conteúdos

**Atualizar `src/pages/9fit/Train.tsx`:**

- **Aba Train:** APENAS treinos montados (manual pelo professor ou IA) — render via `WorkoutOverview/WorkoutExecution`, nunca HTML cru
- **Aba Protocol:** TODO conteúdo HTML, infoproduto, ebook (vindo de `content_library` atribuído OU upload direto no perfil) — render seguro com DOMPurify + iframe `injectMobileViewport`
- **Aba HealthFlix:** conteúdos via API streaming (manter `HealthFlix.tsx` nativo)
- Mover qualquer render HTML que esteja em Train para Protocol

---

## 4. Staff (Aluno) — Fluxo Equipe → Serviços → Agendamento

**Refatorar `src/pages/9fit/Staff.tsx`:**

- Aba **Equipe:** lista de profissionais (query `profiles` onde role IN trainer/admin/nutritionist) em cards
- Clicar num profissional → drawer/sheet com **serviços disponíveis** (Avaliação, Aula, Consultoria — query `services` ou config do trainer)
- Selecionar serviço → tela de **Agendamento** (reusar componente de `AgendaPage`/scheduling.service)
- Manter Suporte e Agenda como abas adicionais

---

## 5. Navbar do Professor — Novos Itens

**Atualizar `src/components/layout/AppSidebar.tsx`:**

- Adicionar entradas no nav principal: **HealthFlix**, **Postura Pro Analyzer**, **RON**, **NEXUS**
- Rotas:
  - `/app/healthflix` → reusa `src/pages/9fit/HealthFlix.tsx` (versão admin)
  - `/app/postura-pro` → nova página placeholder com upload de foto + análise (esqueleto)
  - `/app/ron` → reusa `src/pages/9fit/Ron.tsx`
  - `/app/nexus` → nova página placeholder (módulo de gestão de ecosistema)
- Registrar rotas em `src/App.tsx`

---

## 6. Hub Sequencial estilo Renner (Overlap/Layered Design)

**Substituir `ModuleGrid` por novo componente `HubSequentialCarousel`:**

Arquitetura visual em 3 camadas:

- **Layer 0:** fundo dark (`hsl(var(--background))`)
- **Layer 1:** tipografia display gigante (Chakra Petch Black, ~30vw, outline ou sólido conforme módulo) — texto de fundo
- **Layer 2:** ícone/asset PNG 3D flutuando à frente, sobrepondo letras (mask effect)

**Roteiro (auto-play 4s):**

```text
01 Performance  → "STATS"   (outline orange) + mini gráfico aderência 7D
02 Daily        → "HABIT"   (sólido)         + ícones gota/haltere/prato
03 Comunidade   → "TRIBOS"  (outline white)  + badge ranking
04 SmartTreino  → "INTELL"  (sólido)         + ícone neural
05 HealthFlix   → "PLAY"    (outline orange) + thumbnail vídeo
```

**Implementação técnica:**

- Framer Motion: fade-in texto + zoom-in elemento frontal; saída slide-out lateral sync
- Parallax: elemento frontal `translateX` ~1.3x mais rápido que texto (no swipe/transition)
- Linear Progress Bar na base indicando tempo até próxima troca
- Z-index: frontal > texto > fundo; sombra do frontal projetada sobre o texto
- Toque no frontal: pausa auto-play e navega para rota (`/9fit/stats`, `/9fit/os`, `/9fit/community`, `/9fit/train`, `/9fit/healthflix`)
- Lazy-load assets via `React.lazy` ou `loading="lazy"` em imgs
- Usar `vw` units para garantir corte responsivo do display text
- Manter todos os 8 módulos atuais acessíveis: 5 no carrossel principal + grid compacto secundário com PrimePass, 9Store, 9Foods, O Ron abaixo

**Arquivos:**

- novo: `src/components/9fit/HubSequentialCarousel.tsx`
- novos assets: `src/assets/hub/stats.png`, `habit.png`, `tribos.png`, `intell.png`, `play.png` (gerados via imagegen, fundo transparente)
- edit: `src/pages/9fit/Hub.tsx` substituir `ModuleGrid` no topo por `HubSequentialCarousel`, manter grid pequeno abaixo

---

## 7. Design System (consolidação)

Aplicar tokens do `9FIT_UIUX_Speech_Lovable.md` no `index.css` se ainda divergente:

- `--background: 12 60% 4%` (#0C0907)
- `--card: 22 67% 6%` (#1A1008)
- `--primary: 16 87% 52%` (#F05C1A)
- Fontes: Chakra Petch (display) + Inter (body) via Google Fonts  
  
8. Alterar do nav bar inferior store -> comunity -> exibir a api que irei colar aqui da comunidade oficial com todos os recursos oferencidos dentro dela. 

---

## Fora de escopo (informar ao usuário)

- NEXUS e Postura Pro Analyzer: criados como **shells** com UI; engines reais precisam de definição de backend/IA
- Sync real do HealthFlix API admin: depende de credenciais (`HEALTHFLIX_API_KEY`)

---

## Pergunta antes de implementar

**Postura Pro Analyzer** — devo criar como tela placeholder com upload+marcação manual, ou já integrar com IA Gemini Vision (Lovable AI Gateway) para análise automática de fotos posturais?   
RESPOSTA : ainda nao , no sistema que vou fazer api ja tem isso, ou seja pra todos essas inteligencgencias adicionais ja tenho frontend, desgins criados, a api vais ervir para reproduzirmos sem delay para o usuario  .     
  
- ATENTOS - > IREI COLAR ALGUMAS SUGESTOES PARA ATUALIZAÇAO :   
DESIGN DEVE CORRESPONDER A PERFEIÇAO DA APPLE.   
ORGANIZAÇAO DO SISTEMAS, MODULOS, INTELIGENCIAS, IGUAL DA GOOGLE.   
SOFISITCAÇAO E EXPERIÊNCIA DA NETFLIX, AMAZON.  
Fit OS Vanguarda (Final Sprint)

#### **BLOCO 1: CORREÇÕES CRÍTICAS** (Paralelizável)

1.1 — Biblioteca + Sync + Atribuição

typescript

```typescript
// src/services/library.service.ts — Recriação completa

// 1. Verificar RLS policies
// 2. Adicionar content_library ao realtime publication
// 3. Hook useContentLibraryRealtime com invalidação automática
// 4. Garantir atribuição funciona (student_training_assignments + student_diet_assignments)
// 5. Testes: criar conteúdo → atribuir → estudante vê em <5s
```

**Você quer que eu:**

- A) Veja o código atual (preciso de SSH/repo access ou você copia o ts?)
- B) Reescreva completo baseado no pattern?
- C) Ambos (você manda, eu debugo)?

---

1.2 — Dashboard Pessoal (OS.tsx)

typescript

```typescript
// Mudanças cirúrgicas:
// ✅ PersonalIDCard: flip-3d, remover "DASHBOARD PESSOAL"
// ✅ DailyProtocol: MODO SINGLE-STEP (uma micrometa por vez)
//    └─ Marcar → anima saída → revela próxima → salva no event
//    └─ Histórico atualiza realtime
// ✅ Remover HTML cru, mover para Protocol
```

Arquivo: `src/pages/9fit/OS.tsx`

---

1.3 — Separação Train/Protocol/HealthFlix

typescript

```typescript
// src/pages/9fit/Train.tsx → SPLIT em 3 abas

// TAB 1: TRAIN
// └─ Apenas treinos (manual ou IA)
// └─ Render: WorkoutOverview + WorkoutExecution
// └─ ZERO HTML cru

// TAB 2: PROTOCOL
// └─ HTML + infoprodutos + ebooks (content_library)
// └─ DOMPurify + iframe injected com injectMobileViewport
// └─ Auto-play se ebook, tabs se multi-content

// TAB 3: HEALTHFLIX
// └─ API streaming (nativo HealthFlix.tsx)
// └─ Cards com thumbnail + metadata
```

Arquivo: `src/pages/9fit/Train.tsx` (refator maior)

---

1.4 — Staff: Equipe → Serviços → Agendamento

typescript

```typescript
// src/pages/9fit/Staff.tsx → FLUXO novo

// STEP 1: Listar profissionais (query profiles role IN [trainer, admin, nutritionist])
// STEP 2: Click profissional → Drawer com serviços (Avaliação, Aula, Consultoria)
// STEP 3: Select serviço → Sheet agendamento (reusar AgendaPage logic)
// STEP 4: Confirm → Salva em scheduling_events
```

Arquivo: `src/pages/9fit/Staff.tsx`

---

#### **BLOCO 2: NAVEGAÇÃO + NOVOS ITENS** (5-15 min)

2.1 — Navbar Professor (AppSidebar.tsx)

typescript

```typescript
// Adicionar:
// ├─ HealthFlix          → /app/healthflix
// ├─ Postura Pro         → /app/postura-pro
// ├─ RON                 → /app/ron
// └─ NEXUS               → /app/nexus

// Registrar em App.tsx routes
```

**Nota:** Postura Pro e NEXUS são **shells com UI**. Você quer placeholder agora ou delay até ter backend?

---

#### **BLOCO 3: HUB SEQUENCIAL (THE MONSTER)**

Este é o mais complexo. Vou fazer **modular**:

3.1 — Novo Componente: HubSequentialCarousel.tsx

typescript

```typescript
// src/components/9fit/HubSequentialCarousel.tsx

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HUB_SEQUENCE = [
  {
    id: 'stats',
    label: 'Performance',
    displayText: 'STATS',
    displayStyle: 'outline',
    color: '#E8571A',
    icon: '/hub/stats.png',
    route: '/9fit/stats',
    asset: '📊',
  },
  {
    id: 'habit',
    label: 'Daily Protocol',
    displayText: 'HABIT',
    displayStyle: 'solid',
    color: '#F2F0EC',
    icons: ['💧', '🏋️', '🍽️'],
    route: '/9fit/os',
    asset: 'triplet',
  },
  {
    id: 'tribos',
    label: 'Comunidade',
    displayText: 'TRIBOS',
    displayStyle: 'outline',
    color: '#F2F0EC',
    icon: '/hub/tribos.png',
    route: '/9fit/community',
    asset: '🏅',
  },
  {
    id: 'intel',
    label: 'SmartTreino',
    displayText: 'INTELL',
    displayStyle: 'solid',
    color: '#F2F0EC',
    icon: '/hub/intell.png',
    route: '/9fit/train',
    asset: '🧠',
  },
  {
    id: 'play',
    label: 'HealthFlix',
    displayText: 'PLAY',
    displayStyle: 'outline',
    color: '#E8571A',
    icon: '/hub/play.png',
    route: '/9fit/healthflix',
    asset: '▶️',
  },
];

export function HubSequentialCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HUB_SEQUENCE.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const module = HUB_SEQUENCE[current];

  return (
    <div className="relative w-full h-96 bg-[#090909] overflow-hidden rounded-xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={module.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 flex items-center justify-between px-8"
          onClick={() => setIsPlaying(false)}
        >
          {/* Layer 1: Tipografia Gigante (Fundo) */}
          <motion.div
            className="text-9xl font-black text-transparent"
            style={{
              WebkitTextStroke: `2px ${module.color}`,
              textStroke: `2px ${module.color}`,
            }}
          >
            {module.displayText}
          </motion.div>

          {/* Layer 2: Asset Frontal (3D effect) */}
          <motion.div
            className="absolute text-6xl"
            style={{ x: '20%', zIndex: 10 }}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {module.asset}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Progress Bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-[#E8571A]"
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 4, ease: 'linear' }}
      />
    </div>
  );
}
```

3.2 — Assets (Emojis + PNG opcional)

Usar **emojis primário** agora (pronto), PNG depois se quiser premium.

3.3 — Integração no Hub.tsx

typescript

```typescript
// src/pages/9fit/Hub.tsx

import { HubSequentialCarousel } from '@/components/9fit/HubSequentialCarousel';

export function Hub() {
  return (
    <div className="space-y-8">
      {/* Nova seção */}
      <HubSequentialCarousel />

      {/* Grid secundário com PrimePass, 9Store, 9Foods, O Ron */}
      <ModuleGrid modules={SECONDARY_MODULES} />
    </div>
  );
}
```

---


|        |
| ------ |
| &nbsp; |
