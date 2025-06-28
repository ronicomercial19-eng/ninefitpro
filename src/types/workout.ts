
export interface Exercise {
  nome: string;
  series: string;
  repeticoes: string;
  carga?: string;
  cadencia?: string;
  rir?: string;
  metodo?: string;
}

export interface WorkoutBlock {
  tipo: 'Aquecimento' | 'Principal' | 'Finalização';
  exercicios: Exercise[];
}

export interface WorkoutDay {
  dia: string;
  blocos: WorkoutBlock[];
}

export interface WorkoutPlan {
  nome: string;
  objetivo: string;
  dias: WorkoutDay[];
}
