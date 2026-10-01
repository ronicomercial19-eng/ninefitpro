import { useState, useEffect } from 'react';
import { Crown, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Assumindo este caminho para o cliente

export function AssinaturaStatus() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_subscriptions' as any)
          .select('status, plan_id, expires_at')
          .eq('user_id', user.id).order('activated_at', { ascending: false }).limit(1).maybeSingle();
        setSubscription(data);
      }
      setLoading(false);
    }
    fetchSubscription();
  }, []);

  if (loading) return <div className="p-4 text-xs">Carregando status...</div>;

  const isPro = ['active','trialing'].includes(subscription?.status) && (!subscription?.expires_at || new Date(subscription.expires_at).getTime() > Date.now());
  
  return (
    <div className="bg-brand-surface border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Crown className={isPro ? "text-brand-orange" : "text-gray-500"} size={20} />
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest">{isPro ? `Plano ${subscription.plan_id || 'ativo'}` : 'Sem assinatura ativa'}</h3>
          <p className="text-[10px] text-gray-500 font-mono">Status: {subscription?.status || 'Inativo'}</p>
        </div>
      </div>
      
      {subscription?.expires_at && (
        <div className="text-[10px] text-gray-400 font-mono">
          Expira em: {new Date(subscription.expires_at).toLocaleDateString()}
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
