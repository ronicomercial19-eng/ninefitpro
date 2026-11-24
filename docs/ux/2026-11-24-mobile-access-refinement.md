# Início — refinamento dos acessos no celular

A captura enviada pelo usuário exibia os cartões anteriores; a versão pública foi consultada e já continha as diagonais. O pedido de melhorar o desenho mobile foi aplicado ao componente atual.

## Ajustes
- Cinco acessos mantidos lado a lado, com diagonal, cor, emoji e nome.
- Superfície individual com cantos cortados e contorno sutil, deixando a área de toque reconhecível.
- Faixa mais compacta no celular, traço acompanhado de uma sombra gráfica e nomes maiores.
- Descrição auxiliar no desktop; celular preserva apenas a informação essencial.
- Paleta RGB sem dependência de color-mix para os fundos; fontes nativas de emoji.
- Destinos e diálogo de alimentação preservados; sem mudança na gravação de dados ou permissões.

## Fidelidade e validação
A fixture de validação passou a carregar também orange-palette, touch-feedback, experience-theme e brand-nine, com a superfície student e a grade do Início. A prévia anterior carregava apenas index.css e não reproduzia todos os estilos globais do produto.

Foram conferidos 320×568, 390×844, 768×960 e 1440×960: nomes sem corte, cinco áreas de toque de pelo menos 44px, destinos, check-in, abertura/fechamento de alimentação e ausência de rolagem horizontal. Tipos, lint, build e checks do GitHub completam a entrega. Também foram testados contextos móveis com toque, hover desativado e densidade de pixels 2 nas duas menores telas. A validação é responsiva em navegador; o emoji pode variar com o sistema do aparelho.

Capturas: output/home-diagonals-*.png e output/inicio-*.png. Reproduzir com PLAYWRIGHT_MODULE configurado e node scripts/qa-student-experience.mjs home hub.
