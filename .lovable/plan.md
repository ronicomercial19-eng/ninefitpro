# Evolução visual da tela Progresso

## Objetivo
Melhorar a hierarquia e a leitura da tela sem remover conteúdo, alterar consultas, estados ou ações existentes.

## Alterações
- Reorganizar o resumo superior em uma grade 3/2: Avaliação Atual em destaque e Composição Corporal/Força Total compactas e empilhadas.
- Adicionar uma sparkline discreta ao card principal usando a série de gordura já carregada, sem criar dados simulados.
- Ampliar o gráfico de gordura para 150px e exibir o valor junto de cada ponto.
- Não desenhar massa muscular histórica enquanto a resposta atual fornecer apenas o valor mais recente.
- Substituir as barras horizontais de força por um gráfico vertical comparativo, limitado visualmente a 150 kg, com badges de variação.
- Destacar recordes com troféu e tratamento laranja/dourado; diferenciar corridas com ícone e tratamento neural/azulado.
- Aumentar o espaçamento entre as seções principais e o respiro do card superior em destaque.

## Preservação funcional
- Manter `fn_get_ron_progresso_screen`, transformação de dados, loading, erros, estados vazios, metas, check-in, histórico, criação de recorde e navegação sem mudanças.
- Manter `RecordesSection` apenas como ação de criação; a lista continuará vindo da RPC principal.

## Validação
- Executar o typecheck do projeto.
- Executar o build completo.
- Conferir a tela em viewport mobile e desktop, verificando legibilidade, ausência de sobreposição e presença de todas as seções.
