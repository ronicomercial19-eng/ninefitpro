# Correções da auditoria do aluno

Referência: relatório de 22/10/2026, revisão dee41ee. Implementação na branch codex/correcoes-aluno-auditoria.

## Entrega por achado

| Achado | Correção implementada |
|---|---|
| F01 | Validação única do contrato de contexto nas leituras direta e por snapshot; compatibilidade com v3. |
| F02 | Projeção da ficha declarada, preferências, registros observados e inferências com origem explícita. |
| F03 | Resposta estruturada do RON e validação das ações no servidor e no cliente. |
| F04 | Água, refeições e dor nas tabelas oficiais, recibos por ação e confirmação humana; remoção das leituras locais obsoletas. |
| F05 | Move confirma persistência, conserva tentativa em erro, separa identidade e grava duração; simulações não contam como atividade real. |
| F06 | Hábitos por usuário e data, conclusão única e sequência real; importação de títulos antigos sem inventar datas. |
| F07 | Grade distingue destino configurado de serviço verificado; falha de consulta não vira online. |
| F08 | Checkout tem estados de erro, oferta ausente e repetição; usa a mesma habilitação comercial da oferta. |
| F09 | Entrada, Prime e retorno do checkout usam a mesma validade; plano da oferta é respeitado no retorno. |
| F10 | Pós-treino vinculado à execução concluída, com duração e esforço reais; parâmetros de XP na URL não premiam. |
| F11 | Recibo único de XP por execução, inclusive em novas tentativas. |
| F12 | Conclusão de protocolo e recompensa atômicas, uma vez por dia; erros recuperáveis de leitura e gravação. |
| F13 | Configurações próprias do aluno; rótulos de ranking, cartões, conteúdo editorial e aplicativos externos alinhados ao recurso. |
| F14 | Abas acompanham URL; treino semanal mantém a sessão selecionada e bloqueia exercícios pulados. |
| F15 | Sequência termina na primeira data sem calibração e pode continuar a partir de ontem. |
| F16 | Leitura de notificações só aparece após confirmação da gravação, com filtro por usuário. |
| F17 | Proteção de rotas externas, destinos HTTPS conhecidos, retorno ao app e informação explícita sobre acesso e sincronização externos. |

## Validação e limites

- 29 testes de aplicação passaram (24 da suíte principal e 5 de entrada/assinatura), incluindo acesso de professor, troca de conta e novos contratos do aluno.
- 10 verificações da migração SQL passaram em PostgreSQL isolado (PGlite): calibração vazia, ficha declarada, sequência com lacuna, feedback repetido, recompensa de protocolo repetida, isolamento de contas e hábitos com RLS.
- Typecheck e compilação do frontend passaram. O build informa avisos de tamanho do bundle e importação de html2canvas.
- Esses testes usam esquema mínimo de teste. Não substituem aplicação da migração em homologação nem teste autenticado completo no navegador.
- Nenhum dado de produção, pagamento, mensagem ou publicação foi alterado nesta implementação.
- A sincronização entre aplicativos externos não foi implementada nem comprovada: o app passa a apresentar esses destinos honestamente como acesso externo. SSO e contratos de troca de dados dependem de implementação nos dois sistemas.
- O envio pelo Lovable foi impedido por falta de créditos; a entrega segue pelo repositório conectado.

## Instalação coordenada

1. Aplicar em homologação a migração 20261023011100_student_audit_contracts_and_receipts.sql.
2. Publicar a Edge Function ai-coach junto com o módulo compartilhado ronActionContract.
3. Publicar o frontend desta revisão. Hábitos e novos recibos dependem da migração; frontend isolado terá erro recuperável nesses recursos.
4. Conferir com duas contas: ficha salvar/reler, ação RON confirmar/reler, Move com falha e nova tentativa, hábito na mudança de data, treino/pós-treino repetido, protocolo repetido, notificações e retorno externo.
5. Verificar os logs antes de liberar produção. Não ativar checkout apenas para testar.

XP de treino passa a usar o valor base já definido no motor do app (200), com recibo único por execução. O protocolo usa 150 por dia. Totais antigos não são recalculados. Sessões já concluídas antes da migração recebem recibo de preservação com zero XP adicional: podem ter feedback corrigido, mas não geram bônus retroativo. Essa regra evita duplicação quando não existe chave confiável nos registros antigos.

## Reproduzir verificações

```powershell
pnpm typecheck
pnpm test
node --import tsx --test src/lib/customerEntry.test.ts
pnpm --dir scripts/qa-db install --frozen-lockfile
node scripts/qa-student-audit-db.mjs
pnpm build
```

A dependência PGlite é isolada em scripts/qa-db e não entra no bundle do aplicativo.
