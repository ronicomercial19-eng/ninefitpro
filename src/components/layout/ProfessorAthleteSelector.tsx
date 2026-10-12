import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function ProfessorAthleteSelector() {
  const { user, isTrainer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentId = new URLSearchParams(location.search).get('athleteId') ?? '';
  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ['professor-athlete-options', user?.id],
    enabled: Boolean(user?.id && isTrainer),
    queryFn: async () => {
      const { data, error } = await supabase.from('athletes')
        .select('id,name')
        .eq('is_test_account', false)
        .order('name')
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = athletes.find(athlete => athlete.id === currentId);
  const choose = (id: string) => {
    const params = new URLSearchParams(location.search);
    if (id) params.set('athleteId', id);
    else params.delete('athleteId');
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params}` : '' });
  };

  return <div className="flex items-center gap-2 min-w-0">
    <label htmlFor="professor-athlete" className="hidden lg:block text-xs text-muted-foreground whitespace-nowrap">Aluno</label>
    <select id="professor-athlete" aria-label="Aluno em foco" value={selected?.id ?? ''}
      onChange={event => choose(event.target.value)}
      className="w-36 sm:w-48 h-9 rounded-md border border-input bg-background px-2 text-sm"
      disabled={isLoading}>
      <option value="">{isLoading ? 'Carregando…' : 'Selecionar aluno'}</option>
      {athletes.map(athlete => <option key={athlete.id} value={athlete.id}>{athlete.name}</option>)}
    </select>
    {selected && <Link to={`/app/alunos?athleteId=${encodeURIComponent(selected.id)}`}
      className="hidden sm:inline text-xs text-primary underline whitespace-nowrap">Abrir ficha</Link>}
  </div>;
}
