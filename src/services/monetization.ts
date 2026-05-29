import { supabase } from '@/integrations/supabase/client';

export type MonetizationEvent = 'view_paywall' | 'select_plan' | 'start_trial' | 'convert' | 'dismiss_paywall';
export type MonetizationContext = 'post_assessment' | 'hub_upsell' | 'dedicated_screen' | 'feature_locked' | 'onboarding';

export async function trackMonetizationEvent(
  eventType: MonetizationEvent,
  planId?: string | null,
  context?: MonetizationContext,
  metadata: Record<string, any> = {},
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('monetization_events' as any).insert({
      user_id: user?.id ?? null,
      event_type: eventType,
      plan_id: planId ?? null,
      context: context ?? null,
      metadata,
    });
  } catch (e) {
    console.debug('[monetization]', e);
  }
}
