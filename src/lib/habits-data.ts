import { supabase } from "@/integrations/supabase/client";

export type HabitCompletion = {
  id: string;
  habitId: string;
  completedOn: string;
  xpEarned: number;
  note: string;
  createdAt: string;
};

export type Habit = {
  id: string;
  name: string;
  description: string;
  area: string;
  frequency: "daily" | "weekly" | "custom";
  targetPerWeek: number;
  weekdays: number[];
  xpReward: number;
  isActive: boolean;
  createdAt: string;
  completions: HabitCompletion[];
};

export type HabitInput = Omit<Habit, "id" | "createdAt" | "completions">;

const db = supabase as any;

function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
}

export async function fetchHabits(): Promise<Habit[]> {
  const rows = unwrap(
    await db
      .from("habits")
      .select("*, habit_completions(id, habit_id, completed_on, xp_earned, note, created_at)")
      .order("created_at", { ascending: true }),
  ) as any[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    area: row.area,
    frequency: row.frequency,
    targetPerWeek: row.target_per_week,
    weekdays: row.weekdays ?? [],
    xpReward: row.xp_reward,
    isActive: row.is_active,
    createdAt: row.created_at,
    completions: [...(row.habit_completions ?? [])]
      .sort((a, b) => b.completed_on.localeCompare(a.completed_on))
      .map((completion) => ({
        id: completion.id,
        habitId: completion.habit_id,
        completedOn: completion.completed_on,
        xpEarned: completion.xp_earned,
        note: completion.note ?? "",
        createdAt: completion.created_at,
      })),
  }));
}

function toDb(userId: string, input: HabitInput) {
  return {
    user_id: userId,
    name: input.name,
    description: input.description || null,
    area: input.area,
    frequency: input.frequency,
    target_per_week: input.targetPerWeek,
    weekdays: input.weekdays,
    xp_reward: input.xpReward,
    is_active: input.isActive,
  };
}

export async function createHabit(userId: string, input: HabitInput) {
  unwrap(await db.from("habits").insert(toDb(userId, input)).select("id").single());
}

export async function updateHabit(userId: string, habitId: string, input: HabitInput) {
  unwrap(await db.from("habits").update(toDb(userId, input)).eq("id", habitId).select("id").single());
}

export async function deleteHabit(habitId: string) {
  unwrap(await db.from("habits").delete().eq("id", habitId).select("id").single());
}

export async function toggleHabitCompletion(userId: string, habit: Habit, date: string) {
  const existing = habit.completions.find((completion) => completion.completedOn === date);
  if (existing) {
    unwrap(await db.from("habit_completions").delete().eq("id", existing.id).select("id").single());
    return false;
  }

  unwrap(
    await db
      .from("habit_completions")
      .insert({
        habit_id: habit.id,
        user_id: userId,
        completed_on: date,
        xp_earned: habit.xpReward,
      })
      .select("id")
      .single(),
  );
  return true;
}
