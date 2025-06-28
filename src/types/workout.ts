
export interface Exercise {
  nome: string;
  series: string;
  repeticoes: string;
  carga?: string;
  cadencia?: string;
  rir?: string;
  metodo?: string;
  [key: string]: string | undefined;
}

export interface WorkoutBlock {
  tipo: 'Aquecimento' | 'Principal' | 'Finalização';
  exercicios: Exercise[];
  [key: string]: any;
}

export interface WorkoutDay {
  dia: string;
  blocos: WorkoutBlock[];
  [key: string]: any;
}

export interface WorkoutPlan {
  nome: string;
  objetivo: string;
  dias: WorkoutDay[];
  [key: string]: any;
}
