export function normalizeRemotePlanning(raw: unknown) {
  const root = raw as Record<string, any> | null;
  if (!root || root.ok === false || root.success === false) throw new Error('Remote plan not confirmed');
  const snapshot = root.snapshot;
  const payload = snapshot?.payload;
  const declaredMacros = payload?.macrocycles;
  const declaredWeeks = Array.isArray(declaredMacros) && declaredMacros.length
    ? declaredMacros.reduce((sum: number, p: any) => sum + Number(p?.weeks ?? p?.duration_weeks), 0) : undefined;
  const source = snapshot ? {
    ...payload, id: snapshot.smartperiodizer_periodization_id,
    status: snapshot.status, current_week: snapshot.cycle_week,
    total_weeks: payload?.total_weeks ?? declaredWeeks,
    waves: payload?.ondas ?? [], name: payload?.name ?? snapshot.goal,
  } : root.data?.plan ?? root.data ?? root.plan ?? root;
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Invalid plan');
  const plan = {...source};
  const id = plan.id ?? plan.plan_id;
  const waves = plan.waves ?? plan.cycles ?? [];
  const weeks = Number(plan.total_weeks ?? plan.weeks);
  if (!id || String(id).length > 200 || !Array.isArray(waves) || waves.length > 104 || waves.some(w => !w || typeof w !== 'object' || Array.isArray(w)) || !Number.isInteger(weeks) || weeks < 1 || weeks > 104) throw new Error('Remote plan requires id, explicit duration and valid waves');
  const current = Number(plan.current_week ?? 1);
  for (const field of ['macrocycles','macrocycle','mesocycles','mesocycle']) {
    const phases=plan[field];
    if (phases == null) continue;
    if (!Array.isArray(phases)) throw new Error('Invalid phase list');
    if (!phases.length) { delete plan[field]; continue; }
    const durations=phases.map(p => Number(p?.weeks ?? p?.duration_weeks));
    if (durations.some(n => !Number.isInteger(n) || n < 1) || durations.reduce((sum,n)=>sum+n,0)!==weeks) throw new Error('Phase duration differs from plan duration');
  }
  if (!Number.isInteger(current) || current < 1 || current > weeks) throw new Error('Invalid current week');
  if (!['active','ativo','in_progress'].includes(plan.status ?? 'active')) throw new Error('Remote plan is not active');
  return { id:String(id), name:String(plan.name ?? plan.title ?? 'Plano SmartPeriodizer').slice(0,200), weeks, current, waves, payload:plan };
}
