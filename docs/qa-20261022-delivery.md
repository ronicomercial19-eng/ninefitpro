# Rodada do relatório exploratório de 22/10

Escopo implementado: FitPro. STEVENT excluída. A loja externa não teve seu código alterado.

| Achado | Tratamento |
| --- | --- |
| F-001 | /9fit/store deixa de renderizar Foods; encaminha ao container Store, cujo destino passa a ser https://ninefit.lovable.app. Container oferece abertura externa explícita se o embed não funcionar. |
| F-002 / F-007 | /sales reaproveitada como apresentação 9FIT PRO, removendo ofertas, contatos e promessas da landing FitEvolution. |
| F-008 / F-009 | Retirados botões de planos sem checkout; substituídos por acesso à conta, loja externa e âncora funcional Como funciona. |
| F-011 | Retirada a tabela de mensalidades conflitantes de /sales. Sem preço novo ou promessa de liberação automática. Não comprova reconciliação de compras da loja. |
| F-003 | Respostas do RON renderizam Markdown sem HTML bruto; normalização de escapes legados apenas na exibição, sem modificar mensagens persistidas. |
| F-004 / F-005 | Permanecem pendentes de reprodução autenticada com comparação por métrica e rede lenta. Não substituir valor desconhecido por zero. |
| F-006 | Infra da variante www não alterada. |
| F-010 | Placeholders da loja externa permanecem dependentes do projeto Store. |

Correções adicionais: histórico do RON é reiniciado quando muda a identidade; Share não inventa duração de 45 minutos quando o registro não contém duração. Requisições de envio ainda pendentes durante troca de conta e integração integral de métricas exigem auditoria adicional.

Esta entrega não encerra os achados do painel professor, não executa pagamento, não altera assinatura e não certifica segurança ou funcionamento do checkout externo. Validação de código não substitui reteste autenticado em produção.
