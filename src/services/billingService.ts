import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';
const subscriptionSchema = z.object({
  id: z.string(), full_name: z.string().nullable().optional(), plan_id: z.string().nullable(),
  status: z.string(), amount: z.number().nullable(), activated_at: z.string(),
  expires_at: z.string().nullable(), source: z.string().nullable(),
});
export type BillingSubscription = z.infer<typeof subscriptionSchema>;
export async function loadBillingSubscriptions() {
  const { data, error } = await withTimeout(supabase.rpc('fn_billing_subscription_list'));
  if (error) throw error;
  return z.array(subscriptionSchema).parse(data);
}
export async function loadProfessionalSubscriptions(userId: string) {
  const { data, error } = await withTimeout(supabase.from('user_subscriptions')
    .select('id,plan_id,status,amount,activated_at,expires_at,source')
    .eq('user_id', userId).eq('plan_id', 'ninecore').order('created_at', { ascending: false }).limit(100));
  if (error) throw error;
  return z.array(subscriptionSchema).parse(data);
}
export function subscriptionActive(subscription: BillingSubscription, now = Date.now()) {
  return ['active', 'trialing'].includes(subscription.status) && Date.parse(subscription.activated_at) <= now
    && (subscription.expires_at === null || Date.parse(subscription.expires_at) > now);
}