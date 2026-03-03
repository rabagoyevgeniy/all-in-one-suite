import { supabase } from '@/integrations/supabase/client';

type CoinTable = 'coaches' | 'parents' | 'students' | 'pro_athletes';

function getRoleTable(userRole: string): CoinTable | null {
  const map: Record<string, CoinTable> = {
    coach: 'coaches',
    parent: 'parents',
    student: 'students',
    pro_athlete: 'pro_athletes',
  };
  return map[userRole] || null;
}

export async function awardCoins(
  userId: string,
  userRole: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string
): Promise<number> {
  const table = getRoleTable(userRole);
  if (!table) return 0;

  const { data } = await supabase
    .from(table)
    .select('coin_balance')
    .eq('id', userId)
    .single();

  const currentBalance = (data as any)?.coin_balance || 0;
  const newBalance = currentBalance + amount;

  await supabase
    .from(table)
    .update({ coin_balance: newBalance } as any)
    .eq('id', userId);

  await supabase.from('coin_transactions').insert({
    user_id: userId,
    user_role: userRole,
    amount,
    transaction_type: type,
    balance_after: newBalance,
    description,
    reference_id: referenceId || undefined,
  });

  await supabase.from('notifications').insert({
    user_id: userId,
    title: `🪙 +${amount} ProFit Coins!`,
    body: description,
    type: 'coin_received',
    reference_id: referenceId || undefined,
  });

  return newBalance;
}

export async function spendCoins(
  userId: string,
  userRole: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const table = getRoleTable(userRole);
  if (!table) return { success: false, newBalance: 0, error: 'Invalid role' };

  const { data } = await supabase
    .from(table)
    .select('coin_balance')
    .eq('id', userId)
    .single();

  const currentBalance = (data as any)?.coin_balance || 0;

  if (currentBalance < amount) {
    return { success: false, newBalance: currentBalance, error: 'Insufficient coins' };
  }

  const newBalance = currentBalance - amount;

  await supabase
    .from(table)
    .update({ coin_balance: newBalance } as any)
    .eq('id', userId);

  await supabase.from('coin_transactions').insert({
    user_id: userId,
    user_role: userRole,
    amount: -amount,
    transaction_type: type,
    balance_after: newBalance,
    description,
    reference_id: referenceId || undefined,
  });

  return { success: true, newBalance };
}
