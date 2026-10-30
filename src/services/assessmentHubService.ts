import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { withTimeout } from '@/lib/withTimeout';

export type Trust = 'CONFIRMADO' | 'DERIVADO' | 'ESTIMADO' | 'NAO_DISPONIVEL';
export type AssessmentRow = Tables<'avaliacoes_unificadas'> & { oficial: boolean; protocolo_alterado?: boolean | null };
export interface ReferenceBand { teste: string; limites: { min?: number; max?: number; rotulo: string }[]; fonte: string; protocolo: string; unidade: string }
export interface HubGoal { id: string; titulo: string; exercicio: string | null; metrica: string; valor_inicial: number; valor_atual: number; valor_meta: number; unidade: string; prazo: string | null; status: string }
export interface DataSource { tipo: string; registros: number; ultima: string; status: 'active' | 'disconnected' | 'erasure_requested'; escopo_professor: boolean; conectado_em: string | null }
export interface AssessmentHub {
  stats?: {total_treinos_mes:number;kg_total_mes:number|null;streak_dias:number;ultimo_treino:string|null;prs_count:number;total_treinos_geral:number};
  weighted_score?: unknown;
  capacity_profile?: unknown;
  unavailable_features?: string[];
  legacy_screen?: unknown;
  contract_version: number; can_manage: boolean; assessments: AssessmentRow[]; references: ReferenceBand[];
  sources: DataSource[]; settings: { interval_weeks: number; reminder_enabled: boolean }; goals: HubGoal[];
  workouts: { id: string; date: string; name: string; volumeKg: number | null; rpe: number | null; source: 'FitPro' | 'Progress Tracker' }[];
  loads: { id: string; date: string; exercise: string; kg: number; reps: number | null; source: 'FitPro' | 'Progress Tracker' }[];
  records: { id: string; date: string; exercise: string; value: number; unit: string; type: string }[];
}
export interface Attempt { id: string; teste: string; ordem: number; carga_kg: number; reps: number; valida: boolean; velocidade_ms: number | null; origem_velocidade: string | null }
export interface AssessmentDetail { avaliacao: AssessmentRow; comparacao: AssessmentRow | null; tipo_comparacao: string; historico: AssessmentRow[]; references: ReferenceBand[]; tentativas: Attempt[] }
export const permissionMessage = (error: unknown) => {
  const e = error as { code?: string; message?: string };
  return e.code === '42501' || /not authorized/i.test(e.message || '') ? 'Sem permissão para este perfil. Entre novamente.' : e.message || 'Não foi possível carregar as avaliações.';
};
const cache = new Map<string, { promise: Promise<AssessmentHub>; expires: number }>();
let authGeneration=0;
supabase.auth.onAuthStateChange(() => {authGeneration++;cache.clear();});
export function invalidateAssessmentHub(athleteId?: string) { if (athleteId) cache.delete(athleteId); else cache.clear(); }
if (typeof window !== 'undefined') ['9fit:sync_updated', '9fit:profile-updated', '9fit:workout-updated', 'focus'].forEach(name => window.addEventListener(name, () => invalidateAssessmentHub()));
export function loadAssessmentHub(athleteId: string): Promise<AssessmentHub> {
  const existing = cache.get(athleteId);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const generation=authGeneration;
  const promise = (async () => {
    const { data, error } = await withTimeout(supabase.rpc('fn_get_assessment_hub', { p_athlete_id: athleteId }));
    if (error) throw new Error(permissionMessage(error));
    if(generation!==authGeneration)throw new Error('A sessão mudou. Atualize os dados deste perfil.');
    return data as unknown as AssessmentHub;
  })().catch(error => { cache.delete(athleteId); throw error; });
  cache.set(athleteId, { promise, expires: Date.now() + 30_000 });
  return promise;
}
export async function loadAssessmentDetail(athleteId: string, assessmentId: string, compare: 'primeira' | 'anterior') {
  const { data, error } = await withTimeout(supabase.rpc('fn_get_avaliacao_detalhe', { p_athlete_id: athleteId, p_avaliacao_id: assessmentId, p_comparar: compare }));
  if (error) throw new Error(permissionMessage(error));
  return data as unknown as AssessmentDetail;
}
export async function saveAssessmentPreferences(athleteId: string, values: { p_interval_weeks?: number; p_reminder?: boolean; p_source?: string; p_source_status?: string; p_share_coach?: boolean }) {
  const { error } = await supabase.rpc('fn_save_assessment_preferences', { p_athlete_id: athleteId, ...values });
  if (error) throw new Error(permissionMessage(error));
  invalidateAssessmentHub(athleteId);
  window.dispatchEvent(new Event('9fit:sync_updated'));
  window.dispatchEvent(new Event('9fit:profile-updated'));
}
