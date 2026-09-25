import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, CalendarDays, Check, ChevronRight, ClipboardPaste, GraduationCap, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { completeTask, createProject, createTask, deleteProject, deleteTask, fetchProjects, fetchTasks, reopenTask, setStudyTaskXp, updateTask, type Project, type Task, type TaskInput } from "@/lib/taskmaster-data";

export const Route = createFileRoute("/study-hub")({
  head: () => ({ meta: [{ title: "Study Hub — Vamo Dale!!" }, { name: "description", content: "Organize seus estudos por cadeira e acompanhe o progresso em um quadro visual." }] }),
  component: StudyHub,
});

type StudyArea = "ufrgs" | "conhecimento";
type SubjectSettings = Record<string, { color: string; area: StudyArea }>;
type Course = { id: string; name: string; status: string };
const COLORS = ["#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#10b981", "#ec4899", "#3b82f6", "#f97316"];
const COLUMNS = ["Planejada", "Em andamento", "Concluída"] as const;
const EMPTY_TASK = { title: "", description: "", area: "ufrgs" as StudyArea, projectId: "", dueDate: "", priority: "Média" };
const settingsKey = (userId: string) => `vamo-dale:study-hub:subjects:${userId}:v1`;
type ImportDraft = { id: number; title: string; subject: string; dueDate: string; duplicate: boolean; selected: boolean };

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim(); }
function parseStudyList(text: string, fallbackSubject: string): ImportDraft[] {
  let heading = "";
  const rows: ImportDraft[] = [];
  for (const source of text.split(/\r?\n/)) {
    const line = source.trim();
    if (!line) continue;
    const section = line.match(/^#{1,6}\s+(.+)$/);
    if (section) { heading = section[1]!.replace(/\*\*/g, "").trim(); continue; }
    const prefixed = line.match(/^\[([^\]]+)\]\s*[-–—:]\s*(.+)$/);
    const item = line.match(/^(?:[-*]\s*)?(?:\[[ xX]\]\s*)?(.+)$/);
    if (!prefixed && !/^[-*]\s|^\[[ xX]\]\s/.test(line) && !fallbackSubject && !heading) continue;
    const subject = (prefixed?.[1] || heading || fallbackSubject).trim();
    const content = (prefixed?.[2] ?? item?.[1] ?? "").replace(/\*\*/g, "").trim();
    if (!content || !subject) continue;
    const date = content.match(/(?:\s*\|\s*|\s+)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*$/);
    let dueDate = "";
    if (date) {
      const day = Number(date[1]), month = Number(date[2]);
      const year = Number(date[3] ?? new Date().getFullYear());
      const fullYear = year < 100 ? 2000 + year : year;
      const candidate = new Date(fullYear, month - 1, day);
      if (candidate.getFullYear() === fullYear && candidate.getMonth() === month - 1 && candidate.getDate() === day) dueDate = `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    rows.push({ id: rows.length, title: dueDate ? content.slice(0, date!.index).trim() : content, subject, dueDate, duplicate: false, selected: true });
  }
  return rows;
}

function readSettings(userId: string): SubjectSettings {
  try { return JSON.parse(localStorage.getItem(settingsKey(userId)) ?? "{}") as SubjectSettings; } catch { return {}; }
}
function readCourses(): Course[] {
  try { return JSON.parse(localStorage.getItem("vamo-dale:ufrgs:courses:v1") ?? "[]") as Course[]; } catch { return []; }
}
function inputFor(task: Task): TaskInput {
  return { title: task.title, description: task.description, area: task.area, projectId: task.projectId, priority: task.priority, dueDate: task.dueDate, duration: task.duration, energy: task.energy, difficulty: task.difficulty, recurrence: task.recurrence, status: task.status, xp: task.xp, subtasks: task.subtasks, tagIds: task.tagIds, ...(task.study ? { study: task.study } : {}) };
}
function formatDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR"); }

function StudyHub() {
  const [userId, setUserId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<SubjectSettings>({});
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [areaFilter, setAreaFilter] = useState<"all" | StudyArea>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [subjectForm, setSubjectForm] = useState({ name: "", area: "ufrgs" as StudyArea, color: COLORS[0]! });
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importArea, setImportArea] = useState<StudyArea>("ufrgs");
  const [importDrafts, setImportDrafts] = useState<ImportDraft[]>([]);
  const [importFeedback, setImportFeedback] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!mounted) return;
      if (authError || !data.user) { setError("Entre na sua conta para acessar seus estudos."); setLoading(false); return; }
      const id = data.user.id;
      setUserId(id); setSettings(readSettings(id)); setCourses(readCourses());
      Promise.all([fetchProjects(), fetchTasks()]).then(async ([p, t]) => {
        await setStudyTaskXp(id, t);
        if (mounted) { setProjects(p); setTasks(t.map((task) => task.study ? { ...task, xp: 20 } : task)); }
      }).catch((err) => { if (mounted) setError(err instanceof Error ? err.message : "Erro ao carregar estudos."); }).finally(() => { if (mounted) setLoading(false); });
    });
    return () => { mounted = false; };
  }, []);

  const studyTasks = useMemo(() => tasks.filter((task) => Boolean(task.study)), [tasks]);
  const subjectIds = useMemo(() => new Set([...Object.keys(settings), ...studyTasks.map((task) => task.study!.subjectId)]), [settings, studyTasks]);
  const subjects = useMemo(() => projects.filter((project) => subjectIds.has(project.id)), [projects, subjectIds]);
  const visible = studyTasks.filter((task) => (areaFilter === "all" || task.area === areaFilter) && (subjectFilter === "all" || task.study?.subjectId === subjectFilter));
  const pending = studyTasks.filter((task) => task.status !== "Concluída").length;
  const done = studyTasks.length - pending;
  const courseChoices = courses.filter((course) => course.status === "Em andamento" && !subjects.some((subject) => subject.name.toLocaleLowerCase() === course.name.toLocaleLowerCase()));

  function saveSettings(next: SubjectSettings) {
    if (!userId) return;
    setSettings(next); localStorage.setItem(settingsKey(userId), JSON.stringify(next));
  }
  async function refresh() { setTasks(await fetchTasks()); }
  async function perform(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  async function addSubject(event: FormEvent) {
    event.preventDefault();
    if (!userId || !subjectForm.name.trim()) return;
    await perform(async () => {
      const subject = await createProject(userId, subjectForm.name.trim());
      setProjects((current) => [...current, subject]);
      saveSettings({ ...settings, [subject.id]: { color: subjectForm.color, area: subjectForm.area } });
      setTaskForm((current) => ({ ...current, projectId: subject.id, area: subjectForm.area }));
      setSubjectForm({ name: "", area: "ufrgs", color: COLORS[(subjects.length + 1) % COLORS.length]! });
      setShowSubjectForm(false);
    });
  }
  function startTask(task?: Task) {
    setEditingTask(task?.id ?? null);
    setTaskForm(task ? { title: task.title, description: task.description, area: task.area as StudyArea, projectId: task.study?.subjectId ?? "", dueDate: task.dueDate, priority: task.priority } : { ...EMPTY_TASK, area: areaFilter === "conhecimento" ? "conhecimento" : "ufrgs", projectId: subjectFilter !== "all" ? subjectFilter : "" });
    setShowTaskForm(true);
  }
  async function saveTask(event: FormEvent) {
    event.preventDefault();
    if (!userId || !taskForm.title.trim() || !taskForm.projectId) return;
    await perform(async () => {
      const original = tasks.find((task) => task.id === editingTask);
      const payload: TaskInput = original ? { ...inputFor(original), title: taskForm.title.trim(), description: taskForm.description.trim(), area: taskForm.area, projectId: taskForm.projectId, dueDate: taskForm.dueDate, priority: taskForm.priority, xp: 20, study: { subjectId: taskForm.projectId } } : {
        title: taskForm.title.trim(), description: taskForm.description.trim(), area: taskForm.area, projectId: taskForm.projectId, dueDate: taskForm.dueDate, priority: taskForm.priority, duration: "30", energy: "Média", difficulty: "Média", recurrence: "Não se repete", status: "Planejada", xp: 20, subtasks: [], tagIds: [], study: { subjectId: taskForm.projectId },
      };
      if (editingTask) await updateTask(userId, editingTask, payload); else await createTask(userId, payload);
      await refresh(); setShowTaskForm(false); setEditingTask(null); setTaskForm(EMPTY_TASK);
    });
  }
  async function moveTask(task: Task, status: string) {
    if (!userId || task.status === status) return;
    await perform(async () => {
      if (status === "Concluída") await completeTask(task.id);
      else if (task.status === "Concluída") {
        await reopenTask(task.id);
        if (status !== "Em andamento") await updateTask(userId, task.id, { ...inputFor(task), status });
      } else await updateTask(userId, task.id, { ...inputFor(task), status });
      await refresh();
    });
  }
  async function removeTask(task: Task) {
    if (!window.confirm(`Excluir a tarefa “${task.title}”?`)) return;
    await perform(async () => { await deleteTask(task.id); await refresh(); });
  }
  async function removeSubject(subject: Project) {
    const related = studyTasks.filter((task) => task.study?.subjectId === subject.id);
    if (!window.confirm(`Excluir “${subject.name}” do Study Hub e suas ${related.length} tarefa(s) de estudo? Esta ação não pode ser desfeita.`)) return;
    await perform(async () => {
      for (const task of related) await deleteTask(task.id);
      const hasOtherTasks = tasks.some((task) => task.projectId === subject.id && !task.study);
      if (!hasOtherTasks) await deleteProject(subject.id);
      const next = { ...settings }; delete next[subject.id]; saveSettings(next);
      setSubjectFilter("all");
      if (!hasOtherTasks) setProjects((current) => current.filter((project) => project.id !== subject.id));
      await refresh();
    });
  }
  function previewImport() {
    const fallback = subjectFilter === "all" ? "" : projects.find((project) => project.id === subjectFilter)?.name ?? "";
    const rows = parseStudyList(importText, fallback);
    const seen = new Set(studyTasks.map((task) => `${normalize(projects.find((project) => project.id === task.study?.subjectId)?.name ?? "")}|${normalize(task.title)}`));
    setImportDrafts(rows.map((row) => {
      const key = `${normalize(row.subject)}|${normalize(row.title)}`;
      const duplicate = seen.has(key);
      seen.add(key);
      return { ...row, duplicate, selected: !duplicate };
    }));
    setImportFeedback(rows.length ? "Confira as tarefas e cadeiras antes de importar." : "Nenhuma tarefa encontrada. Use títulos com ## e itens com - [ ], ou [Cadeira] - tarefa.");
  }
  async function importStudies() {
    if (!userId) return;
    const selected = importDrafts.filter((row) => row.selected && !row.duplicate);
    if (!selected.length) return;
    setBusy(true); setError(""); setImportFeedback("");
    let imported = 0;
    const nextSettings = { ...settings };
    try {
      const subjectMap = new Map(projects.map((project) => [normalize(project.name), project]));
      for (const row of selected) {
        const key = normalize(row.subject);
        let subject = subjectMap.get(key);
        if (!subject) {
          subject = await createProject(userId, row.subject);
          subjectMap.set(key, subject);
          setProjects((current) => [...current, subject!]);
        }
        if (!nextSettings[subject.id]) nextSettings[subject.id] = { area: importArea, color: COLORS[Object.keys(nextSettings).length % COLORS.length]! };
        await createTask(userId, {
          title: row.title, description: "", area: nextSettings[subject.id]!.area, projectId: subject.id,
          priority: "Média", dueDate: row.dueDate, duration: "30", energy: "Média", difficulty: "Média",
          recurrence: "Não se repete", status: "Planejada", xp: 20, subtasks: [], tagIds: [], study: { subjectId: subject.id },
        });
        imported += 1;
        setImportDrafts((current) => current.map((draft) => draft.id === row.id ? { ...draft, duplicate: true, selected: false } : draft));
      }
      saveSettings(nextSettings);
      await refresh();
      setImportFeedback(`${imported} ${imported === 1 ? "tarefa importada" : "tarefas importadas"} para o tabuleiro!`);
    } catch (err) {
      saveSettings(nextSettings);
      await refresh().catch(() => {});
      setError(`${imported} tarefa(s) importada(s). ${err instanceof Error ? err.message : "Erro ao continuar a importação."}`);
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#f7f8fb] px-4 py-7 text-slate-950 sm:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-violet-100 text-violet-700"><BookOpen /></div><div><p className="text-xs font-black uppercase tracking-widest text-violet-600">Vamo Dale · Área de estudos</p><h1 className="text-3xl font-black">Study Hub</h1><p className="text-sm text-slate-500">Cada cadeira é uma jornada. Organize o que estudar e avance uma etapa por vez.</p></div></div>
        <Link to="/" className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold"><ArrowLeft className="size-4" /> Voltar</Link>
      </header>
      {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Na trilha" value={pending} icon={<BookOpen className="size-5" />} />
        <Metric label="Concluídas" value={done} icon={<Check className="size-5" />} />
        <Metric label="Progresso geral" value={studyTasks.length ? `${Math.round(done / studyTasks.length * 100)}%` : "0%"} icon={<GraduationCap className="size-5" />} />
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Minhas cadeiras e temas</h2><p className="text-sm text-slate-500">Escolha uma cor para identificar as tarefas de cada matéria.</p></div><button onClick={() => setShowSubjectForm(!showSubjectForm)} className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"><Plus className="size-4" /> Adicionar cadeira ou tema</button></div>
        {showSubjectForm && <form onSubmit={addSubject} className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[1fr_180px_160px_auto] sm:items-end">
          <label className="text-sm font-bold">Nome<input required maxLength={80} className="input mt-1" placeholder="Ex.: Administração Financeira II" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} list="current-courses" /><datalist id="current-courses">{courseChoices.map((course) => <option key={course.id} value={course.name} />)}</datalist></label>
          <label className="text-sm font-bold">Vinculada a<select className="input mt-1" value={subjectForm.area} onChange={(e) => setSubjectForm({ ...subjectForm, area: e.target.value as StudyArea })}><option value="ufrgs">UFRGS</option><option value="conhecimento">Conhecimento</option></select></label>
          <label className="text-sm font-bold">Cor<input type="color" className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1" value={subjectForm.color} onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })} /></label>
          <button disabled={busy} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Salvar</button>
        </form>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{subjects.length ? subjects.map((subject) => {
          const assigned = studyTasks.filter((task) => task.study?.subjectId === subject.id);
          const completed = assigned.filter((task) => task.status === "Concluída").length;
          const percent = assigned.length ? Math.round(completed / assigned.length * 100) : 0;
          const color = settings[subject.id]?.color ?? COLORS[0]!;
          return <article key={subject.id} className={`rounded-2xl border p-4 ${subjectFilter === subject.id ? "border-slate-900" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-2"><button onClick={() => setSubjectFilter(subjectFilter === subject.id ? "all" : subject.id)} className="flex min-w-0 items-center gap-2 text-left font-bold"><span className="size-3 shrink-0 rounded-full" style={{ background: color }} /><span className="truncate">{subject.name}</span></button><button disabled={busy} onClick={() => void removeSubject(subject)} aria-label={`Excluir cadeira ${subject.name}`} title="Excluir cadeira e suas tarefas de estudo" className="shrink-0 text-slate-400 hover:text-red-600 disabled:opacity-40"><Trash2 className="size-4" /></button></div>
            <div className="mt-4 flex items-end justify-between text-sm"><span className="text-slate-500">{completed} de {assigned.length} temas estudados</span><strong style={{ color }}>{percent}%</strong></div>
            <div role="progressbar" aria-label={`Progresso de ${subject.name}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: color }} /></div>
          </article>;
        }) : <p className="text-sm text-slate-500">Adicione sua primeira cadeira ou tema para começar.</p>}</div>
        {subjects.length > 0 && <p className="mt-4 text-xs text-slate-500">Para trocar a cor, clique no círculo ao lado da cadeira: <span className="sr-only">Cores abaixo</span>{subjects.map((subject) => <label key={subject.id} className="ml-2 inline-flex items-center gap-1">{subject.name}<input aria-label={`Cor de ${subject.name}`} type="color" value={settings[subject.id]?.color ?? COLORS[0]!} onChange={(e) => saveSettings({ ...settings, [subject.id]: { area: settings[subject.id]?.area ?? "ufrgs", color: e.target.value } })} className="size-6 cursor-pointer rounded" /></label>)}</p>}
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-black"><ClipboardPaste className="size-5 text-violet-600" /> Importar lista de estudos</h2><p className="text-sm text-slate-500">Cole uma lista; o Study Hub separa as tarefas por cadeira ou tema e coloca cada uma no tabuleiro.</p></div><button onClick={() => setShowImport(!showImport)} className="rounded-xl border border-violet-200 px-4 py-2.5 text-sm font-bold text-violet-700">{showImport ? "Fechar importação" : "Colar lista"}</button></div>
        {showImport && <div className="mt-5 space-y-4">
          <div className="rounded-xl bg-violet-50 p-4 text-sm text-slate-700"><p className="font-bold">Exemplo:</p><pre className="mt-2 whitespace-pre-wrap font-sans">## Administração Financeira II{"\n"}- [ ] Estudar CAPM | 30/09/2026{"\n"}- [ ] Resolver exercícios de CMPC{"\n"}## Inglês{"\n"}- [ ] Revisar vocabulário</pre><p className="mt-2">Também aceita <strong>[Cadeira] - tarefa</strong>, uma por linha. Sem cabeçalho, selecione uma cadeira acima para receber a lista.</p></div>
          <label className="block text-sm font-bold">Sua lista<textarea rows={7} className="input mt-1" value={importText} onChange={(e) => { setImportText(e.target.value); setImportDrafts([]); }} placeholder="Cole as tarefas aqui..." /></label>
          <div className="flex flex-wrap items-center gap-3"><label className="text-sm font-bold">Área das novas cadeiras<select className="ml-2 rounded-lg border p-2" value={importArea} onChange={(e) => setImportArea(e.target.value as StudyArea)}><option value="ufrgs">UFRGS</option><option value="conhecimento">Conhecimento</option></select></label><button onClick={previewImport} disabled={!importText.trim() || busy} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">Pré-visualizar</button></div>
          {importFeedback && <p role="status" className="text-sm font-semibold text-violet-700">{importFeedback}</p>}
          {importDrafts.length > 0 && <div className="space-y-2"><h3 className="font-bold">Prévia · {importDrafts.filter((row) => row.selected && !row.duplicate).length} selecionadas</h3>{importDrafts.map((row) => <label key={row.id} className="flex items-start gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" disabled={row.duplicate || busy} checked={row.selected && !row.duplicate} onChange={(e) => setImportDrafts((current) => current.map((item) => item.id === row.id ? { ...item, selected: e.target.checked } : item))} className="mt-1" /><span className="flex-1"><strong>{row.subject}</strong> · {row.title}{row.dueDate && <span className="ml-2 text-slate-500">{formatDate(row.dueDate)}</span>}</span>{row.duplicate && <span className="text-xs font-bold text-amber-700">Duplicada</span>}</label>)}<button onClick={() => void importStudies()} disabled={busy || !importDrafts.some((row) => row.selected && !row.duplicate)} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? "Importando..." : "Importar tarefas selecionadas"}</button></div>}
        </div>}
      </section>
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Tabuleiro de estudos</h2><p className="text-sm text-slate-500">Mova as cartas entre as etapas conforme avançar.</p></div><div className="flex gap-2"><select aria-label="Filtrar área" value={areaFilter} onChange={(e) => { setAreaFilter(e.target.value as typeof areaFilter); setSubjectFilter("all"); }} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold"><option value="all">Todas as áreas</option><option value="ufrgs">UFRGS</option><option value="conhecimento">Conhecimento</option></select><button onClick={() => startTask()} disabled={!subjects.length} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><Plus className="size-4" /> Nova tarefa</button></div></div>
        {showTaskForm && <form onSubmit={saveTask} className="mb-5 grid gap-3 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between"><h3 className="font-black">{editingTask ? "Editar estudo" : "Novo estudo"}</h3><button type="button" aria-label="Fechar" onClick={() => setShowTaskForm(false)}><X className="size-4" /></button></div>
          <label className="text-sm font-bold">O que estudar? *<input required maxLength={160} className="input mt-1" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Ex.: Resolver lista de exercícios 1" /></label>
          <label className="text-sm font-bold">Cadeira ou tema *<select required className="input mt-1" value={taskForm.projectId} onChange={(e) => { const projectId = e.target.value; setTaskForm({ ...taskForm, projectId, area: settings[projectId]?.area ?? "ufrgs" }); }}><option value="">Selecione</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
          <label className="text-sm font-bold">Área<select className="input mt-1" value={taskForm.area} onChange={(e) => setTaskForm({ ...taskForm, area: e.target.value as StudyArea })}><option value="ufrgs">UFRGS</option><option value="conhecimento">Conhecimento</option></select></label>
          <label className="text-sm font-bold">Prazo<input type="date" className="input mt-1" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} /></label>
          <label className="text-sm font-bold">Prioridade<select className="input mt-1" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>{["Baixa", "Média", "Alta", "Urgente"].map((priority) => <option key={priority}>{priority}</option>)}</select></label>
          <label className="text-sm font-bold sm:col-span-2 lg:col-span-3">Anotações<textarea rows={2} className="input mt-1" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Capítulos, materiais ou objetivo da sessão" /></label>
          <button disabled={busy} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Salvando..." : editingTask ? "Salvar alterações" : "Criar tarefa"}</button>
        </form>}
        {loading ? <p className="py-10 text-center text-slate-500">Carregando estudos...</p> : <div className="grid gap-4 lg:grid-cols-3">{COLUMNS.map((column, index) => <div key={column} className="min-h-64 rounded-3xl border border-slate-200 bg-slate-100/70 p-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-black">{index === 0 ? "🗺️" : index === 1 ? "⚔️" : "🏆"} {column}</h3><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold">{visible.filter((task) => column === "Planejada" ? !["Em andamento", "Concluída"].includes(task.status) : task.status === column).length}</span></div><div className="space-y-3">{visible.filter((task) => column === "Planejada" ? !["Em andamento", "Concluída"].includes(task.status) : task.status === column).map((task) => { const subject = projects.find((project) => project.id === task.study?.subjectId); const color = settings[task.study?.subjectId ?? ""]?.color ?? COLORS[0]!; return <article key={task.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="h-1.5" style={{ background: color }} /><div className="p-4"><div className="flex items-start justify-between gap-2"><span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color, background: `${color}1a` }}>{subject?.name ?? "Cadeira removida"}</span><span className="text-xs text-slate-400">{task.area === "ufrgs" ? "UFRGS" : "Conhecimento"}</span></div><h4 className="mt-3 font-bold leading-snug">{task.title}</h4>{task.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>}<div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">{task.dueDate && <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{formatDate(task.dueDate)}</span>}<span>{task.priority}</span><span>{task.xp} XP</span></div><div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3"><button disabled={busy} onClick={() => startTask(task)} className="text-xs font-bold text-violet-700">Editar</button><button disabled={busy} onClick={() => void removeTask(task)} aria-label={`Excluir ${task.title}`} className="text-red-500"><Trash2 className="size-4" /></button><span className="flex-1" />{index > 0 && <button disabled={busy} onClick={() => void moveTask(task, COLUMNS[index - 1]!)} className="rounded-lg border px-2 py-1 text-xs font-bold">Voltar</button>}{index < 2 && <button disabled={busy} onClick={() => void moveTask(task, COLUMNS[index + 1]!)} className="flex items-center gap-1 rounded-lg bg-slate-950 px-2 py-1 text-xs font-bold text-white">{index === 1 ? "Concluir" : "Começar"}<ChevronRight className="size-3" /></button>}</div></div></article>; })}{!visible.some((task) => column === "Planejada" ? !["Em andamento", "Concluída"].includes(task.status) : task.status === column) && <p className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-400">Nenhuma carta nesta etapa</p>}</div></div>)}</div>}
      </section>
    </div>
  </main>;
}
function Metric({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) { return <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600">{icon}</span><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="text-2xl font-black">{value}</p></div></div>; }
