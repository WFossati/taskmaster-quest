import {
  CalendarCheck2,
  Check,
  Edit3,
  Flame,
  History,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import {
  createHabit,
  deleteHabit,
  fetchHabits,
  toggleHabitCompletion,
  updateHabit,
  type Habit,
  type HabitInput,
} from "@/lib/habits-data";

const AREAS = [
  { id: "fejers", name: "FEJERS", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  { id: "gera", name: "Gera", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  { id: "ufrgs", name: "UFRGS", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  { id: "saude", name: "Saúde", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  { id: "conhecimento", name: "Conhecimento", bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-500" },
  { id: "financeiro", name: "Financeiro", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
];

const WEEKDAYS = [
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
  { value: 0, label: "D" },
];

const defaultForm: HabitInput = {
  name: "",
  description: "",
  area: "saude",
  frequency: "daily",
  targetPerWeek: 7,
  weekdays: [1, 2, 3, 4, 5, 6, 0],
  xpReward: 20,
  isActive: true,
};

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateOnly(value: Date) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(value: Date) {
  const d = dateOnly(value);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function isScheduled(habit: Habit, date: Date) {
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "custom") return habit.weekdays.includes(date.getDay());
  return true;
}

function currentStreak(habit: Habit) {
  if (habit.frequency === "weekly") return weeklyStreak(habit);
  const completed = new Set(habit.completions.map((c) => c.completedOn));
  let cursor = dateOnly(new Date());
  if (isScheduled(habit, cursor) && !completed.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for (let guard = 0; guard < 365; guard += 1) {
    if (!isScheduled(habit, cursor)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (!completed.has(iso(cursor))) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function bestStreak(habit: Habit) {
  if (habit.frequency === "weekly") return bestWeeklyStreak(habit);
  const dates = [...new Set(habit.completions.map((c) => c.completedOn))].sort();
  if (!dates.length) return 0;
  const completed = new Set(dates);
  const first = new Date(`${dates[0]}T00:00:00`);
  const last = new Date(`${dates[dates.length - 1]}T00:00:00`);
  let best = 0;
  let streak = 0;
  const cursor = new Date(first);
  while (cursor <= last) {
    if (isScheduled(habit, cursor)) {
      if (completed.has(iso(cursor))) {
        streak += 1;
        best = Math.max(best, streak);
      } else streak = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return best;
}

function weeklyStreak(habit: Habit) {
  const completions = habit.completions.map((c) => new Date(`${c.completedOn}T00:00:00`));
  let week = startOfWeek(new Date());
  const countWeek = (start: Date) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return completions.filter((d) => d >= start && d < end).length;
  };
  if (countWeek(week) < habit.targetPerWeek) week.setDate(week.getDate() - 7);
  let streak = 0;
  for (let i = 0; i < 104; i += 1) {
    if (countWeek(week) < habit.targetPerWeek) break;
    streak += 1;
    week.setDate(week.getDate() - 7);
  }
  return streak;
}

function bestWeeklyStreak(habit: Habit) {
  if (!habit.completions.length) return 0;
  const grouped = new Map<string, number>();
  for (const completion of habit.completions) {
    const key = iso(startOfWeek(new Date(`${completion.completedOn}T00:00:00`)));
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }
  const weeks = [...grouped.keys()].sort();
  let best = 0;
  let streak = 0;
  let previous: Date | null = null;
  for (const key of weeks) {
    if ((grouped.get(key) ?? 0) < habit.targetPerWeek) continue;
    const week = new Date(`${key}T00:00:00`);
    if (previous && Math.round((week.getTime() - previous.getTime()) / 86400000) === 7) streak += 1;
    else streak = 1;
    best = Math.max(best, streak);
    previous = week;
  }
  return best;
}

export function HabitsDashboard({ userId }: { userId: string }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HabitInput>(defaultForm);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      setHabits(await fetchHabits());
    } finally {
      setLoading(false);
    }
  }

  useMemo(() => {
    void reload();
    return null;
  }, [userId]);

  const today = iso(new Date());
  const completedToday = habits.filter((habit) => habit.completions.some((c) => c.completedOn === today)).length;
  const xpTotal = habits.reduce((sum, habit) => sum + habit.completions.reduce((s, c) => s + c.xpEarned, 0), 0);
  const longest = habits.reduce((max, habit) => Math.max(max, bestStreak(habit)), 0);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(true);
  }

  function openEdit(habit: Habit) {
    setEditingId(habit.id);
    setForm({
      name: habit.name,
      description: habit.description,
      area: habit.area,
      frequency: habit.frequency,
      targetPerWeek: habit.targetPerWeek,
      weekdays: habit.weekdays,
      xpReward: habit.xpReward,
      isActive: habit.isActive,
    });
    setShowForm(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description.trim() };
      if (editingId) await updateHabit(userId, editingId, payload);
      else await createHabit(userId, payload);
      await reload();
      setShowForm(false);
      setEditingId(null);
      setFeedback(editingId ? "Hábito atualizado!" : "Novo hábito criado!");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível salvar o hábito.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(habit: Habit) {
    setSaving(true);
    try {
      const completed = await toggleHabitCompletion(userId, habit, today);
      await reload();
      setFeedback(completed ? `+${habit.xpReward} XP! Check-in concluído.` : "Check-in de hoje removido.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(habit: Habit) {
    if (!window.confirm(`Excluir o hábito “${habit.name}” e todo o histórico?`)) return;
    await deleteHabit(habit.id);
    await reload();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">Hábitos</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Pequenas ações. Progresso acumulado.</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Faça check-in, mantenha sua sequência e transforme consistência em XP.</p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white"><Plus className="size-4" /> Novo hábito</button>
      </div>

      {feedback && <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700">{feedback}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Target className="size-5" />} label="Hábitos ativos" value={String(habits.filter((h) => h.isActive).length)} />
        <Metric icon={<CalendarCheck2 className="size-5" />} label="Check-ins hoje" value={`${completedToday}/${habits.filter((h) => h.isActive).length}`} />
        <Metric icon={<Flame className="size-5" />} label="Maior sequência" value={`${longest} ${longest === 1 ? "dia" : "dias"}`} />
        <Metric icon={<Zap className="size-5" />} label="XP de hábitos" value={`${xpTotal} XP`} />
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center justify-between"><div><p className="text-sm font-bold text-violet-600">{editingId ? "EDITAR HÁBITO" : "NOVO HÁBITO"}</p><h3 className="mt-1 text-xl font-bold">{editingId ? "Ajuste sua rotina" : "O que você quer tornar consistente?"}</h3></div><button type="button" onClick={() => setShowForm(false)}><X className="size-5 text-slate-400" /></button></div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-700">Nome *</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Ler 20 minutos" /></label>
            <label className="md:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-700">Descrição</span><textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-700">Área da vida</span><select className="input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>{AREAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-700">Recorrência</span><select className="input" value={form.frequency} onChange={(e) => { const frequency = e.target.value as HabitInput["frequency"]; setForm({ ...form, frequency, targetPerWeek: frequency === "daily" ? 7 : form.targetPerWeek }); }}><option value="daily">Todos os dias</option><option value="weekly">X vezes por semana</option><option value="custom">Dias específicos</option></select></label>
            {form.frequency === "weekly" && <label><span className="mb-2 block text-sm font-bold text-slate-700">Meta semanal</span><select className="input" value={form.targetPerWeek} onChange={(e) => setForm({ ...form, targetPerWeek: Number(e.target.value) })}>{[1,2,3,4,5,6,7].map((n) => <option key={n} value={n}>{n}x por semana</option>)}</select></label>}
            {form.frequency === "custom" && <div className="md:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-700">Dias da semana</span><div className="flex flex-wrap gap-2">{WEEKDAYS.map((day) => <button key={day.value} type="button" onClick={() => setForm({ ...form, weekdays: form.weekdays.includes(day.value) ? form.weekdays.filter((d) => d !== day.value) : [...form.weekdays, day.value], targetPerWeek: form.weekdays.includes(day.value) ? Math.max(1, form.weekdays.length - 1) : Math.min(7, form.weekdays.length + 1) })} className={`grid size-10 place-items-center rounded-full text-sm font-bold ${form.weekdays.includes(day.value) ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"}`}>{day.label}</button>)}</div></div>}
            <label><span className="mb-2 block text-sm font-bold text-slate-700">XP por check-in</span><input type="number" min="0" step="5" className="input" value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: Number(e.target.value) })} /></label>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">Cancelar</button><button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar hábito"}</button></div>
        </form>
      )}

      {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Carregando hábitos...</div> : habits.length === 0 ? <Empty onCreate={openCreate} /> : <div className="grid gap-5 xl:grid-cols-2">{habits.map((habit) => <HabitCard key={habit.id} habit={habit} onToggle={() => void toggle(habit)} onEdit={() => openEdit(habit)} onDelete={() => void remove(habit)} disabled={saving} />)}</div>}
    </section>
  );
}

function HabitCard({ habit, onToggle, onEdit, onDelete, disabled }: { habit: Habit; onToggle: () => void; onEdit: () => void; onDelete: () => void; disabled: boolean }) {
  const area = AREAS.find((a) => a.id === habit.area) ?? AREAS[0]!;
  const today = new Date();
  const todayIso = iso(today);
  const doneToday = habit.completions.some((c) => c.completedOn === todayIso);
  const streak = currentStreak(habit);
  const best = bestStreak(habit);
  const historyDays = Array.from({ length: 7 }, (_, index) => { const d = new Date(today); d.setDate(d.getDate() - (6 - index)); return d; });
  const completedSet = new Set(habit.completions.map((c) => c.completedOn));
  const xp = habit.completions.reduce((sum, c) => sum + c.xpEarned, 0);

  return <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${area.bg} ${area.text}`}>{area.name}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{frequencyLabel(habit)}</span></div><h3 className="mt-3 text-xl font-bold">{habit.name}</h3>{habit.description && <p className="mt-1 text-sm text-slate-500">{habit.description}</p>}</div><div className="flex gap-1"><button title="Editar" onClick={onEdit} className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500"><Edit3 className="size-4" /></button><button title="Excluir" onClick={onDelete} className="grid size-9 place-items-center rounded-xl border border-red-100 text-red-500"><Trash2 className="size-4" /></button></div></div>

    <div className="mt-5 grid grid-cols-3 gap-3"><MiniStat label="Sequência" value={`${streak}${habit.frequency === "weekly" ? " sem" : " dias"}`} icon={<Flame className="size-4" />} /><MiniStat label="Recorde" value={`${best}${habit.frequency === "weekly" ? " sem" : " dias"}`} icon={<Trophy className="size-4" />} /><MiniStat label="XP ganho" value={`${xp}`} icon={<Zap className="size-4" />} /></div>

    <div className="mt-5"><div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-400"><span>Últimos 7 dias</span><span>{habit.completions.length} check-ins</span></div><div className="grid grid-cols-7 gap-2">{historyDays.map((day) => { const completed = completedSet.has(iso(day)); const scheduled = isScheduled(habit, day); return <div key={iso(day)} className="text-center"><div className={`mx-auto grid size-9 place-items-center rounded-xl text-xs font-bold ${completed ? "bg-emerald-500 text-white" : scheduled ? "bg-slate-100 text-slate-400" : "bg-slate-50 text-slate-300"}`}>{completed ? <Check className="size-4" /> : day.getDate()}</div><span className="mt-1 block text-[10px] font-semibold uppercase text-slate-400">{new Intl.DateTimeFormat("pt-BR", { weekday: "narrow" }).format(day)}</span></div>; })}</div></div>

    <button onClick={onToggle} disabled={disabled} className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold transition disabled:opacity-60 ${doneToday ? "bg-emerald-50 text-emerald-700" : "bg-slate-950 text-white hover:bg-slate-800"}`}>{doneToday ? <><Check className="size-4" /> Feito hoje · remover check-in</> : <><Sparkles className="size-4" /> Fazer check-in · +{habit.xpReward} XP</>}</button>
  </article>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-xs font-bold uppercase tracking-wider">{label}</span></div><p className="mt-3 text-2xl font-bold">{value}</p></div>; }
function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-3"><div className="flex items-center gap-1.5 text-slate-400">{icon}<span className="text-[10px] font-bold uppercase">{label}</span></div><p className="mt-2 text-sm font-bold text-slate-800">{value}</p></div>; }
function Empty({ onCreate }: { onCreate: () => void }) { return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><History className="mx-auto size-9 text-slate-300" /><h3 className="mt-3 text-lg font-bold">Nenhum hábito ainda</h3><p className="mt-1 text-sm text-slate-500">Crie o primeiro hábito e comece sua sequência.</p><button onClick={onCreate} className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"><Plus className="mr-2 inline size-4" />Criar hábito</button></div>; }
function frequencyLabel(habit: Habit) { if (habit.frequency === "daily") return "Todos os dias"; if (habit.frequency === "weekly") return `${habit.targetPerWeek}x/semana`; return `${habit.weekdays.length} dias/semana`; }
