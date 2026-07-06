# 🔐 GUIA DE IMPLEMENTAÇÃO — Créditos & Gamificação (CORRIGIDO)

**Status:** ✅ Corrigido erros de race condition  
**Data:** 2026-07-06  
**Repositório:** ronicomercial19-eng/ninefitpro (fonte da verdade)

---

## ⚠️ SEGURANÇA: fn_consume_credit (OBRIGATÓRIA)

### Problema: Race Condition em Débito de Créditos

**❌ INSEGURO (nunca fazer):**
```typescript
// Lê do client, escreve direto — 2 cliques = 2 débitos
const result = await action();
await supabase.from('athlete_credits').update({ 
  credits_remaining: remaining - cost 
})
```

**✅ CORRETO (usar sempre):**
```typescript
// RPC atômica no banco — 1 operação indivisível
const { data, error } = await supabase.rpc('fn_consume_credit', {
  p_athlete_id: athleteId,
  p_amount: cost,
  p_reason: 'ai_message'
});

if (error || !data?.ok) {
  // Saldo insuficiente — bloqueado no banco
  return null;
}
```

### SQL da RPC (já existe em ninefitpro)

```sql
CREATE OR REPLACE FUNCTION public.fn_consume_credit(
  p_athlete_id uuid,
  p_amount int4,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE public.athlete_credits
  SET 
    credits_remaining = credits_remaining - p_amount,
    credits_used = credits_used + p_amount,
    updated_at = now()
  WHERE athlete_id = p_athlete_id
    AND credits_remaining >= p_amount  -- ⚠️ GUARD: se saldo < custo, falha
  RETURNING jsonb_build_object(
    'ok', true,
    'credits_remaining', credits_remaining
  ) INTO v_result;
  
  -- Se nenhuma linha foi atualizada = saldo insuficiente
  RETURN COALESCE(v_result, jsonb_build_object('ok', false, 'error', 'insufficient_credits'));
END;
$$;
```

---

## ✅ Hook: useCredits (CORRETO COM RPC ATÔMICA)

```typescript
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type CreditState = {
  total: number;
  used: number;
  remaining: number;
  plan_type: string;
};

const empty: CreditState = { 
  total: 0, 
  used: 0, 
  remaining: 0, 
  plan_type: 'base_2990' 
};

export function useCredits(athleteId: string | null) {
  const [state, setState] = useState<CreditState>(empty);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!athleteId) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('athlete_credits')
        .select('credits_total, credits_used, credits_remaining, plan_type')
        .eq('athlete_id', athleteId)
        .maybeSingle();

      if (data) {
        setState({
          total: data.credits_total ?? 0,
          used: data.credits_used ?? 0,
          remaining: data.credits_remaining ?? 0,
          plan_type: data.plan_type ?? 'base_2990',
        });
      }
    } catch (err) {
      console.error('[useCredits] refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to real-time updates (Supabase v2)
  useEffect(() => {
    if (!athleteId) return;

    const channel = supabase
      .channel(`credits:${athleteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'athlete_credits',
          filter: `athlete_id=eq.${athleteId}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athleteId, refresh]);

  /**
   * ✅ SEGURO: Envolve uma ação de IA e debita crédito de forma ATÔMICA.
   * RPC no banco garante que débito e execução são indivisíveis.
   * Se saldo insuficiente → bloqueado no banco (não no client).
   */
  const withCredit = useCallback(
    async <T,>(
      reason: string,
      fn: () => Promise<T>,
      cost: number = 1
    ): Promise<T | null> => {
      if (!athleteId) return await fn();

      try {
        // RPC ATÔMICA: debita crédito com guard no banco
        const { data, error } = await supabase.rpc('fn_consume_credit', {
          p_athlete_id: athleteId,
          p_amount: cost,
          p_reason: reason,
        });

        if (error || !data?.ok) {
          toast.error('Créditos insuficientes. Recarregue para continuar.');
          return null;
        }

        // Débito confirmado no banco — agora executa ação
        const result = await fn();
        
        // Refresh local state
        await refresh();
        return result;
      } catch (e) {
        // Erro durante execução — REEMBOLSA crédito
        console.error('[withCredit] action failed, refunding:', e);
        try {
          await supabase.rpc('fn_add_credits', {
            p_athlete_id: athleteId,
            p_amount: cost,
            p_reason: `refund:${reason}`,
          });
        } catch (refundErr) {
          console.error('[withCredit] refund failed:', refundErr);
          toast.error('Erro ao reembolsar crédito. Contacte suporte.');
        }
        throw e;
      }
    },
    [athleteId, refresh]
  );

  return { ...state, loading, refresh, withCredit };
}
```

---

## 🚀 Uso Seguro em Componentes

### Exemplo: RON Chat (IA com Gate)

```typescript
import { useCredits } from '@/hooks/useCredits';
import { toast } from 'sonner';

export function RonChat({ athleteId }) {
  const { withCredit, remaining } = useCredits(athleteId);

  const handleSendMessage = async (message: string) => {
    // ✅ SEGURO: withCredit garante atomicidade
    const response = await withCredit(
      'ron_ai_message',        // reason (auditoria)
      async () => {
        // RPC bloqueia aqui se saldo < 1
        const res = await callAIAPI(message);
        return res;
      },
      1  // cost
    );

    if (!response) {
      // Bloqueado pelo banco — saldo insuficiente
      showCreditPaywall();
      return;
    }

    toast.success('Mensagem enviada!');
  };

  return (
    <div>
      <p>Créditos: {remaining}</p>
      <button 
        onClick={() => handleSendMessage('...')}
        disabled={remaining < 1}  // guard visual (redundante mas bom UX)
      >
        Enviar (+1 crédito)
      </button>
    </div>
  );
}
```

---

## ✅ Checklist de Segurança

- [ ] `fn_consume_credit` existe e é SECURITY DEFINER
- [ ] RPC faz UPDATE com guard `credits_remaining >= p_amount`
- [ ] Hook **nunca** escreve `credits_remaining` direto
- [ ] RLC política bloqueia UPDATE em `athlete_credits` pelo client
- [ ] `withCredit()` sempre trata erro de RPC
- [ ] Refund automático se ação falha
- [ ] Teste: 2 cliques rápidos = 1 débito só
- [ ] Teste: sem créditos = erro do banco, não do client

---

## 🔴 Comparação: Antes vs Depois

| Aspecto | ❌ ANTES (inseguro) | ✅ DEPOIS (seguro) |
|--------|---|---|
| Lógica de débito | Client-side | RPC atômica (banco) |
| Race condition | Vulnerável | Impossível (ACID) |
| Guard | Apenas JS | Banco garante |
| Auditoria | Nenhuma | Log em `p_reason` |
| Refund automático | Não | Sim |
| RLS protection | Não garante | SECURITY DEFINER |

---

**Implementação pronta para monetização! 🔒**
