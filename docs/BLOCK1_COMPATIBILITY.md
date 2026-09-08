# Compatibilidade — Bloco 1

## Resultado da análise estática

Arquivos analisados do `ninefitpro-`:
- `AchievementShareSheet.tsx`
- `WeeklyRecapPrompt.tsx`
- `NotificationBell.tsx`
- `usePushNotifications.ts`

## Resultado

- Dependências npm compatíveis com `ninefitpro`.
- Imports internos de notificações e push resolvem na árvore do principal.
- `WeeklyRecapPrompt.tsx` depende de `AchievementShareSheet.tsx`, que é exclusivo do `ninefitpro-`; os dois devem ser integrados juntos.
- `NotificationBell.tsx` e `usePushNotifications.ts` podem ser integrados separadamente, mas exigem validação de autenticação e permissões.
- `useShareEvent` já existe no principal, porém deve ser comparado por contrato antes de usar o componente de compartilhamento.

## Riscos

1. Dados/tabelas Supabase usados no recap podem não existir ou ter nomes/colunas diferentes.
2. Componentes podem exigir rotas ou pontos de montagem ausentes.
3. Push notifications dependem de permissões do navegador/dispositivo e configuração de ambiente.
4. Compartilhamento pode depender de Storage, URLs públicas ou políticas RLS.

## Decisão

Nenhum código funcional será copiado ainda. O primeiro bloco de implementação, quando autorizado, será:
1. `AchievementShareSheet` + `WeeklyRecapPrompt`;
2. validação de `useShareEvent` e `useAthleteId`;
3. teste de contratos Supabase;
4. depois notificações e push.
