import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Flame,
  Gauge,
  Save,
  Target,
  Trophy,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import {
  fetchAreaBreakdown,
  fetchDemeritBreakdown,
  fetchHabitBreakdown,
  fetchPendingTasks,
  fetchWeeklyDashboardMetrics,
  fetchWeeklyEvolution,
  fetchWeeklyMetrics,
  fetchWeeklyReview,
  saveWeeklyReview,
  type AreaBreakdown,
  type DemeritBreakdown,
  type HabitBreakdown,
  type PendingTask,
  type WeeklyDashboardMetrics,
  type WeeklyMetrics,
} from "@/lib/weekly-review-data";

const AREA_NAMES: Record<string, string> = {
  fejers: "FEJERS",
  gera: "Gera",
  ufrgs: "UFRGS",
  saude: "Saúde",
  conhecimento: "Conhecimento",
  financeiro: "Financeiro",
};

const AREA_STYLES: Record<string, { bar: string; soft: string; text: string }> = {
  fejers: { bar: "bg-red-500", soft: "bg-red-50", text: "text-red-700" },
  gera: { bar: "bg-emerald-500", soft: "bg-emerald-50", text: "text-emerald-700" },
  ufrgs: { bar: "bg-amber-400", soft: "bg-amber-50", text: "text-amber-700" },
  saude: { bar: "bg-blue-500", soft: "bg-blue-50", text: "text-blue-700" },
  conhecimento: { bar: "bg-pink-500", soft: "bg-pink-50", text: "text-pink-700" },
  financeiro: { bar: "bg-purple-500", soft: "bg-purple-50", text: "text-purple-700" },
};

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

function formatWeek(start: string) {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  return `${fmt.format(s)} — ${fmt.format(e)}`;
}

function shortWeek(start: string) {
  const s = new Date(`${start}T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(s);
}

function hours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h}h`;
  return `${h}h ${m}min`;
}

function scoreWeek(metrics: WeeklyMetrics, dashboard: WeeklyDashboardMetrics) {
  const execution = Math.min(100, dashboard.executionRate);
  const habits = Math.min(100, dashboard.habitCompletionRate);
  const demeritScore = Math.max(0, 100 - dashboard.demeritOccurrences * 20);
  return Math.round(execution * 0.5 + habits * 0.3 + demeritScore * 0.2);
}

function scoreLabel(score: number) {
  if (score >= 85) return "Semana excelente";
  if (score >= 70) return "Boa semana";
  if (score >= 50) return "Semana em construção";
  return "Semana para recalibrar";
}

export function WeeklyReviewDashboard({ userId }: { userId: string }) {
  const currentWeek = useMemo(() => startOfWeek(), []);
  const [weekStart, setWeekStart] = useState(iso(currentWeek));
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [dashboard, setDashboard] = useState<WeeklyDashboardMetrics | null>(null);
  const [areas, setAreas] = useState<AreaBreakdown[]>([]);
  const [habits, setHabits] = useState<HabitBreakdown[]>([]);
  const [demerits, setDemerits] = useState<DemeritBreakdown[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [evolution, setEvolution] = useState<Array<WeeklyMetrics & { dashboard: WeeklyDashboardMetrics }>>([]);
  const [range, setRange] = useState<4 | 8 | 12>(8);

  const [wins, setWins] = useState("");
  const [pendingNotes, setPendingNotes] = useState("");
  const [nextWeekPriority, setNextWeekPriority] = useState("");
  const [focus1, setFocus1] = useState("");
  const [focus2, setFocus2] = useState("");
  const [focus3, setFocus3] = useState("");
  const [executionGoal, setExecutionGoal] = useState(80);
  const [priorityHabit, setPriorityHabit] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(selected: string) {
    setLoading(true);
    setError(null);
    try {
      const selectedDate = new Date(`${selected}T00:00:00`);
      const starts = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 7 * (11 - i));
        return iso(d);
      });

      const [m, dm, review, pending, history, areaData, habitData, demeritData] = await Promise.all([
        fetchWeeklyMetrics(selected),
        fetchWeeklyDashboardMetrics(selected),
        fetchWeeklyReview(selected),
        fetchPendingTasks(selected),
        fetchWeeklyEvolution(starts),
        fetchAreaBreakdown(selected),
        fetchHabitBreakdown(selected),
        fetchDemeritBreakdown(selected),
      ]);

      setMetrics(m);
      setDashboard(dm);
      setPendingTasks(pending);
      setEvolution(history);
      setAreas(areaData);
      setHabits(habitData);
      setDemerits(demeritData);
      setWins(review?.wins ?? "");
      setPendingNotes(review?.pendingNotes ?? "");
      setNextWeekPriority(review?.nextWeekPriority ?? "");
      setFocus1(review?.focus1 ?? "");
      setFocus2(review?.focus2 ?? "");
      setFocus3(review?.focus3 ?? "");
      setExecutionGoal(review?.executionGoal ?? 80);
      setPriorityHabit(review?.priorityHabit ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o dashboard semanal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(weekStart);
  }, [weekStart, userId]);

  function moveWeek(delta: number) {
    const d = new Date(`${weekStart}T00:00:00`);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(iso(d));
  }

  async function save() {
    setSaving(true);
    setFeedback(null);
    try {
      await saveWeeklyReview(userId, weekStart, {
        wins,
        pendingNotes,
        nextWeekPriority,
        focus1,
        focus2,
        focus3,
        executionGoal,
        priorityHabit,
      });
      setFeedback("Revisão e plano da próxima semana salvos.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Não foi possível salvar a revisão.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Montando seu dashboard semanal...</div>;
  }

  if (error || !metrics || !dashboard) {
    return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">{error ?? "Não foi possível carregar a semana."}</div>;
  }

  const netXp = metrics.xpGained - metrics.xpLost;
  const currentScore = scoreWeek(metrics, dashboard);
  const previous = evolution.at(-2);
  const previousScore = previous ? scoreWeek(previous, previous.dashboard) : null;
  const scoreDelta = previousScore === null ? null : currentScore - previousScore;
  const executionDelta = previous ? dashboard.executionRate - previous.dashboard.executionRate : null;

  const totalAreaActivity = areas.reduce((sum, item) => sum + item.activityCount, 0);
  const visibleEvolution = evolution.slice(-range);
  const maxEvolutionXp = Math.max(1, ...visibleEvolution.map((w) => Math.max(w.xpGained, w.xpLost)));
  const maxTasks = Math.max(1, ...visibleEvolution.map((w) => w.tasksCompleted));

  const insight = (() => {
    if (!previous) return "Continue registrando suas semanas para o Vamo Dale!! construir comparações mais inteligentes.";
    const parts: string[] = [];
    if (executionDelta !== null && executionDelta >= 8) parts.push(`sua execução subiu ${Math.round(executionDelta)} p.p.`);
    else if (executionDelta !== null && executionDelta <= -8) parts.push(`sua execução caiu ${Math.abs(Math.round(executionDelta))} p.p.`);
    else parts.push("sua taxa de execução ficou relativamente estável");
    if (metrics.neglectedArea) parts.push(`${AREA_NAMES[metrics.neglectedArea] ?? metrics.neglectedArea} recebeu pouca atenção`);
    if (dashboard.demeritOccurrences === 0) parts.push("você passou a semana sem deméritos");
    else if (dashboard.demeritOccurrences > previous.dashboard.demeritOccurrences) parts.push("os deméritos aumentaram em relação à semana anterior");
    return `${parts[0]}; ${parts.slice(1).join(" e ")}.`;
  })();

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">Minha Semana</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Dashboard de gestão pessoal</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Resultado, comportamento, equilíbrio e direção para a próxima semana em uma única visão.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => moveWeek(-1)} className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ArrowLeft className="size-4" /></button>
          <div className="min-w-40 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-bold">{formatWeek(weekStart)}</div>
          <button onClick={() => moveWeek(1)} disabled={weekStart >= iso(currentWeek)} className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30"><ArrowRight className="size-4" /></button>
        </div>
      </div>

      {feedback && <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700">{feedback}</div>}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Leitura da semana</p>
              <h3 className="mt-2 text-2xl font-bold">{scoreLabel(currentScore)}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{insight}</p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <div className="text-5xl font-black tracking-tight">{currentScore}<span className="text-xl text-slate-400">/100</span></div>
              <p className={`mt-1 text-sm font-bold ${scoreDelta === null ? "text-slate-400" : scoreDelta >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {scoreDelta === null ? "Primeira comparação" : `${scoreDelta >= 0 ? "+" : ""}${scoreDelta} pts vs semana anterior`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric compact icon={<Zap className="size-5" />} label="XP líquido" value={`${netXp >= 0 ? "+" : ""}${netXp}`} detail={`${metrics.xpGained} ganhos · ${metrics.xpLost} perdidos`} />
          <Metric compact icon={<Gauge className="size-5" />} label="Execução" value={`${dashboard.executionRate}%`} detail={`${dashboard.completedPlannedTasks}/${dashboard.plannedTasks} planejadas`} />
          <Metric compact icon={<CheckCircle2 className="size-5" />} label="Tarefas" value={String(metrics.tasksCompleted)} detail={`${metrics.overdueTasks} atrasadas`} />
          <Metric compact icon={<Flame className="size-5" />} label="Hábitos" value={String(metrics.habitsCompleted)} detail={`${dashboard.habitCompletionRate}% da meta`} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<TrendingUp className="size-5" />} label="XP ganho" value={`+${metrics.xpGained}`} detail="Missões + hábitos" />
        <Metric icon={<TrendingDown className="size-5" />} label="XP perdido" value={`-${metrics.xpLost}`} detail={`${dashboard.demeritOccurrences} ocorrências`} />
        <Metric icon={<Clock3 className="size-5" />} label="Tempo planejado" value={hours(metrics.plannedMinutes)} detail={`${dashboard.plannedTasks} tarefas com prazo`} />
        <Metric icon={<CalendarRange className="size-5" />} label="Pendências" value={String(metrics.pendingTasks)} detail="Ao final da semana" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_.92fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-sm font-bold text-violet-600">EXECUÇÃO</p><h3 className="mt-1 text-xl font-bold">Do planejado ao concluído</h3></div>
            <div className="text-right"><p className="text-3xl font-black">{dashboard.executionRate}%</p><p className="text-xs font-semibold text-slate-400">taxa de execução</p></div>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-950" style={{ width: `${Math.min(100, dashboard.executionRate)}%` }} /></div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <MiniStat label="Planejadas" value={dashboard.plannedTasks} />
            <MiniStat label="Concluídas" value={dashboard.completedPlannedTasks} />
            <MiniStat label="Não concluídas" value={Math.max(0, dashboard.plannedTasks - dashboard.completedPlannedTasks)} />
          </div>
          {executionDelta !== null && <p className={`mt-4 text-sm font-semibold ${executionDelta >= 0 ? "text-emerald-600" : "text-red-600"}`}>{executionDelta >= 0 ? "↑" : "↓"} {Math.abs(Math.round(executionDelta))} p.p. em relação à semana anterior</p>}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div><p className="text-sm font-bold text-violet-600">EQUILÍBRIO</p><h3 className="mt-1 text-xl font-bold">Distribuição por área da vida</h3></div>
          <div className="mt-5 space-y-4">
            {areas.map((item) => {
              const pct = totalAreaActivity ? Math.round((item.activityCount / totalAreaActivity) * 100) : 0;
              const style = AREA_STYLES[item.area] ?? AREA_STYLES.fejers;
              return <div key={item.area}>
                <div className="mb-1.5 flex items-center justify-between text-sm"><span className="font-bold text-slate-700">{AREA_NAMES[item.area] ?? item.area}</span><span className="font-semibold text-slate-400">{pct}% · {item.activityCount}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${style.bar}`} style={{ width: `${pct}%` }} /></div>
              </div>;
            })}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <AreaBadge label="Mais priorizada" area={metrics.topArea} />
            <AreaBadge label="Negligenciada" area={metrics.neglectedArea} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-violet-600">HÁBITOS</p><h3 className="mt-1 text-xl font-bold">Consistência da semana</h3></div><span className="rounded-full bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-700">{dashboard.habitCompletionRate}%</span></div>
          <div className="mt-5 space-y-3">
            {habits.length === 0 ? <EmptyText>Nenhum hábito ativo.</EmptyText> : habits.map((habit) => {
              const pct = habit.target ? Math.min(100, Math.round((habit.completed / habit.target) * 100)) : 0;
              return <div key={habit.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3"><div><p className="font-bold text-slate-800">{habit.name}</p><p className="text-xs font-semibold text-slate-400">{AREA_NAMES[habit.area] ?? habit.area}</p></div><span className={`text-sm font-black ${habit.completed >= habit.target ? "text-emerald-600" : "text-slate-700"}`}>{habit.completed}/{habit.target}</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-orange-400" style={{ width: `${pct}%` }} /></div>
              </div>;
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-red-600">DEMÉRITOS</p><h3 className="mt-1 text-xl font-bold">Padrões que tiraram pontos</h3></div><span className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700">-{metrics.xpLost} XP</span></div>
          <div className="mt-5 space-y-3">
            {demerits.length === 0 ? <div className="rounded-2xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">Nenhum demérito nesta semana. Ótimo sinal de consistência.</div> : demerits.map((item, index) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-4">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-red-600">{index + 1}</div>
              <div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-800">{item.title}</p><p className="text-xs font-semibold text-slate-400">{item.occurrences} ocorrência{item.occurrences === 1 ? "" : "s"}</p></div>
              <span className="shrink-0 font-black text-red-600">-{item.xpLost} XP</span>
            </div>)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><Trophy className="size-5 text-amber-500" /><h3 className="text-lg font-bold">Principais vitórias</h3></div>
          <p className="mt-1 text-sm text-slate-500">O que aconteceu nesta semana que vale reconhecer?</p>
          <textarea value={wins} onChange={(e) => setWins(e.target.value)} rows={5} className="input mt-4 resize-none" placeholder="Entregas, decisões, hábitos, conversas, avanços..." />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><AlertTriangle className="size-5 text-amber-500" /><h3 className="text-lg font-bold">Pendências e pontos de atenção</h3></div>
          <p className="mt-1 text-sm text-slate-500">{metrics.pendingTasks} tarefas estavam pendentes ao final da semana.</p>
          <div className="mt-4 space-y-2">
            {pendingTasks.slice(0, 4).map((task) => <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"><span className="truncate">{task.title}</span><span className="shrink-0 text-xs text-slate-400">{AREA_NAMES[task.area] ?? task.area}</span></div>)}
            {pendingTasks.length === 0 && <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">Nada pendente nesta semana.</p>}
          </div>
          <textarea value={pendingNotes} onChange={(e) => setPendingNotes(e.target.value)} rows={3} className="input mt-4 resize-none" placeholder="O que está se repetindo ou precisa de atenção?" />
        </div>
      </div>

      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-7">
        <div className="flex items-center gap-2 text-violet-300"><Target className="size-5" /><p className="text-xs font-bold uppercase tracking-[0.2em]">Plano da próxima semana</p></div>
        <h3 className="mt-2 text-2xl font-bold">O que eu quero priorizar?</h3>
        <textarea value={nextWeekPriority} onChange={(e) => setNextWeekPriority(e.target.value)} rows={2} className="mt-4 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400" placeholder="A prioridade que deve orientar suas decisões..." />

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <DarkField label="Foco 1"><input value={focus1} onChange={(e) => setFocus1(e.target.value)} className="dark-input" placeholder="Primeiro foco" /></DarkField>
          <DarkField label="Foco 2"><input value={focus2} onChange={(e) => setFocus2(e.target.value)} className="dark-input" placeholder="Segundo foco" /></DarkField>
          <DarkField label="Foco 3"><input value={focus3} onChange={(e) => setFocus3(e.target.value)} className="dark-input" placeholder="Terceiro foco" /></DarkField>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <DarkField label="Meta de execução"><div className="relative"><input type="number" min="0" max="100" value={executionGoal} onChange={(e) => setExecutionGoal(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="dark-input pr-10" /><span className="absolute right-4 top-3 text-sm font-bold text-slate-400">%</span></div></DarkField>
          <DarkField label="Hábito principal"><input value={priorityHabit} onChange={(e) => setPriorityHabit(e.target.value)} className="dark-input" placeholder="Ex.: Academia 4x" /></DarkField>
        </div>
        <button onClick={() => void save()} disabled={saving} className="mt-5 flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-60"><Save className="size-4" />{saving ? "Salvando..." : "Salvar revisão e plano"}</button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="flex items-center gap-2 text-violet-600"><BarChart3 className="size-5" /><p className="text-sm font-bold">EVOLUÇÃO</p></div><h3 className="mt-1 text-2xl font-bold">Semana a semana</h3><p className="mt-1 text-sm text-slate-500">Compare execução, XP, hábitos e score ao longo do tempo.</p></div>
          <div className="flex rounded-xl bg-slate-100 p-1">{([4, 8, 12] as const).map((value) => <button key={value} onClick={() => setRange(value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${range === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>{value} semanas</button>)}</div>
        </div>

        <div className="mt-7 overflow-x-auto">
          <div className="flex min-w-[760px] items-end gap-3">
            {visibleEvolution.map((week) => {
              const gainedHeight = Math.max(6, Math.round((week.xpGained / maxEvolutionXp) * 100));
              const lostHeight = week.xpLost === 0 ? 0 : Math.max(5, Math.round((week.xpLost / maxEvolutionXp) * 100));
              const weekScore = scoreWeek(week, week.dashboard);
              return <div key={week.weekStart} className="flex flex-1 flex-col items-center">
                <div className="mb-2 rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">{weekScore}</div>
                <div className="flex h-28 items-end gap-1.5">
                  <div title={`${week.xpGained} XP ganhos`} className="w-5 rounded-t-md bg-emerald-400" style={{ height: gainedHeight }} />
                  <div title={`${week.xpLost} XP perdidos`} className="w-5 rounded-t-md bg-red-300" style={{ height: lostHeight }} />
                </div>
                <div className="mt-2 text-center text-[11px] font-bold text-slate-500">{shortWeek(week.weekStart)}</div>
                <div className="mt-1 text-xs font-black text-slate-800">{week.dashboard.executionRate}% exec.</div>
              </div>;
            })}
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <TrendCard label="Score médio" values={visibleEvolution.map((week) => scoreWeek(week, week.dashboard))} suffix="/100" />
          <TrendCard label="Execução média" values={visibleEvolution.map((week) => week.dashboard.executionRate)} suffix="%" />
          <TrendCard label="Tarefas/semana" values={visibleEvolution.map((week) => week.tasksCompleted)} suffix="" />
        </div>

        <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-slate-500"><span><span className="mr-1 inline-block size-2 rounded-full bg-emerald-400" />XP ganho</span><span><span className="mr-1 inline-block size-2 rounded-full bg-red-300" />XP perdido</span><span><span className="mr-1 inline-grid size-4 place-items-center rounded-full bg-slate-950 text-[8px] font-black text-white">S</span> Score semanal</span></div>
      </div>
    </section>
  );
}

function Metric({ icon, label, value, detail, compact }: { icon: ReactNode; label: string; value: string; detail: string; compact?: boolean }) {
  return <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? "p-4" : "p-5"}`}><div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-[11px] font-bold uppercase tracking-wider">{label}</span></div><p className={`${compact ? "mt-2 text-xl" : "mt-3 text-2xl"} font-bold`}>{value}</p><p className="mt-1 text-xs font-semibold text-slate-400">{detail}</p></div>;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-slate-50 p-4 text-center"><p className="text-2xl font-black text-slate-900">{value}</p><p className="mt-1 text-xs font-semibold text-slate-400">{label}</p></div>;
}

function AreaBadge({ label, area }: { label: string; area: string }) {
  const style = AREA_STYLES[area] ?? { soft: "bg-slate-50", text: "text-slate-700", bar: "bg-slate-400" };
  return <div className={`rounded-2xl p-3 ${style.soft}`}><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-1 text-sm font-black ${style.text}`}>{AREA_NAMES[area] ?? area ?? "—"}</p></div>;
}

function EmptyText({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">{children}</div>;
}

function DarkField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>{children}</label>;
}

function TrendCard({ label, values, suffix }: { label: string; values: number[]; suffix: string }) {
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const first = values[0] ?? 0;
  const last = values.at(-1) ?? 0;
  const delta = last - first;
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><div className="mt-2 flex items-end justify-between gap-3"><p className="text-2xl font-black">{Math.round(average)}{suffix}</p><p className={`text-xs font-bold ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>{delta >= 0 ? "↑" : "↓"} {Math.abs(Math.round(delta))}{suffix}</p></div></div>;
}
