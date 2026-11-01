# Perfil e navegação — auditoria de 01/11/2026

## Versões verificadas
- Git origin/main e Lovable (9c713e4a-7db8-48ba-829c-18abc2bf4a27) estavam no mesmo commit: 5bccdd23bb6f348a4190b1f64d71855c25a4382d.
- O checkout original fitpro estava 49 commits atrás, com alterações locais. Ele foi preservado. A entrega foi preparada sobre o commit atual em uma cópia isolada, branch codex/profile-navigation-cleanup.
- As correções de histórico, ajuste, notificações e cabeçalho desta conversa foram reintegradas preservando PaidAccessGate, controle de acesso da IA, periodização e distinção entre treino rápido e treino planejado.
- Banco e training-ai-adjust já estavam atualizados na etapa anterior; a migração aplicada está incluída no código com a mesma versão do banco, 20261101220515.

## Componentes e destinos do Perfil

| Entrada anterior | Destino/comportamento após revisão |
| --- | --- |
| Configurações (título do Perfil) | Perfil; preferências têm página própria em /9fit/settings |
| DigitalIDCard | Mantido; edição, completar cadastro e compartilhamento carregam ao abrir |
| CompleteProfileFlow extra no Perfil | Removido; era montado sem nenhum comando que o abrisse |
| PDI / DynamicPDI / PDIWizard | Uma entrada em /9fit/profile?section=pdi, com splash acessível e carregamento sob demanda; Settings aponta para ela |
| Equipe | /9fit/staff; a lista de profissionais deixou de ser consultada apenas para desenhar um badge no Perfil |
| Planejamento | /9fit/planejamento; fluxo mantido |
| Ajuste de treino | /9fit/ajuste-treino; sem badge Novo permanente; periodização e publicação preservadas |
| RON | Acesso pelo cabeçalho e /9fit/ron; o chat, histórico, agenda e voz não são inicializados antes de solicitar |
| Histórico | /9fit/progresso; entrada por métrica, sem seleção obrigatória da origem |
| Compartilhar | /9fit/compartilhar; compartilhamento do ID permanece no próprio DigitalIDCard |
| Compartilhar ID Card extra | Removido o CTA com template=id_card, que a página de destino não consumia |
| Pagamento e plano | /9fit/primepass; condições e status continuam no fluxo existente |
| Explorar mais opções | Removido o atalho repetido; Hub permanece na navegação principal |
| Cupons | Removido o atalho incorreto que abria Fitness Place, sem ferramenta de cupons |
| Preferências e suporte | Entrada explícita em /9fit/settings, incluindo player, animações e AppSupport |
| Notificações | /9fit/notificacoes |
| Meus dados | /9fit/progresso/fontes |
| Sair | Logout existente e retorno a /9fit/login |

## Limpeza
- 96 arquivos órfãos removidos (357.396 bytes de código-fonte), incluindo cinco páginas sem rota ativa, componentes antigos e dependências exclusivas deles.
- Manifesto completo: audits/profile-navigation-removed-20261101.json. Todos eram arquivos rastreados no Git e podem ser recuperados pelo histórico.
- Rastreio inclui imports estáticos, exports, imports dinâmicos/lazy, scripts, servidor e SDK. A verificação considera também importadores de testes antes de remover um módulo.
- Entradas de integração documentadas (src/services/index.ts e src/sdk/zap-sdk.ts) e contratos usados por testes/servidor foram preservados, mesmo sem aparecer no bundle do navegador.
- Nenhuma página órfã ou componente órfão de 9fit permaneceu no grafo. A rota RON foi mantida: o arquivo pequeno é um destino válido que ativa o chat global.
- Menos arquivos não significa, por si só, menos download: o ganho de execução vem sobretudo de adiar ficha, formulários, compartilhamento e RON. A remoção dos órfãos reduz manutenção e superfície de compilação.

## Verificações técnicas
- 17 destinos literais nos seis componentes centrais do Perfil/formulários: todos registrados. Evidência em audits/profile-navigation-routes-20261101.json.
- scripts/audit-navigation.mjs reproduz o grafo; scripts/audit-profile-routes.mjs verifica os destinos.
- Os dez testes de histórico e ajuste e os 82 testes da suíte unitária existente passaram durante a integração.
- Checagem TypeScript concluída sem erros.
- Build de produção concluído com páginas separadas; persistem avisos de tamanho em chunks existentes. O chunk principal passou de cerca de 1,22 MB para 758 KB entre as compilações desta revisão após adiar o RON; isso não representa o tamanho total do app.
- QA visual e funcional fica com o usuário, conforme solicitado. Não foram alterados registros de alunos para executar QA.

## Publicação
A branch reúne a revisão sobre o Git/Lovable atual e as correções desta conversa. A publicação do frontend no Lovable não foi acionada nesta revisão.
