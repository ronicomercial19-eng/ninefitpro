# Handoff — Fase 1 · Hub

Data: 2026-10-27
Revisão: 2026-11-07
Repositório: ronicomercial19-eng/ninefitpro
Branch: main

## O que estava inconsistente

- O Hub pedia `vw_hub_status` e jogava o resultado fora. Um erro nessa view derrubava também plano e biblioteca, e o checklist de ativação nunca aparecia.
- "CICLO EM ANDAMENTO" aparecia mesmo sem plano ativo.
- Enquanto o plano ainda carregava, ou se a leitura do plano falhava, o selo caía em "SEM CICLO ATIVO" e o título virava "Defina seu objetivo". Ausência e falha pareciam a mesma coisa.
- O mesmo acontecia com a biblioteca: erro de contagem virava "Nenhuma intervenção prescrita disponível."
- O brief da semana fazia o mesmo com treino e alimentação. Sem snapshot, o Hub mostrava "Sem treino registrado", "Sem refeições", barra 0/5 e a frase pedindo para começar uma sessão. Peso virava "Não registrado", sequência "0 dias" e engajamento "Sem leitura" antes da leitura voltar.
- Um refresh do snapshot marcava o score como "loading" e, no Início, escondia a semana que já tinha sido confirmada.
- Botões de teste "Enable Push" e "Conectar Bluetooth" ficavam no topo do Hub. Não gravam token nem dispositivo. O sino de notificações continua sendo o canal real.
- Explorar ecossistema no Hub só mostrava o título. O card desenhado (`EcosystemModuleCard`) não era usado. "Ver todos" abria um preview em vez da lista.
- Staff do ecossistema ia para a página fina `/9fit/native-system?app=staff`. O atalho Staff dos comandos ia para `/9fit/staff`. Os dois agora abrem a equipe.
- Laranja dos destaques e dos módulos ainda era `#FF6600`. O token do Hub é `#EF7A45`.
- O aviso do topo dizia que o professor ainda não vinculou a ficha sempre que não havia `athleteId`. Uma falha de `fn_current_athlete_id` parecia ausência de ficha.

## O que foi feito

- Missões reais (avaliação, plano, primeiro treino, 3 dias, 7 dias) voltam ao Hub só quando ainda há pendência. Perfil não entra: a view não tem esse campo, então não marcamos tarefa falsa.
- Falha de uma leitura não apaga as outras.
- Selo do foco: "CICLO EM ANDAMENTO" só com plano confirmado. Sem plano confirmado: "SEM CICLO ATIVO". Leitura em curso: "LENDO CICLO". Falha ou atleta ainda sem ficha: "CICLO NÃO CONFIRMADO". O título deixa de pedir um objetivo novo nesses dois casos.
- A linha da biblioteca só diz que não há intervenção quando a contagem voltou vazia. Em carga ou erro, o texto diz que a biblioteca ainda não foi confirmada.
- Sem snapshot, o brief diz "Lendo treinos da semana" ou "Treinos da semana não confirmados". A barra não desenha 0/5. Peso, sequência e engajamento dizem "Lendo" ou "Não confirmado".
- Com snapshot, zero continua zero. "Sem treino registrado esta semana" só depois da leitura. Um refresh não apaga a semana já confirmada.
- O Início usa a mesma regra nos pilares de treino, nutrição e consistência, e no comando do dia. O detalhe está em [HANDOFF_FASE3_INICIO.md](HANDOFF_FASE3_INICIO.md).
- Hub mostra 2 módulos em card e "Ver todos" abre `/9fit/modules`, já com a lista densa e o mesmo laranja.
- Toque no módulo com rota interna abre a tela. Sem rota, continua o preview.
- Atalho de teste de push/bluetooth saiu do Hub. Nada de notificação real foi removido.
- Página fina do Staff continua existindo; o card do ecossistema não aponta mais para ela.
- O aviso "Seu acesso está pronto…" só aparece quando a consulta confirma que não há ficha. Se a leitura falha, o Hub diz que a ficha não foi confirmada e oferece tentar de novo. O selo continua "CICLO NÃO CONFIRMADO" nos dois casos. O texto compartilhado está em `src/components/9fit/identityNotice.ts`. O Perfil usa a mesma frase, descrito em [HANDOFF_FASE4_PERFIL.md](HANDOFF_FASE4_PERFIL.md).

## O que não foi mexido

- Train, Perfil, RON, painel do professor e APIs externas. O selo de ciclo do Início permanece como na Fase 3.
- Checkout, prescrição, GPS, créditos e migrações.
- Atalhos de apoio no player que ainda usam `/9fit/native-system?app=staff`.
- Cor semântica do anel de sync (`#FF6600` no estado estável). Não é o laranja de destaque dos cards.
- Textos do comando do dia, calibração e ranking. Só a faixa numérica da semana deixou de aparecer antes do snapshot e de sumir num refresh.

## Próximo passo

Fase 2 — Train: conferir se o player ainda trata falha de contador como treino vazio. O handoff anterior está em [HANDOFF_FASE2_TRAIN.md](HANDOFF_FASE2_TRAIN.md). Não reabrir o selo de ciclo nem o brief semanal.
