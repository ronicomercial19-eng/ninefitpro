# Handoff — Fase 2 · Train

Data: 2026-10-28
Repositório: ronicomercial19-eng/ninefitpro
Branch: fix/fase2-train-consistencia

## O que estava inconsistente

- No modo de assistência máximo, "Solicitar apoio do treinador" abria a página fina `/9fit/native-system?app=staff`. O Hub já abre a equipe em `/9fit/staff`.
- Depois de pausar o registro por dor, "Apoio profissional" ia para a mesma página fina.
- Falha ao confirmar sessões concluídas marcava erro de carga e escondia o treino do dia, a semana e o treino rápido. Os contadores também zeravam a faixa "Retomar ou finalizar" antes da nova consulta voltar.
- O Modo Foco e o botão que o abre ainda usavam `#FF6600`. A home do Treino e o Hub usam `#EF7A45`.

## O que foi feito

- Apoio do treinador e apoio após dor abrem `/9fit/staff`. A revisão do treino e o retorno do registro continuam iguais.
- Falha dos contadores mostra aviso e deixa a lista de treinos no lugar. Tentar de novo só relê os contadores. Uma falha da lista de treinos continua na tela de erro já existente.
- A faixa de sessão antiga só some quando a consulta confirma que não há sessão, ou quando troca o atleta.
- Destaques do player (Modo Foco e o botão na execução) passam a `#EF7A45`. Layout, textos e fluxo de série não mudaram.

## O que não foi mexido

- Hub, Início, Perfil, RON, painel do professor e APIs externas.
- Página da equipe: o card interno que abre `/9fit/native-system?app=staff` continua lá, como atalho do fluxo Cliente / Staff.
- Créditos (`ServiceCreditOptions`) ainda consultam a equipe pela página fina. Não faz parte do player.
- Checkout, prescrição, GPS, migrações e o laranja de marca fora do player de treino.
- Toast de recorde pessoal: também aparece fora do treino, então a cor dele ficou como estava.

## Próximo passo

Fase 3 — Início: conferir a jornada diária contra o Hub e o Treino, sem reabrir o que estas duas fases fecharam.
