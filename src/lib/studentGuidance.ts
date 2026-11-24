import { businessDate, type DailyContext } from "../services/dailyContextRules";

export interface StudentRecordSummary {
  key: "checkin" | "training" | "nutrition" | "water";
  label: string;
  value: string;
  recorded: boolean;
}

/** Current-day records, without inferring health, adherence or a training adjustment. */
export function studentEvidence(
  context: DailyContext | null | undefined,
  date = businessDate()
): StudentRecordSummary[] {
  if (!context || context.date !== date) return [];
  const { today, calibration } = context;
  const number = new Intl.NumberFormat("pt-BR");
  return [
    {
      key: "checkin",
      label: "Check-in",
      value: calibration.complete ? "Respondido" : "Pendente",
      recorded: calibration.complete,
    },
    {
      key: "training",
      label: "Treino",
      value: today.workout_completed
        ? "Concluído"
        : today.workout_in_progress
        ? "Em andamento"
        : today.rest_day
        ? "Descanso"
        : today.workout_scheduled
        ? "Programado"
        : "Sem registro",
      recorded:
        today.workout_completed || today.workout_in_progress || today.rest_day,
    },
    {
      key: "nutrition",
      label: "Refeições",
      value:
        today.meals > 0
          ? `${number.format(today.meals)} ${
              today.meals === 1 ? "refeição" : "refeições"
            }`
          : "Sem registro",
      recorded: today.meals > 0,
    },
    {
      key: "water",
      label: "Água",
      value:
        today.water_ml > 0
          ? `${number.format(today.water_ml)} ml`
          : "Sem registro",
      recorded: today.water_ml > 0,
    },
  ];
}

export function effortFeedback(rpe: number) {
  return rpe >= 8
    ? "Você relatou um esforço alto nesta sessão."
    : rpe >= 5
    ? "Você relatou um esforço moderado nesta sessão."
    : "Você relatou um esforço leve nesta sessão.";
}
