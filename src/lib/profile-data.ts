import { supabase } from "@/integrations/supabase/client";
import { fetchWeeklyEvolution, type WeeklyDashboardMetrics, type WeeklyMetrics } from "@/lib/weekly-review-data";

const db = supabase as any;

export type ProfileStats = {
  completedTasks: number;
  completedHabits: number;
  totalXp: number;
  exerciseDays: number;
  readingDays: number;
  investmentValue: number;
  bestWeeklyScore: number;
  bestWeekly70Streak: number;
  xpWithoutDemerits: number;
};

const EXERCISE_WORDS = ["academia", "treino", "exercicio", "exercício", "corrida", "correr", "caminhada", "caminhar", "bike", "bicicleta", "musculacao", "musculação", "pilates", "yoga", "esporte"];
const READING_WORDS = ["leitura", "ler", "livro", "reading"];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function matchesAny(name: string, words: string[]) {
  const normalized = normalize(name);
  return words.some((word) => normalized.includes(normalize(word)));
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(value = new Date()) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function scoreWeek(metrics: WeeklyMetrics, dashboard: WeeklyDashboardMetrics) {
  const execution = Math.min(100, dashboard.executionRate);
  const habits = Math.min(100, dashboard.habitCompletionRate);
  const demeritScore = Math.max(0, 100 - dashboard.demeritOccurrences * 20);
  return Math.round(execution * 0.5 + habits * 0.3 + demeritScore * 0.2);
}

function buildWeekStarts(count = 52) {
  const current = startOfWeek();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(current);
    date.setDate(date.getDate() - 7 * (count - 1 - index));
    return iso(date);
  });
}

function calculateXpWithoutDemerits(taskRows: any[], habitRows: any[], demeritRows: any[]) {
  const lastDemerit = demeritRows
    .map((row) => new Date(`${row.occurred_on}T23:59:59`).getTime())
    .sort((a, b) => b - a)[0] ?? 0;

  const taskXp = taskRows.reduce((sum, row) => {
    const completedAt = row.completed_at ? new Date(row.completed_at).getTime() : 0;
    return completedAt > lastDemerit ? sum + Number(row.xp_reward ?? 0) : sum;
  }, 0);

  const habitXp = habitRows.reduce((sum, row) => {
    const completedAt = row.completed_on ? new Date(`${row.completed_on}T23:59:59`).getTime() : 0;
    return completedAt > lastDemerit ? sum + Number(row.xp_earned ?? 0) : sum;
  }, 0);

  return taskXp + habitXp;
}

export async function fetchProfileStats(): Promise<ProfileStats> {
  const weekStarts = buildWeekStarts(52);
  const [
    { data: tasks, error: taskError },
    { data: completions, error: habitError },
    { data: demerits, error: demeritError },
    { data: investments, error: investmentError },
    weeklyEvolution,
  ] = await Promise.all([
    db.from("tasks").select("xp_reward,status,completed_at").eq("status", "Concluída"),
    db.from("habit_completions").select("completed_on,xp_earned,habits(name)"),
    db.from("demerit_occurrences").select("occurred_on"),
    db.from("investments").select("invested_value,earnings"),
    fetchWeeklyEvolution(weekStarts),
  ]);

  if (taskError) throw taskError;
  if (habitError) throw habitError;
  if (demeritError) throw demeritError;
  if (investmentError) throw investmentError;

  const taskRows = tasks ?? [];
  const habitRows = completions ?? [];
  const demeritRows = demerits ?? [];
  const investmentRows = investments ?? [];

  const exerciseDates = new Set<string>();
  const readingDates = new Set<string>();

  for (const row of habitRows) {
    const habitName = row.habits?.name ?? "";
    if (matchesAny(habitName, EXERCISE_WORDS)) exerciseDates.add(row.completed_on);
    if (matchesAny(habitName, READING_WORDS)) readingDates.add(row.completed_on);
  }

  const weeklyScores = weeklyEvolution.map((week) => scoreWeek(week, week.dashboard));
  let currentStreak = 0;
  let bestStreak = 0;
  for (const score of weeklyScores) {
    if (score > 70) {
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return {
    completedTasks: taskRows.length,
    completedHabits: habitRows.length,
    totalXp:
      taskRows.reduce((sum: number, row: any) => sum + Number(row.xp_reward ?? 0), 0) +
      habitRows.reduce((sum: number, row: any) => sum + Number(row.xp_earned ?? 0), 0),
    exerciseDays: exerciseDates.size,
    readingDays: readingDates.size,
    investmentValue: investmentRows.reduce(
      (sum: number, row: any) => sum + Number(row.invested_value ?? 0) + Number(row.earnings ?? 0),
      0,
    ),
    bestWeeklyScore: weeklyScores.length ? Math.max(...weeklyScores) : 0,
    bestWeekly70Streak: bestStreak,
    xpWithoutDemerits: calculateXpWithoutDemerits(taskRows, habitRows, demeritRows),
  };
}
