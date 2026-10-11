export interface FilterableContent { title: string; category?: string | null; level?: string | null; duration?: string | number | null; objective?: string | null; equipment?: string | string[] | null; }
export interface CatalogFilters { search: string; category: string; level: string; duration: string; objective: string; equipment: string; }
export function durationMinutes(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  const input = value.trim();
  if (/^\d+:\d{2}(?::\d{2})?$/.test(input)) {
    const parts = input.split(':').map(Number);
    if (parts.slice(1).some(part => part >= 60)) return null;
    return parts.length === 3 ? parts[0] * 60 + parts[1] + parts[2] / 60 : parts[0] + parts[1] / 60;
  }
  const match = input.match(/^(\d+(?:[.,]\d+)?)\s*(?:min(?:utos?)?)?$/i);
  return match && Number(match[1].replace(',', '.')) > 0 ? Number(match[1].replace(',', '.')) : null;
}
export function matchesCatalog(item: FilterableContent, filters: CatalogFilters): boolean {
  const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (filters.search && !fold(item.title).includes(fold(filters.search))) return false;
  for (const key of ['category', 'level', 'objective'] as const) {
    if (filters[key] && filters[key] !== (item[key] || '__unknown')) return false;
  }
  const equipment = Array.isArray(item.equipment) ? item.equipment : item.equipment ? [item.equipment] : ['__unknown'];
  if (filters.equipment && !equipment.includes(filters.equipment)) return false;
  const minutes = durationMinutes(item.duration);
  if (filters.duration === '__unknown' && minutes !== null) return false;
  if (filters.duration && filters.duration !== '__unknown' && (minutes === null || (filters.duration === 'short' ? minutes > 20 : filters.duration === 'medium' ? minutes <= 20 || minutes > 45 : minutes <= 45))) return false;
  return true;
}
