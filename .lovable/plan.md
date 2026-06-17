## Escopo desta rodada

**Bloco 4 (crítico)** + **Blocos 6, 7, 9, 10**. Bloco 8 fica para a próxima.

---

### Bloco 4 — Train: Quick / Ajuste / Semana

**4.1 Treino Rápido (`QuickTrainModal.tsx`)**

Fluxo: tela criativo (já existe) → ao recusar/fechar, 3 perguntas (objetivo / tempo / equipamento) → query `workout_models` filtrando `goal`, `estimated_duration`, `equipment_required` → fallback: composição on-the-fly via `exercises` filtrando `target_muscle`/`equipment` → tela de execução guiada (reusar `WorkoutExecution.tsx`) com `exercises.video_url || exercises.gif_url` → `INSERT workout_executions (athlete_id, phase_name='quick', status='completed', completed_at)` → `supabase.rpc('fn_award_xp', { p_athlete_id, p_amount: 50, p_source: 'quick_workout' })`.

**4.2 Ajuste de Treino (`AjusteTreino.tsx`)**

Nova RPC `aplicar_ajuste_treino_dia(p_athlete_id uuid, p_data date, p_changes jsonb)`:
- Cria/atualiza registro em `daily_workouts` para a data alvo com `override_locked=true` e `changes_json=p_changes`.
- NÃO toca em `planos_de_treino_gerados`.
- Retorna o treino do dia resultante (merge plano base + changes).

Frontend `AjusteTreino.tsx`: substitui qualquer UPDATE direto em planos por chamada à RPC. Mostra treino atualizado imediatamente após retorno.

**4.3 Treinos da Semana (`WorkoutHome.tsx` ou nova `TreinosSemana.tsx`)**

- Tela de preferências (objetivo / dias / equipamento) → atualiza `athletes.preferences` (jsonb).
- Carrega `planos_de_treino_gerados` (`status='active'`, `athlete_id=eq.X`) + `vw_athlete_periodizacao_ativa` para identificar `current_phase_category`.
- Renderiza grid 7 dias (D1–D7): nome do treino, grupos musculares, lista de exercícios.
- Para cada exercício busca vídeo em `library_items` (`type='videos'`, `category=current_phase_category`) → fallback `exercises.video_url`.
- Apenas o dia atual (`weekday=EXTRACT(dow FROM now())`) tem botão "Executar" → abre `WorkoutExecution`.
- Conclusão → `INSERT workout_executions (phase_name='scheduled')` + `fn_award_xp(athlete_id, 100, 'workout_completed')`.

**Migration Bloco 4:**

```sql
-- daily_workouts: adicionar override_locked, changes_json se faltarem
ALTER TABLE daily_workouts 
  ADD COLUMN IF NOT EXISTS override_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS changes_json jsonb DEFAULT '{}'::jsonb;

-- RPC aplicar_ajuste_treino_dia
CREATE OR REPLACE FUNCTION aplicar_ajuste_treino_dia(...) ...

-- athletes.preferences (jsonb) se faltar
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

-- vw_athlete_periodizacao_ativa: adicionar coluna current_phase_category
-- (derivada do mesociclo ativo na data corrente)
```

---

### Bloco 6 — Templates Sociais (compartilhamento viral)

- Tabela `social_share_templates` (id, slug, layout_html, layout_css, preview_url, active).
- Seed com 5 templates: "PR Bater", "Streak X dias", "Level Up", "Check-in", "Workout Done".
- Refactor `ShareButton.tsx`: ao compartilhar, renderiza template via `<canvas>` ou OG image edge function → upload para `storage/share-cards` → URL pública para WhatsApp/Instagram.
- Edge function `generate-share-card` (opcional MVP: client-side via html2canvas).
- Cada share continua chamando `fn_award_xp(athlete_id, 10, 'share:<slug>')`.

---

### Bloco 7 — Oferta Audiência R$49

- Tabela `monetization_offers` já existe — seed oferta `audience_49` (price=4900, currency='BRL', active=true, target='public').
- Página `src/pages/9fit/Oferta.tsx`: hero, prova social, CTA "Começar por R$49/mês".
- Integração Stripe (já habilitado? usar `stripe--enable_stripe` se não) → checkout session de R$49 recorrente.
- Pós-checkout: cria `athletes` (status=trial/active), envia welcome email (`send-student-welcome`), redireciona `/9fit/onboarding`.
- Não bloquear features (paywall = Bloco 5 descartado). Apenas captar.

---

### Bloco 9 — Loop Onboarding → Venda

- Página `Onboarding.tsx` já existe — adicionar última etapa "Próximos passos" com CTA para oferta R$49 (caso `athletes.plan_status != 'active'`).
- Hook `useUserState` adiciona flag `should_show_offer` (true se onboarding completo + sem plano).
- `Hub.tsx`: banner persistente `DynamicOffers` para usuários sem plano.
- Event tracking: `monetization_events` registra `viewed_offer`, `clicked_offer`, `converted`.
- Email transacional dia +1, +3, +7 (sem plano) via edge function `smart-notifications` agendada.

---

### Bloco 10 — Design System Global

- Auditar `src/index.css` e `tailwind.config.ts`: garantir tokens canônicos (`--neon-orange`, `--neon-green`, `--bg-black`, `--surface-1/2/3`, `--text-primary/muted`).
- Componentes hardcoded com `text-white`/`bg-black`/`bg-[#...]` → migrar para tokens semânticos.
- Tipografia: definir `--font-display` (Sans-Serif Black Italic) e `--font-body` no CSS, aplicar via Tailwind theme extend.
- Variantes shadcn: revisar `button`, `card`, `badge`, `input` para alinhar ao tema dark/neon.
- Documentar tokens em `CANONICAL_DATA_CONTRACT.md` (seção "Design Tokens").
- Validar visualmente: `Hub`, `Train`, `Profile`, `Settings`, `HealthFlix`.

---

## Ordem de execução

1. Migração SQL única cobrindo: Bloco 4 (`daily_workouts` cols + RPC + `athletes.preferences` + `vw_athlete_periodizacao_ativa.current_phase_category`), Bloco 6 (`social_share_templates` + seed), Bloco 7 (seed `monetization_offers`).
2. Frontend Bloco 4 (3 telas).
3. Frontend Bloco 6 (`ShareButton` + templates).
4. Frontend Bloco 7 (`Oferta.tsx` + Stripe checkout).
5. Frontend Bloco 9 (onboarding CTA + hub banner + tracking).
6. Bloco 10: tokens CSS + auditoria de componentes-chave.

## Notas

- Todas as views novas: `SECURITY INVOKER`. Todas as RLS: `(select auth.uid())`. Toda nova tabela: `GRANT` explícito.
- `fn_award_xp` continua sendo a única porta de entrada de XP.
- Stripe: se chaves não configuradas, deixar checkout em modo "coming soon" e logar evento.
- Bloco 8 (MVP prof/aluno) fica para próxima rodada conforme solicitado.

Confirme para eu começar pela migração.