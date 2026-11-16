import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAthleteId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** Shared FitPro guard for browser-initiated calls that use a service key upstream. */
export async function canAccessAthlete(admin: SupabaseClient, userId: string, athleteId: string): Promise<boolean> {
  if (!isAthleteId(athleteId)) return false;

  const { data: athlete, error: athleteError } = await admin
    .from("athletes")
    .select("id,user_id,coach_id")
    .eq("id", athleteId)
    .maybeSingle();
  if (athleteError) throw athleteError;
  if (!athlete) return false;
  if (athlete.user_id === userId || athlete.coach_id === userId) return true;

  const [linkResult, roleResult] = await Promise.all([
    admin.from("athlete_auth_link").select("id").eq("athlete_id", athleteId).eq("user_id", userId).limit(1).maybeSingle(),
    admin.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (linkResult.error) throw linkResult.error;
  if (roleResult.error) throw roleResult.error;
  return !!linkResult.data || (roleResult.data ?? []).some((row) => row.role === "admin" || row.role === "super_admin");
}

export async function canAccessLegacyAluno(admin: SupabaseClient, userId: string, alunoId: string, verifiedEmail?: string | null): Promise<boolean> {
  if (!isAthleteId(alunoId)) return false;
  const { data: aluno, error } = await admin.from("alunos")
    .select("id,professor_id,email").eq("id", alunoId).maybeSingle();
  if (error) throw error;
  if (!aluno) return false;
  if (aluno.professor_id === userId) return true;
  if (verifiedEmail && aluno.email?.toLowerCase() === verifiedEmail.toLowerCase()) return true;
  const { data: roles, error: rolesError } = await admin.from("user_roles")
    .select("role").eq("user_id", userId);
  if (rolesError) throw rolesError;
  return (roles ?? []).some((row) => row.role === "admin" || row.role === "super_admin");
}

export async function canAccessStudentTarget(admin: SupabaseClient, userId: string, externalId: string, verifiedEmail?: string | null): Promise<boolean> {
  let targetId = externalId;
  if (!isAthleteId(targetId)) {
    const { data: mappings, error } = await admin.from("fitpro_student_map")
      .select("athlete_id").eq("fitpro_student_id", externalId).limit(2);
    if (error) throw error;
    const ids = [...new Set((mappings ?? []).map((row) => row.athlete_id).filter(Boolean))];
    if (ids.length !== 1) return false;
    targetId = ids[0];
  }
  return await canAccessAthlete(admin, userId, targetId)
    || await canAccessLegacyAluno(admin, userId, targetId, verifiedEmail);
}

export async function canAccessConnectionAthlete(admin: SupabaseClient, conn: { professor_id?: string | null }, athleteId: unknown, callerId: string | null, trustedService: boolean): Promise<boolean> {
  if (!isAthleteId(athleteId)) return false;
  if (trustedService) return true;
  if (callerId) return await canAccessAthlete(admin, callerId, athleteId);
  if (!conn.professor_id) return false;
  const { data: athlete, error } = await admin.from("athletes")
    .select("coach_id").eq("id", athleteId).maybeSingle();
  if (error) throw error;
  return athlete?.coach_id === conn.professor_id;
}
