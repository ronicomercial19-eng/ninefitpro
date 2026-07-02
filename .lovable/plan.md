# Plano — Atualização Crítica de Frontend + Integração Total com Banco

Regra dura para toda a execução: **atualizar de forma pragmatica ou manter o layout, CSS, tokens ou identidade visual**. Só lógica, handlers, queries, RPCs, fluxo e estado. Banco = fonte da verdade. Nenhuma Edge Function nova.

## Fase 0 — Descoberta & Auditoria de RPCs (P0, bloqueante)

Antes de tocar em qualquer tela, validar contratos no banco. Já confirmado hoje:

- Existem: `ajustar_exercicio_por_dor`, `regenerar_dia_evitando_regiao`, `fn_award_xp`, `fn_compute_user_thresholds`, `prescrever_treino_rapido`.
- **Faltam**: `get_athlete_scores`, `get_healthflix_feed`.

Ação:

1. Rodar `supabase--read_query` para inspecionar assinatura e retorno de cada RPC existente + views chave (`vw_athlete_status`, `vw_hub_status`, `vw_athlete_periodizacao_ativa`, `athlete_auth_link`).
2. Se `get_athlete_scores` e `get_healthflix_feed` não existirem, criar via **migration** (RPC SECURITY INVOKER, sem edge function nova). Definir contrato antes do frontend.
3. Extrair apenas os zips relevantes para /tmp e usar como referência de UI/lógica — **não copiar arquivos crus** para o projeto.

Entrega: documento curto em `.lovable/plan.md` com o contrato canônico de cada RPC/view.

---

## P0 — Correções críticas (impedem comercialização)

### 1. Sync Score real + Radar 5D

- `SyncScoreRing.tsx`: consumir `rpc('get_athlete_scores', {p_athlete_id})` via novo hook `useAthleteScores` com realtime em `sync_score_logs`.
- Faixas de cor: 0-40 vermelho, 41-70 laranja `#FF6600`, 71-100 verde (mantendo conic-gradient e glow atuais, só troca thresholds).
- Recalcular após eventos: onboarding done, `ninefit_checkins` insert, `workout_executions` completed, `avaliacoes_unificadas` insert — usar hook único `useSyncScoreRefresh` disparado em cada handler.
- `WeeklyRadar3D` no Hub consome o mesmo breakdown (treino/nutri/sono/mob/hidr) já retornado pela RPC.

### 2. Fluxo de ativação 7 dias

- `HubMissionsCard`: ler `athlete_activation` + `activation_events`. Se não existir linha, inicializar via RPC/insert.
- 6 missões com rotas garantidas:
  1. Completar perfil → `/9fit/profile?flow=complete`
  2. Avaliação inicial → `/9fit/avaliacao-guiada`
  3. Primeiro plano → `/9fit/planejamento`
  4. Primeiro treino → `/9fit/train?open=today`
  5. 3 dias no Hub → contagem automática (evento login)
  6. 7 dias consecutivos → streak automático
- Cada CTA navega e ao concluir insere em `activation_events` + `fn_award_xp`. Barra `0/6 · 0%` fica reativa via realtime.

### 3. RON no lugar da aba Prime

- `BottomNavigation.tsx`: trocar apenas o slot central "PRIME" por "RON" apontando para `/9fit/ron` (Prime continua acessível via Hub). Mesmo componente visual — só rótulo, ícone e rota.
- Manter guard/estilo do slot central.

### 4. Treino Rápido via RPC

- `QuickTrainModal.tsx`: eliminar chamada a edge function; usar `supabase.rpc('prescrever_treino_rapido', { p_athlete_id, p_objetivo, p_tempo_min, p_equipamento })`.
- Fluxo: criativo → 3 perguntas na mesma tela → geração → execução guiada com vídeos de `exercises.video_url`/`gif_url` ou implementar no treino do dia do aluno salvo. 
- Início: `insert workout_executions {status:'in_progress', source:'quick'}`. Fim: `update status='completed'` + `fn_award_xp(50,'quick_workout')`.
- Remover duplicação de botões da tela final (bug reportado).

### 5. RON detecta dor e ajusta só o dia

- `Ron.tsx`: novo detector `detectPain(message)` (regex PT-BR: dói/dor/travou/estralou + região) → extrai `body_region` + `intensity`.
- Insert em `pain_reports`. Se detectado:
  - `rpc('ajustar_exercicio_por_dor', { athlete_id, exercise_id: hoje, body_region, day: today })`
  - Se retorno `no_safe_variation` → `rpc('regenerar_dia_evitando_regiao', ...)`.
- Nunca tocar semana/periodização.

### 6. Check-in pré-treino + durante treino

- Modal pré-treino em `WorkoutExecution.tsx`: dor 0-10 + disposição 0-10 → grava em `ninefit_checkins`. Se dor ≥ 6 → dispara ajuste automático via RPC acima.
- Após cada exercício concluído: mini-prompt 👍 / 😐 / ⚠️. Se ⚠️ → picker de região (joelho/ombro/lombar/punho/tornozelo/outro) → ajuste do próximo exercício via `ajustar_exercicio_por_dor`.

### 7. Sistema Fliperama (fichas)

- Novo hook `useCredits` lendo `athlete_credits`/`credit_transactions`.
- Gate único `withCredit(action, cost=1)` que envolve toda chamada de IA (RON chat, treino IA, cálculo nutri, protocolo). Debita via `credit_transactions` (RPC nova `fn_consume_credit` se ainda não existir — criar por migration).
- UI: badge de fichas no `NineFitTopBar` (sem redesign, só número + ícone). Ao chegar em 0: modal "Recarregar" com pacotes 30/50/100 → `/9fit/checkout?pack=X`. Histórico/perfil/treinos salvos continuam livres.

## P1 — Alto impacto

### 8. Treino IA (painel professor) — semana completa

- `AITrainingPage.tsx`: fluxo obrigatório aluno → periodização (Smart Periodizer) → modelo (Smart Treino) → aplicar → distribuir D1-D7 → vídeos da biblioteca → publicar.
- Substituir erro "gerar treino com IA" pela chamada correta: `rpc('smart_treino_criar_semana', {...})` ou pipeline: `analyze-periodization` já existente + inserts em `student_training_assignments` (7 registros).
- Vídeos: matching por `exercises.name`/`muscle_group` em `library_items` (fase atual) com fallback `exercises.video_url`.

### 9. Smart Periodizer

- `SmartPeriodizer.tsx`: selecionar aluno → periodização → salvar em `periodization_annual_plans` com `athlete_id`. Auto-atualiza `Planejamento.tsx` do aluno via view já existente `vw_athlete_periodizacao_ativa` (realtime).

### 10. Smart Treino

- Página admin: aluno → template (`workout_models`) → distribuição por dia da semana → vídeos → publish. Escreve em `student_training_assignments` + `daily_workouts`.

### 11. HealthFlix real

- `HealthFlix.tsx`: usar `rpc('get_healthflix_feed', { p_athlete_id })` (criar por migration se ainda não existe). Fallback `library_items` filtrando `type IN ('video','videos')` + categoria = `current_phase_category`.
- Ordenação por histórico (`healthflix_progress`) e fase atual.

### 12. Progress Tracker

- `Progresso.tsx`: linha do tempo lendo `avaliacoes_unificadas` + `historico_avaliacoes`. Comparativos automáticos (delta entre última e anterior). Botão "Nova avaliação" → `AvaliacaoGuiada` .   
* se nao possuir dados de avaliação -> criar fluxo de aquisiçao de dados rapidas para começar gerar historico -> 5 dados basicos apenas para monitoramento de evoluçao/progresso

### 13. Postura Pro

- Página cliente: upload fotos → `postura-pro-scan` (já existe) → mostrar flags + sugestões (métodos + alongamentos) lendo `postura_scans`.

### 14. Biblioteca + HealthFlix disponibilização automática

- `Biblioteca.tsx`: filtro server-side por `id_card_tier` do athlete (via view). HealthFlix já coberto no item 11.

### 15. Hub / Navegação — rotas

- `ModuleGrid`: STAFF mantém; PLANEJAMENTO → `/9fit/planejamento`; AJUSTE TREINO → `/9fit/ajuste-treino`; PROGRESS → `/9fit/progresso`. Sem telas novas, apenas `onClick={navigate(...)}`.

### 16. Dashboard admin FitPro

- Aplicar dados reais nas métricas já existentes (`Dashboard.tsx` admin): alunos, conclusão, sessões, atenção, receita por plano — todos por query em `athletes`, `workout_executions`, `payments`, `user_plans`. Sem mudar layout do dashboard v2 do HTML enviado (mantido como referência, não copiado).

---

## Fase Final — Checklist de validação

Rodar cada item do checklist do briefing (Sync/Radar/RON/Treino Rápido/IA/Smart Periodizer/Smart Treino/HealthFlix/Biblioteca/Progress/Postura/Ativação/Viral/Fichas/Sync FitPro↔alunos), com Playwright em rotas críticas (Hub, Train, Ron, AITrainingPage, SmartPeriodizer) capturando screenshot para prova de UI intacta + logs de rede confirmando as RPCs.

Auditoria final entregue em `.lovable/plan.md` com: RPCs usadas, arquivos alterados, tabelas afetadas, itens que ficaram pendentes (ex.: RPCs a criar por migration, botões/edge cases descobertos durante execução).

---

## Detalhes técnicos consolidados

- **Novos hooks**: `useAthleteScores`, `useSyncScoreRefresh`, `useCredits`, `useActivationMissions` (todos em `src/hooks/`, com realtime `supabase.channel` no `useEffect` + cleanup).
- **Novos utilitários**: `src/services/pain/detectPain.ts`, `src/services/credits/withCredit.ts`.
- **Migrations necessárias** (mínimas, só se RPC/coluna faltar): `get_athlete_scores`, `get_healthflix_feed`, `fn_consume_credit`, `athlete_credits` (se estrutura atual não bater), realtime `ALTER PUBLICATION supabase_realtime ADD TABLE ...` para `athlete_activation`, `sync_score_logs`, `credit_transactions` se ainda não estiverem.
- **Nenhuma nova Edge Function.** Só RPCs no banco + código React.
- **Zips enviados** ficam em /tmp como referência para copiar padrões de UI/lógica; nunca sobrescrever `.git` nem colar componentes crus no projeto.

execução: 2 fases de build. Rodada 1 = Fase 0 + P0 (Sync Score, Ativação, Treino Rápido, RON dor, Fichas, RON tab) e Rodada 2 = P1 (Treino IA, Smart Periodizer/Treino, HealthFlix, Progress, Postura, Biblioteca). Rodada .  
fase 2 de build = Dashboard admin + checklist final + auditoria.

Confirma que posso seguir por essa ordem e criar as migrations mínimas (get_athlete_scores, get_healthflix_feed, fn_consume_credit) quando faltarem?