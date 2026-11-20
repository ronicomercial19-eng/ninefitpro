# Handoff — Fase 1 · Hub

Data: 2026-10-27
Revisão: 2026-11-20
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
- Em 16/11/2026 a checklist de ativação saiu do Hub (foi para Perfil > Meu app > Ativações) e os dois cards de destaque do grid (Staff e SmartTreino) saíram. A entrada "Explorar ecossistema" e o botão "Ver módulos" continuam abrindo `/9fit/modules`.
- O console do Hub (`FitOSConsoleDock`) ainda pintava a barra de consistência em 0% quando `barPercent` era nulo, e ainda colava `· 0/5 sessões` no brief sempre que o objeto da semana existia. O texto dizia "lendo", a barra parecia zero.
- O registro rápido, antes da primeira leitura, mostrava "0 de 7 dias com registro" e a barra cheia em zero. Falha ao ler o plano alimentar esvaziava as refeições e o botão oferecia "Escolher refeição", como se não houvesse plano.
- O card "Sua alimentação hoje" dizia "sem meta prescrita" enquanto a leitura ainda não tinha voltado, ao lado de kcal em traço. Se um refresh falhava depois de um dia já lido, o card escondia kcal e plano e o resumo deixava de mostrar os números. O pedido ao RON ainda narrava "nenhum" plano e zero refeições.

## O que foi feito

- Missões reais (avaliação, plano, primeiro treino, 3 dias, 7 dias) não ficam mais no Hub. Vivem em Perfil > Meu app > Ativações (`src/pages/9fit/Ativacao.tsx`), que lê `vw_hub_status` por conta própria. Perfil não entra na missão: a view não tem esse campo.
- Falha de uma leitura não apaga as outras.
- Selo do foco: "CICLO EM ANDAMENTO" só com plano confirmado. Sem plano confirmado: "SEM CICLO ATIVO". Leitura em curso: "LENDO CICLO". Falha ou atleta ainda sem ficha: "CICLO NÃO CONFIRMADO". O título deixa de pedir um objetivo novo nesses dois casos.
- A linha da biblioteca só diz que não há intervenção quando a contagem voltou vazia. Em carga ou erro, o texto diz que a biblioteca ainda não foi confirmada.
- Sem snapshot, o brief diz "Lendo treinos da semana" ou "Treinos da semana não confirmados". A barra não desenha preenchimento. O sufixo `· N/5 sessões` só entra com a semana confirmada (`weekSessionSuffix`). Peso, sequência e engajamento dizem "Lendo" ou "Não confirmado".
- Com snapshot, zero continua zero. "Sem treino registrado esta semana" e `0/5` só depois da leitura. Um refresh não apaga a semana já confirmada.
- O Início usa a mesma regra nos pilares de treino, nutrição e consistência, e no comando do dia. O detalhe está em [HANDOFF_FASE3_INICIO.md](HANDOFF_FASE3_INICIO.md).
- Hub não mostra mais os dois cards de módulo. "Ver módulos" e "Explorar ecossistema" abrem `/9fit/modules`.
- Atalho de teste de push/bluetooth saiu do Hub. Nada de notificação real foi removido.
- Página fina do Staff continua existindo; o card do ecossistema não aponta mais para ela. O atalho Staff do console abre `/9fit/staff`.
- O aviso "Seu acesso está pronto…" só aparece quando a consulta confirma que não há ficha. Se a leitura falha, o Hub diz que a ficha não foi confirmada e oferece tentar de novo. O selo continua "CICLO NÃO CONFIRMADO" nos dois casos. O texto compartilhado está em `src/components/9fit/identityNotice.ts`. O Perfil usa a mesma frase, descrito em [HANDOFF_FASE4_PERFIL.md](HANDOFF_FASE4_PERFIL.md).
- Registro rápido: enquanto a leitura não volta, o rótulo é "Lendo os últimos 7 dias" e a barra não recebe valor. Se a primeira leitura falha, "Últimos 7 dias não confirmados". Uma leitura já confirmada não é apagada por um refresh que falha. Zero real continua "0 de 7 dias com registro".
- Falha da view de dieta não zera o plano já lido e o botão de nutrição diz "Plano não confirmado" em vez de pedir para escolher uma refeição que não foi lida.
- Alimentação de hoje: antes da primeira leitura, o card diz "Lendo a alimentação de hoje" e "Lendo a meta". Kcal fica em traço. Falha sem leitura anterior diz "Alimentação de hoje não confirmada" e "Meta não confirmada", não "sem meta prescrita". Se já havia leitura, um refresh que falha mantém plano, kcal e meta e avisa "atualização não confirmada". O texto enviado ao RON e ao Staff, sem leitura confirmada, não inventa plano nem zero refeições. Uma exceção na consulta também vira falha, em vez de deixar o card em "Carregando" para sempre.

## O que não foi mexido

- Train, Perfil, RON, painel do professor e APIs externas. O selo de ciclo do Início permanece como na Fase 3.
- Checkout, prescrição, GPS, créditos e migrações.
- Atalhos de apoio no player e o atalho Store do console, que ainda usam `/9fit/native-system`.
- Cor semântica do anel de sync (`#FF6600` no estado estável). Não é o laranja de destaque dos cards (`#EF7A45`).
- Textos do comando do dia, calibração e ranking. A faixa numérica da semana no Início continua escondida enquanto o snapshot não chega (`weeklyKnown`).
- Bloqueio manual de acesso e splash de marca, entregues em 18/11/2026, ficaram como estão.

## Como conferir

- Sem snapshot: brief sem "Sem treino", sem `0/5`, barra sem preenchimento laranja.
- Com snapshot vazio: "Sem treino registrado esta semana" e `· 0/5 sessões`.
- Registro rápido, antes da resposta: "Lendo os últimos 7 dias", não "0 de 7".
- Alimentação de hoje, antes da resposta: "Lendo a meta", não "sem meta prescrita". Com dia já lido e refresh falho: kcal e nome do plano continuam, com "atualização não confirmada".
- Testes: `src/lib/__tests__/hubWeeklyBrief.test.ts`, `src/lib/__tests__/hubQuickCoverage.test.ts` e `src/lib/__tests__/nutritionTodayCopy.test.ts`.

## Próximo passo

Fase 2 — Train: conferir se o player ainda trata falha de contador como treino vazio. O handoff anterior está em [HANDOFF_FASE2_TRAIN.md](HANDOFF_FASE2_TRAIN.md). Não reabrir o selo de ciclo nem o brief semanal.
