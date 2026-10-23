export const ATHLETE_PARAM = "athlete";
export const isAthleteId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
export function withAthlete(path: string, athleteId: string | null) {
  if (!/^\/app(?:\/|[?#]|$)/.test(path) || path.startsWith("//")) return path;
  const url = new URL(path, "https://fitpro.invalid");
  if (athleteId && isAthleteId(athleteId))
    url.searchParams.set(ATHLETE_PARAM, athleteId);
  else url.searchParams.delete(ATHLETE_PARAM);
  return url.pathname + url.search + url.hash;
}
export function createRequestScope() {
  let revision = 0;
  return {
    invalidate: () => ++revision,
    capture: () => revision,
    isCurrent: (value: number) => value === revision,
  };
}

export function saoPauloInstant(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value))
    throw new Error("Data e hora inválidas.");
  const date = new Date(value + "-03:00");
  if (
    !Number.isFinite(date.getTime()) ||
    new Date(date.getTime() - 3 * 3600000).toISOString().slice(0, 16) !==
      value.slice(0, 16)
  )
    throw new Error("Data e hora inválidas.");
  return date.toISOString();
}
