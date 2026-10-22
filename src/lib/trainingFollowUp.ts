interface Assignment {
  student_id: string;
  end_date: string | null;
}

/** Categorias exclusivas por aluno: vigente > sem data > vencido > sem treino. */
export function trainingFollowUp(athleteIds: string[], assignments: Assignment[], today: string) {
  const byStudent = new Map<string, Assignment[]>();
  for (const assignment of assignments) {
    const rows = byStudent.get(assignment.student_id) ?? [];
    rows.push(assignment);
    byStudent.set(assignment.student_id, rows);
  }
  const result = { total: 0, withoutTraining: 0, withoutEndDate: 0, expired: 0, current: 0 };
  for (const id of new Set(athleteIds)) {
    result.total++;
    const rows = byStudent.get(id) ?? [];
    if (!rows.length) result.withoutTraining++;
    else if (rows.some(row => row.end_date && row.end_date >= today)) result.current++;
    else if (rows.some(row => !row.end_date)) result.withoutEndDate++;
    else result.expired++;
  }
  return result;
}
