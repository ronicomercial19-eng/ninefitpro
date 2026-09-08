# Inventário de Diferenças

Comparação entre `ninefitpro-` e `ninefitpro`, com destino de integração na branch `integracao-ninefitpro-dash`.

## Exclusivos do ninefitpro- — candidatos à incorporação

### Funcionalidades de produto
- `src/components/9fit/AchievementShareSheet.tsx` — incorporar após validar contratos de conquistas.
- `src/components/9fit/NotificationBell.tsx` — incorporar após validar fonte de notificações.
- `src/components/9fit/WeeklyRecapPrompt.tsx` — incorporar após validar dados de atividade.
- `src/components/students/StudentTraining.tsx` — adaptar à navegação atual.
- `src/hooks/usePushNotifications.ts` — incorporar com permissões e configuração por ambiente.

### Backend e integrações
- `supabase/functions/core-os-dispatch/index.ts` — revisar autenticação HMAC e segredos antes de integrar.
- `supabase/functions/library-search-proxy/index.ts` — revisar CORS, autorização e dependência externa.
- `src/services/stevent.service.ts` — somente incorporar após remover chave hardcoded e migrar para variáveis de ambiente.

### PWA
- `public/manifest.json`
- `public/sw.js`
- Integrar somente depois de validar estratégia PWA do principal.

## Exclusivos do ninefitpro — preservar

- `src/components/9fit/MetasSection.tsx` — metas reais de progresso.
- `supabase/functions/fitpro-api/index.ts` — integração FitPro.
- `sdk/healthflix-sdk.ts` — integração HealthFlix.
- `supabase/migrations/20260706_periodization_failures_sync.sql` — preservar e revisar ordem de execução.
- Documentação de contratos e integrações em `docs/`.
- `.env.local.example` — preservar como modelo; nunca copiar valores secretos.

## Arquivos alterados nos dois repositórios

Os 40 arquivos alterados concentram-se em:
- componentes 9fit;
- páginas de treino, progresso, perfil e staff;
- dashboard e Nexus;
- componentes de alunos;
- hooks e serviços;
- configuração visual/ecossistema;
- Edge Function `ai-coach`.

Tratamento: não substituir em bloco. Cada arquivo deve ser comparado por responsabilidade, dependências, contratos e comportamento.

## Ordem aprovada

1. Documentar contratos e dependências.
2. Integrar compartilhamento, recap e notificações.
3. Integrar hooks/serviços associados.
4. Integrar fluxo de treino do aluno.
5. Revisar e integrar Edge Functions.
6. Integrar PWA.
7. Executar validações de build e testes.

## Bloqueadores antes do merge

- Segredo/chave hardcoded em serviço externo.
- Migrations sem confirmação de compatibilidade.
- Funções Supabase sem teste de autenticação/CORS.
- Alterações de páginas críticas sem teste de regressão.
