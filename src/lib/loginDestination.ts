export const STUDENT_HOME = '/9fit/hub';
export const AUTH_CALLBACK = '/auth/callback';
export function loginDestination(profileRole: string | null | undefined, roles: string[] = []): string {
  // Canonical profile wins over legacy role rows; no email or user-editable metadata.
  const effective = profileRole ? [profileRole] : roles;
  return effective.some(role => ['super_admin', 'admin', 'trainer', 'professor'].includes(role)) ? '/app' : STUDENT_HOME;
}
