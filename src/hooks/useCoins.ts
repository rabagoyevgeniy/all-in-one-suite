import { supabase } from '@/integrations/supabase/client';

export async function awardCoins(
  userId: string,
  userRole: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string
): Promise<number> {
  const { data, error } = await supabase.rpc('add_coins', {
    p_user_id: userId,
    p_user_role: userRole,
    p_amount: amount,
    p_type: type,
    p_description: description,
    p_reference_id: referenceId || null,
  });

  if (error) {
    console.error('awardCoins error:', error);
    return 0;
  }

  // Fire-and-forget notification
  supabase.from('notifications').insert({
    user_id: userId,
    title: `🪙 +${amount} ProFit Coins!`,
    body: description,
    type: 'coin_received',
    reference_id: referenceId || undefined,
  }).then(() => {});

  return data as number;
}

export async function spendCoins(
  userId: string,
  userRole: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const { data, error } = await supabase.rpc('spend_coins', {
    p_user_id: userId,
    p_user_role: userRole,
    p_amount: amount,
    p_type: type,
    p_description: description,
    p_reference_id: referenceId || null,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('Insufficient coins')) {
      return { success: false, newBalance: 0, error: 'Insufficient coins' };
    }
    console.error('spendCoins error:', error);
    return { success: false, newBalance: 0, error: msg };
  }

  return { success: true, newBalance: data as number };
}
