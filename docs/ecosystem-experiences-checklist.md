# QA — experiências do ecossistema

Implementação de 02/10/2026. Testes funcionais a executar pelo responsável pelo aplicativo.

- [ ] Home/Hub: clicar em cada card deve abrir o módulo escolhido dentro do contêiner.
- [ ] Ver todos os módulos: navegar pelas setas e usar os controles sem sair do contêiner.
- [ ] Conferir fechar, Escape, foco do teclado e rolagem no celular.
- [ ] Conferir o botão Acessar módulo completo em todos os módulos.

| Módulo | Experiência para validar |
| --- | --- |
| Train / SmartTreino | Alterar objetivo, séries, repetições, descanso e lista de exercícios. |
| Ajuste de Treino | Experimentar séries, repetições e descanso sem alterar o treino real. |
| Planejamento / SmartPeriodizer | Organizar os sete dias e conferir quantidade de dias ativos. |
| Staff | Preparar interesse por profissional e data; não deve criar agendamento. |
| Prime Pass | Alternar treino, recuperação e assistente; não deve criar assinatura. |
| Biblioteca | Buscar exercícios reais e selecionar conteúdo disponível. |
| RON | Enviar mensagem e receber resposta real; conferir tratamento de erro. |
| Progress | Abrir históricos reais de treino e nutrição. |
| Move | Alterar distância e tempo e conferir ritmo e velocidade. |
| Store | Adicionar, marcar e remover itens da lista de interesse; não deve comprar. |
| Foods | Informar macros e conferir estimativa energética; não deve criar refeição. |
| HealthFlix | Buscar no catálogo real e abrir vídeos compatíveis; conferir ausência/erro. |
| Postura Pro | Preparar checklist e observações; não deve apresentar diagnóstico. |
| HabitFlow | Adicionar, concluir e remover hábitos do rascunho. |
| 9Zap | Alterar destinatário e mensagem e conferir prévia; não deve enviar. |
| Events | Preparar interesse por categoria/data; não deve reservar vaga. |
| Nexus | Adicionar, marcar e remover ações do rascunho. |

## Limites explícitos

Rascunhos são locais e temporários: mudar de módulo ou fechar descarta a experiência. Não são transferidos automaticamente ao sistema completo. Histórico e acervos são leituras reais; RON envia a mensagem ao serviço ai-coach. Vídeos externos dependem das permissões do provedor. Catálogo, disponibilidade, contratação, compras e registros definitivos continuam no sistema completo.

Não foi criado backend novo nem alteradas permissões do banco nesta entrega.
