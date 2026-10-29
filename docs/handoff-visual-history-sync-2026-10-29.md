Handoff 9FIT · Padronização visual, Histórico que aprende e Sync → Treino
Atualizado em 29/10/2026 · Rony (founder) + Claude · Repositório ronicomercial19-eng/ninefitpro (branch main)
0. Como ler este documento
Existem três trilhas que se conectam. Cada uma tem estado, arquivos, objetos de banco e pendências. A seção 5 mostra como uma depende da outra. Leia a 1 e a 5 primeiro. O resto é referência.
Trilha
Objetivo
Estado
A. Padronização visual
Hub, Início, Train → Hoje com a mesma linguagem (laranja chapado, sem glow) e feedback interno no toque
Entregue em 6 telas/componentes. Faltam telas secundárias
B. Histórico que aprende
Avaliação do professor = checkpoint master; autoavaliação guiada gera dados e entra no score com peso menor
Banco e tela entregues. Falta ligar ao treino e coletar sexo
C. Sync → Treino do dia
Check-in diário (Sync) ajusta o treino do dia, com devolutiva instantânea e explicação
Arquitetura e tabela v2 propostas. Nada implementado
Ambientes e identificadores
Item
Valor
Repositório
ronicomercial19-eng/ninefitpro, branch main
Supabase FitPro
mfrydtrzjxscbkaiwfnw
Projeto Lovable
9c713e4a-7db8-48ba-829c-18abc2bf4a27 (app: ninefitpro.lovable.app)
Deploy disparado em 29/10
991bef46-d5bd-4eb0-b595-63a302cf4087 (status "pending" no momento do disparo; confirmar que concluiu)
Atleta de teste
Fernanda, id 18fabf10-6ab7-4c09-8c5c-7169516043e2 (dados de teste, sem sexo cadastrado)
Core OS (separado)
Supabase hmppvtdlzsnxyiaozssu; não foi tocado nesta frente
Preferência de trabalho do Rony: respostas diretas, nada genérico, planos em sprint curto (não em 30 dias). Ele é a única pessoa decidindo e atua como professor e dev.
1. Visão em uma página
Hoje o app registra muito dado e devolve pouco. O fio condutor das três trilhas é "o sistema precisa mostrar que olhou para a pessoa":
1. A deixa a interface coerente, para a devolutiva parecer de um produto premium.
2. B faz as avaliações alimentarem um perfil de capacidade (o que a pessoa consegue, num horizonte de semanas).
3. C faz o check-in diário ajustar o treino (o que a pessoa está pronta para fazer hoje).
Ordem de composição de um treino no dia, da camada mais lenta para a mais rápida:
Plano da semana (wave / periodização)
   → ênfase por capacidade (trilha B, depende de aprovação)
      → ajuste por prontidão do dia (trilha C, Sync)
         → travas (treino iniciado, override do professor, tetos)
2. Trilha A · Padronização visual
2.1 Tokens (fonte da verdade)
Token
Valor
Laranja primário
#EF7A45, chapado, sem gradiente
Borda de card
rgba(239,122,69,0.25); ativa/selecionada: laranja 60% + fundo laranja 8%
Fundo de card
#0B0B0C (leve tom quente no topo, 4 a 5%)
Texto
título #FFF · corpo branco 65% · label neutro branco 45% · apoio branco 35%
Teal (só status/sync)
#5BC8E8
Raios
cards 24px (rounded-3xl), tiles 20px, botões 16px (rounded-2xl)
Labels mono
11px, tracking-[0.12em], uppercase
Ícones
traço 1,75; tile de ícone 56px com fundo laranja 12% e borda laranja 25%
Botão CTA
#EF7A45 chapado, texto branco semibold, sombra 0 8px 24px rgba(239,122,69,0.25)
Proibido
verde, âmbar como destaque, gradiente em botão, glow colorido, blob de fundo
Efeito de fundo permitido
malha de pontos (40%) e radar SVG a 5% de opacidade
2.2 O que foi entregue (todos na main)
Commit
Arquivo
O que mudou
8a0f7c60
components/9fit/FitOSConsoleDock.tsx
Hub: Foco Atual (borda laranja, badge laranja no lugar do verde, botão chapado) e Comandos & Sinais (6 tiles idênticos, bolinha só com hasNews, pb-20 pro botão flutuante RON)
3bc8fe67
components/9fit/HubRonCard.tsx
Card Ron IA: radial interno de 15% para 6%, hairline mais fraca, halo e sombra reduzidos, laranja #FF6600 → #EF7A45
bb569810
components/9fit/HubCommandDeck.tsx
Início: Comando do Dia (dial, métricas, botões); status verde/âmbar → teal
5c21bbf5
components/9fit/OSDashboard.tsx
Início: Atalhos do Dia (radar discreto) e Comunidade & Notícias. Modais de pilar não mudaram
a848f31b
components/9fit/WorkoutHome.tsx
Train → Hoje: hero, telemetria, modo de assistência, RON Concierge
39492a0b
pages/9fit/Train.tsx
Header, abas (Hoje, Semana, Protocolo, Streaming) e Treino Rápido; blob de fundo removido
186102e8
styles/touch-feedback.css + main.tsx
Feedback interno de toque/hover (ver 2.3)
892d1691
styles/orange-palette.css
Token global --primary: 19 84% 60% (era 18 100% 59%)
2.3 Como o feedback de toque funciona (e o risco)
• CSS global com seletores por atributo de classe (ex.: [class*="border-[#EF7A45]/25"][class*="cursor-pointer"]). Só box-shadow inset: não muda fundo, layout nem sombra externa (reaproveita --tw-shadow).
• Cards e tiles: brilho laranja interno 8% (hover) e 12% (toque), mais filete de borda. Botões laranja chapados: clarão branco interno 14% e 20%.
• main.tsx ganhou um touchstart vazio, necessário para o :active funcionar no iOS Safari.
• Risco: o efeito depende de as classes seguirem o padrão. Componente fora do padrão fica sem efeito. Se mudarem os tokens de borda/fundo, ajustar os seletores.
• Reverter o token global: apagar o bloco :root, .dark { --primary ... } em orange-palette.css. Ele afeta o app inteiro, inclusive possivelmente o painel do professor, se usar o mesmo repo. Conferir.
2.4 Pendências visuais
• Sobras nas telas já tratadas: TrainingAdjustmentBanner, UpsellBanner (variante cyan), TrainingHistory, Slider do modo de assistência, modais de pilar do Início (âmbar no ranking, botões com primary), NutritionCompactCard, NutritionTodaySummary, DailyGoalCheckins, HubFloatingMetrics.
• Telas inteiras: Train → Semana (WeeklyTrainingView), WorkoutOverview, WorkoutExecution, Perfil, Progresso/Histórico (AssessmentWorkspace e CSS assessment-workspace.css / assessment-v2.css), Metas, Staff, Store, Compromissos, Prime Pass, Comunidade, Biblioteca, Protocolo, Healthflix, Move GPS, tela do RON e BottomNavigation.
• Prioridade sugerida: Progresso/Histórico (já em obra na trilha B), Perfil, Semana, WorkoutExecution.
3. Trilha B · Histórico que aprende
3.1 Decisão de produto (Rony)
• Avaliação do professor gera o checkpoint master: base de comparação e recalibração.
• Avaliação guiada (autoavaliação) gera dados, histórico e métricas. Entra no score com peso menor que o do professor.
• Antes, a autoavaliação ficava fora do score oficial por regra de projeto (docs/assessment-history-delivery.md, e o teste de assessmentMetrics garante que a projeção de metas nunca usa autoavaliação). Metas e projeções continuam só com avaliação oficial. Atualizar esse documento.
3.2 Diagnóstico que originou a trilha (tela Histórico, dados da Fernanda)
Achado
Causa
"Score oficial" vazio
Só conta avaliação com professor; ela não tem nenhuma. Regra, não bug
Registro "0 medidas" em 20/10
fn_salvar_avaliacao_guiada_v2 salvava mesmo sem nenhuma medida (trava de 1 registro por atleta/data/origem)
Dados incoerentes
1RM de 140 a 180 kg com 58 a 60 kg de peso; peso de 86 kg em 22/10 contra 60 kg em 21/10
"Histórico que não aprende"
Funções de prescrição e Sync não leem avaliacoes_unificadas
Correção de rumo: em um ponto eu disse que as estimativas de 1RM não eram persistidas. Estava errado: a função salva o que o app envia; as colunas ficaram nulas porque o aluno não informou 1RM. O que é fixo é o selo ESTIMADO, gravado em todo registro guiado v2.
3.3 Objetos de banco (todos como migration; testados com rollback quando havia escrita)
Objeto
Função
fn_assessment_weight(jsonb)
Peso da avaliação: professor/oficial 1,0; autoavaliação guiada 0,4; guiada com confianca_score = ESTIMADO 0,24; sem score ou com 1RM implausível 0. Executável só por authenticated/service_role
fn_rm_plausible(chave, kg, peso, sexo)
Limite de carga/peso por exercício. Supino: M 2,5×, F 1,6×. Perna: M 5,0×, F 4,0×. Puxada: M 2,2×, F 1,5×. Puxar inferior: M 3,5×, F 2,8×. Sexo desconhecido usa o limite masculino
fn_assessment_weighted_score(_core)
Média ponderada dos últimos 120 dias, com meia-vida de 60 dias e reset pelo checkpoint master (autoavaliação anterior ao master sai do score, fica no histórico)
fn_athlete_capacity_profile(_core)
Perfil de capacidade: master, score por pilar (força, resistência, core, cardio, mobilidade) com data e fonte, pilar mais fraco, referências de 1RM válidas, score ponderado
fn_get_assessment_hub
Passou a devolver peso_score por avaliação (campo novo; não quebra clientes)
fn_salvar_avaliacao_guiada_v2
Exige ao menos 1 medida ou foto (erro 22023, dica guided_requires_measure)
fn_decidir_foco_dia
Devolve a chave capacidade (somente leitura; falha vira null; não altera protocolo nem exercícios)
As funções _core não têm checagem de auth e não são executáveis por anon/authenticated. As públicas checam fn_assessment_can_read.
3.4 Front (components/progress/AssessmentWorkspace.tsx, commits ae57708a e eef08a1f)
• Anel "Score global · ponderado" com contagem de avaliações do professor e autoavaliações.
• Gráfico do Histórico com pontos de autoavaliação menores e mais claros; tooltip mostra o peso.
• Card Perfil de capacidade no Resumo (lê fn_athlete_capacity_profile).
• Rótulos do Histórico: "Checkpoint master · base atual do seu plano", "Anterior ao checkpoint master · fora do score", "Valores fora do plausível · não entra no score", "Registro vazio".
• Duplicação de lógica: o front recalcula o score ponderado com a mesma fórmula do banco. Risco de divergência; o ideal é ler o RPC.
3.5 Resultado de referência (Fernanda)
Data
Score
Peso
22/10
46,7
0,24
21/10, 05/10, 02/10
75 / 76,7 / 60
0 (1RM implausível)
20/10
vazio
0
01/09, 29/08, 25/07
24,2 / 20 / 40
0,4
Score ponderado ≈ 32,5; pilar mais fraco força (24), vindo do dado antigo de 01/09.
3.6 Pendências da trilha B
1. Ênfase por pilar fraco no treino (aguarda aprovação). Proposta: se o pilar mais fraco for core, mobilidade ou cardio e estiver abaixo de 50, entra 1 exercício desse grupo no bloco de reset do dia. Força e resistência seguem a wave. Nenhum bloco principal é substituído. Respeita as travas atuais.
2. Coletar sexo no cadastro. 37 de 38 atletas não têm. Sem isso a trava de 1RM é frouxa.
3. Carga sugerida a partir de 1RM: só depois de haver 1RM com professor ou confirmado pelo aluno. Hoje workout_exercise_sets tem carga em 1 de 213 séries.
4. Atualizar docs/assessment-history-delivery.md e os testes que descrevem a regra antiga.
5. Validar build e testes do projeto (não foram rodados por mim). O supabase.rpc está com cast porque a função não está nos tipos gerados.
4. Trilha C · Sync → Treino do dia
4.1 O que já existe e deve ser reaproveitado
Peça
Onde
Observação
Check-in
daily_checkins (sono, energia, humor, motivação, dor, dor_local, alimentacao)
Quiz EmojiCalibrationQuiz: 5 perguntas × 5 emojis. Dor é invertida no banco (5 = muita dor). A coluna alimentacao existe e não é perguntada
Sync
private.fitpro_daily_readiness
((sono−1)·30 + (energia−1)·30 + ((6−dor)−1)·20 + (humor−1)·10 + (motivação−1)·10) / 4, escala 0 a 100
Modos
services/adaptiveState.ts
power / low / balanced (o "high" do Rony é power). Inferência só por Sync e texto; não altera treino
Geração do treino
prescrever_treino, fn_decidir_foco_dia
Protocolo vem da wave. Treinos sem carga gravada
Ajuste
AjusteTreino.tsx, training_adjustment_recommendations/deliveries/feedback
Em obra (corrigido em 26/10: 4198232, d23b10f)
Auditoria
workout_adjustment_versions (antes/depois dos exercícios)
Base para reversão
Travas
daily_workouts.override_locked, changes_json, workout_executions.status
prescrever_treino já recusa quando há treino iniciado
Treino rápido
QuickTrainModal → rota /9fit/train com state.quickTraining
Pergunta energia e tempo por conta própria (segunda fonte de "energia")
Perfil
athlete_pdi_history
Ver alerta na 4.5
Descanso
athlete_day_reviews.training_choice = 'rest'
Botão "Hoje vou descansar"
4.2 Princípios
1. Assimétrico: reduzir é fácil, aumentar é difícil (risco de lesão).
2. Determinístico: regra em tabela versionada. IA não decide carga.
3. Um único ponto de aplicação para treino semanal, treino rápido e ajuste.
4. Idempotente e reversível: nunca soma ajuste sobre ajuste.
5. Transparente: toda mudança mostra motivo e valor real.
6. Não diagnostica: dor reencaminha ao professor.
4.3 Parametrização v2 (proposta; valores iniciais, não calibrados)
Alavancas: V volume (séries), R teto de RPE, D descanso, W aquecimento extra. Pesos do Sync mantidos (sono 30, energia 30, dor 20, humor 10, motivação 10).
Pergunta
1
2
3
4
5
Sono
V−14 · R−1 · D+15s · W+4min
V−8 · R−0,5 · D+10s · W+3
0
0
V+3
Energia
V−12 · R−1 · W+3
V−7 · R−0,5
0
V+3
V+5
Humor
V−4 + mensagem de apoio
V−2
0
0
V+1
Motivação
V−8, sessão curta, modo Low
V−4
0
V+1
V+2
Dor (1 = muita)
V−20 + gate 2
V−10 + gate 1
V−3, monitorar
0
0
Combinação
• Reduções: maior + 50% da segunda + 25% do resto. Teto −30%.
• Aumentos: só se sono ≥ 4, energia ≥ 4, dor nenhuma/quase nenhuma, fora de deload e de semana de teste. Teto +10%, aplicado como +1 série no exercício principal, nunca como carga.
• Arredondamento: séries são inteiras. Tirar primeiro das acessórias; mínimo de 1 série por exercício; bloco principal nunca zerado. Mostrar o percentual real aplicado (ex.: "−2 séries, cerca de 10%").
Interações
• Sono ≤ 2 e energia ≤ 2: Low, sem série até a falha.
• Sono bom e energia baixa: possível doença ou estresse, pedir reconfirmação.
• Dor leve ou média numa zona do PDI confirmado: sobe um nível de cautela.
• Motivação baixa com energia boa: encurta a sessão e mantém a intensidade (objetivo é adesão).
• Mesmas respostas por 5 dias: baixa confiança, pedir confirmação.
Camadas de contexto (depois das respostas)
Sinal
Regra inicial
Idade do check-in
até 4 h: 100% · 4 a 10 h: 80% · acima de 10 h: 60% e pergunta de novo "energia agora?"
Carga recente
3 dias seguidos com RPE ≥ 8: −5% · última sessão com RPE ≥ 9: −3% · parado há 7 dias ou mais: sem Power e início em −10%
Tendência da Sync
3 dias em queda: −3% · 3 dias baixos seguidos: sugerir deload e avisar o Staff
PDI confirmado
recuperação lenta ×1,25 nas reduções, rápida ×0,85; baixa tolerância a volume ×1,2 e sem aumento
Wave
deload e semana de teste: nunca aumentar
Tipo de sessão
cardio/corrida ajusta tempo e pace, não séries
Treino rápido
usar o mais restritivo entre tempo disponível e ajuste da Sync
Hidratação e alimentação
lembrete antes do treino, sem cortar volume
Ordem de cálculo: respostas → interações → contexto → PDI → tetos e travas → modo → alavancas → texto.
Modos
Modo
Gatilho
Efeito
Low
total ≤ −10%, motivação 1, ou dor média/muita
volume reduzido, RPE −1, foco em técnica
Balanced
demais casos
treino como prescrito
Power
total ≥ +10% e nenhum gate
+1 série no principal, dentro do teto da periodização
Exemplo. Sono ruim, energia baixa, dor leve, humor ok, motivação média, check-in de 2 h atrás: V = −8 + 50% de −7 + dor leve com peso menor ≈ −12%; modo Low; R−0,5, D+10s, W+3 min. Texto: "Dormiu mal e a energia está baixa: −2 séries, descanso +10s e aquecimento +3 min. Foco em técnica hoje."
4.4 Fluxo da dor
• Muita (gate 2): abre o Ajuste de Treino, pergunta o local (dor_local), cruza com PDI e restrições, troca ou remove exercícios da região e oferece "hoje vou descansar".
• Média (gate 1): pergunta o local e sugere troca.
• Dor alta por 3 dias seguidos: alerta o professor (Staff) e recomenda avaliação profissional.
• Sinais de alerta (detectados por detectPain): interromper e orientar a procurar atendimento. O app não diagnostica.
4.5 Alertas de dados que condicionam a trilha
• PDI parece preenchido por padrão: 21 de 31 estão "aggressive"; 21 de 31 têm volume_tolerance = 9; 23 de 31 têm injury_zones = ["hip"]. Só usar o PDI depois de confirmado pelo atleta ou professor (novo campo de confirmação).
• Falta o mapa zona → exercício. injury_zones são articulações (hip, knee, shoulder); exercises.muscle_groups são grupos musculares. Sem tabela de contraindicações, o fluxo da dor não é seguro.
• Pouco dado para calibrar: 21 check-ins de 3 atletas. 38 treinos concluídos (37 com RPE de sessão). RPE e carga por série: praticamente vazios.
• Sono → risco de lesão é bem sustentado; motivação → lesão é mais fraco. Motivação baixa entra como adesão, não como risco clínico.
• LGPD: sono, humor e dor são dado de saúde. Consentimento claro e tela "dados usados hoje".
4.6 Ponto único de aplicação
fn_apply_readiness_to_workout(daily_workout_id), idempotente. Roda:
1. quando o check-in é salvo e já existe treino do dia;
2. ao tocar em Iniciar treino (check-in pode ter vindo depois da geração);
3. quando o treino rápido é criado.
Regras: guarda o treino-base em changes_json.readiness e sempre recalcula a partir dele; grava antes/depois em workout_adjustment_versions; não mexe em treino iniciado nem em override_locked (nesse caso mostra só sugestão, porque a autoridade é do professor); sem check-in, treino original com chamada para fazer o check-in.
4.7 Dados novos
Tabela
Colunas principais
readiness_rules
rule_set_version, question, answer_value, volume_pct, rpe_delta, rest_delta_s, warmup_add_min, gate_level, mode_hint, reason_key, copy_variants (3 textos por regra), active
readiness_context_modifiers
signal_key, bucket, volume_pct, flags, copy_variants
daily_readiness_decisions
athlete_id, decision_date, checkin_id, rule_set_version, mode, volume_pct_total, volume_pct_applied, rpe_cap_delta, rest_delta_s, warmup_add_min, gate_level, flags, reasons (jsonb), applied_workout_id, status (shadow, applied, skipped_locked, skipped_no_workout, superseded)
injury_zone_contraindications
zone, muscle_group ou exercise_id, severity
confirmação do PDI
campo/colunas confirmed_at, confirmed_by
Funções: fn_compute_readiness_decision (pura e testável) e fn_apply_readiness_to_workout. O modo passa a vir da decisão gravada, não do inferUserState: RON, Hub e treino leem a mesma fonte.
4.8 UX (a sensação de ser acompanhado)
1. Tela de resultado ao fechar o check-in: Sync, modo e o que muda no treino de hoje, na hora.
2. Banner no Hoje e ao iniciar o treino, uma frase: "Seu treino foi reduzido em 10% do volume de acordo com sua Sync de hoje." Com "Ver motivo" e "Ver treino original". Mostrar só os 2 motivos de maior impacto; o resto em "Ver detalhes".
3. Power: "Sinais no pico: +1 série no exercício principal hoje."
4. Três variações de texto por regra, para o RON não repetir a mesma frase.
5. Visual no padrão da trilha A (laranja chapado, sem verde, teal só para status).
4.9 Aprendizado em ciclo fechado
Depois do treino, comparar o RPE real (workout_executions.rpe/avg_rpe) com o esperado. A partir de 10 decisões por atleta, ajustar um multiplicador individual, com teto entre 0,8 e 1,25. É assim que o histórico deixa de só listar e passa a aprender.
4.10 Sprints
Sprint
Entrega
Critério de aceite
0
Tabela lesão → exercícios contraindicados; confirmação do PDI; coleta de sexo
Tabela cobre articulações do PDI; PDI com flag de confirmação; sexo no cadastro
1
readiness_rules, função de decisão, modo sombra (calcula e grava, não aplica) por ~1 semana
Matriz de ~30 cenários passa; decisão idempotente; nenhum treino alterado
2
Aplicar no treino do dia (semanal e rápido), versões e travas
Recheck-in não soma ajuste; treino iniciado e override_locked intocados; teste com rollback nos atletas com periodização
3
Tela de resultado, banner e fluxo da dor com PDI
Fluxo de dor leva ao Ajuste de Treino com contexto; texto mostra o valor real aplicado
4
RON/Hub leem a decisão gravada; alerta ao Staff; recalibragem com dados reais; aprendizado individual
Sem divergência de modo entre telas; percentuais ajustados com RPE real
5. Como as trilhas se conectam
Item
Depende de
Libera
Tokens e feedback de toque (A)
—
Banner, tela de resultado e card de capacidade já nascem no padrão
Perfil de capacidade (B)
Peso, plausibilidade e checkpoint master
Ênfase por pilar fraco; RON com contexto de longo prazo
Sexo no cadastro (B/C)
Tela de cadastro
Trava de 1RM mais forte; personalização futura
Confirmação do PDI e tabela de contraindicações (C, Sprint 0)
Decisão do Rony sobre quem confirma
Fluxo da dor, multiplicadores por PDI
Decisão gravada de prontidão (C)
Regras, check-in, daily_workouts
RON, Hub, banner e aprendizado
Treino rápido unificado (C)
Decisão gravada
Fim da segunda fonte de "energia"
Ênfase por capacidade (B) e ajuste da Sync (C)
Ordem de composição da seção 1
Evita dupla penalização: teto total de −30% sobre o treino original
Aprendizado individual (C)
RPE real em workout_executions
Calibra percentuais e responde ao "histórico que não aprende"
Compartilham dados: athlete_pdi_history (B/C), workout_executions (C, aprendizado), daily_checkins (C, Sync) e avaliacoes_unificadas (B). Nenhuma mexe no Core OS.
6. Decisões
Já tomadas pelo Rony: autoavaliação entra no score com peso menor; professor gera o checkpoint master; Sync ajusta o treino do dia (inclusive no treino rápido), nos dois sentidos; percentuais por emoji devem ser finos e dar sensação de acompanhamento.
Defaults adotados, salvo objeção: aumento só como +1 série no principal; reduções automáticas com "ver treino original"; tetos −30%/+10%; modo sombra por ~1 semana antes de aplicar.
Pendentes de aprovação:
1. Tabela de parametrização v2 (seção 4.3) como v1 oficial das regras.
2. Regra de ênfase por pilar fraco (3.6, item 1).
3. Quem confirma o PDI (atleta, professor ou ambos).
4. Se metas e projeções podem passar a considerar autoavaliação (hoje não, de propósito).
7. Riscos e cuidados
• Token global --primary afeta o app inteiro; verificar o painel do professor se compartilhar o repo.
• fn_decidir_foco_dia é executável por anon e prescrever_treino gera treino de todos os atletas. Qualquer mudança nelas exige teste com rollback e não pode lançar erro.
• Sem sexo cadastrado, a plausibilidade de 1RM usa o limite masculino. Funciona, mas barra menos.
• Selo ESTIMADO fixo faz toda autoavaliação nova pesar 0,24. Revisar quando houver teste de 1RM confirmado.
• Dado de teste no ambiente: Fernanda tem avaliações com valores irreais; não usar como base de calibração.
• Duplicação da fórmula do score no front e no banco.
• Feedback de toque por seletor de classe: frágil se os tokens mudarem.
• Calibração: 3 atletas com check-in. Não ajustar percentuais antes do modo sombra.
• Privacidade: dados de saúde sensíveis; consentimento e transparência antes de aplicar.
8. Checklist de validação no celular (após o deploy)
1. Hub: Foco Atual, tiles de Comandos & Sinais, card Ron IA (sem brilho forte, sem verde).
2. Início: Comando do Dia, Atalhos do Dia, Comunidade; toque nos cards mostra o brilho interno discreto.
3. Train → Hoje: abas, Treino Rápido, hero, telemetria, assistência, RON Concierge.
4. Slider e botões "Concierge" com o novo primary (não podem destoar).
5. Progresso → Resumo: anel ponderado, card Perfil de capacidade.
6. Progresso → Histórico: pontos de tamanhos diferentes, rótulos de peso, registro vazio esmaecido, linha com 1RM implausível sem score.
7. Salvar uma avaliação guiada vazia: deve mostrar erro "Informe ao menos uma medida".
8. Painel do professor (se compartilhar o repo): verificar o token primary.
9. Confirmar que o deploy 991bef46… concluiu.
9. Referência rápida
Arquivos tocados: FitOSConsoleDock.tsx, HubRonCard.tsx, HubCommandDeck.tsx, OSDashboard.tsx, WorkoutHome.tsx, Train.tsx, AssessmentWorkspace.tsx, styles/touch-feedback.css, styles/orange-palette.css, main.tsx.
Arquivos a tocar na trilha C: EmojiCalibrationQuiz.tsx, adaptiveState.ts, QuickTrainModal, TrainingAdjustmentBanner.tsx, AjusteTreino.tsx, WorkoutExecution, tela de cadastro (sexo) e telas que exibem modo/Sync (Hub, RON).
Migrations aplicadas (Supabase FitPro): assessment_weighted_score_self_counts_with_lower_weight, guided_assessment_require_at_least_one_measure, guided_assessment_guard_null_safe, assessment_master_checkpoint_and_capacity_profile, assessment_weight_rm_plausibility_gate, capacity_core_functions_and_foco_dia_exposes_capacidade, revoke_anon_fn_assessment_weight.
Próximo passo imediato: o Rony aprovar a tabela v2 (seção 4.3) e decidir quem confirma o PDI. Com isso começa o Sprint 0.