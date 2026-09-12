# QA somente leitura — FitPro (/9fit + /app)

Auditoria por leitura de código, cruzamento de links x rotas e checagem de tipos. Nada foi alterado.

Legenda: ✅ ok · ⚠️ parcial · ❌ ausente/quebrado · 🔒 não verificável nesta sessão

## Checagem de tipos

`tsgo -p tsconfig.app.json` → **2 erros**, ambos em `QuickTrainModal.tsx` (linhas 107 e 108): a consulta de oferta não retorna um registro válido para o TypeScript. Causa: a busca filtra por colunas que não existem em `monetization_offers` (`active` e `goal`; o correto é `status`). Na prática a oferta do Treino Rápido nunca aparece e a criação da execução pode falhar. ❌ P0

## Matriz por tela

| Tela | Rota | Dados reais | Loading | Vazio | Erro | Status |
|---|---|---|---|---|---|---|
| Hub | /9fit/hub | vw_hub_status, vw_fitpro_performance_overview, student_library_assignments | ❌ | ❌ | ❌ | ⚠️ |
| Train | /9fit/train | atribuições + progresso | ✅ | ✅ | ✅ | ✅ |
| Protocolo | /9fit/protocolo | student_library_assignments | ✅ | ✅ | ⚠️ | ⚠️ |
| Planejamento | /9fit/planejamento | view de periodização ativa | ⚠️ | ⚠️ | ✅ | ⚠️ |
| Biblioteca | /9fit/biblioteca | componente versionado | ✅ | ✅ | ✅ | ✅ |
| Progresso | /9fit/progresso | recordes, avaliações, metas | ✅ | ✅ | ⚠️ | ⚠️ |
| Move (GPS) | /9fit/move | bio_activity_logs | ✅ | ✅ | ⚠️ | ✅ |
| Ron | /9fit/ron | mensagens + créditos | ⚠️ | ✅ | ✅ | ⚠️ |
| Dieta | /9fit/dieta | nutrition_logs | ✅ | ✅ | ✅ | ✅ |
| Foods | /9fit/foods | só embed externo | ❌ | ❌ | ❌ | ⚠️ |
| HealthFlix | /9fit/healthflix | library_items | ✅ | ❌ | ✅ | ⚠️ |
| Prime / PrimePass | /9fit/prime, /planos, /primepass | conteúdo estático | ❌ | ❌ | ❌ | ⚠️ |
| Perfil | /9fit/profile | profiles | ❌ | ❌ | ❌ | ⚠️ |
| Compartilhar | /9fit/compartilhar | atletas, recordes, execuções | ✅ | ❌ | ❌ | ⚠️ |
| Eventos | — | — | — | — | — | ❌ tela não existe |
| Cobrança | — | — | — | — | — | ❌ tela não existe |
| Painel professor | /app/* | várias | ❌ | varia | varia | ⚠️ |

## Achados priorizados

### P0 — crítico
1. **Professor legítimo pode ser expulso do painel.** `AppLayout` redireciona para o app do aluno assim que `isTrainer` é falso, sem esperar o carregamento do papel do usuário. Como o papel é buscado de forma assíncrona depois do login, o primeiro render tende a jogar o professor para fora. Falta um estado de espera antes de decidir.
2. **Treino Rápido com consulta inválida** (ver seção de tipos): filtro por colunas inexistentes; a oferta nunca é exibida e a verificação de tipos quebra o build de produção.

### P1 — alto
3. **Quatro links internos sem rota** (levam a tela "não encontrado"): `/9fit/perfil` (botão em Train — a rota real é `/9fit/profile`), `/9fit/progresso/recordes` ("Ver todos" em Progresso), `/9fit/premium` (cartão do ecossistema) e `/9fit/store` (grade de módulos).
4. **Link de pagamento de teste ainda no código.** `Prime.tsx` aponta para `buy.stripe.com/test_...`. A tela está órfã (importada, mas sem rota — `/9fit/prime` abre PrimePass), então hoje não é alcançável, mas o link fixo continua no projeto e a importação inútil pesa no pacote.
5. **Prime/PrimePass sem estado real de assinatura.** Nenhuma leitura de `user_subscriptions`, `subscription_plans` ou `payments` nessas telas; o aluno não vê se já é assinante. Existem `useSubscription` e `usePrimeOffer` prontos, porém não usados nessas telas.
6. **Hub falha em silêncio.** As três consultas do Hub ignoram erro e não têm carregamento: se a view não responder, a tela mostra zeros como se fossem dados confirmados.

### P2 — médio
7. Perfil, Compartilhar e HealthFlix sem estado de lista vazia/erro.
8. Foods é apenas um embed externo, sem tratamento de falha de carregamento.
9. Planejamento trata erro, mas sem indicador de carregamento nem estado vazio claro.
10. Telas de Eventos e Cobrança, entregues em rodadas anteriores, não existem mais no projeto.

### P3 — baixo
11. Sessão expirada: o guard preserva a sessão quando a leitura do perfil falha, então queda de rede e falta de permissão produzem a mesma tela — sem mensagem específica.
12. Pacote principal continua acima do recomendado (cache do app offline elevado para 12 MB para o build passar).

## 🔒 Não verificável nesta sessão
- Execução autenticada real das telas: o Supabase é externo e não gerenciado aqui, não é possível criar sessão de teste. Toda validação de fluxo logado foi por leitura de código.
- Efeito prático das regras de acesso (RLS) por papel em tempo de execução.
- Carregamento efetivo dos embeds externos (HealthFlix, Foods, Community, Checkout), que dependem de login no domínio de origem.

## Próximo passo sugerido
Corrigir na ordem P0 → P1. Nada será alterado sem sua aprovação.
