# Handoff — Fase 3 · Início (OS)

Data: 2026-10-29  
Repositório: ronicomercial19-eng/ninefitpro  
Branch: fix/fase3-inicio-consistencia  

## O que estava inconsistente

- O selo de consistência no Início (OS) mostrava **"Sem ciclo"** sempre que a semana tinha 0 treinos, mesmo com **plano/prescrição ativa**. O Hub já distingue ciclo com plano; o Início não.
- A posição no ranking comparava só o **primeiro nome** com o nome exibido. Homônimos ou nomes truncados marcavam a pessoa errada (ou nenhuma).
- O destaque **Comunidade** abria um `EcoEmbed` com `backTo="/9fit/hub"` em vez da rota real `/9fit/community`. Ranking/social já iam para `/9fit/social`.
- Não havia regras puras testáveis para ciclo/treino/ranking do Início.

## O que foi feito

- Extraídas regras puras em `src/lib/osInicioStatus.ts`:
  - treinos da semana prevalecem;
  - plano ativo sem treino na semana → **"Ciclo ativo"** / **"Plano ativo"** (não "Sem ciclo");
  - sem plano confirmado → sem treino e sem ciclo;
  - ranking marca `self` pelo **id do atleta** (`fn_get_leaderboard.id`), com fallback de nome só se não houver id;
  - destaques resolvem rotas reais (`/9fit/community`, `/9fit/social`).
- `OSDashboard` passou a usar essas regras; CTA dos destaques sempre navega para a rota canônica; removido o overlay EcoEmbed do Início (comunidade fica na página dedicada).
- Regressão: `scripts/qa-fase3-inicio.mjs` (6 testes alinhados aos critérios acima).

## O que não foi mexido

- Hub, Train (Fases 1–2), Perfil, RON, painel do professor, APIs externas.
- Cálculo de `hasPlan` em `OS.tsx` (continua via `vw_fitpro_performance_overview.plan_title`).
- Página `Community.tsx` / `Social.tsx` em si — só o ponto de entrada a partir dos destaques.
- Checkout, prescrição server-side, GPS, migrações.

## Como validar

```bash
node --experimental-strip-types --test scripts/qa-fase3-inicio.mjs
```

Manual: login aluno → `/9fit/os` → com plano e 0 treinos na semana o status não deve dizer "Sem ciclo"; ranking deve destacar o atleta correto; toques em Comunidade e Ranking abrem `/9fit/community` e `/9fit/social`.

## Próximo passo

Fase 4 — Perfil: alinhar snapshot canônico, campos faltantes e consistência visual com Hub/Início/Train, sem reabrir o que as Fases 1–3 fecharam.
