# Wave 20 — Port 9FIT OS Prototype → FitPro App

## Contexto
O zip `9fit.zip` traz um protótipo standalone polido (React + Tailwind, tema `dark-800/neon-400`, italic black) cobrindo: HUB OS, Train, Social, Progress, Profile, Premium, **SeasonPass**, **MissionCompleteOverlay**, **DigitalIDCard**, **MissionList**, **DailyCheckIn**, **Fit360**, **NineFlix**, **StoreView**, **Settings**. O app atual já tem a maioria das rotas (`Hub`, `Train`, `Social`, `Stats`, `Profile`, `Plans`, `Ron`) — falta principalmente **polimento visual**, **Season Pass**, **overlay de conclusão de missão** e **digital ID card** mais elaborado.

## Estratégia
Não recriar app do zero. **Portar componentes-chave do protótipo** para o projeto Lovable existente, conectando-os ao schema real (`athletes`, `daily_tasks`, `sync_score_logs`, etc.) — sem inventar tabelas. Manter rotas atuais.

## Entregas

### A. Novos componentes (port direto, dados reais)
1. `src/components/9fit/SeasonPassTrack.tsx` — trilha de tiers (Free/Premium) consumindo `athletes.total_xp` + `athletes.level`. Botões de claim disparam `gamification_events` (XP bônus). Rota nova `/9fit/season-pass`.
2. `src/components/9fit/MissionCompleteOverlay.tsx` — overlay fullscreen animado (Framer Motion) com XP ganho + streak. Disparado por evento `9fit:mission_completed`.
3. `src/components/9fit/DigitalIDCard.tsx` — refatorar `PersonalIDCard` atual com layout do protótipo (QR holográfico, classe, badges). Manter dados do `useAthleteId`.
4. `src/components/9fit/DailyCheckInPanel.tsx` — versão refinada do `QuickCheckIn` com sliders de mood/energy/sleep gravando em `bio_sleep_logs` + `sync_score_logs`.
5. `src/components/9fit/MissionListPanel.tsx` — lista DAILY/WEEKLY/SEASON consumindo `daily_tasks` (filtro por tipo). Substitui parte do Hub.

### B. Refinos visuais
6. `src/pages/9fit/Hub.tsx` — topo HUD compacto (LVL chip + XP bar + streak chip + settings), header "9FIT OS / System Operational", grid Ecosystem 3-col com `ModuleGrid`. Inserir `SeasonPassTrack` resumido (3 tiers próximos).
7. `src/pages/9fit/Train.tsx` — adicionar `ClassPlayer` style cards + filtros de intensidade Low/Medium/High.
8. `src/pages/9fit/Social.tsx` — feed estilo card grande + leaderboard semanal usando `aluno_score_composite`.
9. `src/pages/9fit/Profile.tsx` — usar `DigitalIDCard` novo + seção achievements de `user_achievements`.
10. `src/pages/9fit/Stats.tsx` — gráficos de `bio_*` + `workout_executions` semanal.

### C. Rotas e navegação
11. `src/App.tsx` — adicionar rota `/9fit/season-pass`.
12. `BottomNavigation` — sem mudanças (5 tabs canônicas mantidas). Season Pass entra como card no Hub + link no Profile.

### D. Tokens / estilo
13. `tailwind.config.ts` + `src/index.css` — garantir tokens `neon-400`, `dark-800/700` mapeados a `--primary` / `--card` / `--muted` (HSL semânticos, sem cores hardcoded em componentes).

## Não-objetivos
- Sem novas tabelas/migrations (usa schema existente).
- Sem mexer no Sovereign Core / NEXO.
- Sem alterar fluxos de auth / onboarding já entregues nas waves 17-19.

## Arquivos
**Novos (5):** SeasonPassTrack, MissionCompleteOverlay, DigitalIDCard, DailyCheckInPanel, MissionListPanel + página `pages/9fit/SeasonPass.tsx`.
**Refatorados (6):** Hub, Train, Social, Profile, Stats, App.tsx (rota).
**Tokens:** ajustes em index.css/tailwind se faltar mapeamento neon.

## Ordem de execução
1. Tokens neon/dark (base visual)
2. DigitalIDCard + MissionCompleteOverlay + DailyCheckInPanel + MissionListPanel
3. SeasonPassTrack + página SeasonPass + rota
4. Refino Hub (HUD + grid + season summary)
5. Refino Train/Social/Profile/Stats
