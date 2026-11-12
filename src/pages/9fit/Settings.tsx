import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDailyContext } from '@/hooks/useDailyContext';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { AppSupport } from '@/components/9fit/AppSupport';
import { toast } from 'sonner';
import { StudentSectionHeader } from '@/components/9fit/StudentSectionHeader';
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
  return <main className="min-h-screen bg-background pb-28"><StudentSectionHeader kicker="9FIT // AJUSTES" title="Preferências e suporte" description="Personalize sua experiência sem perder o controle da sua jornada." /><div className="mx-auto max-w-2xl space-y-4 px-4 pt-5">
    <Link className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/[0.05] p-4 text-sm font-semibold text-primary" to="/9fit/profile?section=pdi">Editar minha ficha <span aria-hidden>→</span></Link>
    {context.data && <fieldset disabled={saving} className="rounded-2xl border border-white/10 bg-card/70 p-5 space-y-4"><legend className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Acompanhamento no treino</legend>
      <label className="block text-sm">Como prefere usar o player?<select className="mt-2 block w-full rounded-xl border border-white/10 bg-background p-3" value={context.data.profile.preferences.assistance || 'guided'} onChange={e => void save({ assistance: e.target.value })}><option value="guided">Guiado</option><option value="autonomous">Autônomo</option><option value="technical">Técnico</option></select></label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={!!context.data.profile.preferences.reduced_motion} onChange={e => void save({ reduced_motion: e.target.checked })} />Reduzir animações no app</label>
    </fieldset>}
    <section className="rounded-2xl border border-white/10 bg-card/70 p-5 space-y-2"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Minha conta e meus dados</h2>{[['/9fit/profile','Perfil e ficha pessoal'],['/9fit/progresso/fontes','Fontes de avaliações e compartilhamento'],['/9fit/primepass','Assinatura e condições de acesso'],['/9fit/notificacoes','Minhas notificações']].map(([to,label]) => <Link key={to} className="flex items-center justify-between rounded-xl border border-white/[0.07] p-3 text-sm text-foreground transition hover:border-primary/35" to={to}>{label}<span className="text-primary" aria-hidden>→</span></Link>)}</section><AppSupport />
  </div><BottomNavigation /></main>;
}
