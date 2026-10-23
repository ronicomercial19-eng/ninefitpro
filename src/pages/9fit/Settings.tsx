import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDailyContext } from '@/hooks/useDailyContext';
import { DynamicPDI } from '@/components/9fit/DynamicPDI';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { AppSupport } from '@/components/9fit/AppSupport';
import { toast } from 'sonner';
export default function NineFitSettings() {
  const context = useDailyContext();
  const [saving, setSaving] = useState(false);
  const save = async (patch: Record<string, unknown>) => {
    if(saving) return; setSaving(true);
    try {
      const { data, error } = await supabase.rpc('fn_save_pdi' as any, { p_patch: {}, p_preferences: patch });
      if(error || !(data as any)?.saved) throw error || new Error('not_saved');
      window.dispatchEvent(new Event('9fit:profile-updated')); toast.success('Preferência salva');
    } catch { toast.error('Não foi possível salvar. Tente novamente.'); }
    finally { setSaving(false); }
  };
  return <main className="min-h-screen bg-background px-4 pt-6 pb-28"><div className="max-w-2xl mx-auto space-y-6">
    <h1 className="text-3xl font-display">Minhas preferências</h1><DynamicPDI />
    {context.data && <fieldset disabled={saving} className="rounded-xl border border-border p-4 space-y-4"><legend>Acompanhamento no treino</legend>
      <label className="block text-sm">Como prefere usar o player?<select className="block w-full rounded-lg bg-card p-3 mt-2" value={context.data.profile.preferences.assistance || 'guided'} onChange={e => void save({ assistance: e.target.value })}><option value="guided">Guiado</option><option value="autonomous">Autônomo</option><option value="technical">Técnico</option></select></label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={!!context.data.profile.preferences.reduced_motion} onChange={e => void save({ reduced_motion: e.target.checked })} />Reduzir animações no app</label>
    </fieldset>}
    <section className="rounded-xl border border-border p-4 space-y-3"><h2 className="font-semibold">Minha conta e meus dados</h2><Link className="block text-primary" to="/9fit/profile">Perfil e ficha pessoal</Link><Link className="block text-primary" to="/9fit/progresso/fontes">Fontes de avaliações e compartilhamento</Link><Link className="block text-primary" to="/9fit/primepass">Assinatura e condições de acesso</Link><Link className="block text-primary" to="/9fit/notificacoes">Minhas notificações</Link></section><AppSupport />
  </div><BottomNavigation /></main>;
}
