# Inventário visual do 9FIT PRO

Atualizado em 09/11/2026. As rotas abaixo foram extraídas de `src/App.tsx` e agrupadas por superfície. Rotas com `Navigate` são aliases, não telas independentes.

## 1. Marketing, entrada e suporte

| Rota | Tela | Prioridade visual |
|---|---|---|
| `/` | Home / landing principal | Média — comparar com a direção do app autenticado |
| `/treinar` | Página comercial para alunos | Média |
| `/sales` | Página comercial para profissionais | Média |
| `/auth` | Login geral | Alta — superfície de entrada visualmente separada |
| `/login` | Alias do login geral | Alias de `/auth` |
| `/register` | Alias de cadastro/login | Alias de `/auth` |
| `/auth/callback` | Callback de autenticação | Técnica, sem auditoria visual prioritária |
| `/forgot-password` | Recuperação de senha | Média |
| `/assessment` | Avaliação pública | Média — validar responsividade e estados de formulário |
| `/suporte` | Suporte público | Média |
| `/whatsapp-redirect` | Redirecionamento para WhatsApp | Técnica, sem tela relevante |
| `*` | NotFound | Média — precisa manter a mesma linguagem visual |

## 2. App profissional — `/app`

Todas as rotas abaixo usam `PrivateRoute + AppLayout`, portanto devem ser auditadas como um sistema único: sidebar, cabeçalho, largura de conteúdo, cards, tabelas, filtros, modais, estados vazios e responsividade.

| Rota | Tela | Prioridade visual |
|---|---|---|
| `/app` | Dashboard profissional | Alta — tela de referência da área profissional |
| `/app/alunos` | Alunos | Alta — tabela/lista complexa |
| `/app/exercicios` | Exercícios | Média |
| `/app/super-series` | Super séries | Média |
| `/app/series-referencia` | Séries de referência | Média |
| `/app/smart-treino` | Smart Treino | Alta — produto central |
| `/app/smart-periodizer` | Smart Periodizer | Alta — fluxo complexo |
| `/app/fit-copilot` | Fit Copilot | Média |
| `/app/treino-ia` | Treino IA | Média |
| `/app/assistente-ia` | Assistente IA | Média |
| `/app/analise-ia` | Análise IA | Média |
| `/app/estatisticas` | Estatísticas | Alta — gráficos e densidade de dados |
| `/app/relatorios` | Relatórios | Alta — exportação, filtros e tabelas |
| `/app/agenda` | Agenda | Alta — interação e navegação temporal |
| `/app/roadmap` | Roadmap | Média |
| `/app/configuracoes` | Configurações | Alta — muitos agrupamentos de formulário |
| `/app/healthflix` | HealthFlix administrativo | Média |
| `/app/postura-pro` | Postura Pro administrativo | Média |
| `/app/ron` | RON professor | Alta — experiência conversacional |
| `/app/acompanhamento` | Workspace de acompanhamento | Alta |
| `/app/mensagens` | Mensagens profissionais | Alta |
| `/app/ajustes-treino` | Ajustes de treino | Alta — fluxo operacional |
| `/app/nexus` | Nexus | Média |
| `/app/monetizacao` | Monetização | Alta — dados financeiros e estados de cobrança |
| `/app/community` | Community admin | Média |
| `/app/academy` | Academy admin | Média |
| `/app/alunos-assinaturas` | Assinaturas de alunos | Alta — billing/tabela/status |
| `/app/configuracao-webhook` | Configuração de webhook | Alta — tela técnica e sensível |
| `/app/skills` | Skills / gerenciamento | Média |
| `/app/modelos-ninefit` | Modelos NineFit | Média |

## 3. Produto aluno — autenticação e ativação

| Rota | Tela | Prioridade visual |
|---|---|---|
| `/9fit` | Alias do login 9FIT | Alias de `/9fit/login` |
| `/9fit/login` | Login do 9FIT | Alta — referência de entrada do produto |
| `/9fit/onboarding` | Onboarding | Alta — primeiro contato autenticado |
| `/9fit/first-access` | Primeiro acesso | Alta — fluxo de ativação |
| `/9fit/entrada` | Entrada do cliente | Alta — ponte entre compra, cadastro e app |
| `/9fit/ativacao` | Ativação do atleta | Alta — fluxo guiado |

## 4. Produto aluno — navegação principal e módulos

Estas rotas usam `NineFitLayout`, com `NineFitTopBar`, `BackButton`, `PaidAccessGate`, `RonBubble` e, em várias telas, `BottomNavigation`. Devem compartilhar tokens, espaçamentos e comportamento de navegação.

| Rota | Tela | Prioridade visual |
|---|---|---|
| `/9fit/hub` | Hub principal | Alta — principal referência do app aluno |
| `/9fit/os` | Fit OS / dashboard operacional | Alta |
| `/9fit/train` | Treino | Alta — tela da referência visual enviada |
| `/9fit/profile` | Perfil | Alta |
| `/9fit/dieta` | Dieta | Alta |
| `/9fit/foods` | Alimentos | Média |
| `/9fit/acompanhamento` | Acompanhamento | Alta |
| `/9fit/mensagens` | Mensagens | Alta |
| `/9fit/notificacoes` | Notificações | Média |
| `/9fit/social` | Social | Média |
| `/9fit/community` | Community | Média |
| `/9fit/staff` | Staff / profissionais | Média |
| `/9fit/ron` | RON | Alta — experiência conversacional |
| `/9fit/healthflix` | HealthFlix | Média |
| `/9fit/habit-flow` | Habit Flow | Média |
| `/9fit/habitflow` | Alias de Habit Flow | Alias de `/9fit/habit-flow` |
| `/9fit/elite-bio` | Elite Bio | Média |
| `/9fit/kitchen` | Kitchen | Média |
| `/9fit/recovery` | Recovery | Alta — saúde/recuperação |
| `/9fit/protocolo` | Protocolo | Alta |
| `/9fit/protocols` | Protocolos | Alta |
| `/9fit/protocols/:category` | Categoria de protocolos | Alta — rota dinâmica |
| `/9fit/protocols/:category/:id` | Detalhe de protocolo | Alta — rota dinâmica |
| `/9fit/aulas-creditos` | Aulas e créditos | Alta — relação com acesso/consumo |
| `/9fit/planejamento` | Planejamento | Alta |
| `/9fit/biblioteca` | Biblioteca | Média |
| `/9fit/progresso` | Progresso | Alta — gráficos e histórico |
| `/9fit/progresso/:view` | Subtelas de progresso | Alta — rota dinâmica |
| `/9fit/avaliacao/:id` | Avaliação | Alta — rota dinâmica |
| `/9fit/avaliacao/:id/:section` | Seção da avaliação | Alta — rota dinâmica |
| `/9fit/avaliacao-guiada` | Avaliação guiada | Alta |
| `/9fit/postura-pro` | Postura Pro | Alta |
| `/9fit/move` | Move | Média |
| `/9fit/modules` | Todos os módulos | Alta — densidade de cards |
| `/9fit/collections` | Coleções | Média |
| `/9fit/native-system` | Sistema nativo | Média |
| `/9fit/compartilhar` | Compartilhar | Média |
| `/9fit/embed` | Embed de ecossistema | Média — validar navegação de retorno |
| `/9fit/pos-treino` | Pós-treino | Alta — modal/fluxo de conclusão |
| `/9fit/ajuste-treino` | Ajuste de treino | Alta |
| `/9fit/settings` | Configurações 9FIT | Alta |

## 5. Planos, cobrança e pagamento

Este grupo foi reformulado no commit `60d45d5` e deve ser usado como referência para outras telas financeiras.

| Rota | Tela | Situação |
|---|---|---|
| `/9fit/primepass` | Prime Pass | Reformulada |
| `/9fit/planos` | Planos | Reformulada |
| `/9fit/prime` | Prime / billing | Reformulada |
| `/9fit/billing` | Alias de cobrança | Reformulada via Prime Pass |
| `/9fit/oferta/:offerId` | Oferta dinâmica | Próxima auditoria — ainda pode estar fora do shell de cobrança |
| `/9fit/checkout/:offerId` | Checkout | Reformulada para `basic` e `annual`; validar ofertas legadas |
| `/9fit/checkout/basic` | Checkout mensal | Reformulada |
| `/9fit/checkout/annual` | Checkout anual | Reformulada |
| `/9fit/checkout/success` | Sucesso de checkout | Alta — conferir consistência com retorno de pagamento |
| `/9fit/pagamento/retorno` | Retorno do pagamento | Reformulada |

## 6. Aliases e rotas técnicas

| Rota | Destino |
|---|---|
| `/dashboard` | Redireciona para `/app` |
| `/9fit/onboarding-pro` | Redireciona para `/9fit/hub` |
| `/9fit/stats` | Redireciona para `/9fit/progresso` |
| `/9fit/aulas` | Redireciona para `/9fit/aulas-creditos` |
| `/9fit/home` | Redireciona para `/9fit/os` |
| `/9fit/perfil/fontes` | Redireciona para `/9fit/progresso/fontes` |
| `/9fit/avaliacao` | Redireciona para `/9fit/progresso/historico` |
| `/9fit/progresso/recordes` | Usa `NineFitProgresso` |
| `/9fit/premium` | Usa `NineFitPrimePass` |
| `/9fit/store` | Redireciona para `/9fit/native-system?app=store` |

## Prioridade recomendada para a próxima checagem visual

1. `/9fit/oferta/:offerId` e `/9fit/checkout/success`, para fechar o fluxo financeiro reformulado.
2. `/9fit/onboarding`, `/9fit/first-access`, `/9fit/entrada` e `/9fit/ativacao`, porque são telas de alta importância e podem usar shells diferentes.
3. `/9fit/hub`, `/9fit/os`, `/9fit/train`, `/9fit/progresso` e `/9fit/profile`, para garantir consistência no núcleo de navegação.
4. `/app/alunos`, `/app/estatisticas`, `/app/relatorios`, `/app/agenda`, `/app/configuracoes` e `/app/alunos-assinaturas`, por serem superfícies densas e com maior risco de desalinhamento.
5. `/9fit/modules`, `/9fit/protocols/:category`, `/9fit/avaliacao/:id/:section`, `/9fit/pos-treino` e `/9fit/ajuste-treino`, por concentrarem fluxos dinâmicos, overlays e estados de interação.

## Observação

A matriz acima é uma auditoria estrutural baseada nas rotas, layouts e componentes existentes. A classificação “Alta” indica prioridade para inspeção visual, não necessariamente que a tela esteja quebrada. A confirmação final deve ser feita em viewport mobile e desktop, incluindo loading, vazio, erro, sucesso, modal e rolagem longa.
