# Correções do relatório exploratório — 26/10/2026

Escopo confirmado: pular somente F-001. Implementação e verificação técnica; QA visual e funcional no aplicativo ficam com o usuário.

| Achado | Implementação |
| --- | --- |
| F-001 | Pulado por solicitação explícita. A rota Store interna não foi alterada. |
| F-002, F-007 | Sales usa marca 9FIT PRO, suporte real e a configuração comercial compartilhada. O componente antigo de preços também usa a mesma fonte. |
| F-003 | Normalização de Markdown legado já existente mantida e testada novamente. |
| F-004 | XP, nível, Sync, sequência e peso do Perfil leem o snapshot canônico. Roadmap e wizard contam só sessões com completion_valid. Biblioteca não presume bronze durante carregamento; respostas antigas de outra aba são descartadas. Dieta diferencia falha de consulta e ausência de plano alimentar. Hub só aplica o lote de dados complementares quando todas as consultas têm sucesso. |
| F-005 | Identidade, leitura do Perfil e wizard possuem timeout e tentativa novamente. Dados incompletos não são mostrados como zero durante a leitura. |
| F-006 | Pendente externo: o HTTPS de www.ninefitpro.lovable.app pertence à hospedagem Lovable. O endereço canônico já é https://ninefitpro.lovable.app, sem www. Os conectores disponíveis não configuram certificado/alias. Um redirect React não corrige falha antes do handshake TLS. |
| F-008 | A escolha conserva o plano e período no destino da oferta/consulta. Não envia para assessment. CHECKOUT_READY permanece false: sem contrato de liberação confirmado, a ação abre consulta por e-mail identificando o plano e valor. |
| F-009 | Conhecer metodologia leva à seção explicativa da própria página. |
| F-010 | No repositório separado ninefit: placeholders removidos; CNPJ/endereço opcionais por configuração; contato real por e-mail e WhatsApp somente quando configurado com número válido. Não foram inventados dados institucionais. |
| F-011 | No repositório separado ninefit: a Store aponta para a oferta canônica do FitPro. Criação da cobrança avulsa antiga retorna 410 sem criar pagamento. Históricos e webhook preservados. Publicação da edge está pendente junto da entrega Store. |
| F-012 | Validador único exige exercícios com nome, séries e dose. Cards, overview e handlers bloqueiam modelos incompletos; contagem de exercícios isolada não libera sessão. |
| F-013 | Protocolos agrupam prescrições executáveis, modelos em preparação e arquivos do profissional. A atribuição original não é apagada. |
| F-014 | Consultas do chat limitadas por timeout; campo desabilitado sem canal/na falha de leitura. Retry e chamado no próprio painel, aproveitando a mensagem digitada, mais e-mail disponível. Nenhuma mensagem real foi enviada durante a implementação. |
| F-015 | Falhas de rede, sessão e contrato possuem mensagens e ações distintas; retry fica indisponível durante a consulta; métricas do dia não são apresentadas como leitura confirmada após erro. |
| F-016 | ID Card identifica campos faltantes e progresso de dados físicos; CTA abre diretamente a edição, com foco no primeiro campo físico ausente. Wizard valida valores e só marca perfil completo com os campos preenchidos. |

## Entrega

Alterações do FitPro na branch codex/fitpro-checklist-safety, PR 105. Alterações da Store em branch própria no repositório ninefit. Nenhum merge ou publicação de frontend foi feito nesta rodada. O bloqueio de prescrição é deliberado até revisão do profissional; o código não inventa exercícios ou doses.
