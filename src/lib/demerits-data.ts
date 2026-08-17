import { supabase } from "@/integrations/supabase/client";

export type DemeritOccurrence = {
  id: string;
  demeritId: string;
  occurredOn: string;
  xpLost: number;
  note: string;
  createdAt: string;
};

export type Demerit = {
  id: string;
  title: string;
  description: string;
  xpPenalty: number;
  isActive: boolean;
  createdAt: string;
  occurrences: DemeritOccurrence[];
};

export type DemeritInput = {
  title: string;
  description: string;
  xpPenalty: number;
  isActive: boolean;
};

const db = supabase as any;

function mapOccurrence(row: any): DemeritOccurrence {
  return {
    id: row.id,
    demeritId: row.demerit_id,
    occurredOn: row.occurred_on,
    xpLost: Number(row.xp_lost ?? 0),
    note: row.note ?? "",
    createdAt: row.created_at,
  };
}

export async function fetchDemerits(): Promise<Demerit[]> {
  const [{ data: demerits, error: demeritError }, { data: occurrences, error: occurrenceError }] = await Promise.all([
    db.from("demerits").select("*").order("created_at", { ascending: false }),
    db.from("demerit_occurrences").select("*").order("created_at", { ascending: false }),
  ]);
  if (demeritError) throw demeritError;
  if (occurrenceError) throw occurrenceError;
  const occurrenceRows = (occurrences ?? []).map(mapOccurrence);
  return (demerits ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    xpPenalty: Number(row.xp_penalty ?? 0),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    occurrences: occurrenceRows.filter((occurrence: DemeritOccurrence) => occurrence.demeritId === row.id),
  }));
}

export async function createDemerit(userId: string, input: DemeritInput) {
  const { error } = await db.from("demerits").insert({
    user_id: userId,
    title: input.title,
    description: input.description,
    xp_penalty: input.xpPenalty,
    is_active: input.isActive,
  });
  if (error) throw error;
}

export async function updateDemerit(id: string, input: DemeritInput) {
  const { error } = await db.from("demerits").update({
    title: input.title,
    description: input.description,
    xp_penalty: input.xpPenalty,
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteDemerit(id: string) {
  const { error } = await db.from("demerits").delete().eq("id", id);
  if (error) throw error;
}

export async function recordDemerit(id: string, note = "") {
  const { data, error } = await db.rpc("record_demerit", { p_demerit_id: id, p_note: note || null });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteDemeritOccurrence(id: string) {
  const { error } = await db.from("demerit_occurrences").delete().eq("id", id);
  if (error) throw error;
}
