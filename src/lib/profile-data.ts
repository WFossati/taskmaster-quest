import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type ProfileStats = {
  completedTasks: number;
  completedHabits: number;
  totalXp: number;
  exerciseDays: number;
  readingDays: number;
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

export async function fetchProfileStats(): Promise<ProfileStats> {
  const [{ data: tasks, error: taskError }, { data: completions, error: habitError }] = await Promise.all([
    db.from("tasks").select("xp_reward,status").eq("status", "Concluída"),
    db.from("habit_completions").select("completed_on,xp_earned,habits(name)"),
  ]);

  if (taskError) throw taskError;
  if (habitError) throw habitError;

  const taskRows = tasks ?? [];
  const habitRows = completions ?? [];

  const exerciseDates = new Set<string>();
  const readingDates = new Set<string>();

  for (const row of habitRows) {
    const habitName = row.habits?.name ?? "";
    if (matchesAny(habitName, EXERCISE_WORDS)) exerciseDates.add(row.completed_on);
    if (matchesAny(habitName, READING_WORDS)) readingDates.add(row.completed_on);
  }

  return {
    completedTasks: taskRows.length,
    completedHabits: habitRows.length,
    totalXp:
      taskRows.reduce((sum: number, row: any) => sum + Number(row.xp_reward ?? 0), 0) +
      habitRows.reduce((sum: number, row: any) => sum + Number(row.xp_earned ?? 0), 0),
    exerciseDays: exerciseDates.size,
    readingDays: readingDates.size,
  };
}
