export const ACTIVATION_PROFILE_KEYS = ['goal', 'recovery_rate', 'volume_tolerance', 'peak_window', 'stress_sensitivity', 'discomfort_tolerance', 'time_horizon', 'injury_zones', 'dietary_restrictions'] as const;

export function hasConfirmedProfile(settings: { pdi_completed_at?: string | null; declared_keys?: string[] | null } | null | undefined) {
  return !!settings?.pdi_completed_at && ACTIVATION_PROFILE_KEYS.every(key => settings.declared_keys?.includes(key));
}
