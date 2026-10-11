import { supabase } from '@/integrations/supabase/client';

export type ShareChannel = 'native' | 'native_share' | 'copy' | 'download';
export interface ShareReceipt { id: string; athlete_id: string | null; reward_xp: number; rewarded: boolean; }

/** Call after successful native handoff or export. Neither proves external publication. */
export async function recordShareEvent(input: { userId: string; contentType: string; contentId?: string | null; channel: ShareChannel }): Promise<ShareReceipt> {
  const { data, error } = await supabase.from('share_events').insert({
    user_id: input.userId, content_type: input.contentType,
    content_id: input.contentId ?? null, channel: input.channel,
  }).select('id,athlete_id,reward_xp,rewarded').single();
  if (error) throw error;
  return data;
}
