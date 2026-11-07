# Handoff — Fase 4 · Perfil

Data: 2026-11-07
Repositório: ronicomercial19-eng/ninefitpro
Branch: main

## O que estava inconsistente

- Sem ficha vinculada, o Hub dizia que o acesso está pronto. O Perfil tratava o mesmo caso como falha: "Não foi possível confirmar os dados do perfil."
- A condição `!identityLoading || erro` marcava erro mesmo quando a consulta ainda não tinha terminado de forma útil, e o botão de tentar de novo só disparava `9fit:profile-updated`, sem reler a identidade.
- Com a leitura da ficha falhando, `useEngrenagem` também falha. Mostrar o cartão nesse estado colocaria nível 1, 0 XP e 0 dias como se fossem leitura real.

## O que foi feito

- O Perfil usa o mesmo aviso do Hub (`identityNotice`).
- Ficha confirmada como ausente: a frase do Hub, sem cartão de zeros.
- Falha de leitura: "Não foi possível confirmar sua ficha. Isso não significa que ela não existe." O botão chama de novo a consulta da identidade.
- Com atleta confirmado, o cartão, o erro de bio e o erro de pontos continuam como estavam.

## O que não foi mexido

- Destinos do menu (ficha, preferências, pagamento, notificações, dados, planejamento, ajuste, histórico, equipe, compartilhar, sair).
- Hub além do aviso de ficha, Train, Início, RON, checkout e o painel do professor.
- A limpeza de navegação de 01/11/2026.

## Próximo passo

Fase 5 — RON: conferir se uma falha do coach ainda aparece como conversa vazia ou resposta inventada. Não reabrir o aviso de ficha nem o brief semanal.
