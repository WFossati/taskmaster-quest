import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Flame,
  FolderPlus,
  Plus,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  component: TaskLaunchpad,
});

type LifeArea = {
  id: string;
  name: string;
  dot: string;
  soft: string;
  text: string;
};

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
};

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

const initialProjects = ["TaskMaster Quest"];
const initialTags = ["rápida", "foco", "administrativo"];

function TaskLaunchpad() {
  const [projects, setProjects] = useState<string[]>(initialProjects);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newProject, setNewProject] = useState("");
  const [newTag, setNewTag] = useState("");
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [showTagCreator, setShowTagCreator] = useState(false);
  const [saved, setSaved] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("fejers");
  const [project, setProject] = useState("");
  const [priority, setPriority] = useState("Média");
  const [dueDate, setDueDate] = useState("");
  const [duration, setDuration] = useState("30");
  const [energy, setEnergy] = useState("Média");
  const [difficulty, setDifficulty] = useState("Média");
  const [recurrence, setRecurrence] = useState("Não se repete");
  const [status, setStatus] = useState("Inbox");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");

  useEffect(() => {
    const storedProjects = localStorage.getItem("taskmaster-projects");
    const storedTags = localStorage.getItem("taskmaster-tags");
    const storedTasks = localStorage.getItem("taskmaster-tasks");
    if (storedProjects) setProjects(JSON.parse(storedProjects));
    if (storedTags) setTags(JSON.parse(storedTags));
    if (storedTasks) setTasks(JSON.parse(storedTasks));
  }, []);

  useEffect(() => localStorage.setItem("taskmaster-projects", JSON.stringify(projects)), [projects]);
  useEffect(() => localStorage.setItem("taskmaster-tags", JSON.stringify(tags)), [tags]);
  useEffect(() => localStorage.setItem("taskmaster-tasks", JSON.stringify(tasks)), [tasks]);

  const selectedArea = useMemo(() => AREAS.find((item) => item.id === area) ?? AREAS[0], [area]);

  const xpPreview = useMemo(() => {
    const base: Record<string, number> = {
      "Muito fácil": 10,
      Fácil: 25,
      Média: 50,
      Difícil: 100,
      Boss: 200,
    };
    const priorityMultiplier: Record<string, number> = { Baixa: 0.8, Média: 1, Alta: 1.25, Urgente: 1.5 };
    return Math.round((base[difficulty] ?? 50) * (priorityMultiplier[priority] ?? 1));
  }, [difficulty, priority]);

  function addProject() {
    const clean = newProject.trim();
    if (!clean) return;
    if (!projects.includes(clean)) setProjects((current) => [...current, clean]);
    setProject(clean);
    setNewProject("");
    setShowProjectCreator(false);
  }

  function addTag() {
    const clean = newTag.trim().replace(/^#/, "");
    if (!clean) return;
    if (!tags.includes(clean)) setTags((current) => [...current, clean]);
    setSelectedTags((current) => (current.includes(clean) ? current : [...current, clean]));
    setNewTag("");
    setShowTagCreator(false);
  }

  function addSubtask() {
    const clean = subtaskDraft.trim();
    if (!clean) return;
    setSubtasks((current) => [...current, { id: crypto.randomUUID(), title: clean }]);
    setSubtaskDraft("");
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setArea("fejers");
    setProject("");
    setPriority("Média");
    setDueDate("");
    setDuration("30");
    setEnergy("Média");
    setDifficulty("Média");
    setRecurrence("Não se repete");
    setStatus("Inbox");
    setSelectedTags([]);
    setSubtasks([]);
    setSubtaskDraft("");
  }

  function saveTask(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const task: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      area,
      project,
      priority,
      dueDate,
      duration,
      energy,
      difficulty,
      recurrence,
      subtasks,
      status,
      tags: selectedTags,
      createdAt: new Date().toISOString(),
    };
    setTasks((current) => [task, ...current]);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
    resetForm();
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">TaskMaster Quest</p>
              <h1 className="text-lg font-bold tracking-tight">Lançamento de tarefas</h1>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              {tasks.length} tarefas salvas
            </div>
            <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">⚡ {xpPreview} XP</div>
          </div>
        </div>
      </header>

      <form onSubmit={saveTask} className="mx-auto grid max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[1fr_320px] lg:px-8 lg:py-10">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-7">
              <p className="mb-1 text-sm font-semibold text-violet-600">NOVA MISSÃO</p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">O que precisa ser feito?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Comece pelo essencial. Depois ajuste contexto, esforço e recompensa.</p>
            </div>

            <div className="space-y-5">
              <Field label="Título" required>
                <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Finalizar apresentação de segunda-feira" className="input text-base font-medium" />
              </Field>
              <Field label="Descrição">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Adicione contexto, links, observações ou o resultado esperado..." rows={4} className="input resize-none" />
              </Field>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle title="Contexto" subtitle="Onde essa tarefa vive na sua vida?" />
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Área da vida">
                <div className="grid grid-cols-2 gap-2">
                  {AREAS.map((item) => (
                    <button key={item.id} type="button" onClick={() => setArea(item.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${area === item.id ? `${item.soft} ${item.text} border-current shadow-sm` : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                      <span className={`size-2.5 rounded-full ${item.dot}`} />
                      {item.name}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Projeto">
                <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
                  <option value="">Sem projeto</option>
                  {projects.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                {!showProjectCreator ? (
                  <button type="button" onClick={() => setShowProjectCreator(true)} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800"><FolderPlus className="size-4" /> Criar novo projeto</button>
                ) : (
                  <InlineCreator value={newProject} onChange={setNewProject} placeholder="Nome do novo projeto" onAdd={addProject} onCancel={() => setShowProjectCreator(false)} />
                )}
              </Field>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle title="Planejamento" subtitle="Defina quando fazer e quanto esforço isso exige." />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Prioridade">
                <Select value={priority} setValue={setPriority} options={priorityOptions} />
              </Field>
              <Field label="Prazo">
                <div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input pl-10" /></div>
              </Field>
              <Field label="Duração estimada">
                <div className="relative"><Clock3 className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><input type="number" min="5" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} className="input pl-10 pr-14" /><span className="pointer-events-none absolute right-3 top-3 text-sm text-slate-400">min</span></div>
              </Field>
              <Field label="Energia necessária">
                <Select value={energy} setValue={setEnergy} options={energyOptions} />
              </Field>
              <Field label="Dificuldade">
                <Select value={difficulty} setValue={setDifficulty} options={difficultyOptions} />
              </Field>
              <Field label="Recorrência">
                <Select value={recurrence} setValue={setRecurrence} options={recurrenceOptions} />
              </Field>
              <Field label="Status">
                <Select value={status} setValue={setStatus} options={statusOptions} />
              </Field>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle title="Subtarefas" subtitle="Quebre missões grandes em passos pequenos e acionáveis." />
            <div className="flex gap-2">
              <input value={subtaskDraft} onChange={(e) => setSubtaskDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }} placeholder="Adicionar um passo..." className="input" />
              <button type="button" onClick={addSubtask} className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white hover:bg-slate-800"><Plus className="size-5" /></button>
            </div>
            {subtasks.length > 0 && (
              <div className="mt-3 space-y-2">
                {subtasks.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <span className="grid size-6 place-items-center rounded-full bg-white text-xs font-bold text-slate-500 shadow-sm">{index + 1}</span>
                    <span className="flex-1 text-sm font-medium">{item.title}</span>
                    <button type="button" onClick={() => setSubtasks((current) => current.filter((subtask) => subtask.id !== item.id))} className="text-slate-400 hover:text-red-500"><Trash2 className="size-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle title="Tags" subtitle="Crie sua própria linguagem de organização ao longo do tempo." />
            <div className="flex flex-wrap gap-2">
              {tags.map((item) => {
                const active = selectedTags.includes(item);
                return <button key={item} type="button" onClick={() => setSelectedTags((current) => active ? current.filter((tag) => tag !== item) : [...current, item])} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${active ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>#{item}</button>;
              })}
            </div>
            {!showTagCreator ? (
              <button type="button" onClick={() => setShowTagCreator(true)} className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800"><Tag className="size-4" /> Criar nova tag</button>
            ) : (
              <InlineCreator value={newTag} onChange={setNewTag} placeholder="Ex.: reunião, casa, estudo..." onAdd={addTag} onCancel={() => setShowTagCreator(false)} />
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetForm} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50"><RotateCcw className="size-4" /> Limpar</button>
            <button type="submit" disabled={!title.trim()} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"><Check className="size-4" /> Criar missão</button>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/10">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs font-bold tracking-[0.18em] text-slate-400">PRÉVIA DA MISSÃO</p>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">{status}</span>
            </div>
            <div className="mb-4 flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${selectedArea.dot}`} />
              <span className="text-sm font-semibold text-slate-300">{selectedArea.name}</span>
              {project && <><span className="text-slate-600">/</span><span className="truncate text-sm text-slate-400">{project}</span></>}
            </div>
            <h3 className="min-h-14 text-xl font-bold leading-7">{title || "Sua próxima missão aparecerá aqui"}</h3>
            {description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{description}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Stat icon={<Flame className="size-4" />} label="Dificuldade" value={difficulty} />
              <Stat icon={<Zap className="size-4" />} label="Energia" value={energy} />
              <Stat icon={<Clock3 className="size-4" />} label="Duração" value={`${duration || 0} min`} />
              <Stat icon={<CalendarDays className="size-4" />} label="Prazo" value={dueDate ? new Date(`${dueDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "Sem prazo"} />
            </div>
            <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Recompensa estimada</p>
              <p className="mt-1 text-2xl font-black text-amber-200">+{xpPreview} XP</p>
              <p className="mt-1 text-xs text-amber-100/60">Baseada em dificuldade e prioridade.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold">Resumo do cadastro</p>
            <div className="mt-4 space-y-3 text-sm">
              <SummaryLine label="Prioridade" value={priority} />
              <SummaryLine label="Recorrência" value={recurrence} />
              <SummaryLine label="Subtarefas" value={String(subtasks.length)} />
              <SummaryLine label="Tags" value={String(selectedTags.length)} />
            </div>
          </div>

          {saved && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm">
              <div className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><Check className="size-4" /></div>
              <div><p className="text-sm font-bold">Missão criada!</p><p className="mt-0.5 text-xs text-emerald-700">Ela foi salva neste dispositivo.</p></div>
            </div>
          )}
        </aside>
      </form>
    </main>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>{children}</label>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="mb-5"><h3 className="text-lg font-bold tracking-tight">{title}</h3><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>;
}

function Select({ value, setValue, options }: { value: string; setValue: (value: string) => void; options: string[] }) {
  return <div className="relative"><select value={value} onChange={(e) => setValue(e.target.value)} className="input appearance-none pr-9">{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-slate-400" /></div>;
}

function InlineCreator({ value, onChange, placeholder, onAdd, onCancel }: { value: string; onChange: (value: string) => void; placeholder: string; onAdd: () => void; onCancel: () => void }) {
  return <div className="mt-2 flex gap-2"><input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} placeholder={placeholder} className="input" autoFocus /><button type="button" onClick={onAdd} className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-600 text-white hover:bg-violet-700"><Plus className="size-4" /></button><button type="button" onClick={onCancel} className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><X className="size-4" /></button></div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-white/[0.06] p-3"><div className="flex items-center gap-1.5 text-slate-500">{icon}<span className="text-[10px] font-bold uppercase tracking-wide">{label}</span></div><p className="mt-1.5 truncate text-sm font-bold text-slate-200">{value}</p></div>;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{label}</span><span className="max-w-[170px] truncate font-semibold text-slate-800">{value}</span></div>;
}
