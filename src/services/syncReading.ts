import { dailySync, type DailyContext } from './dailyContextRules';
export function syncReading(context: DailyContext | null, date: string, quickRecords: readonly string[]) {
  const baseline=dailySync(context,date);
  const records=baseline.markers.filter(marker=>marker.done).map(marker=>marker.label);
  return dailySync(context,date,[...new Set([...records,...quickRecords])]);
}
export const SYNC_UPDATE_EVENTS = ['9fit:sync_updated','9fit:workout-updated','9fit:nutrition-updated','9fit:water-updated','9fit:hydration-updated','9fit:vitals-updated','9fit:profile-updated','9fit:day-reviewed','9fit:user-state-invalidated','9fit:protocol_completed'];
