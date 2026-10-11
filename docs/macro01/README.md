# Macro 01 — base confiável e contratos comuns

Concluída em código e banco em 05/10/2026. Escopo: Meso 1.1 (auditoria) e Meso 1.2 (contratos/base). Não significa que as experiências das Macros 02–09 já estejam implementadas.

## Entregas
- Inventário de 77 assinaturas SQL ligadas aos loops e pesquisa de referências em 398 arquivos de fonte. Inclui argumentos, exposição e candidatos a chamadores.
- Inspeção de 146 registros de gatilhos em information_schema: alguns são linhas repetidas de eventos do mesmo trigger, não 146 triggers distintos.
- Fontes de dados, identidade, permissões, eventos, estados e aprovação por versão definidos.
- Contrato tipado em src/types/fitproLoop.ts, com verificações de transições; adoção pelos loops futuros será gradual.
- Serviço único de registro de compartilhamento aplicado aos três pontos de compartilhamento.
- Recompensa definida no servidor, limite diário, deduplicação serializada e recibo confirmado. Copiar/baixar não concede XP de compartilhamento; Web Share comprova handoff, não postagem pública.
- Guardas de acesso adicionadas às RPCs legadas inspecionadas, sem remover assinaturas.
- Bloqueio de republicação/regeneração de prescrições iniciadas ou concluídas nas rotas corrigidas.
- Treino rápido exige calibração e revisão de restrições nas duas assinaturas; início também verifica o contexto da sessão rápida.
- PDI sem INSERT amplo; assinatura não pode ser autoativada/editada pelo cliente.
- Débito negativo de fichas bloqueado; atalho legado de XP de treino restrito a service_role.
- RON deixa de afirmar ajuste protetor quando apenas registrou dor.
- Webhook InfinitePay falha fechado quando o segredo não está configurado.
- Fallback de nível Nine/Lima já existente no banco registrado em migration, com comportamento preservado.

## Documentos
- [Auditoria de loops e pendências](audit.md)
- [Fontes e identidade](data-contracts.md)
- [Contrato de loop e permissões](loop-contract.md)
- [Inventário de funções](function-inventory.md)
- [Plano rastreável](implementation-map.md)
- [Verificação e QA](verification.md)

## Limites
A auditoria cobre o repositório e o catálogo SQL consultado. Não certifica todos os sistemas externos, infraestrutura de produção, catálogo remoto ou capacidade para 3.000 usuários. Nenhuma função foi apagada, nenhum plano real foi gerado e nenhum pagamento/agendamento externo foi realizado.

Há riscos legados documentados, inclusive XP genérico com valores de cliente fora de compartilhamento, regras concorrentes de XP/nível, contratos de pagamentos e mutações de treino ainda com locks diferentes. A Macro 01 entrega o diagnóstico e a base corrigida; as alterações de comportamento de cada jornada seguem a macro responsável.
