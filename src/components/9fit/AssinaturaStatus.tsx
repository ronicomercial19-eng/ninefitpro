import { useState, useEffect } from 'react';
import { Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function AssinaturaStatus() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('plan_status, plan_expires_at')
          .eq('id', user.id)
          .maybeSingle();
        setProfile(data);
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  if (loading) return <div className="p-4 text-xs">Carregando status...</div>;

  const isPro = profile?.plan_status === 'Full';
  
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Crown className={isPro ? "text-brand-orange" : "text-gray-500"} size={20} />
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest">{isPro ? 'Plano Full' : 'Plano Básico'}</h3>
          <p className="text-[10px] text-gray-500 font-mono">Status: {profile?.plan_status || 'Básico'}</p>
        </div>
      </div>
      
      {profile?.plan_expires_at && (
        <div className="text-[10px] text-gray-400 font-mono">
          Expira em: {new Date(profile.plan_expires_at).toLocaleDateString()}
        </div>
      )}

      <a
        href="https://infinitepay.io/login"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-3 text-center bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
      >
        Gerenciar Assinatura
      </a>
    </div>
  );
}
