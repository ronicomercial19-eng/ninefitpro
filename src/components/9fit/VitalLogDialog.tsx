import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function VitalLogDialog({ metric, onClose }: { metric: 'hrv' | 'heart_rate' | null; onClose: () => void }) {
  const { user } = useAuth();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  useEffect(() => { setValue(''); }, [metric, user?.id]);
  async function save() {
    if (!metric || !user || busy.current) return;
    const number = Number(value.replace(',', '.'));
    if (!value.trim() || !Number.isFinite(number) || number <= 0 || number > (metric === 'hrv' ? 500 : 300) || metric === 'heart_rate' && !Number.isInteger(number)) {
      toast.error(metric === 'hrv' ? 'Informe uma medição entre 0 e 500 ms, maior que zero.' : 'Informe uma medição inteira entre 1 e 300 bpm.');
      return;
    }
    busy.current = true; setSaving(true);
    try {
      const result = metric === 'hrv'
        ? await supabase.from('bio_hrv_logs').insert({ user_id: user.id, hrv_ms: number, source: 'manual' }).select('id').single()
        : await supabase.from('bio_heart_rate_logs').insert({ user_id: user.id, bpm: number, source: 'manual', context: 'rest' }).select('id').single();
      if (result.error) throw result.error;
      window.dispatchEvent(new Event('9fit:vitals-updated'));
      window.dispatchEvent(new Event('9fit:sync_updated'));
      toast.success('Medição registrada'); onClose();
    } catch { toast.error('Não foi possível salvar sua medição. Tente novamente.'); }
    finally { busy.current = false; setSaving(false); }
  }
  return <Dialog open={!!metric} onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent><DialogHeader><DialogTitle>{metric === 'hrv' ? 'Registrar variabilidade cardíaca (HRV)' : 'Registrar frequência cardíaca em repouso'}</DialogTitle><DialogDescription>Informe uma medição feita agora pelo seu dispositivo. O registro manual não é uma avaliação médica nem altera sua prescrição.</DialogDescription></DialogHeader>
      <form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-4">
        <label className="block text-sm">{metric === 'hrv' ? 'Medição em ms' : 'Medição em bpm'}<input autoFocus required type="number" min={metric === 'hrv' ? 0.01 : 1} max={metric === 'hrv' ? 500 : 300} step={metric === 'hrv' ? 'any' : 1} value={value} onChange={e => setValue(e.target.value)} disabled={saving} className="mt-2 w-full rounded-lg border border-border bg-background p-3" /></label>
        <button type="submit" disabled={saving || !user} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">{saving ? 'Salvando…' : 'Salvar medição'}</button>
      </form>
    </DialogContent>
  </Dialog>;
}
