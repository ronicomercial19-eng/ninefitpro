import { supabase } from '@/integrations/supabase/client';
import { businessDate } from './dailyContextRules';

export async function recordRonAction(type: string, payload: Record<string, any>, requestId: string) {
  const { data: identity, error: identityError } = await supabase.rpc('fn_current_athlete_id');
  if(identityError || !identity) throw new Error('Não foi possível confirmar seu perfil.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if(authError || !auth.user) throw new Error('Entre novamente para registrar.');
  let table: 'hydration_logs'|'nutrition_logs'|'pain_reports';
  let values: Record<string,unknown>;
  if(type==='LOG_WATER') {
    if(!Number.isInteger(payload.amountMl)||payload.amountMl<1||payload.amountMl>5000) throw new Error('Informe entre 1 e 5000 ml.');
    table='hydration_logs';values={athlete_id:identity,log_date:businessDate(),amount_ml:payload.amountMl};
  } else if(type==='LOG_NUTRITION') {
    if(typeof payload.mealName!=='string'||!payload.mealName.trim()||!['calories','protein','carbs','fats'].every(k=>typeof payload[k]==='number'&&Number.isFinite(payload[k])&&payload[k]>=0))throw new Error('Informe o alimento e os valores confirmados no diário.');
    table='nutrition_logs';values={athlete_id:identity,date:businessDate(),meal_name:payload.mealName.trim(),calories:payload.calories,protein:payload.protein,carbs:payload.carbs,fat:payload.fats};
  } else if(type==='REGISTER_PAIN') {
    if(typeof payload.region!=='string'||!payload.region.trim()||!Number.isInteger(payload.intensity)||payload.intensity<1||payload.intensity>10)throw new Error('Informe região e intensidade da dor.');
    table='pain_reports';values={athlete_id:identity,source:'ron_action',body_region:payload.region,intensity:payload.intensity};
  } else if(type==='DELETE_NUTRITION') {
    if(!payload.mealId)throw new Error('Escolha a refeição no diário.');
    const {error}=await supabase.from('nutrition_logs').delete().eq('id',payload.mealId).eq('athlete_id',identity);
    if(error)throw error;
    window.dispatchEvent(new Event('9fit:nutrition-updated'));
    window.dispatchEvent(new Event('9fit:sync_updated'));
    return {id:payload.mealId};
  } else throw new Error('Operação não suportada.');
  const {data,error}=await (supabase as any).from(table).insert({id:requestId,...values}).select('id').single();
  if(error) {
    if(error.code!=='23505')throw error;
    const {data:receipt,error:receiptError}=await (supabase as any).from(table).select('id').eq('id',requestId).eq('athlete_id',identity).single();
    if(receiptError||!receipt)throw receiptError||new Error('Não foi possível confirmar o registro.');
  }
  window.dispatchEvent(new Event(type==='LOG_WATER'?'9fit:water-updated':type==='LOG_NUTRITION'?'9fit:nutrition-updated':'9fit:user-state-invalidated'));
  window.dispatchEvent(new Event('9fit:sync_updated'));
  return data || {id:requestId};
}
