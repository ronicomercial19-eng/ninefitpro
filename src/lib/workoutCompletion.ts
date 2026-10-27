export interface CompletionRecord {
  completion_valid?: boolean | null;
  completion_validation_reason?: string | null;
}

/** Validity is confirmed by the database, never inferred from status/duration. */
export function completionLabel(record: CompletionRecord): string {
  return record.completion_valid === true ? 'Conclusão válida' : 'Registro não contabilizado';
}

export function completionReason(record: CompletionRecord): string | null {
  if (record.completion_valid === true) return null;
  if (record.completion_validation_reason === 'no_completed_set') return 'Sem série concluída registrada.';
  if (record.completion_validation_reason === 'duration_under_5_minutes') return 'Duração registrada inferior a cinco minutos.';
  return 'Não há confirmação suficiente para incluir esta sessão nos indicadores.';
}
