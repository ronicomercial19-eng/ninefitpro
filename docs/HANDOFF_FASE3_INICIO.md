# Handoff — Fase 3 · Início

Data: 2026-11-01
Repositório: ronicomercial19-eng/ninefitpro
Branch: fix/hub-inicio-ciclo-honesto

## O que estava inconsistente

- O Início (`/9fit/os`) lia `plan_title` e, se a consulta falhasse, tratava como se não houvesse plano.
- O card de consistência dizia "Sem ciclo" sempre que a semana tinha zero treinos, mesmo com prescrição ativa. O Hub, com plano, diz "CICLO EM ANDAMENTO".
- "Sem prescrição ativa detectada" aparecia também quando a leitura ainda não tinha confirmado nada.
- Uma resposta antiga podia chegar depois da troca de atleta, porque a consulta não era cancelada.

## O que foi feito

- O Início usa o mesmo estado do Hub: lendo, ativo, ausente ou não confirmado.
- Zero treinos com plano confirmado mostra "Ciclo ativo" e "Plano ativo", não "Sem ciclo".
- Zero treinos sem plano confirmado continua "Sem ciclo" / "Sem treino".
- Falha ou ficha ainda não vinculada não afirma ausência de prescrição.
- A consulta do plano ignora resposta atrasada.

## O que não foi mexido

- Comando do dia, calibração, ranking, pilares de nutrição, foco, recuperação e ecossistema.
- Train, Perfil, RON, checkout e o painel do professor.
- A página do Hub além do selo de ciclo e da linha da biblioteca, já descritos na Fase 1.

## Próximo passo

Fase 4 — Perfil: não reabrir a limpeza de 01/11/2026. Só corrigir destino que ainda contradiga o Hub ou o Início.
