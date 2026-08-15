import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Edit3,
  FolderPlus,
  ListTodo,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({ component: TaskMaster });

type Subtask = { id: string; title: string };
type Task = {
  id: string;
  title: string;
  description: string;
  area: string;
  project: string;
  priority: string;
  dueDate: string;
  duration: string;
  energy: string;
  difficulty: string;
  recurrence: string;
  subtasks: Subtask[];
  status: string;
  tags: string[];
  createdAt: string;
  completedAt?: string;
  xp?: number;
};

type FormState = Omit<Task, "id" | "createdAt" | "completedAt">;

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
  title: "",
  description: "",
  area: "fejers",
  project: "",
  priority: "Média",
  dueDate: "",
  duration: "30",
  energy: "Média",
  difficulty: "Média",
  recurrence: "Não se repete",
  subtasks: [],
  status: "Inbox",
  tags: [],
  xp: 50,
};

function calcXp(difficulty: string, priority: string) {
  const base: Record<string, number> = { "Muito fácil": 10, Fácil: 25, Média: 50, Difícil: 100, Boss: 200 };
  const multiplier: Record<string, number> = { Baixa: 0.8, Média: 1, Alta: 1.25, Urgente: 1.5 };
  return Math.round((base[difficulty] ?? 50) * (multiplier[priority] ?? 1));
}

function TaskMaster() {
  const [tab, setTab] = useState<"new" | "tasks">("new");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<string[]>(["TaskMaster Quest"]);
  const [tags, setTags] = useState<string[]>(["rápida", "foco", "administrativo"]);
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

  useEffect(() => {
    const storedTasks = localStorage.getItem("taskmaster-tasks");
    const storedProjects = localStorage.getItem("taskmaster-projects");
    const storedTags = localStorage.getItem("taskmaster-tags");
    if (storedTasks) setTasks(JSON.parse(storedTasks));
    if (storedProjects) setProjects(JSON.parse(storedProjects));
    if (storedTags) setTags(JSON.parse(storedTags));
  }, []);

  useEffect(() => localStorage.setItem("taskmaster-tasks", JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem("taskmaster-projects", JSON.stringify(projects)), [projects]);
  useEffect(() => localStorage.setItem("taskmaster-tags", JSON.stringify(tags)), [tags]);

  const xpPreview = useMemo(() => calcXp(form.difficulty, form.priority), [form.difficulty, form.priority]);
  const completedXp = useMemo(() => tasks.filter((t) => t.status === "Concluída").reduce((sum, t) => sum + (t.xp ?? calcXp(t.difficulty, t.priority)), 0), [tasks]);

  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tasks.filter((task) => {
      const text = `${task.title} ${task.description} ${task.project} ${task.tags.join(" ")}`.toLowerCase();
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
  }, [tasks, search, filterArea, filterStatus, filterPriority, periodFilter]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function saveTask(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    const payload: FormState = { ...form, title: form.title.trim(), description: form.description.trim(), xp: xpPreview };
    if (editingId) {
      setTasks((current) => current.map((task) => task.id === editingId ? { ...task, ...payload } : task));
    } else {
      setTasks((current) => [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...payload }, ...current]);
    }
    setForm(emptyForm);
    setSubtaskDraft("");
    setEditingId(null);
    setTab("tasks");
  }

  function editTask(task: Task) {
    setForm({
      title: task.title, description: task.description, area: task.area, project: task.project,
      priority: task.priority, dueDate: task.dueDate, duration: task.duration, energy: task.energy,
      difficulty: task.difficulty, recurrence: task.recurrence, subtasks: task.subtasks ?? [],
      status: task.status, tags: task.tags ?? [], xp: task.xp,
    });
    setEditingId(task.id);
    setTab("new");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function completeTask(id: string) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: "Concluída", completedAt: new Date().toISOString() } : task));
  }

  function reopenTask(id: string) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: "Em andamento", completedAt: undefined } : task));
  }

  function deleteTask(id: string) {
    if (window.confirm("Excluir esta tarefa?")) setTasks((current) => current.filter((task) => task.id !== id));
  }

  function addProject() {
    const clean = newProject.trim();
    if (!clean) return;
    if (!projects.includes(clean)) setProjects((current) => [...current, clean]);
    set("project", clean);
    setNewProject(""); setShowProjectCreator(false);
  }

  function addTag() {
    const clean = newTag.trim().replace(/^#/, "");
    if (!clean) return;
    if (!tags.includes(clean)) setTags((current) => [...current, clean]);
    if (!form.tags.includes(clean)) set("tags", [...form.tags, clean]);
    setNewTag(""); setShowTagCreator(false);
  }

  function addSubtask() {
    const clean = subtaskDraft.trim();
    if (!clean) return;
    set("subtasks", [...form.subtasks, { id: crypto.randomUUID(), title: clean }]);
    setSubtaskDraft("");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-white"><Sparkles className="size-5" /></div>
            <div><p className="text-sm font-medium text-slate-500">TaskMaster Quest</p><h1 className="font-bold">Sistema pessoal de missões</h1></div>
          </div>
          <div className="hidden gap-2 sm:flex">
            <Pill>{tasks.length} tarefas</Pill><Pill>⚡ {completedXp} XP conquistados</Pill>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8">
        <div className="mb-7 flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:w-fit">
          <button onClick={() => { setEditingId(null); setForm(emptyForm); setTab("new"); }} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition sm:flex-none ${tab === "new" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><Plus className="size-4" /> Nova missão</button>
          <button onClick={() => setTab("tasks")} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition sm:flex-none ${tab === "tasks" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><ListTodo className="size-4" /> Minhas tarefas</button>
        </div>

        {tab === "new" ? (
          <form onSubmit={saveTask} className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="space-y-6">
              <Card>
                <p className="mb-1 text-sm font-bold text-violet-600">{editingId ? "EDITAR MISSÃO" : "NOVA MISSÃO"}</p>
                <h2 className="mb-6 text-2xl font-bold">{editingId ? "Atualize o que mudou" : "O que precisa ser feito?"}</h2>
                <div className="space-y-5">
                  <Field label="Título" required><input autoFocus value={form.title} onChange={(e) => set("title", e.target.value)} className="input" placeholder="Ex.: Finalizar apresentação" /></Field>
                  <Field label="Descrição"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="input resize-none" rows={4} placeholder="Contexto, links, observações..." /></Field>
                </div>
              </Card>

              <Card><SectionTitle title="Contexto" subtitle="Onde essa tarefa vive na sua vida?" />
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Área da vida"><div className="grid grid-cols-2 gap-2">{AREAS.map((area) => <button key={area.id} type="button" onClick={() => set("area", area.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${form.area === area.id ? `${area.soft} ${area.text} border-current` : "border-slate-200 text-slate-600"}`}><span className={`size-2.5 rounded-full ${area.dot}`} />{area.name}</button>)}</div></Field>
                  <Field label="Projeto"><select value={form.project} onChange={(e) => set("project", e.target.value)} className="input"><option value="">Sem projeto</option>{projects.map((p) => <option key={p}>{p}</option>)}</select>{!showProjectCreator ? <button type="button" onClick={() => setShowProjectCreator(true)} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-violet-600"><FolderPlus className="size-4" /> Criar novo projeto</button> : <InlineCreator value={newProject} setValue={setNewProject} onAdd={addProject} onCancel={() => setShowProjectCreator(false)} placeholder="Nome do projeto" />}</Field>
                </div>
              </Card>

              <Card><SectionTitle title="Planejamento" subtitle="Prazo, esforço e energia." />
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="Prioridade"><Select value={form.priority} onChange={(v) => set("priority", v)} options={priorityOptions} /></Field>
                  <Field label="Prazo"><input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className="input" /></Field>
                  <Field label="Duração estimada"><div className="relative"><Clock3 className="absolute left-3 top-3 size-4 text-slate-400" /><input type="number" min="5" step="5" value={form.duration} onChange={(e) => set("duration", e.target.value)} className="input pl-10" /></div></Field>
                  <Field label="Energia necessária"><Select value={form.energy} onChange={(v) => set("energy", v)} options={energyOptions} /></Field>
                  <Field label="Dificuldade"><Select value={form.difficulty} onChange={(v) => set("difficulty", v)} options={difficultyOptions} /></Field>
                  <Field label="Recorrência"><Select value={form.recurrence} onChange={(v) => set("recurrence", v)} options={recurrenceOptions} /></Field>
                  <Field label="Status"><Select value={form.status} onChange={(v) => set("status", v)} options={statusOptions} /></Field>
                </div>
              </Card>

              <Card><SectionTitle title="Subtarefas" subtitle="Quebre missões grandes em passos menores." />
                <div className="flex gap-2"><input value={subtaskDraft} onChange={(e) => setSubtaskDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }} className="input" placeholder="Adicionar um passo..." /><button type="button" onClick={addSubtask} className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white"><Plus className="size-5" /></button></div>
                <div className="mt-3 space-y-2">{form.subtasks.map((s, i) => <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><span className="text-xs font-bold text-slate-400">{i + 1}</span><span className="flex-1 text-sm font-medium">{s.title}</span><button type="button" onClick={() => set("subtasks", form.subtasks.filter((x) => x.id !== s.id))}><X className="size-4 text-slate-400" /></button></div>)}</div>
              </Card>

              <Card><SectionTitle title="Tags" subtitle="Crie etiquetas que façam sentido para sua rotina." />
                <div className="flex flex-wrap gap-2">{tags.map((tag) => <button key={tag} type="button" onClick={() => set("tags", form.tags.includes(tag) ? form.tags.filter((t) => t !== tag) : [...form.tags, tag])} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${form.tags.includes(tag) ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600"}`}>#{tag}</button>)}</div>
                {!showTagCreator ? <button type="button" onClick={() => setShowTagCreator(true)} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-violet-600"><Tag className="size-4" /> Criar nova tag</button> : <InlineCreator value={newTag} setValue={setNewTag} onAdd={addTag} onCancel={() => setShowTagCreator(false)} placeholder="Nova tag" />}
              </Card>
            </section>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Card><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Prévia da missão</p><h3 className="mt-3 text-lg font-bold">{form.title || "Sua nova missão"}</h3><div className="mt-4 space-y-3 text-sm"><Meta label="Área" value={AREAS.find((a) => a.id === form.area)?.name ?? "—"} /><Meta label="Prioridade" value={form.priority} /><Meta label="Dificuldade" value={form.difficulty} /><Meta label="Energia" value={form.energy} /><Meta label="Duração" value={`${form.duration || 0} min`} /><Meta label="XP estimado" value={`${xpPreview} XP`} /></div></Card>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-bold text-white shadow-lg shadow-slate-200 hover:bg-slate-800"><Check className="size-5" />{editingId ? "Salvar alterações" : "Criar missão"}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-600">Cancelar edição</button>}
            </aside>
          </form>
        ) : (
          <section className="space-y-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold text-violet-600">MINHAS TAREFAS</p><h2 className="text-3xl font-bold tracking-tight">Tudo que está no seu radar</h2><p className="mt-1 text-sm text-slate-500">Edite, conclua e organize suas missões sem sair daqui.</p></div><button onClick={() => { setEditingId(null); setForm(emptyForm); setTab("new"); }} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"><Plus className="size-4" /> Nova tarefa</button></div>

            <Card>
              <div className="grid gap-3 lg:grid-cols-[1fr_170px_170px_170px]">
                <div className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" placeholder="Buscar tarefa, projeto ou tag..." /></div>
                <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="input"><option value="all">Todas as áreas</option>{AREAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="input"><option value="all">Prioridades</option>{priorityOptions.map((p) => <option key={p}>{p}</option>)}</select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input"><option value="all">Todos os status</option>{statusOptions.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{([['all','Todas'],['today','Hoje'],['upcoming','Próximas'],['late','Atrasadas'],['done','Concluídas']] as const).map(([key,label]) => <button key={key} onClick={() => setPeriodFilter(key)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${periodFilter === key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}</div>
            </Card>

            <div className="space-y-3">
              {filteredTasks.length === 0 ? <Card><div className="py-10 text-center"><ListTodo className="mx-auto mb-3 size-9 text-slate-300" /><h3 className="font-bold">Nenhuma tarefa encontrada</h3><p className="mt-1 text-sm text-slate-500">Crie uma nova missão ou ajuste os filtros.</p></div></Card> : filteredTasks.map((task) => <TaskCard key={task.id} task={task} onEdit={() => editTask(task)} onComplete={() => completeTask(task.id)} onReopen={() => reopenTask(task.id)} onDelete={() => deleteTask(task.id)} />)}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function TaskCard({ task, onEdit, onComplete, onReopen, onDelete }: { task: Task; onEdit: () => void; onComplete: () => void; onReopen: () => void; onDelete: () => void }) {
  const area = AREAS.find((a) => a.id === task.area) ?? AREAS[0];
  const done = task.status === "Concluída";
  const today = new Date(); today.setHours(0,0,0,0);
  const due = task.dueDate ? new Date(`${task.dueDate}T00:00:00`) : null;
  const late = due && due < today && !done;
  return <div className={`rounded-2xl border bg-white p-4 shadow-sm transition ${done ? "border-emerald-200 bg-emerald-50/40" : late ? "border-red-200" : "border-slate-200"}`}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <button onClick={done ? onReopen : onComplete} className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-2 ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500"}`}><Check className="size-4" /></button>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={`font-bold ${done ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${area.soft} ${area.text}`}>{area.name}</span>{task.project && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{task.project}</span>}</div>
        {task.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">{task.dueDate && <span className={late ? "text-red-600" : ""}><CalendarDays className="mr-1 inline size-3.5" />{late ? "Atrasada · " : ""}{new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}</span>}<span><Clock3 className="mr-1 inline size-3.5" />{task.duration} min</span><span><Zap className="mr-1 inline size-3.5" />{task.xp ?? calcXp(task.difficulty, task.priority)} XP</span><span>{task.priority}</span>{task.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
      </div>
      <div className="flex gap-1 self-end sm:self-start"><IconButton label="Editar" onClick={onEdit}><Edit3 className="size-4" /></IconButton><IconButton label={done ? "Reabrir" : "Concluir"} onClick={done ? onReopen : onComplete}><CircleCheck className="size-4" /></IconButton><IconButton label="Excluir" onClick={onDelete} danger><Trash2 className="size-4" /></IconButton></div>
    </div>
  </div>;
}

function Card({ children }: { children: ReactNode }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">{children}</div>; }
function Pill({ children }: { children: ReactNode }) { return <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">{children}</div>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</span>{children}</label>; }
function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) { return <div className="mb-5"><h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>; }
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="input">{options.map((o) => <option key={o}>{o}</option>)}</select>; }
function InlineCreator({ value, setValue, onAdd, onCancel, placeholder }: { value: string; setValue: (v: string) => void; onAdd: () => void; onCancel: () => void; placeholder: string }) { return <div className="mt-2 flex gap-2"><input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} className="input" placeholder={placeholder} /><button type="button" onClick={onAdd} className="rounded-xl bg-slate-950 px-3 text-white"><Check className="size-4" /></button><button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-3"><X className="size-4" /></button></div>; }
function Meta({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{label}</span><span className="font-bold text-slate-800">{value}</span></div>; }
function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) { return <button title={label} onClick={onClick} className={`grid size-9 place-items-center rounded-xl border ${danger ? "border-red-100 text-red-500 hover:bg-red-50" : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>{children}</button>; }
