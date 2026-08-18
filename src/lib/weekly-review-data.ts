import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type WeeklyMetrics = {
  weekStart: string;
  weekEnd: string;
  xpGained: number;
  xpLost: number;
  tasksCompleted: number;
  habitsCompleted: number;
  overdueTasks: number;
  plannedMinutes: number;
  topArea: string;
  neglectedArea: string;
  pendingTasks: number;
};

export type WeeklyReview = {
  id: string;
  weekStart: string;
  wins: string;
  pendingNotes: string;
  nextWeekPriority: string;
};

export type PendingTask = {
  id: string;
  title: string;
  dueDate: string | null;
  area: string;
};

function mapMetrics(row: any): WeeklyMetrics {
  return {
    weekStart: row.week_start,
    weekEnd: row.week_end,
    xpGained: row.xp_gained ?? 0,
    xpLost: row.xp_lost ?? 0,
    tasksCompleted: row.tasks_completed ?? 0,
    habitsCompleted: row.habits_completed ?? 0,
    overdueTasks: row.overdue_tasks ?? 0,
    plannedMinutes: row.planned_minutes ?? 0,
    topArea: row.top_area ?? "",
    neglectedArea: row.neglected_area ?? "",
    pendingTasks: row.pending_tasks ?? 0,
  };
}

export async function fetchWeeklyMetrics(weekStart: string) {
  const { data, error } = await db.rpc("get_weekly_review_metrics", { p_week_start: weekStart });
  if (error) throw error;
  return mapMetrics(data?.[0] ?? {});
}

export async function fetchWeeklyReview(weekStart: string): Promise<WeeklyReview | null> {
  const { data, error } = await db
    .from("weekly_reviews")
    .select("id,week_start,wins,pending_notes,next_week_priority")
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    weekStart: data.week_start,
    wins: data.wins ?? "",
    pendingNotes: data.pending_notes ?? "",
    nextWeekPriority: data.next_week_priority ?? "",
  };
}

export async function saveWeeklyReview(userId: string, weekStart: string, input: Omit<WeeklyReview, "id" | "weekStart">) {
  const { error } = await db.from("weekly_reviews").upsert(
    {
      user_id: userId,
      week_start: weekStart,
      wins: input.wins,
      pending_notes: input.pendingNotes,
      next_week_priority: input.nextWeekPriority,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,week_start" },
  );
  if (error) throw error;
}

export async function fetchPendingTasks(weekStart: string): Promise<PendingTask[]> {
  const { data, error } = await db.rpc("get_weekly_review_pending_tasks", { p_week_start: weekStart });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ id: row.id, title: row.title, dueDate: row.due_date, area: row.area }));
}

export async function fetchWeeklyEvolution(weeks: string[]) {
  return Promise.all(weeks.map(fetchWeeklyMetrics));
}
