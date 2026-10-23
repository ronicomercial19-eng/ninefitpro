export function previousDate(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

/** A streak may continue from yesterday, but never bridge a missing day. */
export function consecutiveDays(dates: string[], today: string): number {
  const days = new Set(dates);
  let day = days.has(today) ? today : previousDate(today);
  let streak = 0;
  while (days.has(day)) { streak++; day = previousDate(day); }
  return streak;
}
