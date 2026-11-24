# NINE PRO — acessos em diagonais e gráficos sob demanda

## Direção solicitada
Correção visual do Início e da ocupação de espaço pelos gráficos do Hub. O usuário esclareceu que a divergência era de design, não do destino dos botões.

## Início
Os quatro cartões principais foram substituídos por cinco linhas diagonais paralelas, com cores distintas, emoji abaixo e nome legível. Acessos: Treino, Nutrição, Evolução, RON e Hub. Os destinos existentes permanecem; Nutrição conserva o diálogo de alimentação e água. O Hub ganha um acesso direto nessa faixa.

Os elementos têm nomes acessíveis e áreas de toque de pelo menos 44px. Emoji e traço são decorativos; texto e semântica de link/botão identificam a ação. Animação de hover desativada quando o usuário prefere movimento reduzido.

## Hub
Os quatro gráficos e os detalhes dos registros ficam dentro do cabeçalho “Ver gráficos da rotina”, fechado ao entrar na página. Abrir e recolher funcionam com botão nativo, aria-expanded e região identificada. As curvas só são montadas quando abertas, sem ocupar altura na página quando fechadas.

Salvar registros continua disponível fora do painel. A seleção de data e os registros ficam no componente pai, mantendo a atualização ao reabrir. Agregação, geometria SVG, persistência e autorização não foram alteradas.

## Integração com a main recente
A correção de leitura confirmada de coverageReadState foi preservada: falha de atualização não descarta a semana já confirmada; erro sem leitura anterior continua indisponível. As alterações recentes do RON e do painel de anúncios foram mantidas.

## Validação
- Tipos, lint dos componentes novos, build e orçamento de entrega.
- 148 testes de regressão aprovados na base atualizada.
- Início e Hub em 320/390/768/1440 px, sem rolagem horizontal. Cinco acessos, cores, emojis, destinos e diálogo de Nutrição conferidos.
- Hub fechado inicialmente, abrir/recolher e ausência dos SVGs quando fechado.
- Salvar água com gráficos fechados e conferir a atualização ao abrir; exclusão de autorrelato; navegação por datas/teclado; recálculo de escala e posição dos pontos.
- Estados vazio, carregando, erro inicial e falha de atualização com dados preservados. APIs simuladas, sem gravações reais.

Capturas locais: output/home-diagonals-*.png, output/hub-experience-*.png e output/hub-*.png. Scripts: qa-student-experience.mjs home hub e qa-hub-visual.mjs, com Playwright configurado no ambiente de QA.
