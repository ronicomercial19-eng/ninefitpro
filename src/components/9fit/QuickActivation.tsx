import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';
import { DAYS } from '@/lib/appOnboarding';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const GOALS: Record<string, string> = { performance: 'Performance', aesthetics: 'Estética', longevity: 'Longevidade', recomposition: 'Recomposição' };
const ZONES: Record<string, string> = { knee: 'Joelho', shoulder: 'Ombro', back: 'Costas', elbow: 'Cotovelo', ankle: 'Tornozelo', hip: 'Quadril' };
const chip = (on: boolean) => `rounded-xl border px-4 py-3 text-sm transition ${on ? 'border-primary bg-primary/10' : 'border-border'}`;

/**
 * Etapa 1 do onboarding: ativação rápida em uma tela só.
 * Grava objetivo + zonas de lesão (PDI parcial) e dias de treino (onboarding do app).
 * A ficha completa continua disponível depois, em Perfil > Minha ficha.
 */
export function QuickActivation({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const client = useQueryClient();
  const [goal, setGoal] = useState('');
  const [zones, setZones] = useState<string[] | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const ready = !!goal && zones !== null && days.length > 0;

  async function save() {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const pdi = await withTimeout(supabase.rpc('fn_save_pdi' as never, { p_patch: { goal, injury_zones: zones }, p_complete: false, p_preferences: {} } as never));
      if (pdi.error) throw pdi.error;
      const state: { data: unknown; error: unknown } = await withTimeout(supabase.rpc('fn_get_app_onboarding' as never));
      if (state.error || !state.data) throw state.error || new Error('onboarding_unavailable');
      const revision = (state.data as { onboarding?: { revision?: number } }).onboarding?.revision || 0;
      const saved = await withTimeout(supabase.rpc('fn_save_app_onboarding' as never, { p_patch: { training_days: days }, p_revision: revision, p_complete: false } as never));
      const result = saved.data as { saved?: boolean } | null;
      if (saved.error || !result?.saved) throw saved.error || new Error('save_not_confirmed');
      await client.invalidateQueries({ queryKey: ['my-onboardings'] });
      window.dispatchEvent(new Event('9fit:profile-updated'));
      toast.success('Ativação rápida concluída.');
      onDone();
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="fitpro-orange max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ativação rápida</DialogTitle>
          <DialogDescription>3 respostas. Seu professor já fica com o essencial.</DialogDescription>
        </DialogHeader>
        <fieldset disabled={busy} className="space-y-6">
          <section className="space-y-2">
            <h2 className="font-semibold">Qual é seu objetivo?</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(GOALS).map(([v, l]) => (
                <button type="button" key={v} aria-pressed={goal === v} className={chip(goal === v)} onClick={() => setGoal(v)}>{l}</button>
              ))}
            </div>
          </section>
          <section className="space-y-2">
            <h2 className="font-semibold">Tem dor ou lesão?</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={zones !== null && zones.length === 0} className={chip(zones !== null && zones.length === 0)} onClick={() => setZones([])}>Nenhuma</button>
              {Object.entries(ZONES).map(([v, l]) => {
                const on = !!zones?.includes(v);
                return <button type="button" key={v} aria-pressed={on} className={chip(on)} onClick={() => setZones(on ? zones!.filter((z) => z !== v) : [...(zones || []), v])}>{l}</button>;
              })}
            </div>
          </section>
          <section className="space-y-2">
            <h2 className="font-semibold">Quais dias você treina?</h2>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d, i) => {
                const n = i + 1;
                const on = days.includes(n);
                return <button type="button" key={d} aria-pressed={on} className={chip(on)} onClick={() => setDays(on ? days.filter((x) => x !== n) : [...days, n].sort())}>{d}</button>;
              })}
            </div>
          </section>
          <Button className="w-full" disabled={!ready || busy} onClick={() => void save()}>{busy ? 'Salvando…' : 'Concluir'}</Button>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
