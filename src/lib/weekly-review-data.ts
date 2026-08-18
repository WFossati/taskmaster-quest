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

export type WeeklyDashboardMetrics = {
  weekStart: string;
  weekEnd: string;
  plannedTasks: number;
  completedPlannedTasks: number;
  executionRate: number;
  habitTarget: number;
  habitCompletionRate: number;
  demeritOccurrences: number;
};

export type AreaBreakdown = { area: string; activityCount: number };
export type HabitBreakdown = { id: string; name: string; area: string; target: number; completed: number };
export type DemeritBreakdown = { id: string; title: string; occurrences: number; xpLost: number };

export type WeeklyReview = {
  id: string;
  weekStart: string;
  wins: string;
  pendingNotes: string;
  nextWeekPriority: string;
  focus1: string;
  focus2: string;
  focus3: string;
  executionGoal: number;
  priorityHabit: string;
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

export async function fetchWeeklyDashboardMetrics(weekStart: string): Promise<WeeklyDashboardMetrics> {
  const { data, error } = await db.rpc("get_weekly_dashboard_metrics", { p_week_start: weekStart });
  if (error) throw error;
  const row = data?.[0] ?? {};
  return {
    weekStart: row.week_start,
    weekEnd: row.week_end,
    plannedTasks: row.planned_tasks ?? 0,
    completedPlannedTasks: row.completed_planned_tasks ?? 0,
    executionRate: Number(row.execution_rate ?? 0),
    habitTarget: row.habit_target ?? 0,
    habitCompletionRate: Number(row.habit_completion_rate ?? 0),
    demeritOccurrences: row.demerit_occurrences ?? 0,
  };
}

export async function fetchAreaBreakdown(weekStart: string): Promise<AreaBreakdown[]> {
  const { data, error } = await db.rpc("get_weekly_area_breakdown", { p_week_start: weekStart });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ area: row.area, activityCount: row.activity_count ?? 0 }));
}

export async function fetchHabitBreakdown(weekStart: string): Promise<HabitBreakdown[]> {
  const { data, error } = await db.rpc("get_weekly_habit_breakdown", { p_week_start: weekStart });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ id: row.habit_id, name: row.habit_name, area: row.area, target: row.target ?? 0, completed: row.completed ?? 0 }));
}

export async function fetchDemeritBreakdown(weekStart: string): Promise<DemeritBreakdown[]> {
  const { data, error } = await db.rpc("get_weekly_demerit_breakdown", { p_week_start: weekStart });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ id: row.demerit_id, title: row.title, occurrences: row.occurrences ?? 0, xpLost: row.xp_lost ?? 0 }));
}

export async function fetchWeeklyReview(weekStart: string): Promise<WeeklyReview | null> {
  const { data, error } = await db
    .from("weekly_reviews")
    .select("id,week_start,wins,pending_notes,next_week_priority,focus_1,focus_2,focus_3,execution_goal,priority_habit")
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
    focus1: data.focus_1 ?? "",
    focus2: data.focus_2 ?? "",
    focus3: data.focus_3 ?? "",
    executionGoal: data.execution_goal ?? 80,
    priorityHabit: data.priority_habit ?? "",
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
      focus_1: input.focus1,
      focus_2: input.focus2,
      focus_3: input.focus3,
      execution_goal: input.executionGoal,
      priority_habit: input.priorityHabit,
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
  return Promise.all(weeks.map(async (weekStart) => {
    const [metrics, dashboard] = await Promise.all([fetchWeeklyMetrics(weekStart), fetchWeeklyDashboardMetrics(weekStart)]);
    return { ...metrics, dashboard };
  }));
}
