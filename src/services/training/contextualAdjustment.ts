export interface ContextualInput {
  prescription: Array<{ name: string; sets: number; reps: string; restSeconds: number; rpe?: number }>;
  request?: string;
  reviewRequired?: boolean;
  sessionLocked?: boolean;
  calibration?: { sleep: number | null; energy: number | null };
}
export interface ContextualDecision {
  kind: 'maintain' | 'reduce' | 'shorten' | 'review';
  rationale: string;
  sources: string[];
  limitations: string[];
  changes: Array<{ exercise: string; sets?: number; rpe?: number; reason: string }>;
}

/** Versioned product rules, not a physiological readiness score or medical clearance. */
export function decideContextualAdjustment(input: ContextualInput): ContextualDecision {
  const request = (input.request ?? '').toLocaleLowerCase('pt-BR');
  const result: ContextualDecision = {
    kind: 'maintain', changes: [], sources: ['Prescrição atual'],
    rationale: 'A prescrição foi preservada. Abrir esta tela não justifica aumentar o estímulo.',
    limitations: ['Sem histórico comparável validado: progressão automática desativada.', 'Não estima fadiga, HRV ou recuperação.'],
  };
  if (input.sessionLocked) return { ...result, kind: 'review', rationale: 'Sessão iniciada ou finalizada: a prescrição executada fica preservada.' };
  if (input.reviewRequired || /\b(dor|doendo|lesão|lesao|incomodando|poupar)\b/.test(request)) {
    return { ...result, kind: 'review', rationale: 'Há dor ou restrição informada. Nenhuma alteração automática: revise a sessão com seu profissional.' };
  }
  if (!input.prescription.length || input.prescription.some(ex => !Number.isInteger(ex.sets) || ex.sets < 1 || ex.sets > 10)) {
    return { ...result, kind: 'review', rationale: 'Prescrição incompleta ou inválida. Confirme os parâmetros com seu profissional.' };
  }
  if (new Set(input.prescription.map(ex => ex.name.trim().toLocaleLowerCase())).size !== input.prescription.length) return { ...result, kind: 'review', rationale: 'Há exercícios com o mesmo nome. Revise a identificação antes de ajustar automaticamente.' };
  if (input.calibration) {
    result.sources.push('Sono e energia declarados para esta data');
    if ((input.calibration.sleep != null && input.calibration.sleep <= 2) || (input.calibration.energy != null && input.calibration.energy <= 2)) {
      result.rationale = 'Sono ou energia declarados estão baixos. Confirme se precisa de uma sessão mais leve; não alteramos a prescrição apenas pelo check-in.';
    }
  } else result.limitations.push('Sem check-in atual válido.');
  if (request) result.sources.push('Solicitação informada nesta sessão');
  if (/intens|pesad|progred|aument/.test(request)) return { ...result, rationale: 'Não aumentamos carga, séries ou esforço sem execuções comparáveis e limites do professor. Mantenha a prescrição ou solicite uma revisão.' };
  if (/equipamento|máquina|maquina|trocar|substitu/.test(request)) return { ...result, rationale: 'Use Trocar exercício para escolher uma alternativa. A equivalência de equipamento e carga não é inferida automaticamente.' };
  const lighter = /leve|cansad|difícil|dificil|reduz/.test(request);
  const shorter = /tempo|encurt|rápid|rapid/.test(request);
  if (!lighter && !shorter) return result;
  // Keep the first movement and every exercise. Remove at most one set per
  // later movement and at most 20% of session sets, always from the saved base.
  const total = input.prescription.reduce((sum, ex) => sum + ex.sets, 0);
  let budget = Math.floor(total * 0.2);
  for (let index = input.prescription.length - 1; index >= 1 && budget > 0; index--) {
    const ex = input.prescription[index];
    if (ex.sets <= 1) continue;
    result.changes.push({ exercise: ex.name, sets: ex.sets - 1, reason: shorter ? 'Redução conservadora de volume solicitada por tempo; primeiro exercício preservado.' : 'Redução conservadora de volume solicitada por dificuldade; carga, dose e descanso preservados.' });
    budget--;
  }
  result.kind = result.changes.length ? (shorter ? 'shorten' : 'reduce') : 'maintain';
  result.rationale = result.changes.length
    ? `${shorter ? 'Sessão enxugada' : 'Volume reduzido'} a partir da prescrição salva, sem aumentar carga ou esforço. A proposta retira no máximo 20% das séries e preserva todos os exercícios. Confirme antes de aplicar.`
    : 'A sessão já tem pouco volume para esta regra. Nenhuma redução automática segura dentro dos limites configurados.';
  if (shorter) result.limitations.push('Sem duração real por exercício: não garantimos um tempo final em minutos.');
  return result;
}
