# Fechamento operacional de /app/*

Entrega complementar ao PR #102. Escopo: contratos, módulos, permissões, dados e confirmação das operações. QA com contas reais permanece com o usuário.

| Rotas | Entrada → operação → conclusão |
| --- | --- |
| `/app`, `/app/estatisticas`, `/app/relatorios` | Carteira autorizada e período → agregação canônica → indicadores coerentes e CSV real. |
| `/app/alunos`, `/app/acompanhamento` | Aluno selecionado → ficha e contexto canônico → gravação confirmada e leitura dos registros vinculados. |
| `/app/exercicios` | Busca/filtros/página → acervo real → seleção para prescrição; respostas antigas de busca são descartadas. |
| `/app/super-series`, `/app/series-referencia` | Nome e exercícios reais com parâmetros → modelo persistido → carregamento explícito no editor → revisão → publicação ao aluno. Modelos antigos vazios são identificados e precisam ser completados; nenhum treino histórico é reescrito. |
| `/app/smart-treino`, `/app/fit-copilot` | Aluno atual → prescrição, análise ou revisão de ajuste → destinos profissionais preservando contexto. |
| `/app/smart-periodizer` | Rascunhos revisados → publicação transacional de ciclo → sessões e planejamento no aluno. Não promete progressão automática de cargas. |
| `/app/treino-ia` | IA, edição manual ou modelo → rascunho → revisão obrigatória → publicação canônica com versão, recibo e notificação. |
| `/app/assistente-ia`, `/app/analise-ia`, `/app/ron` | Aluno autorizado → chamada contextual → resposta e histórico privado profissional. Sugestões não executam alterações automaticamente. |
| `/app/agenda` | Horário e aluno → criação/alteração com bloqueio de conflitos → confirmação e agenda vinculada. |
| `/app/ajustes-treino` | Recomendação → aceitar/rejeitar → prévia ou editor manual → alteração concreta e prova de entrega, preservando sessões iniciadas. |
| `/app/healthflix` | Catálogo externo + local reconciliados → publicação/correção/ocultação com confirmação → mesmo catálogo efetivo usado pelo aluno. Ocultar não apaga o original externo nem os registros de execução. |
| `/app/postura-pro` | Aluno e foto privada → processamento com limite de tempo → apenas resultado concluído é apresentado como avaliação. |
| `/app/mensagens` | Texto e aluno → registro único → conversa humana e notificação do destinatário, separadas de RON e Equipe. |
| `/app/community` | Abertura da gestão no módulo externo, em outra aba; o painel local permanece aberto. Não há contrato de importação das tribos implementado nesta rota, nem promessa de SSO ou sincronização por simplesmente cadastrar uma chave. |
| `/app/roadmap` | Mapa navegável dos fluxos implementados, sem percentuais estáticos apresentados como QA ou disponibilidade. |
| `/app/configuracoes` | Perfil/preferências/senha → confirmação de persistência/Auth → retorno à configuração. |
| `/app/monetizacao` | Admin → oferta com URL HTTPS e checkout obrigatório quando ativa → gravação confirmada. Criação possui UUID estável para evitar duplicação em repetição. Oferta publicada não confirma pagamento. |
| `/app/skills` | Admin → gravação/importação → Skill e ativação global na mesma transação. Desativação/remove limpa a ativação; edição incrementa versão para invalidar conteúdo compilado. JSON inválido não é ignorado silenciosamente. |
| `/app/nexus` | Admin → consulta de conectores e registros → configuração e eventos visíveis, com erro recuperável. Configurado não equivale a serviço disponível ou entrega concluída. |
| `/app/modelos-ninefit` | Admin → revisão de status → RPC precisa confirmar registro encontrado. Escrita e revisão administrativa também são protegidas no banco. |

## Correções transversais

- Menu e guardas de rota coerentes: NEXUS e modelos administrativos não aparecem ao professor; recusa de rota administrativa devolve o profissional para `/app`.
- Conectores: chaves são gravadas no [Supabase Vault](https://supabase.com/docs/guides/database/vault). O navegador recebe apenas o sufixo; leitura do segredo é restrita ao backend. A configuração não inventa referência de variável de ambiente. Referências legadas de ambiente continuam suportadas no proxy.
- Proxy administrativo exige identidade canônica ativa, destino HTTPS, caminho relativo, GET e resposta JSON sem erro declarado. Não envia chaves em redirecionamentos. O health check confirma resposta do endpoint, sem certificar integração completa.
- Sincronizar fica indisponível onde não há operação de sincronização implementada. Não há atualização de timestamp apresentada como sincronização real.
- HealthFlix usa chave no Vault quando configurada, mantém fallback de ambiente existente, valida perfil e vínculo e limita chamadas externas. A sincronização da biblioteca exige autenticação real, informa falhas parciais e preserva publicações locais com override.
- Fábrica de conectores não envia mais token FitPro em URL de outro aplicativo nem simula SSO. O cache é limpo na troca de sessão.
- Cache das Skills guarda somente o texto compilado; sinais fisiológicos atuais são montados a cada uso.

## Backend e verificações de engenharia

Migração `20261024000440_professor_module_delivery_closure.sql` aplicada ao projeto `mfrydtrzjxscbkaiwfnw`.

Funções ativas e fontes conferidas: `api-connector-proxy` v49, `healthflix-proxy` v45, `sync-library-full` v52. OPTIONS 200 e POST sem autenticação 401 nas três. Não foram usados pacientes reais, enviados emails/mensagens externas ou feitas compras.

Contratos SQL: 14 verificações adicionais aprovadas antes/depois da publicação, junto à suíte anterior, dentro de BEGIN/ROLLBACK. Cobrem exercícios dos modelos, contagem derivada, modelo vazio, escopo, ativação/desativação/exclusão de Skills, versão, permissão administrativa e armazenamento/rotação de segredo fictício. Nenhuma fixture persiste.

Testes Node: 33 da suíte principal e 19 de acesso/protocolos/integração aprovados. Fase 2, Macro 02, QA Master e Macro 03 aprovados. TypeScript, build e CI são verificados antes do merge. O build mantém avisos anteriores de bundle grande e html2canvas; lint das alterações não tem erros.

Advisor novo: a RPC administrativa de configuração é SECURITY DEFINER acessível a authenticated, com verificação explícita de administrador ativo no corpo; exposição intencional. [Referência do advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Disponibilidade, credenciais e contratos dos provedores externos continuam sendo dependências operacionais. A entrega não transforma Comunidade em CRUD nativo, não inventa um contrato externo e não declara QA real concluído. Publicação Lovable e validação real permanecem com o usuário.
