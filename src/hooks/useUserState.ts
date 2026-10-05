import { useDailyContext } from '@/hooks/useDailyContext';
import { businessDate } from '@/services/dailyContextRules';
import type { StateResult } from '@/services/adaptiveState';

export function useUserState() {
  const context = useDailyContext();
  const current = context.data?.date === businessDate() ? context.data : null;
  let result: StateResult = { state: 'unknown', reasoning: 'Complete a calibração de hoje para acompanhar seus sinais.', confidence: 0 };
  if (context.isError) result.reasoning = 'Não foi possível atualizar os sinais. Tente novamente.';
  if (current?.calibration.complete) {
    const calibration = current.calibration;
    if (current.safety.review_required) result = { state: 'low', reasoning: 'Dor ou restrições registradas pedem revisão antes do treino.', confidence: 1 };
    else if ((calibration.sleep ?? 5) <= 2 || (calibration.energy ?? 5) <= 2) result = { state: 'low', reasoning: 'Você relatou sono ou energia baixos hoje.', confidence: 1 };
    else if ((current.sync.readiness ?? 0) >= 80) result = { state: 'power', reasoning: 'Sua percepção diária está positiva. Confira a prescrição antes de treinar.', confidence: 1 };
    else result = { state: 'balanced', reasoning: 'Sua percepção diária está intermediária. Siga o plano confirmado.', confidence: 1 };
  }
  const invalidate = () => window.dispatchEvent(new Event('9fit:user-state-invalidated'));
  return { ...result, loading: context.isPending, invalidate };
}
