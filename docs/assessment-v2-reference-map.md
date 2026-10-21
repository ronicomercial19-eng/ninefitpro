# Histórico e avaliações: referências consolidadas

Referências fornecidas em 21/10/2026: `FitPro — Minhas Avaliações.html` e `FitPro — Minhas Avaliações – v2 · Meta e projeção.html`.

O primeiro arquivo é um painel com treze quadros. Foram selecionados os onze quadros v2. Os quadros “v1 · Hoje” e “v1 · Dossiê (descartado)” não orientam a implementação. O segundo arquivo confirma e detalha o quadro v2 de meta.

| Quadro selecionado | Destino |
| --- | --- |
| Resumo e primeira avaliação | `/9fit/progresso` |
| Capacidades | `/9fit/progresso/capacidades` |
| Histórico | `/9fit/progresso/historico` |
| Detalhe da avaliação | `/9fit/avaliacao/:id` |
| Fontes de dados | `/9fit/progresso/fontes` |
| Próxima reavaliação | `/9fit/progresso/reavaliacao` |
| Teste de 1RM | `/9fit/avaliacao/:id/1rm` |
| Gordura por dois métodos | `/9fit/avaliacao/:id/composicao` |
| Cardio em detalhe | `/9fit/avaliacao/:id/cardio` |
| Meta e projeção | `/9fit/progresso/meta` |

## Adaptação aos dados existentes

- Score oficial, capacidades, datas, medidas, fontes e metas vêm dos serviços existentes. Valores ilustrativos dos arquivos não foram copiados para perfis reais.
- Os cinco pilares canônicos do contrato atual foram preservados. Não são inventados scores de potência, composição, níveis ou limites de “Elite” ausentes do contrato.
- Massa muscular mantém a unidade do banco (kg); o percentual ilustrativo do mockup não substitui a unidade real.
- Progresso da meta considera o valor inicial, inclusive para metas decrescentes. O gráfico usa as medidas oficiais disponíveis. A data exige quatro dias de avaliação compatíveis, com mesma métrica, unidade, protocolo e método corporal, sem dados estimados ou autoavaliações.
- Medições de velocidade da barra só geram gráfico quando trazem origem do sensor. Tentativas continuam separadas do 1RM final validado.
- Conexões de dispositivos e importação de exames não são simuladas: esta entrega apresenta fontes registradas, preferências e resultados que o backend já fornece.
- Histórico de sessões, cargas, recordes e gerenciamento de metas continuam acessíveis, recolhidos em áreas próprias.
- Avaliação guiada iniciada pelo Progresso retorna ao Histórico; o fluxo original de ativação continua disponível para os demais acessos.

## Validação

Testes de projeção cobrem quantidade mínima, direção da tendência, metas decrescentes, unidades, protocolo, duplicação por data e exclusão de estimativas. Build e TypeScript devem passar antes da publicação. A visualização autenticada requer conferência com um perfil real; a tentativa de acesso à prévia local pelo navegador disponível falhou.
