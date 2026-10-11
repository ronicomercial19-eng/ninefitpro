const TARGET_KEYS = ['fitpro_student_id','athlete_id','athleteId','student_id','aluno_id'];
export function partnerTarget(query: string, payload: unknown): string | null {
  const ids: string[] = [];
  const params = new URLSearchParams(query.replace(/^\?/,''));
  for (const key of TARGET_KEYS) ids.push(...params.getAll(key));
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    for (const [key,item] of Object.entries(value)) {
      if (TARGET_KEYS.includes(key)) {
        if (typeof item !== 'string') throw new Error('Identificador de aluno inválido');
        ids.push(item);
      } else if (typeof item === 'object') visit(item);
    }
  };
  visit(payload);
  if (!ids.length) return null;
  if (ids.some(id=>! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) throw new Error('Identificador de aluno inválido');
  if (new Set(ids.map(id=>id.toLowerCase())).size !== 1) throw new Error('Identificadores de aluno incompatíveis');
  return ids[0].toLowerCase();
}
