export function canProvisionAthlete(
  callerId: string, role: string | null, active: boolean | null,
  athlete: { coach_id: string; user_id: string | null; email: string | null } | null,
  requestedEmail: string,
) {
  if (!athlete || active === false || athlete.user_id) return false;
  if (athlete.email?.trim().toLowerCase() !== requestedEmail.trim().toLowerCase()) return false;
  if (role === 'admin' || role === 'super_admin') return true;
  return (role === 'professor' || role === 'trainer') && athlete.coach_id === callerId;
}
