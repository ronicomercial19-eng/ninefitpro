# Handoff — Fase 3 · Início

Data: 2026-11-01
Revisão: 2026-11-05
Repositório: ronicomercial19-eng/ninefitpro
Branch: main

## O que estava inconsistente

- O Início (`/9fit/os`) lia `plan_title` e, se a consulta falhasse, tratava como se não houvesse plano.
- O card de consistência dizia "Sem ciclo" sempre que a semana tinha zero treinos, mesmo com prescrição ativa. O Hub, com plano, diz "CICLO EM ANDAMENTO".
- "Sem prescrição ativa detectada" aparecia também quando a leitura ainda não tinha confirmado nada.
- Uma resposta antiga podia chegar depois da troca de atleta, porque a consulta não era cancelada.
- Nutrição dizia "Nenhuma refeição registrada" e "Sem registro" enquanto o snapshot do Hub ainda não tinha voltado. O mesmo zero falso entrava em treino e consistência.
- A cada atualização, o comando do dia escondia treinos, minutos e nutrição já lidos, porque o status do score voltava para "loading".

## O que foi feito

- O Início usa o mesmo estado do Hub: lendo, ativo, ausente ou não confirmado.
- Zero treinos com plano confirmado mostra "Ciclo ativo" e "Plano ativo", não "Sem ciclo".
- Zero treinos sem plano confirmado continua "Sem ciclo" / "Sem treino".
- Falha ou ficha ainda não vinculada não afirma ausência de prescrição.
- A consulta do plano ignora resposta atrasada.
- Sem snapshot, treino, nutrição e consistência dizem que a semana está sendo lida ou não foi confirmada. Não usam o zero provisório.
- Com snapshot, o comando do dia mantém os números da semana mesmo durante um refresh ou um erro que não apagou a última leitura.

## O que não foi mexido

- Texto do comando do dia, calibração, ranking, pilares de foco, recuperação e ecossistema.
- Train, Perfil, RON, checkout e o painel do professor.
- A página do Hub além do selo de ciclo, da linha da biblioteca e do brief semanal, já descritos na Fase 1.

## Próximo passo

Fase 4 — Perfil: não reabrir a limpeza de 01/11/2026. Só corrigir destino que ainda contradiga o Hub ou o Início.
