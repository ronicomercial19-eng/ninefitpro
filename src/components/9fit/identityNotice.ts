/** Mesma frase de useAthleteId quando a consulta volta sem ficha. */
export const ATHLETE_MISSING = "Perfil de atleta não encontrado";

export type IdentityNotice = "loading" | "ready" | "unlinked" | "unread";

export const IDENTITY_COPY = {
  unlinked: "Seu acesso está pronto. Seus treinos aparecerão quando seu professor vincular sua ficha.",
  unread: "Não foi possível confirmar sua ficha. Isso não significa que ela não existe.",
} as const;

/** Falha de leitura não é ausência de ficha. Sem atleta confirmado também não é ciclo ativo. */
export function identityNotice(
  loading: boolean,
  athleteId: string | null,
  error: string | null,
): IdentityNotice {
  if (loading) return "loading";
  if (athleteId) return "ready";
  if (error && error !== ATHLETE_MISSING) return "unread";
  return "unlinked";
}
