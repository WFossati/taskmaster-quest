import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, CalendarDays, Frown, GraduationCap, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { createTask, fetchTasks, type Task } from "@/lib/taskmaster-data";

export const Route = createFileRoute("/ufrgs")({
  head: () => ({ meta: [{ title: "UFRGS — Vamo Dale!!" }, { name: "description", content: "Histórico acadêmico, créditos, provas e trabalhos." }] }),
  component: UfrgsPage,
});

type Concept = "" | "A" | "B" | "C" | "D" | "FF";
type CourseStatus = "Em andamento" | "Aprovada" | "Reprovada" | "Trancada" | "Aproveitamento";
type Course = { id: string; code: string; name: string; semester: string; credits: number; concept: Concept; status: CourseStatus; professor: string; schedule: string };
type EventMeta = { courseId: string; courseName: string; eventType: string; weight: string };

const STORAGE_KEY = "vamo-dale:ufrgs:courses:v1";
const concepts: Concept[] = ["", "A", "B", "C", "D", "FF"];
const statuses: CourseStatus[] = ["Em andamento", "Aprovada", "Reprovada", "Trancada", "Aproveitamento"];
const blankCourse: Omit<Course, "id"> = { code: "", name: "", semester: "", credits: 4, concept: "", status: "Em andamento", professor: "", schedule: "" };

function readCourses(): Course[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Course[]; } catch { return []; }
}

function parseEvent(task: Task): EventMeta | null {
  if (!task.description.startsWith("[UFRGS_EVENT]")) return null;
  try { return JSON.parse(task.description.slice(13)) as EventMeta; } catch { return null; }
}

function UfrgsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>(readCourses);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courseForm, setCourseForm] = useState(blankCourse);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ courseId: "", eventType: "Prova", title: "", date: "", weight: "", xp: 50 });
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    fetchTasks().then(setTasks).catch(() => setFeedback("Não foi possível carregar as avaliações."));
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(courses)); }, [courses]);

  const completed = courses.filter((c) => c.status === "Aprovada" || c.status === "Aproveitamento");
  const current = courses.filter((c) => c.status === "Em andamento");
  const completedCredits = completed.reduce((sum, c) => sum + c.credits, 0);
  const currentCredits = current.reduce((sum, c) => sum + c.credits, 0);
  const events = useMemo(() => tasks.map((task) => ({ task, meta: parseEvent(task) })).filter((item): item is { task: Task; meta: EventMeta } => Boolean(item.meta)).sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate)), [tasks]);
  const upcoming = events.filter(({ task }) => task.status !== "Concluída" && task.dueDate >= new Date().toISOString().slice(0, 10));

  function addCourse(event: FormEvent) {
    event.preventDefault();
    if (!courseForm.name.trim()) return;
    const concept = courseForm.concept;
    let status = courseForm.status;
    if (["A", "B", "C"].includes(concept)) status = "Aprovada";
    if (["D", "FF"].includes(concept)) status = "Reprovada";
    setCourses((items) => [...items, { ...courseForm, id: crypto.randomUUID(), name: courseForm.name.trim(), status }]);
    setCourseForm(blankCourse); setShowCourseForm(false); setFeedback("Cadeira adicionada!");
  }

  async function addEvent(event: FormEvent) {
    event.preventDefault();
    if (!userId || !eventForm.courseId || !eventForm.title.trim() || !eventForm.date) return;
    const course = courses.find((item) => item.id === eventForm.courseId);
    if (!course) return;
    setSaving(true); setFeedback("");
    try {
      await createTask(userId, {
        title: `${eventForm.eventType}: ${eventForm.title.trim()}`,
        description: `[UFRGS_EVENT]${JSON.stringify({ courseId: course.id, courseName: course.name, eventType: eventForm.eventType, weight: eventForm.weight })}`,
        area: "ufrgs", projectId: "", priority: eventForm.eventType === "Prova" ? "Alta" : "Média", dueDate: eventForm.date,
        duration: "60", energy: "Alta", difficulty: "Média", recurrence: "Não se repete", status: "Planejada", xp: eventForm.xp, subtasks: [], tagIds: [],
      });
      setTasks(await fetchTasks());
      setEventForm({ courseId: "", eventType: "Prova", title: "", date: "", weight: "", xp: 50 });
      setShowEventForm(false); setFeedback("Avaliação criada e adicionada ao calendário!");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Erro ao criar avaliação."); }
    finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-5 py-7 text-slate-950 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-amber-400 text-slate-950"><Frown className="size-6" /></div>
            <div><p className="text-sm font-bold text-amber-600">VIDA ACADÊMICA</p><h1 className="text-3xl font-bold">UFRGS</h1><p className="text-sm text-slate-500">Cadeiras, conceitos, créditos e avaliações em um só lugar.</p></div>
          </div>
          <Link to="/" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><ArrowLeft className="size-4" /> Voltar ao Vamo Dale</Link>
        </div>

        {feedback && <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{feedback}</div>}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Créditos concluídos" value={String(completedCredits)} helper={`${completed.length} cadeiras aprovadas`} />
          <Metric label="Créditos em andamento" value={String(currentCredits)} helper={`${current.length} cadeiras atuais`} />
          <Metric label="Cadeiras registradas" value={String(courses.length)} helper="histórico total" />
          <Metric label="Próxima entrega" value={upcoming[0]?.task.dueDate ? formatDate(upcoming[0].task.dueDate) : "—"} helper={upcoming[0]?.task.title ?? "nenhuma cadastrada"} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-amber-600">CADEIRAS ATUAIS</p><h2 className="text-2xl font-bold">Semestre em andamento</h2></div><button onClick={() => setShowCourseForm(!showCourseForm)} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"><Plus className="size-4" /> Adicionar cadeira</button></div>
          {showCourseForm && <CourseForm value={courseForm} setValue={setCourseForm} onSubmit={addCourse} />}
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{current.length ? current.map((course) => <CourseCard key={course.id} course={course} onDelete={() => setCourses((items) => items.filter((item) => item.id !== course.id))} />) : <Empty text="Nenhuma cadeira em andamento cadastrada." />}</div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-amber-600">PROVAS E TRABALHOS</p><h2 className="text-2xl font-bold">Próximas avaliações</h2><p className="mt-1 text-sm text-slate-500">Tudo que você cadastrar aqui também aparece no calendário como missão UFRGS.</p></div><button disabled={!courses.length} onClick={() => setShowEventForm(!showEventForm)} className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-40"><CalendarDays className="size-4" /> Nova avaliação</button></div>
          {showEventForm && <EventForm courses={courses} value={eventForm} setValue={setEventForm} onSubmit={addEvent} saving={saving} />}
          <div className="mt-5 space-y-2">{upcoming.length ? upcoming.map(({ task, meta }) => <div key={task.id} className="flex flex-col gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-700">{meta.eventType}</span><p className="mt-2 font-bold">{task.title.replace(`${meta.eventType}: `, "")}</p><p className="text-sm text-slate-500">{meta.courseName}{meta.weight ? ` · Peso ${meta.weight}%` : ""}</p></div><div className="text-sm font-bold text-slate-700">{formatDate(task.dueDate)} · {task.xp} XP</div></div>) : <Empty text="Nenhuma prova ou trabalho futuro cadastrado." />}</div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5"><p className="text-sm font-bold text-amber-600">HISTÓRICO</p><h2 className="text-2xl font-bold">Todas as cadeiras</h2></div>
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-400"><tr><th className="p-3">Cadeira</th><th className="p-3">Semestre</th><th className="p-3">Créditos</th><th className="p-3">Conceito</th><th className="p-3">Situação</th><th className="p-3" /></tr></thead><tbody>{courses.map((course) => <tr key={course.id} className="border-b border-slate-100"><td className="p-3"><p className="font-bold">{course.name}</p><p className="text-xs text-slate-400">{course.code || "Sem código"}</p></td><td className="p-3">{course.semester || "—"}</td><td className="p-3 font-bold">{course.credits}</td><td className="p-3"><ConceptBadge concept={course.concept} /></td><td className="p-3">{course.status}</td><td className="p-3"><button onClick={() => setCourses((items) => items.filter((item) => item.id !== course.id))} className="text-slate-300 hover:text-red-500" title="Excluir"><Trash2 className="size-4" /></button></td></tr>)}</tbody></table>{!courses.length && <Empty text="Adicione sua primeira cadeira para começar o histórico." />}</div>
        </section>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900"><strong>Conceitos:</strong> A = 10 · B = 8–9 · C = 6–7 · D = reprovação por desempenho · FF = reprovação por falta.</div>
      </div>
    </main>
  );
}

function CourseForm({ value, setValue, onSubmit }: { value: Omit<Course, "id">; setValue: (value: Omit<Course, "id">) => void; onSubmit: (event: FormEvent) => void }) {
  return <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-4"><Input label="Nome da cadeira *" value={value.name} onChange={(name) => setValue({ ...value, name })} /><Input label="Código" value={value.code} onChange={(code) => setValue({ ...value, code })} /><Input label="Semestre" value={value.semester} placeholder="Ex.: 2026/2" onChange={(semester) => setValue({ ...value, semester })} /><Input label="Créditos" value={String(value.credits)} type="number" onChange={(credits) => setValue({ ...value, credits: Number(credits) || 0 })} /><Input label="Professor" value={value.professor} onChange={(professor) => setValue({ ...value, professor })} /><Input label="Horários" value={value.schedule} placeholder="Ex.: Ter/Qui 10h30" onChange={(schedule) => setValue({ ...value, schedule })} /><SelectField label="Conceito" value={value.concept} options={concepts} labels={{ "": "Sem conceito" }} onChange={(concept) => setValue({ ...value, concept: concept as Concept })} /><SelectField label="Situação" value={value.status} options={statuses} onChange={(status) => setValue({ ...value, status: status as CourseStatus })} /><button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white md:col-span-2 lg:col-span-4">Salvar cadeira</button></form>;
}

function EventForm({ courses, value, setValue, onSubmit, saving }: { courses: Course[]; value: { courseId: string; eventType: string; title: string; date: string; weight: string; xp: number }; setValue: (value: { courseId: string; eventType: string; title: string; date: string; weight: string; xp: number }) => void; onSubmit: (event: FormEvent) => void; saving: boolean }) {
  return <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl bg-amber-50 p-4 md:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-bold text-slate-700">Cadeira<select required className="input mt-1" value={value.courseId} onChange={(e) => setValue({ ...value, courseId: e.target.value })}><option value="">Selecione</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><SelectField label="Tipo" value={value.eventType} options={["Prova", "Trabalho", "Apresentação", "Leitura", "Outro"]} onChange={(eventType) => setValue({ ...value, eventType })} /><Input label="Nome *" value={value.title} onChange={(title) => setValue({ ...value, title })} /><Input label="Data *" value={value.date} type="date" onChange={(date) => setValue({ ...value, date })} /><Input label="Peso na nota (%)" value={value.weight} type="number" onChange={(weight) => setValue({ ...value, weight })} /><Input label="XP" value={String(value.xp)} type="number" onChange={(xp) => setValue({ ...value, xp: Number(xp) || 0 })} /><button disabled={saving} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white md:col-span-2 lg:col-span-3">{saving ? "Salvando..." : "Salvar e adicionar ao calendário"}</button></form>;
}

function CourseCard({ course, onDelete }: { course: Course; onDelete: () => void }) { return <article className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600"><BookOpen className="size-5" /></div><button onClick={onDelete} className="text-slate-300 hover:text-red-500"><Trash2 className="size-4" /></button></div><h3 className="mt-3 font-bold">{course.name}</h3><p className="mt-1 text-sm text-slate-500">{course.code || "Sem código"} · {course.credits} créditos</p>{course.professor && <p className="mt-2 text-sm">{course.professor}</p>}{course.schedule && <p className="text-sm text-slate-500">{course.schedule}</p>}</article>; }
function Metric({ label, value, helper }: { label: string; value: string; helper: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 truncate text-xs text-slate-500">{helper}</p></div>; }
function ConceptBadge({ concept }: { concept: Concept }) { const colors: Record<string, string> = { A: "bg-emerald-100 text-emerald-700", B: "bg-blue-100 text-blue-700", C: "bg-amber-100 text-amber-700", D: "bg-red-100 text-red-700", FF: "bg-slate-900 text-white" }; return concept ? <span className={`inline-flex size-8 items-center justify-center rounded-full font-black ${colors[concept]}`}>{concept}</span> : <span className="text-slate-300">—</span>; }
function Empty({ text }: { text: string }) { return <div className="col-span-full grid min-h-24 place-items-center rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-400"><GraduationCap className="mb-2 size-6" />{text}</div>; }
function Input({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) { return <label className="text-sm font-bold text-slate-700">{label}<input required={label.includes("*")} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="input mt-1" /></label>; }
function SelectField({ label, value, options, labels = {}, onChange }: { label: string; value: string; options: readonly string[]; labels?: Record<string, string>; onChange: (value: string) => void }) { return <label className="text-sm font-bold text-slate-700">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="input mt-1">{options.map((option) => <option key={option || "empty"} value={option}>{labels[option] ?? option}</option>)}</select></label>; }
function formatDate(value: string) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "—"; }
