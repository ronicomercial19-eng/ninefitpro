import { supabase } from "@/integrations/supabase/client";

export interface ResolvedTemplateAssignment {
  assignment_id: string;
  athlete_id: string;
  content_type: string;
  content_ref: string;
  content_title: string | null;
  assignment_status: string | null;
  progress_pct: number | null;
  template_version_id: string | null;
  resolved_version_id: string | null;
  resolved_version: number | null;
  resolved_version_status: string | null;
  prescription_schema: unknown;
  protocol_schema: unknown;
  design_tokens: unknown;
  required_variables: unknown;
}

/**
 * Fonte única de atribuições versionadas.
 * A query usa a view security_invoker; o cast temporário mantém compatibilidade
 * até a próxima regeneração automática dos tipos Supabase.
 */
export async function loadResolvedTemplateAssignments(
  athleteId: string,
  contentType?: string,
): Promise<ResolvedTemplateAssignment[]> {
  let query = (supabase as any)
    .from("vw_ninefit_assignment_with_version")
    .select("*")
    .eq("athlete_id", athleteId);

  if (contentType) query = query.eq("content_type", contentType);

  const { data, error } = await query.order("assigned_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ResolvedTemplateAssignment[];
}
