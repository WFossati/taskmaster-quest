import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type Investment = {
  id: string;
  name: string;
  assetType: string;
  institution: string;
  investedValue: number;
  earnings: number;
  notes: string;
  createdAt: string;
};

export type InvestmentInput = {
  name: string;
  assetType: string;
  institution: string;
  investedValue: number;
  earnings: number;
  notes: string;
};

function mapInvestment(row: any): Investment {
  return {
    id: row.id,
    name: row.name,
    assetType: row.asset_type,
    institution: row.institution,
    investedValue: Number(row.invested_value ?? 0),
    earnings: Number(row.earnings ?? 0),
    notes: row.notes ?? "",
    createdAt: row.created_at,
  };
}

export async function fetchInvestments(): Promise<Investment[]> {
  const { data, error } = await db
    .from("investments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapInvestment);
}

export async function createInvestment(userId: string, input: InvestmentInput) {
  const { data, error } = await db
    .from("investments")
    .insert({
      user_id: userId,
      name: input.name,
      asset_type: input.assetType,
      institution: input.institution,
      invested_value: input.investedValue,
      earnings: input.earnings,
      notes: input.notes || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapInvestment(data);
}

export async function updateInvestment(userId: string, id: string, input: InvestmentInput) {
  const { data, error } = await db
    .from("investments")
    .update({
      name: input.name,
      asset_type: input.assetType,
      institution: input.institution,
      invested_value: input.investedValue,
      earnings: input.earnings,
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return mapInvestment(data);
}

export async function deleteInvestment(id: string) {
  const { error } = await db.from("investments").delete().eq("id", id);
  if (error) throw error;
}
