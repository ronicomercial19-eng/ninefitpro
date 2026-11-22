import { businessDate, type DailyContext } from '../services/dailyContextRules';

/** Describe confirmed evidence, never infer adherence or a training adjustment from a log. */
export function studentEvidence(context: DailyContext | null | undefined, date = businessDate()) {
  if (!context || context.date !== date) return [];
  return [
    { title: 'Como você está', value: context.calibration.complete ? 'Check-in respondido' : 'Check-in pendente', use: 'Sono, energia e desconforto ajudam a revisar a sessão. Confira no Treino se houve ajuste aplicado.' },
    { title: 'O que você fez', value: context.today.workout_completed ? 'Treino concluído' : context.today.workout_in_progress ? 'Treino em andamento' : context.today.rest_day ? 'Descanso registrado' : 'Treino ainda não concluído', use: 'A sessão e seu relato de esforço ficam no histórico para acompanhar a evolução com seu professor.' },
    { title: 'Sua rotina', value: `${context.today.meals} refeições · ${context.today.water_ml} ml de água`, use: 'Os registros mostram quando sua rotina acontece. Quantidade registrada não comprova adequação nutricional nem altera a prescrição por si só.' },
  ];
}

export function effortFeedback(rpe: number) {
  return rpe >= 8 ? 'Você relatou um esforço alto nesta sessão.' : rpe >= 5 ? 'Você relatou um esforço moderado nesta sessão.' : 'Você relatou um esforço leve nesta sessão.';
}
