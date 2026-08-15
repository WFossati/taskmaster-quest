import { supabase } from "@/integrations/supabase/client";

export type Subtask = { id: string; title: string; isCompleted: boolean };
export type Project = { id: string; name: string };
export type TagRow = { id: string; name: string };

export type Task = {
  id: string;
  title: string;
  description: string;
  area: string;
  projectId: string;
  priority: string;
  dueDate: string;
  duration: string;
  energy: string;
  difficulty: string;
  recurrence: string;
  status: string;
  xp: number;
  subtasks: Subtask[];
  tagIds: string[];
  createdAt: string;
  completedAt?: string;
};

export type TaskInput = Omit<Task, "id" | "createdAt" | "completedAt">;

export function calcXp(difficulty: string, priority: string) {
  const base: Record<string, number> = {
    "Muito fácil": 10,
    Fácil: 25,
    Média: 50,
    Difícil: 100,
    Boss: 200,
  };
  const multiplier: Record<string, number> = { Baixa: 0.8, Média: 1, Alta: 1.25, Urgente: 1.5 };
  return Math.round((base[difficulty] ?? 50) * (multiplier[priority] ?? 1));
}

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export async function fetchProjects(): Promise<Project[]> {
  const rows = unwrap(
    await supabase.from("projects").select("id, name").order("created_at", { ascending: true }),
  );
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

export async function fetchTags(): Promise<TagRow[]> {
  const rows = unwrap(
    await supabase.from("tags").select("id, name").order("created_at", { ascending: true }),
  );
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

export async function fetchTasks(): Promise<Task[]> {
  const tasks = unwrap(
    await supabase
      .from("tasks")
      .select("*, subtasks(id, title, is_completed, created_at), task_tags(tag_id)")
      .order("created_at", { ascending: false }),
  );

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    area: t.area,
    projectId: t.project_id ?? "",
    priority: t.priority,
    dueDate: t.due_date ?? "",
    duration: t.duration_minutes == null ? "" : String(t.duration_minutes),
    energy: t.energy,
    difficulty: t.difficulty,
    recurrence: t.recurrence,
    status: t.status,
    xp: t.xp_reward,
    createdAt: t.created_at,
    ...(t.completed_at ? { completedAt: t.completed_at } : {}),
    subtasks: [...(t.subtasks ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((s) => ({ id: s.id, title: s.title, isCompleted: s.is_completed })),
    tagIds: (t.task_tags ?? []).map((tt) => tt.tag_id),
  }));
}

export async function createProject(userId: string, name: string): Promise<Project> {
  const row = unwrap(
    await supabase.from("projects").insert({ user_id: userId, name }).select("id, name").single(),
  );
  return { id: row.id, name: row.name };
}

export async function createTag(userId: string, name: string): Promise<TagRow> {
  const row = unwrap(
    await supabase.from("tags").insert({ user_id: userId, name }).select("id, name").single(),
  );
  return { id: row.id, name: row.name };
}

function taskColumns(userId: string, input: TaskInput) {
  return {
    user_id: userId,
    title: input.title,
    description: input.description || null,
    area: input.area,
    project_id: input.projectId || null,
    priority: input.priority,
    due_date: input.dueDate || null,
    duration_minutes: input.duration ? Number(input.duration) : null,
    energy: input.energy,
    difficulty: input.difficulty,
    recurrence: input.recurrence,
    status: input.status,
    xp_reward: input.xp,
  };
}

async function syncSubtasks(userId: string, taskId: string, subtasks: Subtask[]) {
  unwrap(await supabase.from("subtasks").delete().eq("task_id", taskId).select("id"));
  if (subtasks.length === 0) return;
  unwrap(
    await supabase
      .from("subtasks")
      .insert(
        subtasks.map((s) => ({
          task_id: taskId,
          user_id: userId,
          title: s.title,
          is_completed: s.isCompleted,
        })),
      )
      .select("id"),
  );
}

async function syncTags(userId: string, taskId: string, tagIds: string[]) {
  unwrap(await supabase.from("task_tags").delete().eq("task_id", taskId).select("task_id"));
  if (tagIds.length === 0) return;
  unwrap(
    await supabase
      .from("task_tags")
      .insert(tagIds.map((tagId) => ({ task_id: taskId, tag_id: tagId, user_id: userId })))
      .select("task_id"),
  );
}

export async function createTask(userId: string, input: TaskInput): Promise<string> {
  const row = unwrap(
    await supabase.from("tasks").insert(taskColumns(userId, input)).select("id").single(),
  );
  await syncSubtasks(userId, row.id, input.subtasks);
  await syncTags(userId, row.id, input.tagIds);
  return row.id;
}

export async function updateTask(userId: string, taskId: string, input: TaskInput) {
  unwrap(
    await supabase
      .from("tasks")
      .update(taskColumns(userId, input))
      .eq("id", taskId)
      .select("id")
      .single(),
  );
  await syncSubtasks(userId, taskId, input.subtasks);
  await syncTags(userId, taskId, input.tagIds);
}

export async function completeTask(taskId: string) {
  unwrap(
    await supabase
      .from("tasks")
      .update({ status: "Concluída", completed_at: new Date().toISOString() })
      .eq("id", taskId)
      .select("id")
      .single(),
  );
}

export async function reopenTask(taskId: string) {
  unwrap(
    await supabase
      .from("tasks")
      .update({ status: "Em andamento", completed_at: null })
      .eq("id", taskId)
      .select("id")
      .single(),
  );
}

export async function deleteTask(taskId: string) {
  unwrap(await supabase.from("task_tags").delete().eq("task_id", taskId).select("task_id"));
  unwrap(await supabase.from("subtasks").delete().eq("task_id", taskId).select("id"));
  unwrap(await supabase.from("tasks").delete().eq("id", taskId).select("id"));
}

export async function setSubtaskCompleted(subtaskId: string, isCompleted: boolean) {
  unwrap(
    await supabase
      .from("subtasks")
      .update({ is_completed: isCompleted })
      .eq("id", subtaskId)
      .select("id")
      .single(),
  );
}
