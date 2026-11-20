export type NutritionRead = "loading" | "unread" | "ready" | "stale";

/** Leitura já confirmada (updatedAt) não volta a parecer dia vazio se o refresh falhar. */
export function nutritionRead(loading: boolean, error: boolean, confirmed: boolean): NutritionRead {
  if (confirmed) return error ? "stale" : "ready";
  if (loading) return "loading";
  if (error) return "unread";
  return "ready";
}

export function nutritionHeadline(read: NutritionRead, dietName: string | null | undefined): string {
  if (read === "loading") return "Lendo a alimentação de hoje";
  if (read === "unread") return "Alimentação de hoje não confirmada";
  const name = dietName?.trim();
  if (read === "stale") return name ? `${name} · atualização não confirmada` : "Última leitura · atualização não confirmada";
  return name || "Sem plano alimentar ativo";
}

export function nutritionGoalLine(read: NutritionRead, calories: number | null | undefined): string {
  if (read === "loading") return "Lendo a meta";
  if (read === "unread") return "Meta não confirmada";
  return calories ? `de ${calories} kcal` : "sem meta prescrita";
}

export function nutritionKcalText(read: NutritionRead, kcal: number): string {
  if (read === "loading" || read === "unread") return "—";
  return `${Math.round(kcal)} kcal`;
}

export function nutritionReviewFacts(
  read: NutritionRead,
  facts: { dietName: string | null | undefined; meals: number; calories: number; protein: number; waterMl: number; goals: unknown },
): string {
  if (read !== "ready" && read !== "stale") {
    return "A leitura de hoje ainda não foi confirmada. Não invente plano, refeições, calorias nem metas.";
  }
  const diet = facts.dietName?.trim() || "nenhum plano ativo confirmado";
  const stale = read === "stale" ? " A última atualização não foi confirmada; use só estes números já lidos." : "";
  return `Plano: ${diet}. Hoje registrei ${facts.meals} refeições, ${facts.calories} kcal, ${facts.protein} g proteína e ${facts.waterMl} ml água. Metas prescritas: ${JSON.stringify(facts.goals)}.${stale}`;
}
