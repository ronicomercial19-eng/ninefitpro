## Próximo passo — Finalização do planejamento (Onda 2 + Onda 3)

Onda 1 (Train + Engrenagem + IA adaptativa) já está entregue. Falta executar as ondas 2 e 3 alinhadas aos 8 mockups anexos e à Skill Bible v1.

---

### ONDA 2 — Experiência do Aluno (Hub / OS / Progresso / Perfil / Prime / Ativação)

**1. OS "Fit OS+" (mock `Personal ID Card`)**

- Refator `OSDashboard` → header "Fit OS+", Personal ID Card com Sync Score em ring grande (98%), Nível + Classe.
- Bloco "Ecossistema" com 4 atalhos (Train / Hub / Staff / Market).
- Bloco "Ranking Global" (top 3 de `engrenagem_xp_logs` agregado) + "Destaques" carrossel (eventos / desafios).
- Bottom tab inferior dourada: OS · TRAIN · STORE · PRIME · LAB.

**2. Hub "Ecosystem" (mock View all / Add module)**

- Refator `EcosystemGrid` para layout 2 colunas com foto grande + título + estado (ex.: "4 online", "88%").
- Header "Ecosystem · All modules · N active", botão "View all" e FAB "+ Add module".
- Linha de cards segue as fotos em `src/assets/modules/`.

**3. Train + Protocol (mock `SMART TRAINING 75%`)**

- Refator `Train.tsx`: hero "PROTOCOLO SMART TRAINING" com ring de progresso geral, lista "INTERVENÇÕES" (cards exercício com play/concluído/barra), bloco "MÉTRICAS" (Carga Total + Frequência mini-chart).
- Bottom tab destacado central HUB (mock).

**4. Progresso (novo `Progresso.tsx`)**

- Cards topo: Avaliação Atual %, Composição Corporal (radar), Força Total Δkg.
- Gráfico "Tendência de Gordura Corporal" (area chart), "Progressão de Força" (3 barras), "Histórico de Performance" (VO₂, Força Máx), "Insights Personalizados" (bullets gerados via `recommendationEngine`).
- Adicionar rota `/9fit/progresso` + entrada na bottom nav (Início · Treinos · Progresso · Perfil para variante 4-tabs).

**5. Perfil "Configurações" (mock Lucas Mendes)**

- Refator `Profile.tsx`: header avatar + nome + badge "Aluno Premium".
- Lista de cards: Staff (online count), Planejamento, Ajuste de Treino (badge "Novo"), Ron, Histórico, Pagamento & Plano.
- CTA "Explorar mais opções" + secundário "Abrir no Sistema Nativo".

**6. Ativação (mock `BEM-VINDO À 9FIT PRO`)**

- ativaçao de perfil nativa do fitpro deve ser ativada e criar as telas . 

- Refator `Ativacao.tsx`: hero glow laranja "Ative seu protocolo de elite em 90 segundos".
- Stepper 4 etapas (Conexão · Perfil · Protocolo · Prime) usando `OnboardingStepper`.
- Card "Configurando seu sistema" com checklist animado (Sensor Neural, Sono, FC) + waveform.
- Bloco "Escolha seu Protocolo" (Neurogênesis / Metabólico Alpha / Recuperação Total) gravando em `user_preferences`.
- Bloco "9FIT PRIME" com pricing R$ 89 → R$ 49 e CTA "Ativar 9Fit Prime agora" → `/9fit/checkout?plan=prime`.

**7. Planejamento (mock `Periodização Científica`)**

- Aprimorar `Planejamento.tsx`: header "Planejamento" + badge "Aluno", bloco "Periodização Científica · Ciclo X · Meso Y/N" com calendário mensal colorido (deload / treino / teste).
- "Ciclos Adaptativos" carrossel horizontal (ring %, foco, volume, "Gerado por IA · Xh atrás").
- "Progresso do Ciclo" area chart Real vs Projetado pela IA (via `loadProgression`).
- CTA fixo "Ver Plano Completo da Semana" com próximo treino.

---

### ONDA 3 — Painel Professor / Skills / Monetização

**1. Skills no Sidebar (já criado) → página completa**

- `SkillManagerPage`: adicionar tabs "Manual", "Upload JSON", "Biblioteca" (lista das 19 skills da Bible com toggle ativar/desativar por aluno).
- Cada skill exibe: missão, tier, inputs, outputs (do `9FIT_SKILL_BIBLE_v1.md` parseado em constante TS).
- Persistência em tabela `skills` + `student_skill_activations` (ambas já existem via migração anterior).
- permitir upload de arquivo de .skill / .md /  .json /  .tsx , assim ele organzia e orquestrar e arquiteta todas as açoes no fitpro 

**2. Painel Aluno do Professor — botão "Habilitar Skill"**

- Em `StudentDetailedView`: nova aba "Skills" listando 19 skills com switch (grava em `student_skill_activations`).
- Componente reaproveita `SkillUploader` para upload manual extra.

**3. Monetização (`MonetizacaoPage`)**

- Dashboard: MRR, churn, conversão Prime, ofertas ativas (`dynamic_offers`), CTA criar oferta.
- Tabela de transações últimas + filtro por plano.

**4. Staff flow no check-in**

- `QuickCheckIn`: após check-in, abrir sheet com staff online (consulta `profiles` role trainer/nutricionist) e botão "Falar agora" → `/9fit/staff?from=checkin`.
- aplicar fluxo de agendamento , ao agendar aula , descontar os creditos .
- professor ira fazer agendamentos mensais , ao final do ciclo deve gerar relatorios automaticos de relaçao das aulas do mes 
- habilitar campo para realizar api com stevent que ira fornecer todo matching e base de profissionais , inclusive as telas para o aluno acessar dentro do fitpro

5.  API KEYS FITPRO 
  disponibilizar toda chave api do fitpro para realziar conexao com oss outros modulos do ecossistema 
  as conexoes feitas no fitpro foram sucesso mas nao atualizaram nada  

6. HOUVE ATUALIZAÇES NO SHCEMA DE DADOS NO BANCO NATIVO, NO BANCO DE SUPREMO, AJUSTE O FITPRO PARA RECEBER TODAS MUDANÇAS DE FORMA PRAGMATICA E FUNCIONAL
7. ATUALIZAR O GRID DO MEU ECOSSISTEMA DE ACORDO COM MOCKUPS ENVIADOS   
REMOVER GRID DO ECOSSITEMA DO COMPONENTE OS 
8. &nbsp;

---

### Detalhes técnicos

- **Sem novas tabelas.** Usar: `athletes`, `workout_executions`, `engrenagem_xp_logs`, `skills`, `student_skill_activations`, `dynamic_offers`, `user_preferences`, `ai_context_snapshots`.
- Tokens semânticos (`--primary` laranja `#E8571A`, `--background` `#000`). Nada de cores hardcoded.
- Charts: `recharts` (já no projeto) para Progresso e Planejamento.
- Skill Bible: criar `src/data/skillsBible.ts` com array tipado das 19 skills (parse uma vez do md, hardcode em TS).
- Bottom nav: manter v5 (5 tabs) como canônico; rota `/9fit/progresso` acessível pelo Perfil → Histórico e pelo OS.
- QA: após cada onda, screenshot mobile 390x844 das telas-chave (OS, Hub, Train, Progresso, Perfil, Ativação, Planejamento) e comparar com mocks.

---

### Ordem de execução

1. Onda 2 — telas Aluno (OS → Hub → Train → Progresso → Perfil → Ativação → Planejamento).
2. Onda 3 — Skills (Bible + ativação por aluno) → Painel Professor (aba Skills) → Monetização → Staff no check-in.
3. Verificação final: build, screenshots, console logs limpos.
4. 5 , 6 , 7. 

Aprovar para eu iniciar a Onda 2,3,4,5,6 , 7.