# Checkpoint de integração e Planejamento do aluno

Data: 9 de outubro de 2026. Alterações apenas nos checkouts locais de FitPro, SmartTreino e Smart Periodizer. Nenhuma migração, função ou interface deste checkpoint foi publicada.

## Contrato implementado

- `athletes.id` é a identidade canônica. `athlete_periodizations` aponta para o plano anual ativo. O SmartTreino lê a atribuição e resolve mesociclo e semana pela data; sem plano, mantém o modo independente.
- Cada `daily_workouts` criado pelo SmartTreino passa a registrar `periodization_plan_id`, `periodization_assignment_id`, fase, semana, origem e snapshot da regra usada. A publicação é atômica por sessão e preserva qualquer prescrição já existente no dia.
- Doses fora da faixa da fase e distância lançada como repetições são recusadas. Planos de endurance identificados pelo modelo 06 do Periodizer agora geram segmentos tipados em metros/segundos/zonas, com frequência dentro do catálogo; pace e velocidade explícitos são preservados. A geração de força continua recusando distância como repetição.
- A execução do FitPro usa `daily_workout_id`; uma trava de banco impede alterar exercícios e campos de prescrição quando a sessão foi iniciada. O feedback existente passa a guardar IDs das execuções, atribuição e revisão temporal do plano usado. A geração repetida não reabre recomendações já decididas. O aplicador recusa plano alterado e propostas de planejamento que o RPC legado não sabe executar, em vez de anunciar aplicação falsa. O circuito de adaptação ainda não está concluído.
- A entrega só retorna sucesso após conferir atleta e sessão recuperável com exercícios ou segmentos, gravar recibo em `fitpro_events` e confirmar seu ID. A credencial de serviço é enviada apenas ao endpoint do mesmo projeto Supabase. A semana entrega todas as sessões, inclusive duas no mesmo dia, com recibos idempotentes.

## Tela do aluno

O `PlanejamentoPro` fornecido no ZIP foi adaptado ao FitPro. Lê a view publicada `vw_athlete_periodizacao_ativa`, execução real e projeção de força apenas quando há ponto realizado. Exibe mapa do plano, presença, carga e esforço conforme dado disponível, explicações por variável, calendário e RON contextual. O shell mantém PDI, sincronização com fallback, atualização por evento/realtime e acesso ao Train. A tela também informa se a sessão de hoje do plano está disponível, iniciada, concluída, pendente ou com problema.

O Train e a semana apresentam sessões de resistência por segmentos, sem converter metros em repetições. Uma RPC separada inicia/conclui endurance e registra tempo, distância e RPE realizados; treinos mistos mantêm o player de força e salvam o bloco de cardio antes da conclusão. A autorização da RPC usa o atleta da sessão autenticada, e o gatilho impede trocar a prescrição após iniciar.

No perfil do aluno, a atribuição de modelo/HTML/PDF foi distinguida da criação do plano científico: há acesso direto ao wizard do Smart Periodizer para aquele `athletes.id`. Na tela do aluno sem plano e sem professor vinculado, há acesso à criação em autogestão. O wizard do Periodizer agora aceita o próprio atleta autogerido e retorna ao dashboard do aluno ao concluir; professor vinculado mantém seu caminho. Essas rotas ainda exigem teste autenticado nos dois produtos.
O mesmo perfil do professor leva ao builder do SmartTreino para o atleta selecionado. O aluno pode escolher autogestão no FitPro sem perder o vínculo de coach exigido pelo esquema atual. Esse modo explícito controla quem edita plano e sessões: professor no modo profissional, dono no modo autogestão. O builder passa a aceitar o aluno nesse modo, com política de banco correspondente; a automação ignora regras de um autor que deixou de ser o gestor vigente. A geração de endurance devolve sessões tipadas ao builder, para que a interface não trate uma semana publicada como resposta vazia.
A leitura da semana no FitPro deixa de invocar o gerador legado dentro de um `SELECT` e de silenciar sua falha. Quando existe plano mas nenhuma sessão publicada, o aluno vê "geração pendente". A versão atualmente publicada da função ainda chama `fn_generate_periodized_week` implicitamente; a migração local altera esse comportamento.

O seletor de duração do wizard agora determina semanas reais de macro e mesociclos para 3, 6, 9, 12 e 16 meses. O bloco curto preserva uma semana final de recuperação e omite a intensificação quando só há três semanas; a soma das semanas é testada para todas as opções.
O wizard só informa entrega depois de ler de volta a atribuição `in_progress` do mesmo atleta e plano. Se a atribuição falhar após salvar o plano, repetir a ação usa o plano já salvo, evitando criar uma segunda cópia apenas por retry.

A definição atual da view publicada foi capturada em migração antes da migração de `security_invoker`; isso versiona a leitura usada pela UI. Os arquivos entregues pelo usuário foram tratados como especificação e referência, com ajustes onde descreviam `sets_range` como volume semanal por grupo ou sugeriam iniciar uma sessão ainda indisponível.

## Validação local

- FitPro: typecheck sem erros; oito testes de autorização e roteamento passaram; build oficial do Vite produziu bundle e service worker PWA.
- SmartTreino: dezesseis testes de contrato e 16 testes Vitest passaram, incluindo semana/fase, distribuição 80/20, deload, pace explícito e rejeição de `400 m` como repetições. Typecheck do frontend e build oficial passaram. Periodizer: quatro testes de autorização/duração, typecheck e build oficial passaram.
- As onze migrações novas nos três checkouts passaram no parser PostgreSQL `pglast`; isso comprova sintaxe, não compatibilidade com dados, RLS ou execução real.
- `git diff --check` passou nos três repositórios.
- Para o build de produção, Vite usa a transformação TSX padrão; o SWC permanece no servidor de desenvolvimento. Assim, o build oficial pode ser executado neste host sem depender do binding SWC para produção.

## Limites antes da revisão para publicação

- Nenhuma migração ou Edge Function nova foi aplicada no Supabase. A UI que consulta as novas colunas deve ser publicada apenas depois das migrações e funções correspondentes.
- Endurance já tem geração e execução tipadas e preserva pace e velocidade quando prescritos explicitamente; a modalidade mista ainda precisa de validação científica específica de dose por bloco e teste integrado.
- Não houve teste autenticado de professor e aluno sintéticos em ambiente isolado. O usuário fará a validação final de produto após revisar o pacote.
- Os três repositórios compartilham um projeto Supabase. Os fontes locais de `fitpro-api` em FitPro e Periodizer foram alinhados pela versão que reúne as rotas de sincronização, leitura, ajuste e recibo. A implantação deve usar a mesma revisão de ambas as cópias.



