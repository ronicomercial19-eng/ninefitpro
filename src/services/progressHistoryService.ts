import { loadAssessmentHub } from './assessmentHubService';

// Shared database contract for Progress Tracker and FitPro. The same file is kept
// in both repositories because the products ship independently.
export interface HistoryAssessment {
  id: string;
  data_avaliacao: string;
  origem: string | null;
  peso: number | null;
  gordura_corporal: number | null;
  massa_muscular: number | null;
  circunferencia_cintura: number | null;
  rm1_empurrar_superior: number | null;
  rm1_empurrar_perna: number | null;
  rm1_puxar_costas: number | null;
  score_global: number | null;
  oficial?: boolean;
  dados_adicionais?: unknown;
  created_at?: string;
}

export interface HistoryWorkout {
  id: string;
  date: string;
  name: string;
  volumeKg: number | null;
  rpe: number | null;
  source: 'FitPro' | 'Progress Tracker';
}

export interface HistoryLoad {
  id: string;
  date: string;
  exercise: string;
  kg: number;
  reps: number | null;
  source: 'FitPro' | 'Progress Tracker';
}

export interface HistoryPR {
  id: string;
  date: string;
  exercise: string;
  value: number;
  unit: string;
}

export interface ProgressHistory {
  assessments: HistoryAssessment[];
  workouts: HistoryWorkout[];
  loads: HistoryLoad[];
  records: HistoryPR[];
}

export async function loadProgressHistory(athleteId: string): Promise<ProgressHistory> {
  const hub = await loadAssessmentHub(athleteId);
  return { assessments: hub.assessments, workouts: hub.workouts, loads: hub.loads, records: hub.records };
}
