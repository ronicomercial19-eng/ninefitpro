export function businessDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export interface DailyContext {
  version: number; status: string; date: string; generated_at: string;
  profile: {
    complete: boolean; completed_at: string | null;
    declared: Record<string, unknown>;
    preferences: { session_minutes?: number; training_environment?: string; assistance?: string; reduced_motion?: boolean };
    observed: { active_days_30d: number; completed_workouts_30d: number; nutrition_days_30d?: number; hydration_days_30d?: number; review_days_30d?: number; training_windows: Array<{ training_window: string; samples: number }> };
    inferred: { training_window: string | null; source: string; requires_confirmation: boolean };
  };
  calibration: { complete: boolean; sleep: number | null; energy: number | null; mood: number | null; motivation: number | null; pain: number | null; pain_location: string | null; observed_at: string | null };
  safety: { review_required: boolean; reason: string | null; is_medical_clearance: false };
  today: { workout_completed: boolean; workout_in_progress: boolean; workout_scheduled: boolean; rest_day: boolean; meals: number; water_ml: number; review: number | null };
  sync: { value: number | null; readiness: number | null; record_coverage: number; coverage_dimensions: Record<string, number>; formula: string; source: string; is_medical_clearance: false };
  streak: number;
}

export type DayAction = 'calibration' | 'profile' | 'safety' | 'training' | 'nutrition' | 'hydration' | 'review' | 'complete';
export interface DayCommand { key: DayAction; title: string; description: string; label: string; route?: string }
export function selectDayCommand(context: DailyContext): DayCommand {
  if (!context.calibration.complete) return { key: 'calibration', title: 'Vamos calibrar seu dia.', description: 'Sono, energia, humor, dor e motivação: cinco respostas para orientar seu próximo passo.', label: 'Calibrar com emojis' };
  if (context.safety.review_required && !context.today.workout_completed && !context.today.rest_day) return { key: 'safety', title: 'Revise seu treino antes de começar.', description: 'Há dor ou restrições registradas. Consulte o ajuste e seu profissional antes de executar.', label: 'Revisar com meu profissional', route: '/9fit/ajuste-treino' };
  if (!context.profile.complete) return { key: 'profile', title: 'Seu perfil merece a sua confirmação.', description: 'Confirme objetivo, rotina e restrições uma vez. Sua ficha acompanha a evolução depois.', label: 'Completar minha ficha' };
  if (!context.today.workout_completed && !context.today.rest_day) return { key: 'training', title: context.today.workout_in_progress ? 'Seu treino está em andamento.' : context.today.workout_scheduled ? 'Seu treino de hoje está pronto.' : 'Confira o treino adequado para hoje.', description: context.today.workout_in_progress ? 'Retome a sessão e finalize os registros.' : 'Abra Train para conferir a prescrição ou escolher uma sessão adequada. Descanso também faz parte do plano.', label: context.today.workout_in_progress ? 'Retomar treino' : 'Abrir Train', route: '/9fit/train' };
  if (!context.today.meals) return { key: 'nutrition', title: 'Agora, registre sua alimentação.', description: 'Adicione sua refeição no diário da Dieta. O registro alimenta o mesmo histórico nutricional.', label: 'Registrar refeição', route: '/9fit/dieta' };
  if (!context.today.water_ml) return { key: 'hydration', title: 'Registre a água que você tomou.', description: 'Informe o volume real. Registrar água não significa ter atingido sua necessidade diária.', label: 'Registrar água', route: '/9fit/dieta' };
  if (context.today.review === null) return { key: 'review', title: 'Como foi seu dia?', description: 'Uma resposta encerra sua jornada de hoje e ajuda a acompanhar sua rotina.', label: 'Fazer balanço do dia' };
  return { key: 'complete', title: 'Sua jornada de hoje está registrada.', description: 'Você pode encerrar por aqui. Seus módulos continuam disponíveis quando precisar.', label: 'Ver minha evolução', route: '/9fit/progresso' };
}

export function dayProgress(context: DailyContext) {
  const completed = [context.calibration.complete, context.profile.complete, context.today.workout_completed || context.today.rest_day, context.today.meals > 0, context.today.water_ml > 0, context.today.review !== null].filter(Boolean).length;
  return { completed, total: 6 };
}
