/**
 * Resolução de papel do usuário — sempre a partir de dados do servidor
 * (profiles.role canônico, user_roles como fallback). Nunca user_metadata.
 */
export const STAFF_ROLES = ['super_admin', 'admin', 'trainer', 'professor'] as const;
export const ADMIN_ROLES = ['super_admin', 'admin'] as const;

const PRIORITY = ['super_admin', 'admin', 'trainer', 'professor', 'student', 'user', 'demo'];

export function resolveRole(profileRole: string | null | undefined, roles: Array<string | null | undefined> = []): string | null {
  if (profileRole) return profileRole;
  const valid = roles.filter((r): r is string => !!r);
  if (!valid.length) return null;
  return [...valid].sort((a, b) => idx(a) - idx(b))[0];
}
const idx = (r: string) => { const i = PRIORITY.indexOf(r); return i === -1 ? PRIORITY.length : i; };

export const isStaffRole = (r: string | null | undefined) => !!r && (STAFF_ROLES as readonly string[]).includes(r);
export const isAdminRole = (r: string | null | undefined) => !!r && (ADMIN_ROLES as readonly string[]).includes(r);

/**
 * Guarda de geração: cada troca de sessão incrementa; respostas assíncronas
 * de uma geração antiga são descartadas (evita perfil/papel de outro usuário).
 */
export function createGenerationGuard() {
  let current = 0;
  return {
    next: () => ++current,
    isCurrent: (gen: number) => gen === current,
  };
}
