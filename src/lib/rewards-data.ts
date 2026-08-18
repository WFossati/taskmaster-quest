import { supabase } from "@/integrations/supabase/client";

export type Reward = {
  id: string;
  title: string;
  coinCost: number;
  isActive: boolean;
  createdAt: string;
};

export type RewardTransaction = {
  id: string;
  type: "xp_conversion" | "reward_purchase";
  xpAmount: number;
  coinAmount: number;
  rewardId: string;
  rewardTitle: string;
  createdAt: string;
};

export type WalletSummary = {
  totalEarnedXp: number;
  netXp: number;
  convertedXp: number;
  availableXp: number;
  coinBalance: number;
};

const db = supabase as any;

function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
}

export async function fetchRewards(): Promise<Reward[]> {
  const rows = unwrap(
    await db.from("rewards").select("id, title, coin_cost, is_active, created_at").eq("is_active", true).order("created_at", { ascending: true }),
  ) as any[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    coinCost: row.coin_cost,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function fetchRewardTransactions(): Promise<RewardTransaction[]> {
  const rows = unwrap(
    await db
      .from("reward_transactions")
      .select("id, transaction_type, xp_amount, coin_amount, reward_id, reward_title, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ) as any[];

  return rows.map((row) => ({
    id: row.id,
    type: row.transaction_type,
    xpAmount: row.xp_amount,
    coinAmount: row.coin_amount,
    rewardId: row.reward_id ?? "",
    rewardTitle: row.reward_title ?? "",
    createdAt: row.created_at,
  }));
}

export async function fetchWalletSummary(): Promise<WalletSummary> {
  const rows = unwrap(await db.rpc("get_reward_wallet_summary")) as any[];
  const row = rows[0] ?? {};
  return {
    totalEarnedXp: Number(row.total_earned_xp ?? 0),
    netXp: Number(row.net_xp ?? 0),
    convertedXp: Number(row.converted_xp ?? 0),
    availableXp: Number(row.available_xp ?? 0),
    coinBalance: Number(row.coin_balance ?? 0),
  };
}

export async function fetchRewardsPage() {
  const [summary, rewards, transactions] = await Promise.all([
    fetchWalletSummary(),
    fetchRewards(),
    fetchRewardTransactions(),
  ]);
  return { summary, rewards, transactions };
}

export async function createReward(userId: string, title: string, coinCost: number) {
  unwrap(
    await db
      .from("rewards")
      .insert({ user_id: userId, title: title.trim(), coin_cost: coinCost })
      .select("id")
      .single(),
  );
}

export async function deleteReward(rewardId: string) {
  unwrap(await db.from("rewards").delete().eq("id", rewardId).select("id").single());
}

export async function convertXpToCoins(coins: number) {
  unwrap(await db.rpc("convert_xp_to_coins", { p_coins: coins }));
}

export async function purchaseReward(rewardId: string) {
  unwrap(await db.rpc("purchase_reward", { p_reward_id: rewardId }));
}
