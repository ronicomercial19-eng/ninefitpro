import { useState, useEffect } from 'react';
import { Crown, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; // Assumindo este caminho para o cliente

export function AssinaturaStatus() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('plan_status, subscription_expires_at')
          .eq('id', user.id)
          .single();
        setSubscription(data);
      }
      setLoading(false);
    }
    fetchSubscription();
  }, []);

  if (loading) return <div className="p-4 text-xs">Carregando status...</div>;

  const isPro = subscription?.plan_status === 'pro';
  
  return (
    <div className="bg-brand-surface border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Crown className={isPro ? "text-brand-orange" : "text-gray-500"} size={20} />
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest">{isPro ? 'Plano FULL (Pro)' : 'Plano Básico'}</h3>
          <p className="text-[10px] text-gray-500 font-mono">Status: {subscription?.plan_status || 'Inativo'}</p>
        </div>
      </div>
      
      {subscription?.subscription_expires_at && (
        <div className="text-[10px] text-gray-400 font-mono">
          Expira em: {new Date(subscription.subscription_expires_at).toLocaleDateString()}
        </div>
      )}

      <a
        href="https://infinitepay.io/login" // Link padrão de painel do cliente
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-3 text-center bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
      >
        Gerenciar Assinatura
      </a>
    </div>
  );
}
