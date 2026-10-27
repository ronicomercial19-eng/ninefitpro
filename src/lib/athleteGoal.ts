const goalLabels: Record<string, string> = {
  performance: 'Performance', aesthetics: 'Estética', longevity: 'Longevidade', recomposition: 'Recomposição',
};

export function goalLabel(value: string | null | undefined): string {
  return value ? goalLabels[value] || value : 'Não informado';
}
