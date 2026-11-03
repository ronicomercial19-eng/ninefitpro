import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { withTimeout } from '@/lib/withTimeout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

type Account = { user_id: string; full_name: string | null; email: string; created_at: string; google_login: boolean; athlete_id: string | null };
type PendingPage = { total: number; offset: number; accounts: Account[] };
function grantError(error: unknown) {
  const message = (error as {message?: string})?.message || '';
  if (/existing_profile_requires_team_review/.test(message)) return 'Já existe uma ficha com esse e-mail. Revise o vínculo do cadastro existente antes de liberar; nenhuma ficha duplicada foi criada.';
  if (/access_already_active/.test(message)) return 'Esta conta já recebeu acesso. Atualize a lista para conferir.';
  if (/42501|account_access_denied|professional_required/.test(message)) return 'Seu vínculo não permite liberar esta conta. Atualize a lista e confira sua sessão.';
  if (/ambiguous_athlete/.test(message)) return 'Há mais de uma ficha vinculada a esta conta. Revise os cadastros antes de liberar.';
  return 'Não foi possível confirmar a liberação. Os dados foram preservados; tente novamente.';
}
export function PendingAccessPanel() {
  const {user, isTrainer} = useAuth();
  const client = useQueryClient();
  const [draft, setDraft] = useState(''), [search, setSearch] = useState(''), [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Account | null>(null);
  const [days, setDays] = useState('30'), [reason, setReason] = useState('Cortesia autorizada pelo professor');
  const [linkConfirmed, setLinkConfirmed] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const [lastGrant, setLastGrant] = useState<{athlete_id: string; name: string} | null>(null);
  const request = useRef<{signature: string; id: string} | null>(null), savingRef = useRef(false);
  const pending = useQuery({queryKey: ['coach-pending-access', user?.id, search, offset], enabled: !!user && isTrainer,
    staleTime: 15000, refetchInterval: 30000, refetchOnWindowFocus: true,
    queryFn: async () => {
      const {data, error} = await withTimeout(supabase.rpc('fn_coach_pending_access' as any, {p_search: search, p_offset: offset}));
      if(error) throw error;
      if(!data || !Array.isArray((data as any).accounts)) throw new Error('invalid_pending_accounts');
      return data as unknown as PendingPage;
    }});
  useEffect(() => { setSelected(null); setLastGrant(null); setDraft(''); setSearch(''); setOffset(0); request.current = null; }, [user?.id]);
  if(!isTrainer) return null;
  function open(account: Account) {
    request.current = null; setSelected(account); setDays('30'); setReason('Cortesia autorizada pelo professor'); setLinkConfirmed(false); setError('');
  }
  async function grant(event: React.FormEvent) {
    event.preventDefault();
    if(!selected || savingRef.current || (!selected.athlete_id && !linkConfirmed)) return;
    const signature = JSON.stringify([user?.id, selected.user_id, days, reason.trim()]);
    if(request.current?.signature !== signature) request.current = {signature, id: crypto.randomUUID()};
    savingRef.current = true; setSaving(true); setError('');
    try {
      const {data, error} = await withTimeout(supabase.rpc('fn_coach_grant_access' as any, {
        p_user_id: selected.user_id, p_days: days === 'unlimited' ? null : Number(days), p_reason: reason.trim(), p_request_id: request.current.id,
      }));
      if(error || !(data as any)?.saved || !(data as any)?.athlete_id) throw error || new Error('grant_not_confirmed');
      setLastGrant({athlete_id: (data as any).athlete_id, name: selected.full_name || selected.email});
      setSelected(null); setOffset(0); request.current = null;
      toast.success('Acesso por cortesia liberado. O aluno já pode entrar na conta.');
      void client.invalidateQueries({queryKey: ['coach-pending-access', user?.id]});
      void client.invalidateQueries({queryKey: ['professor-students', user?.id]});
      void client.invalidateQueries({queryKey: ['coach-subscription', user?.id]});
    } catch(error) { setError(grantError(error)); }
    finally { savingRef.current = false; setSaving(false); }
  }
  return <section className="rounded-2xl border border-primary/25 bg-card p-4 sm:p-5 space-y-4" aria-label="Acessos pendentes">
    <div className="flex items-start gap-3"><UserPlus className="mt-1 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><h2 className="text-xl font-semibold">Acessos pendentes {pending.data && <span className="text-sm text-muted-foreground">({pending.data.total})</span>}</h2><p className="mt-1 text-sm text-muted-foreground">Novos cadastros e alunos sem acesso válido. Confira a conta e libere uma cortesia para acompanhar com você.</p></div><Button variant="ghost" size="icon" aria-label="Atualizar acessos pendentes" disabled={pending.isFetching} onClick={() => void pending.refetch()}><RefreshCw className={`h-4 w-4 ${pending.isFetching ? 'animate-spin' : ''}`} /></Button></div>
    <form className="flex flex-wrap gap-2" onSubmit={event => {event.preventDefault(); setSearch(draft.trim()); setOffset(0);}}><input aria-label="Buscar cadastro por nome ou e-mail" className="min-h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm" placeholder="Buscar por nome ou e-mail" maxLength={120} value={draft} onChange={event => setDraft(event.target.value)} /><Button type="submit" className="min-h-11">Buscar</Button></form>
    {lastGrant && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm"><p>Acesso liberado para {lastGrant.name}.</p><Link className="mt-2 inline-flex min-h-11 items-center text-primary underline" to={`/app/acompanhamento?athlete=${encodeURIComponent(lastGrant.athlete_id)}`}>Abrir acompanhamento do aluno</Link></div>}
    {pending.isPending ? <p role="status" className="text-sm">Consultando cadastros…</p> : pending.isError ? <div role="alert" className="text-sm"><p>Não foi possível carregar os acessos pendentes.</p><Button variant="outline" className="mt-2" onClick={() => void pending.refetch()}>Tentar novamente</Button></div> : !pending.data?.accounts.length ? <p className="text-sm text-muted-foreground">{search ? 'Nenhum cadastro pendente encontrado para esta busca.' : 'Nenhum acesso pendente para sua equipe.'}</p> : <ul className="space-y-3">{pending.data.accounts.map(account => <li key={account.user_id} className="flex flex-wrap items-center gap-3 rounded-xl border p-4"><div className="min-w-0 flex-1 basis-48"><p className="font-semibold break-words">{account.full_name || 'Novo cadastro'}</p><p className="text-sm text-muted-foreground break-all">{account.email}</p><p className="mt-1 text-xs text-muted-foreground">{account.google_login ? 'Entrou pelo Google' : 'Conta cadastrada'} · {new Date(account.created_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p><p className="mt-1 text-xs text-primary">{account.athlete_id ? 'Ficha já vinculada · acesso pendente' : 'Novo cadastro · ainda sem ficha de aluno'}</p></div><Button className="min-h-11" onClick={() => open(account)}>Liberar acesso</Button></li>)}</ul>}
    {!!pending.data?.total && <div className="flex items-center justify-between gap-2 text-sm"><Button variant="outline" disabled={offset===0 || pending.isFetching} onClick={() => setOffset(value => Math.max(0,value-20))}>Anterior</Button><span>{offset+1}–{Math.min(offset+20,pending.data.total)} de {pending.data.total}</span><Button variant="outline" disabled={offset+20>=pending.data.total || pending.isFetching} onClick={() => setOffset(value => value+20)}>Próxima</Button></div>}
    <Dialog open={!!selected} onOpenChange={open => {if(!open && !savingRef.current) setSelected(null);}}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Liberar acesso por cortesia</DialogTitle><DialogDescription className="break-all">{selected?.full_name || 'Novo cadastro'} · {selected?.email}</DialogDescription></DialogHeader><form onSubmit={grant} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
      <label className="block text-sm">Validade do acesso<select aria-label="Validade do acesso" className="mt-2 min-h-11 w-full rounded-xl border bg-background px-3" value={days} onChange={event => setDays(event.target.value)}><option value="30">30 dias</option><option value="90">90 dias</option><option value="365">1 ano</option><option value="unlimited">Cortesia sem vencimento</option></select></label>
      <label className="block text-sm">Motivo da liberação<textarea required minLength={5} maxLength={500} className="mt-2 min-h-24 w-full rounded-xl border bg-background p-3" value={reason} onChange={event => setReason(event.target.value)} /></label>
      {!selected?.athlete_id && <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={linkConfirmed} onChange={event => setLinkConfirmed(event.target.checked)} required /><span>Vincular este cadastro como meu aluno e criar sua ficha de acompanhamento.</span></label>}
      <p className="text-sm text-muted-foreground">{days==='unlimited' ? 'O acesso ficará ativo sem vencimento.' : `O acesso ficará ativo por ${days} dias a partir da confirmação.`} A cortesia fica registrada em seu nome, sem registrar pagamento recebido.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancelar</Button><Button type="submit" disabled={!selected?.athlete_id && !linkConfirmed}>{saving ? 'Liberando…' : 'Confirmar liberação'}</Button></div>
    </fieldset></form></DialogContent></Dialog>
  </section>;
}
