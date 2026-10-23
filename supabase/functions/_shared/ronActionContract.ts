export interface RonWireAction { id?: string; type: 'NAVIGATE'|'LOG_WATER'|'LOG_NUTRITION'|'DELETE_NUTRITION'|'REGISTER_PAIN'|'START_WORKOUT'|'SCHEDULE_CALENDAR'|'TRIGGER_RECOVERY'|'ADJUST_TRAINING_VOLUME'; title: string; description?: string; payload: Record<string, unknown>; autoExecute: false }
const routes = new Set(['/9fit/os','/9fit/hub','/9fit/train','/9fit/planejamento','/9fit/progresso','/9fit/dieta','/9fit/dieta?action=log','/9fit/profile','/9fit/staff','/9fit/aulas-creditos','/9fit/ajuste-treino','/9fit/recovery','/9fit/avaliacao-guiada','/9fit/habit-flow']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateRonActions(raw: unknown): RonWireAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0,5).flatMap(a => {
    if (!a || typeof a.title !== 'string' || !a.title.trim() || typeof a.type !== 'string') return [];
    const p = a.payload && typeof a.payload === 'object' && !Array.isArray(a.payload) ? a.payload : {};
    let payload: Record<string, unknown> = {};
    switch(a.type) {
      case 'NAVIGATE': if(!routes.has(p.path)) return []; payload={path:p.path}; break;
      case 'LOG_WATER': if(!Number.isInteger(p.amountMl)||p.amountMl<1||p.amountMl>5000) return []; payload={amountMl:p.amountMl}; break;
      case 'LOG_NUTRITION':
        if(typeof p.mealName!=='string'||!p.mealName.trim()||!['calories','protein','carbs','fats'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k])&&p[k]>=0&&p[k]<=10000))return [];
        payload={mealName:p.mealName.trim().slice(0,120),calories:p.calories,protein:p.protein,carbs:p.carbs,fats:p.fats}; break;
      case 'DELETE_NUTRITION': if(!uuid.test(p.mealId))return []; payload={mealId:p.mealId}; break;
      case 'REGISTER_PAIN': if(typeof p.region!=='string'||!p.region.trim()||!Number.isInteger(p.intensity)||p.intensity<1||p.intensity>10)return []; payload={region:p.region.slice(0,100),intensity:p.intensity}; break;
      case 'START_WORKOUT': case 'SCHEDULE_CALENDAR': case 'TRIGGER_RECOVERY': case 'ADJUST_TRAINING_VOLUME': break;
      default: return [];
    }
    return [{ id:uuid.test(a.id)?a.id:undefined,type:a.type,title:a.title.trim().slice(0,120),description:typeof a.description==='string'?a.description.slice(0,400):undefined,payload,autoExecute:false as const }];
  });
}
export function decodeRonChat(content: string) {
  try {
    const parsed=JSON.parse(content.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
    if(typeof parsed.content!=='string'||!parsed.content.trim())throw new Error('invalid_content');
    return { content:parsed.content, actions:validateRonActions(parsed.actions).map(a=>({...a,id:crypto.randomUUID()})) };
  } catch { return {content,actions:[] as RonWireAction[]}; }
}
