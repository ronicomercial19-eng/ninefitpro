# Evolução do Score em Progresso

## Objetivo
Adicionar o histórico completo do score global entre “Corridas recentes” e “Insights Personalizados”, sem alterar as seções ou dados atuais.

## Implementação
- Ampliar o tipo de retorno da tela com `score_historico: { data: string; valor: number }[]`.
- Criar estado próprio e preencher no `load()` com datas em PT-BR e valores numéricos, seguindo o fluxo da tendência de gordura.
- Renderizar um gráfico SVG com linha, pontos e área em gradiente, calculado pela série completa com escala dinâmica de mínimo e máximo.
- Exibir uma mensagem de dados insuficientes quando houver menos de dois registros.
- Manter o card no padrão visual existente e exatamente na posição solicitada.

## Validação
- Executar a verificação de tipos.
- Executar o build completo.
