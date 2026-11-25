export interface RonWireAction { id?: string; type: 'NAVIGATE'|'LOG_WATER'|'LOG_NUTRITION'|'DELETE_NUTRITION'|'REGISTER_PAIN'|'START_WORKOUT'|'SCHEDULE_CALENDAR'|'TRIGGER_RECOVERY'|'ADJUST_TRAINING_VOLUME'; title: string; description?: string; payload: Record<string, unknown>; autoExecute: false }
const routes = new Set(['/9fit/os','/9fit/hub','/9fit/train','/9fit/planejamento','/9fit/progresso','/9fit/dieta','/9fit/dieta?action=log','/9fit/profile','/9fit/staff','/9fit/aulas-creditos','/9fit/ajuste-treino','/9fit/recovery','/9fit/avaliacao-guiada','/9fit/avaliacao-guiada?modo=completa','/9fit/habit-flow','/9fit/move','/9fit/pos-treino']);
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

// Objetos {...} balanceados dentro de um texto (respeita strings e escapes).
function balancedObjects(text: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    let depth = 0, inStr = false, esc = false;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { out.push(text.slice(i, j + 1)); i = j; break; } }
    }
  }
  return out;
}

const JSON_RESIDUE = /[\[{]\s*"(?:content|actions)"\s*:/;

// O modelo às vezes devolve texto + JSON, JSON dentro de cerca de código ou JSON quebrado.
// Regra: o aluno nunca vê JSON cru.
export function decodeRonChat(raw: string) {
  const text = String(raw ?? '').replace(/```(?:json)?/gi, '').trim();
  for (const candidate of [text, ...balancedObjects(text)]) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed.content === 'string' && parsed.content.trim()) {
        return { content: parsed.content.trim(), actions: validateRonActions(parsed.actions).map(a => ({ ...a, id: crypto.randomUUID() })) };
      }
    } catch { /* tenta o próximo candidato */ }
  }
  const cut = text.search(JSON_RESIDUE);
  const prose = (cut >= 0 ? text.slice(0, cut) : text).trim();
  if (prose) return { content: prose, actions: [] as RonWireAction[] };
  const m = text.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (m) {
    try {
      const content = String(JSON.parse(`"${m[1].replace(/\r?\n/g, '\\n')}"`)).trim();
      if (content) return { content, actions: [] as RonWireAction[] };
    } catch { /* cai no aviso abaixo */ }
  }
  return { content: 'Não consegui montar a resposta agora. Pode repetir a pergunta?', actions: [] as RonWireAction[] };
}
