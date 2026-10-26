export function readFailure(error: unknown, online = true): { kind: 'network' | 'auth' | 'data'; message: string; action: string } {
  const failure = error as { status?: number; code?: string; message?: string } | null;
  const message = failure?.message || '';
  if (!online || /fetch|network|timeout|tempo limite|demorou demais|conexão/i.test(message)) return { kind: 'network', message: 'A conexão não respondeu. Seus registros foram preservados.', action: 'Tentar novamente' };
  if (failure?.status === 401 || ['PGRST301', 'PGRST302'].includes(failure?.code || '') || /jwt|session expired|sessão expirada/i.test(message)) return { kind: 'auth', message: 'Sua sessão expirou. Entre novamente para atualizar seus registros.', action: 'Entrar novamente' };
  return { kind: 'data', message: 'Não foi possível confirmar os registros do dia. Os demais módulos continuam disponíveis.', action: 'Tentar novamente' };
}
