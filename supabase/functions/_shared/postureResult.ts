export function confirmedPostureResult(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, any>;
  return !result.error && result.status === "success" &&
    typeof result.macro_diagnosis === "string" && !!result.macro_diagnosis.trim() &&
    !!result.segments && !Array.isArray(result.segments) &&
    ["cervical", "shoulders", "pelvis"].every(key => typeof result.segments[key]?.finding === "string") &&
    ["phase_1_release", "phase_2_activation", "phase_3_integration"].every(key =>
      Array.isArray(result.recovery_protocol?.[key]) && result.recovery_protocol[key].every((item: unknown) => typeof item === "string"));
}
