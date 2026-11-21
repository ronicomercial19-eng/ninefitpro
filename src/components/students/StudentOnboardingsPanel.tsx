import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';
import { Button } from '@/components/ui/button';
import type { Onboardings } from '@/hooks/useOnboardings';

interface CurriculumField { key: string; label: string; value: unknown }
interface CurriculumPage { key: string; title: string; completed_at: string | null; fields: CurriculumField[] }
interface Curriculum { pages: CurriculumPage[]; alerts: { level: 'atencao' | 'info'; text: string }[] }
interface AccessState { blocked: boolean; reason_code: string | null; reason_text: string | null; blocked_at: string | null; logins: number; access: { allowed: boolean; reason: string } | null }

const VALUES: Record<string, string> = {
  performance: 'Performance', aesthetics: 'Estética', longevity: 'Longevidade', recomposition: 'Recomposição',
  fast: 'Rápida', medium: 'Média', slow: 'Lenta', morning: 'Manhã', afternoon: 'Tarde', night: 'Noite',
  aggressive: 'Alta', moderate: 'Moderada', conservative: 'Conservadora',
  knee: 'Joelho', shoulder: 'Ombro', back: 'Costas', elbow: 'Cotovelo', ankle: 'Tornozelo', hip: 'Quadril',
  vegan: 'Vegano', vegetarian: 'Vegetariano', lactose: 'Lactose', gluten: 'Glúten',
};
const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const REASONS: Record<string, string> = { payment_overdue: 'Falta de pagamento', inactivity: 'Inatividade', contract_ended: 'Fim do contrato', other: 'Outro' };
const ACCESS_REASONS: Record<string, string> = { active: 'Acesso ativo', professional: 'Conta profissional', payment_required: 'Sem assinatura ativa', expired: 'Acesso expirado', payment_unconfirmed: 'Pagamento sem confirmação', manual_block: 'Bloqueado pelo professor', account_disabled: 'Conta desativada' };

function fmt(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return 'Não informado';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (key === 'training_days' && Array.isArray(v)) return v.map((n) => DAY_LABELS[Number(n) - 1] || n).join(', ');
  if (Array.isArray(v)) return v.length ? v.map((x) => VALUES[String(x)] || String(x)).join(', ') : 'Nenhuma';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleDateString('pt-BR');
  return VALUES[String(v)] || String(v);
}

function useAthleteRpc<T>(name: string, athleteId: string) {
  return useQuery({
    queryKey: ['student-panel', name, athleteId],
    queryFn: async () => {
      const { data, error } = await withTimeout(supabase.rpc(name as never, { p_athlete_id: athleteId } as never));
      if (error || !data) throw error || new Error(name);
      return data as unknown as T;
    },
  });
}

/** Ficha do aluno > Onboardings: alertas, etapas, currículo evolutivo e controle de acesso. */
export function StudentOnboardingsPanel({ athleteId }: { athleteId: string }) {
  const client = useQueryClient();
  const onboardings = useAthleteRpc<Onboardings>('fn_student_onboardings', athleteId);
  const curriculum = useAthleteRpc<Curriculum>('fn_student_curriculum', athleteId);
  const access = useAthleteRpc<AccessState>('fn_student_access_state', athleteId);
  const [reason, setReason] = useState('payment_overdue');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function changeAccess(block: boolean) {
    if (busy) return;
    if (block && !window.confirm('Bloquear o acesso deste aluno agora? Ele verá uma tela cheia com o motivo.')) return;
    setBusy(true);
    try {
      const { error } = block
        ? await withTimeout(supabase.rpc('fn_coach_block_athlete' as never, { p_athlete_id: athleteId, p_reason_code: reason, p_reason_text: note, p_payment_url: reason === 'payment_overdue' ? '/9fit/planos' : null } as never))
        : await withTimeout(supabase.rpc('fn_coach_release_athlete' as never, { p_athlete_id: athleteId } as never));
      if (error) throw error;
      toast.success(block ? 'Acesso bloqueado.' : 'Acesso liberado.');
      setNote('');
      await client.invalidateQueries({ queryKey: ['student-panel', 'fn_student_access_state', athleteId] });
    } catch {
      toast.error('Não foi possível alterar o acesso. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {curriculum.data?.alerts?.length ? (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-1" role="status">
          <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Atenção: o que o aluno informou</h3>
          <ul className="text-sm list-disc pl-5">{curriculum.data.alerts.map((a, i) => <li key={i}>{a.text}</li>)}</ul>
        </section>
      ) : null}

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-semibold">Etapas de onboarding</h3>
        {onboardings.isPending && <p role="status" className="text-sm">Carregando etapas…</p>}
        {onboardings.isError && <button className="text-sm underline" onClick={() => void onboardings.refetch()}>Não foi possível carregar as etapas. Tentar novamente</button>}
        {onboardings.data?.stages.map((stage, i) => (
          <div key={stage.key} className="space-y-1">
            <p className="text-sm font-medium flex items-center gap-2">
              {stage.completed ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
              {i + 1}. {stage.title} <span className="text-xs text-muted-foreground tabular-nums">{stage.done}/{stage.total}</span>
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 pl-6 text-xs text-muted-foreground">
              {stage.steps.map((s) => <li key={s.key}>{s.done ? '✓' : '○'} {s.label}</li>)}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-semibold">Currículo do aluno</h3>
        {curriculum.isPending && <p role="status" className="text-sm">Carregando currículo…</p>}
        {curriculum.isError && <button className="text-sm underline" onClick={() => void curriculum.refetch()}>Não foi possível carregar o currículo. Tentar novamente</button>}
        {curriculum.data && !curriculum.data.pages.length && <p className="text-sm text-muted-foreground">O aluno ainda não respondeu nenhuma ativação. As páginas aparecem aqui conforme ele avança.</p>}
        {curriculum.data?.pages.map((page) => (
          <div key={page.key} className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">{page.title}{page.completed_at ? <span className="ml-2 text-xs text-muted-foreground">concluído em {new Date(page.completed_at).toLocaleDateString('pt-BR')}</span> : null}</p>
            <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {page.fields.map((f) => <div key={f.key}><dt className="text-xs text-muted-foreground">{f.label}</dt><dd className="text-sm">{fmt(f.key, f.value)}</dd></div>)}
            </dl>
          </div>
        ))}
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-semibold">Acesso ao app</h3>
        {access.isPending && <p role="status" className="text-sm">Carregando acesso…</p>}
        {access.isError && <button className="text-sm underline" onClick={() => void access.refetch()}>Não foi possível carregar o acesso. Tentar novamente</button>}
        {access.data && (access.data.blocked ? (
          <>
            <p className="text-sm"><strong>Bloqueado:</strong> {REASONS[access.data.reason_code || 'other'] || 'Outro'}{access.data.reason_text ? ` · ${access.data.reason_text}` : ''}{access.data.blocked_at ? ` · desde ${new Date(access.data.blocked_at).toLocaleDateString('pt-BR')}` : ''}</p>
            <Button disabled={busy} onClick={() => void changeAccess(false)}>{busy ? 'Liberando…' : 'Liberar acesso'}</Button>
          </>
        ) : (
          <>
            <p className="text-sm">{ACCESS_REASONS[access.data.access?.reason || ''] || 'Acesso sem bloqueio manual'}</p>
            {access.data.logins === 0 ? <p className="text-sm text-muted-foreground">Este aluno ainda não tem login no app, então não há o que bloquear.</p> : (
              <div className="space-y-2">
                <label className="block text-sm space-y-1"><span>Motivo do bloqueio</span>
                  <select className="w-full rounded-lg border bg-background p-2" value={reason} onChange={(e) => setReason(e.target.value)}>
                    {Object.entries(REASONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label className="block text-sm space-y-1"><span>Mensagem para o aluno (opcional)</span>
                  <input className="w-full rounded-lg border bg-background p-2" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
                <Button variant="destructive" disabled={busy} onClick={() => void changeAccess(true)}>{busy ? 'Bloqueando…' : 'Bloquear acesso'}</Button>
              </div>
            )}
          </>
        ))}
        <p className="text-xs text-muted-foreground">Quando um pagamento confirmar ou você liberar acesso, o bloqueio sai sozinho.</p>
      </section>
    </div>
  );
}
