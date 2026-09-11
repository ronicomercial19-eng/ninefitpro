# QA de leitura — FitPro (/9fit + /app)

Auditoria somente leitura. Nada foi corrigido. Verificação por leitura de código, cruzamento de links x rotas e checagem de tipos (build TypeScript passou sem erros: `tsgo -p tsconfig.app.json` limpo, incluindo o trecho apontado em QuickTrainModal).

Legenda: ✅ refletido · ⚠️ parcial · ❌ ausente · 🔒 bloqueado (não verificável nesta sessão)

## Matriz por tela

| Tela | Rota | Dados reais | Loading | Vazio | Erro | Status |
|---|---|---|---|---|---|---|
| Hub | /9fit/hub | vw_hub_status, student_library_assignments | sem estado | sem estado | sem estado | ⚠️ |
| Train | /9fit/train | student_training_assignments, workout_progress | sim | sim | sim | ✅ |
| Protocolo | /9fit/protocolo | student_library_assignments | sim | sim | sem estado | ⚠️ |
| Planejamento | /9fit/planejamento | vw_athlete_periodizacao_ativa | sem estado | sem estado | sem estado | ⚠️ |
| Biblioteca | /9fit/biblioteca | via componente versionado | sim | sim | sim | ✅ |
| Progresso | /9fit/progresso | personal_records, avaliacoes_unificadas, metas_progresso, workout_exercise_sets | sem estado | sim | sem estado | ⚠️ |
| Move | — | — | — | — | — | ❌ tela não existe mais no projeto |
| Ron | /9fit/ron | ai_chat_messages, pain_reports, views fitpro | sem estado | sim | sim | ⚠️ |
| Dieta | /9fit/dieta | nutrition_logs | sim | sim | sim | ✅ |
| Foods | /9fit/foods | nenhuma consulta (só embed externo) | não | não | não | ⚠️ |
| HealthFlix | /9fit/healthflix | library_items | sim | não | sim | ⚠️ |
| Prime | /9fit/prime | nenhuma consulta | não | não | não | ❌ conteúdo estático |
| PrimePass | /9fit/primepass | nenhuma consulta | não | não | não | ❌ conteúdo estático |
| Perfil | /9fit/profile | profiles | não | não | não | ⚠️ |
| Compartilhar | /9fit/compartilhar | athletes, personal_records, workout_executions | sim | não | não | ⚠️ |
| Painel professor | /app/* | várias | varia | varia | varia | ⚠️ sem checagem de papel |

## Achados priorizados

### P0 — crítico
1. **Painel /app sem verificação de papel.** As rotas de gestão só passam por `PrivateRoute`, que valida sessão e perfil, mas não exige professor/admin. Qualquer aluno logado consegue abrir /app/alunos, /app/nexus, /app/monetizacao etc. A proteção real fica apenas nas regras do banco.
2. **Tela Move desapareceu.** Não existe `src/pages/9fit/Move.tsx` nem rota /9fit/move, apesar de a integração Move→Progresso (corridas por GPS) constar como entregue. O registro de corrida por GPS não tem hoje nenhuma porta de entrada no app.
3. **Telas Billing e Events também ausentes.** Não há arquivo nem rota para /9fit/billing (migrada para prime) e /9fit/events; funcionalidades entregues anteriormente não estão no código atual.

### P1 — alto
4. **Links de pagamento fixos de teste.** Prime, PrimePass e o modal de Treino Rápido apontam para a mesma URL `buy.stripe.com/test_...` fixa, em vez das ofertas dinâmicas de `monetization_offers`. Em produção o aluno cai num checkout de teste.
5. **Links internos sem rota** (levam a tela em branco/404): `/9fit/progresso/recordes` (botão "Ver todos" em Progresso), `/9fit/store` e `/9fit/premium`.
6. **Prime e PrimePass 100% estáticos.** Nenhuma leitura de `user_subscriptions`, `subscription_plans` ou `payments`; o estado real da assinatura do aluno não aparece.
7. **Hub e Planejamento sem estados de carregamento/erro.** As consultas falham em silêncio: se a view não responder, a tela mostra zeros como se fossem dados reais.

### P2 — médio
8. **Progresso e Perfil sem estado de erro/carregamento** — mesmo risco de exibir vazio como se fosse dado confirmado.
9. **HealthFlix sem estado de lista vazia.**
10. **Foods é apenas um embed externo** (25 linhas), sem dados nem tratamento de falha de carregamento.
11. **Ron carrega sem indicador**, com dois trechos de conteúdo simulado remanescentes.

### P3 — baixo
12. **Sessão expirada:** o comportamento é redirecionar para o login pelo guard do /9fit, mas os guards preservam a sessão quando a leitura falha, então uma queda momentânea de rede não distingue "sem permissão" de "fora do ar" — sem mensagem específica para o aluno.
13. **Aviso de bundle:** pacote principal ~3,4 MB (build passa, mas acima do recomendado).

## 🔒 Não verificável nesta sessão
- Execução autenticada real das telas (Supabase externo não gerenciado: não é possível criar sessão de teste aqui). Toda a validação de fluxo logado foi feita por leitura de código.
- Carregamento efetivo dos iframes/embeds externos (HealthFlix, Foods, Community, Checkout) — dependem de login no domínio de origem.
- Efeito prático das políticas RLS por papel em runtime.

## Próximo passo sugerido
Corrigir na ordem P0 → P1. Aguardando sua aprovação para começar; nada será alterado antes disso.
