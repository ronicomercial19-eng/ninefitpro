# Handoff — Fase 1 · Hub

Data: 2026-10-27
Revisão: 2026-11-01
Repositório: ronicomercial19-eng/ninefitpro
Branch: main

## O que estava inconsistente

- O Hub pedia `vw_hub_status` e jogava o resultado fora. Um erro nessa view derrubava também plano e biblioteca, e o checklist de ativação nunca aparecia.
- "CICLO EM ANDAMENTO" aparecia mesmo sem plano ativo.
- Enquanto o plano ainda carregava, ou se a leitura do plano falhava, o selo caía em "SEM CICLO ATIVO" e o título virava "Defina seu objetivo". Ausência e falha pareciam a mesma coisa.
- O mesmo acontecia com a biblioteca: erro de contagem virava "Nenhuma intervenção prescrita disponível."
- Botões de teste "Enable Push" e "Conectar Bluetooth" ficavam no topo do Hub. Não gravam token nem dispositivo. O sino de notificações continua sendo o canal real.
- Explorar ecossistema no Hub só mostrava o título. O card desenhado (`EcosystemModuleCard`) não era usado. "Ver todos" abria um preview em vez da lista.
- Staff do ecossistema ia para a página fina `/9fit/native-system?app=staff`. O atalho Staff dos comandos ia para `/9fit/staff`. Os dois agora abrem a equipe.
- Laranja dos destaques e dos módulos ainda era `#FF6600`. O token do Hub é `#EF7A45`.

## O que foi feito

- Missões reais (avaliação, plano, primeiro treino, 3 dias, 7 dias) voltam ao Hub só quando ainda há pendência. Perfil não entra: a view não tem esse campo, então não marcamos tarefa falsa.
- Falha de uma leitura não apaga as outras.
- Selo do foco: "CICLO EM ANDAMENTO" só com plano confirmado. Sem plano confirmado: "SEM CICLO ATIVO". Leitura em curso: "LENDO CICLO". Falha ou atleta ainda sem ficha: "CICLO NÃO CONFIRMADO". O título deixa de pedir um objetivo novo nesses dois casos.
- A linha da biblioteca só diz que não há intervenção quando a contagem voltou vazia. Em carga ou erro, o texto diz que a biblioteca ainda não foi confirmada.
- Hub mostra 2 módulos em card e "Ver todos" abre `/9fit/modules`, já com a lista densa e o mesmo laranja.
- Toque no módulo com rota interna abre a tela. Sem rota, continua o preview.
- Atalho de teste de push/bluetooth saiu do Hub. Nada de notificação real foi removido.
- Página fina do Staff continua existindo; o card do ecossistema não aponta mais para ela.

## O que não foi mexido

- Train, Perfil, RON, painel do professor e APIs externas. O Início passou a usar o mesmo estado de ciclo; o detalhe está em [HANDOFF_FASE3_INICIO.md](HANDOFF_FASE3_INICIO.md).
- Checkout, prescrição, GPS, créditos e migrações.
- Atalhos de apoio no player que ainda usam `/9fit/native-system?app=staff`.
- Cor semântica do anel de sync (`#FF6600` no estado estável). Não é o laranja de destaque dos cards.

## Próximo passo

Fase 4 — Perfil: a auditoria de 01/11/2026 já limpou destinos. Conferir só o que a leitura desta revisão não reabriu.
