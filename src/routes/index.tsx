import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  Edit3,
  Flame,
  FolderPlus,
  Gift,
  House,
  ListTodo,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { AuthScreen } from "@/components/AuthScreen";
import { CalendarView } from "@/components/CalendarView";
import { HabitsDashboard } from "@/components/HabitsDashboard";
import { HomeDashboard } from "@/components/HomeDashboard";
import { supabase } from "@/integrations/supabase/client";
import {
  calcXp,
  completeTask as completeTaskDb,
  createProject as createProjectDb,
  createTag as createTagDb,
  createTask as createTaskDb,
  deleteTask as deleteTaskDb,
  fetchProjects,
  fetchTags,
  fetchTasks,
  reopenTask as reopenTaskDb,
  setSubtaskCompleted,
  updateTask as updateTaskDb,
  type Project,
  type Subtask,
  type TagRow,
  type Task,
  type TaskInput,
} from "@/lib/taskmaster-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vamo Dale!! — Sistema pessoal de missões" },
      { name: "description", content: "Organize tarefas por área da vida, projetos e tags, com XP gamificado para manter o foco." },
      { property: "og:title", content: "Vamo Dale!! — Sistema pessoal de missões" },
      { property: "og:description", content: "Gerencie suas missões diárias com prazos, subtarefas e XP conquistado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TaskMasterPage,
});

type FormState = TaskInput;
type LifeArea = { id: string; name: string; dot: string; soft: string; text: string };

const AREAS: LifeArea[] = [
  { id: "fejers", name: "FEJERS", dot: "bg-red-500", soft: "bg-red-50", text: "text-red-700" },
  { id: "gera", name: "Gera", dot: "bg-emerald-500", soft: "bg-emerald-50", text: "text-emerald-700" },
  { id: "ufrgs", name: "UFRGS", dot: "bg-amber-400", soft: "bg-amber-50", text: "text-amber-700" },
  { id: "saude", name: "Saúde", dot: "bg-blue-500", soft: "bg-blue-50", text: "text-blue-700" },
  { id: "conhecimento", name: "Conhecimento", dot: "bg-pink-500", soft: "bg-pink-50", text: "text-pink-700" },
  { id: "financeiro", name: "Financeiro", dot: "bg-purple-500", soft: "bg-purple-50", text: "text-purple-700" },
];

const priorityOptions = ["Baixa", "Média", "Alta", "Urgente"];
const energyOptions = ["Baixa", "Média", "Alta"];
const difficultyOptions = ["Muito fácil", "Fácil", "Média", "Difícil", "Boss"];
const recurrenceOptions = ["Não se repete", "Diariamente", "Semanalmente", "Mensalmente", "Personalizada"];
const statusOptions = ["Inbox", "Planejada", "Em andamento", "Em espera", "Concluída"];

const emptyForm: FormState = {
  title: "", description: "", area: "fejers", projectId: "", priority: "Média", dueDate: "", duration: "30", energy: "Média", difficulty: "Média", recurrence: "Não se repete", subtasks: [], status: "Inbox", tagIds: [], xp: 50,
};

function TaskMasterPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { setUserId(session?.user.id ?? null); setAuthReady(true); });
    supabase.auth.getSession().then(({ data }) => { setUserId(data.session?.user.id ?? null); setAuthReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);
  if (!authReady) return <main className="grid min-h-screen place-items-center bg-[#f7f8fb] text-sm font-semibold text-slate-500">Carregando...</main>;
  if (!userId) return <AuthScreen />;
  return <TaskMaster userId={userId} />;
}

function TaskMaster({ userId }: { userId: string }) {
  const [tab, setTab] = useState<"home" | "calendar" | "habits" | "new" | "tasks">("home");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newTag, setNewTag] = useState("");
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [showTagCreator, setShowTagCreator] = useState(false);
  const [search, setSearch] = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "upcoming" | "late" | "done">("all");

  const projectName = useCallback((id: string) => projects.find((p) => p.id === id)?.name ?? "", [projects]);
  const tagName = useCallback((id: string) => tags.find((t) => t.id === id)?.name ?? "", [tags]);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const [p, t, ts] = await Promise.all([fetchProjects(), fetchTags(), fetchTasks()]);
      setProjects(p); setTags(t); setTasks(ts);
    } catch (err) { setLoadError(err instanceof Error ? err.message : "Erro ao carregar dados."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { setLoading(true); void reload(); }, [reload, userId]);
  const xpPreview = useMemo(() => calcXp(form.difficulty, form.priority), [form.difficulty, form.priority]);
  const completedXp = useMemo(() => tasks.filter((t) => t.status === "Concluída").reduce((sum, t) => sum + (t.xp || calcXp(t.difficulty, t.priority)), 0), [tasks]);

  const filteredTasks = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    return tasks.filter((task) => {
      const text = `${task.title} ${task.description} ${projectName(task.projectId)} ${task.tagIds.map(tagName).join(" ")}`.toLowerCase();
      if (search && !text.includes(search.toLowerCase())) return false;
      if (filterArea !== "all" && task.area !== filterArea) return false;
      if (filterStatus !== "all" && task.status !== filterStatus) return false;
      if (filterPriority !== "all" && task.priority !== filterPriority) return false;
      if (periodFilter === "done") return task.status === "Concluída";
      if (periodFilter !== "all") {
        if (!task.dueDate) return false;
        const due = new Date(`${task.dueDate}T00:00:00`);
        if (periodFilter === "today") return due.getTime() === today.getTime() && task.status !== "Concluída";
        if (periodFilter === "late") return due < today && task.status !== "Concluída";
        if (periodFilter === "upcoming") return due >= tomorrow && task.status !== "Concluída";
      }
      return true;
    });
  }, [tasks, search, filterArea, filterStatus, filterPriority, periodFilter, projectName, tagName]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function openNewTask() { setEditingId(null); setForm(emptyForm); setSubtaskDraft(""); setTab("new"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function run(action: () => Promise<void>, okText: string) {
    setSaving(true); setFeedback(null);
    try { await action(); await reload(); setFeedback({ kind: "ok", text: okText }); }
    catch (err) { setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Algo deu errado." }); }
    finally { setSaving(false); }
  }
  async function saveTask(event: FormEvent) {
    event.preventDefault(); if (!form.title.trim() || saving) return;
    const payload: TaskInput = { ...form, title: form.title.trim(), description: form.description.trim() };
    const wasEditing = editingId;
    await run(async () => { if (wasEditing) await updateTaskDb(userId, wasEditing, payload); else await createTaskDb(userId, payload); }, wasEditing ? "Missão atualizada!" : "Missão criada!");
    setForm(emptyForm); setSubtaskDraft(""); setEditingId(null); setTab("tasks");
  }
  function editTask(task: Task) {
    setForm({ title: task.title, description: task.description, area: task.area, projectId: task.projectId, priority: task.priority, dueDate: task.dueDate, duration: task.duration, energy: task.energy, difficulty: task.difficulty, recurrence: task.recurrence, subtasks: task.subtasks, status: task.status, tagIds: task.tagIds, xp: task.xp });
    setEditingId(task.id); setTab("new"); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function addProject() {
    const clean = newProject.trim(); if (!clean) return; setSaving(true);
    try { const created = await createProjectDb(userId, clean); setProjects((current) => [...current, created]); set("projectId", created.id); setNewProject(""); setShowProjectCreator(false); }
    catch (err) { setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Erro ao criar projeto." }); }
    finally { setSaving(false); }
  }
  async function addTag() {
    const clean = newTag.trim().replace(/^#/, ""); if (!clean) return; setSaving(true);
    try { const created = await createTagDb(userId, clean); setTags((current) => [...current, created]); set("tagIds", [...form.tagIds, created.id]); setNewTag(""); setShowTagCreator(false); }
    catch (err) { setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Erro ao criar tag." }); }
    finally { setSaving(false); }
  }
  function addSubtask() { const clean = subtaskDraft.trim(); if (!clean) return; set("subtasks", [...form.subtasks, { id: crypto.randomUUID(), title: clean, isCompleted: false }]); setSubtaskDraft(""); }
  async function toggleSubtask(taskId: string, subtask: Subtask) {
    setTasks((current) => current.map((t) => t.id === taskId ? { ...t, subtasks: t.subtasks.map((s) => s.id === subtask.id ? { ...s, isCompleted: !s.isCompleted } : s) } : t));
    try { await setSubtaskCompleted(subtask.id, !subtask.isCompleted); } catch { await reload(); }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-white"><Sparkles className="size-5" /></div><div><p className="text-sm font-medium text-slate-500">Vamo Dale!!</p><h1 className="font-bold">Sistema pessoal de missões</h1></div></div>
          <div className="flex items-center gap-2"><div className="hidden gap-2 sm:flex"><Pill>{tasks.length} tarefas</Pill><Pill>⚡ {completedXp} XP conquistados</Pill></div><IconButton label="Sair" onClick={() => void supabase.auth.signOut()}><LogOut className="size-4" /></IconButton></div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8">
        {loadError && <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{loadError}</div>}
        {feedback && <div className={`mb-5 rounded-2xl px-4 py-3 text-sm font-semibold ${feedback.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{feedback.text}</div>}

        <div className="mb-7 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:w-fit">
          <button onClick={() => setTab("home")} className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === "home" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><House className="size-4" /> Hoje</button>
          <button onClick={() => setTab("calendar")} className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === "calendar" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><CalendarDays className="size-4" /> Calendário</button>
          <button onClick={() => setTab("habits")} className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === "habits" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><Flame className="size-4" /> Hábitos</button>
          <button onClick={openNewTask} className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === "new" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><Plus className="size-4" /> Nova missão</button>
          <button onClick={() => setTab("tasks")} className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === "tasks" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><ListTodo className="size-4" /> Minhas tarefas</button>
          <Link to="/import" className="flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"><ListTodo className="size-4" /> Importar missões</Link><Link to="/rewards" className="flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"><Gift className="size-4" /> Recompensas</Link>
          <Link to="/demerits" className="flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"><X className="size-4" /> Deméritos</Link>
          <Link to="/investments" className="flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"><Zap className="size-4" /> Investimentos</Link>
          <Link to="/weekly-review" className="flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"><ListTodo className="size-4" /> Dashboard</Link>
          <Link to="/library" className="flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"><BookOpen className="size-4" /> Biblioteca</Link>
          <Link to="/profile" className="flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"><UserRound className="size-4" /> Perfil</Link>
        </div>

        {tab === "home" ? <HomeDashboard tasks={tasks} projects={projects} loading={loading} onNewTask={openNewTask} onOpenTasks={() => setTab("tasks")} onEditTask={editTask} onCompleteTask={(task) => void run(() => completeTaskDb(task.id), "Missão concluída!")} />
        : tab === "calendar" ? <CalendarView tasks={tasks} projects={projects} loading={loading} onNewTask={openNewTask} onEditTask={editTask} onCompleteTask={(task) => void run(() => completeTaskDb(task.id), "Missão concluída!")} />
        : tab === "habits" ? <HabitsDashboard userId={userId} />
        : tab === "new" ? (
          <form onSubmit={saveTask} className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="space-y-6">
              <Card><p className="mb-1 text-sm font-bold text-violet-600">{editingId ? "EDITAR MISSÃO" : "NOVA MISSÃO"}</p><h2 className="mb-6 text-2xl font-bold">{editingId ? "Atualize o que mudou" : "O que precisa ser feito?"}</h2><div className="space-y-5"><Field label="Título" required><input autoFocus value={form.title} onChange={(e) => set("title", e.target.value)} className="input" placeholder="Ex.: Finalizar apresentação" /></Field><Field label="Descrição"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="input resize-none" rows={4} placeholder="Contexto, links, observações..." /></Field></div></Card>
              <Card><SectionTitle title="Contexto" subtitle="Onde essa tarefa vive na sua vida?" /><div className="grid gap-5 md:grid-cols-2"><Field label="Área da vida"><div className="grid grid-cols-2 gap-2">{AREAS.map((area) => <button key={area.id} type="button" onClick={() => set("area", area.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${form.area === area.id ? `${area.soft} ${area.text} border-current` : "border-slate-200 text-slate-600"}`}><span className={`size-2.5 rounded-full ${area.dot}`} />{area.name}</button>)}</div></Field><Field label="Projeto"><select value={form.projectId} onChange={(e) => set("projectId", e.target.value)} className="input"><option value="">Sem projeto</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{!showProjectCreator ? <button type="button" onClick={() => setShowProjectCreator(true)} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-violet-600"><FolderPlus className="size-4" /> Criar novo projeto</button> : <InlineCreator value={newProject} setValue={setNewProject} onAdd={() => void addProject()} onCancel={() => setShowProjectCreator(false)} placeholder="Nome do projeto" />}</Field></div></Card>
              <Card><SectionTitle title="Planejamento" subtitle="Prazo, esforço, energia e recompensa." /><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"><Field label="Prioridade"><Select value={form.priority} onChange={(v) => set("priority", v)} options={priorityOptions} /></Field><Field label="Prazo"><input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className="input" /></Field><Field label="Duração estimada"><div className="relative"><Clock3 className="absolute left-3 top-3 size-4 text-slate-400" /><input type="number" min="5" step="5" value={form.duration} onChange={(e) => set("duration", e.target.value)} className="input pl-10" /></div></Field><Field label="Energia necessária"><Select value={form.energy} onChange={(v) => set("energy", v)} options={energyOptions} /></Field><Field label="Dificuldade"><Select value={form.difficulty} onChange={(v) => set("difficulty", v)} options={difficultyOptions} /></Field><Field label="Recorrência"><Select value={form.recurrence} onChange={(v) => set("recurrence", v)} options={recurrenceOptions} /></Field><Field label="Status"><Select value={form.status} onChange={(v) => set("status", v)} options={statusOptions} /></Field><Field label="XP"><input type="number" min="0" step="5" value={form.xp} onChange={(e) => set("xp", Math.max(0, Number(e.target.value) || 0))} className="input" /><button type="button" onClick={() => set("xp", xpPreview)} className="mt-1.5 block text-left text-xs font-semibold text-violet-600 hover:underline">Usar sugestão: {xpPreview} XP</button></Field></div></Card>
              <Card><SectionTitle title="Subtarefas" subtitle="Quebre missões grandes em passos menores." /><div className="flex gap-2"><input value={subtaskDraft} onChange={(e) => setSubtaskDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }} className="input" placeholder="Adicionar um passo..." /><button type="button" onClick={addSubtask} className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white"><Plus className="size-5" /></button></div><div className="mt-3 space-y-2">{form.subtasks.map((s, i) => <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><span className="text-xs font-bold text-slate-400">{i + 1}</span><span className={`flex-1 text-sm font-medium ${s.isCompleted ? "text-slate-400 line-through" : ""}`}>{s.title}</span><button type="button" onClick={() => set("subtasks", form.subtasks.filter((x) => x.id !== s.id))}><X className="size-4 text-slate-400" /></button></div>)}</div></Card>
              <Card><SectionTitle title="Tags" subtitle="Crie etiquetas que façam sentido para sua rotina." /><div className="flex flex-wrap gap-2">{tags.map((tag) => <button key={tag.id} type="button" onClick={() => set("tagIds", form.tagIds.includes(tag.id) ? form.tagIds.filter((t) => t !== tag.id) : [...form.tagIds, tag.id])} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${form.tagIds.includes(tag.id) ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600"}`}>#{tag.name}</button>)}</div>{!showTagCreator ? <button type="button" onClick={() => setShowTagCreator(true)} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-violet-600"><Tag className="size-4" /> Criar nova tag</button> : <InlineCreator value={newTag} setValue={setNewTag} onAdd={() => void addTag()} onCancel={() => setShowTagCreator(false)} placeholder="Nova tag" />}</Card>
            </section>
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start"><Card><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Prévia da missão</p><h3 className="mt-3 text-lg font-bold">{form.title || "Sua nova missão"}</h3><div className="mt-4 space-y-3 text-sm"><Meta label="Área" value={AREAS.find((a) => a.id === form.area)?.name ?? "—"} /><Meta label="Projeto" value={projectName(form.projectId) || "Sem projeto"} /><Meta label="Prioridade" value={form.priority} /><Meta label="Dificuldade" value={form.difficulty} /><Meta label="Energia" value={form.energy} /><Meta label="Duração" value={`${form.duration || 0} min`} /><Meta label="XP da missão" value={`${form.xp} XP`} /></div></Card><button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-bold text-white shadow-lg shadow-slate-200 hover:bg-slate-800 disabled:opacity-60"><Check className="size-5" />{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar missão"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-600">Cancelar edição</button>}</aside>
          </form>
        ) : (
          <section className="space-y-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold text-violet-600">MINHAS TAREFAS</p><h2 className="text-3xl font-bold tracking-tight">Tudo que está no seu radar</h2><p className="mt-1 text-sm text-slate-500">Edite, conclua e organize suas missões sem sair daqui.</p></div><button onClick={openNewTask} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"><Plus className="size-4" /> Nova tarefa</button></div>
            <Card><div className="grid gap-3 lg:grid-cols-[1fr_170px_170px_170px]"><div className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" placeholder="Buscar tarefa, projeto ou tag..." /></div><select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="input"><option value="all">Todas as áreas</option>{AREAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select><select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="input"><option value="all">Prioridades</option>{priorityOptions.map((p) => <option key={p}>{p}</option>)}</select><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input"><option value="all">Todos os status</option>{statusOptions.map((s) => <option key={s}>{s}</option>)}</select></div><div className="mt-4 flex flex-wrap gap-2">{([['all','Todas'],['today','Hoje'],['upcoming','Próximas'],['late','Atrasadas'],['done','Concluídas']] as const).map(([key,label]) => <button key={key} onClick={() => setPeriodFilter(key)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${periodFilter === key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}</div></Card>
            <div className="space-y-3">{loading ? <Card><div className="py-10 text-center text-sm font-semibold text-slate-500">Carregando suas missões...</div></Card> : filteredTasks.length === 0 ? <Card><div className="py-10 text-center"><ListTodo className="mx-auto mb-3 size-9 text-slate-300" /><h3 className="font-bold">Nenhuma tarefa encontrada</h3><p className="mt-1 text-sm text-slate-500">Crie uma nova missão ou ajuste os filtros.</p></div></Card> : filteredTasks.map((task) => <TaskCard key={task.id} task={task} projectLabel={projectName(task.projectId)} tagLabels={task.tagIds.map(tagName).filter(Boolean)} onEdit={() => editTask(task)} onComplete={() => void run(() => completeTaskDb(task.id), "Missão concluída!")} onReopen={() => void run(() => reopenTaskDb(task.id), "Missão reaberta.")} onDelete={() => { if (window.confirm("Excluir esta tarefa?")) void run(() => deleteTaskDb(task.id), "Missão excluída."); }} onToggleSubtask={(s) => void toggleSubtask(task.id, s)} />)}</div>
          </section>
        )}
      </div>
    </main>
  );
}

function TaskCard({ task, projectLabel, tagLabels, onEdit, onComplete, onReopen, onDelete, onToggleSubtask }: { task: Task; projectLabel: string; tagLabels: string[]; onEdit: () => void; onComplete: () => void; onReopen: () => void; onDelete: () => void; onToggleSubtask: (subtask: Subtask) => void; }) {
  const [open, setOpen] = useState(false);
  const area = AREAS.find((a) => a.id === task.area) ?? AREAS[0]!;
  const done = task.status === "Concluída";
  const today = new Date(); today.setHours(0,0,0,0);
  const due = task.dueDate ? new Date(`${task.dueDate}T00:00:00`) : null;
  const late = due && due < today && !done;
  return <div className={`rounded-2xl border bg-white p-4 shadow-sm transition ${done ? "border-emerald-200 bg-emerald-50/40" : late ? "border-red-200" : "border-slate-200"}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><button onClick={done ? onReopen : onComplete} className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-2 ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500"}`}><Check className="size-4" /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={`font-bold ${done ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${area.soft} ${area.text}`}>{area.name}</span>{projectLabel && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{projectLabel}</span>}</div>{task.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>}<div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">{task.dueDate && <span className={late ? "text-red-600" : ""}><CalendarDays className="mr-1 inline size-3.5" />{late ? "Atrasada · " : ""}{new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}</span>}<span><Clock3 className="mr-1 inline size-3.5" />{task.duration || 0} min</span><span><Zap className="mr-1 inline size-3.5" />{task.xp || calcXp(task.difficulty, task.priority)} XP</span><span>{task.priority}</span>{tagLabels.map((tag) => <span key={tag}>#{tag}</span>)}</div>{task.subtasks.length > 0 && <><button onClick={() => setOpen((v) => !v)} className="mt-3 text-xs font-bold text-violet-600">{open ? "Ocultar" : "Ver"} subtarefas ({task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length})</button>{open && <div className="mt-2 space-y-2">{task.subtasks.map((s) => <label key={s.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium"><input type="checkbox" checked={s.isCompleted} onChange={() => onToggleSubtask(s)} /><span className={s.isCompleted ? "text-slate-400 line-through" : ""}>{s.title}</span></label>)}</div>}</>}</div><div className="flex gap-1 self-end sm:self-start"><IconButton label="Editar" onClick={onEdit}><Edit3 className="size-4" /></IconButton><IconButton label={done ? "Reabrir" : "Concluir"} onClick={done ? onReopen : onComplete}><CircleCheck className="size-4" /></IconButton><IconButton label="Excluir" onClick={onDelete} danger><Trash2 className="size-4" /></IconButton></div></div></div>;
}

function Card({ children }: { children: ReactNode }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">{children}</div>; }
function Pill({ children }: { children: ReactNode }) { return <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">{children}</div>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</span>{children}</label>; }
function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) { return <div className="mb-5"><h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>; }
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="input">{options.map((o) => <option key={o}>{o}</option>)}</select>; }
function InlineCreator({ value, setValue, onAdd, onCancel, placeholder }: { value: string; setValue: (v: string) => void; onAdd: () => void; onCancel: () => void; placeholder: string }) { return <div className="mt-2 flex gap-2"><input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} className="input" placeholder={placeholder} /><button type="button" onClick={onAdd} className="rounded-xl bg-slate-950 px-3 text-white"><Check className="size-4" /></button><button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-3"><X className="size-4" /></button></div>; }
function Meta({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{label}</span><span className="font-bold text-slate-800">{value}</span></div>; }
function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) { return <button title={label} onClick={onClick} className={`grid size-9 place-items-center rounded-xl border ${danger ? "border-red-100 text-red-500 hover:bg-red-50" : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>{children}</button>; }
