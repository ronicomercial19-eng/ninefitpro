/**
 * Regras puras do Início (OS) — status de ciclo/treino e match de ranking.
 * Não dependem de React nem de rede; usadas pelo OSDashboard e pelos testes de regressão.
 */

export type WeeklyCounts = { treinos: number; nutri?: number; minutos?: number };

/** Treinos da semana prevalecem; plano ativo sem treino continua ciclo; sem plano = sem treino/ciclo. */
export function resolveTreinoStatus(weeklyTreinos: number, hasPlan: boolean): string {
  if (weeklyTreinos > 0) return `${weeklyTreinos} treinos`;
  if (hasPlan) return 'Plano ativo';
  return 'Sem treino';
}

/**
 * Consistência / selo de ciclo no Início.
 * - Com treinos na semana → contagem
 * - Plano ativo sem treino na semana → ainda em ciclo (não "Sem ciclo")
 * - Sem plano confirmado → sem ciclo
 * Falha/espera de prescrição (hasPlan=false) não inventa ciclo.
 */
export function resolveConsistenciaStatus(weeklyTreinos: number, hasPlan: boolean): string {
  if (weeklyTreinos > 0) return `${weeklyTreinos} na semana`;
  if (hasPlan) return 'Ciclo ativo';
  return 'Sem ciclo';
}

export function resolveFisicaSubtitle(
  hasRank: boolean,
  myRankPos: number,
  hasPlan: boolean,
): string {
  if (hasRank) return `Ranking real: posição #${myRankPos}`;
  if (hasPlan) return 'Prescrição ativa no ciclo';
  return 'Sem prescrição ativa detectada';
}

/** Posição no ranking usa o id do atleta, não o primeiro nome. */
export function markSelfInRanking<T extends { id?: string | null; name: string; self?: boolean }>(
  rows: T[],
  athleteId: string | null | undefined,
  fallbackName?: string | null,
): T[] {
  if (!rows.length) return rows;
  const id = athleteId?.trim() || null;
  const nameKey = fallbackName?.trim().toLowerCase() || null;
  return rows.map((row) => {
    const byId = id && row.id && row.id === id;
    const byName = !id && nameKey && row.name.toLowerCase() === nameKey;
    return byId || byName ? { ...row, self: true } : { ...row, self: false };
  });
}

export type DestaqueRouteId = 'community-feed' | 'news-updates' | 'social-ranking';

/** Destaques do Início abrem rotas reais do app (comunidade, social/ranking, treino quando aplicável). */
export function resolveDestaqueRoute(id: DestaqueRouteId): string {
  switch (id) {
    case 'community-feed':
      return '/9fit/community';
    case 'news-updates':
      return '/9fit/social';
    case 'social-ranking':
      return '/9fit/social';
    default:
      return '/9fit/os';
  }
}
