import { ArrowLeft, ArrowRight, CalendarRange, CheckCircle2, Clock3, Flame, Save, Target, Trophy, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  fetchPendingTasks,
  fetchWeeklyEvolution,
  fetchWeeklyMetrics,
  fetchWeeklyReview,
  saveWeeklyReview,
  type PendingTask,
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

function hours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h}h`;
  return `${h}h ${m}min`;
}

export function WeeklyReviewDashboard({ userId }: { userId: string }) {
  const currentWeek = useMemo(() => startOfWeek(), []);
  const [weekStart, setWeekStart] = useState(iso(currentWeek));
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [evolution, setEvolution] = useState<WeeklyMetrics[]>([]);
  const [wins, setWins] = useState("");
  const [pendingNotes, setPendingNotes] = useState("");
  const [nextWeekPriority, setNextWeekPriority] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function load(selected: string) {
    setLoading(true);
    try {
      const starts = Array.from({ length: 8 }, (_, i) => {
        const d = new Date(currentWeek);
        d.setDate(d.getDate() - (7 * (7 - i)));
        return iso(d);
      });
      const [m, review, pending, history] = await Promise.all([
        fetchWeeklyMetrics(selected),
        fetchWeeklyReview(selected),
        fetchPendingTasks(selected),
        fetchWeeklyEvolution(starts),
      ]);
      setMetrics(m);
      setPendingTasks(pending);
      setEvolution(history);
      setWins(review?.wins ?? "");
      setPendingNotes(review?.pendingNotes ?? "");
      setNextWeekPriority(review?.nextWeekPriority ?? "");
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
      await saveWeeklyReview(userId, weekStart, { wins, pendingNotes, nextWeekPriority });
      setFeedback("Revisão da semana salva.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível salvar a revisão.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !metrics) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Carregando sua semana...</div>;
  }

  const netXp = metrics.xpGained - metrics.xpLost;
  const maxEvolutionXp = Math.max(1, ...evolution.map((w) => Math.max(w.xpGained, w.xpLost)));

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">Minha Semana</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Revisão semanal</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Veja o que avançou, o que pesou e escolha conscientemente onde colocar energia na próxima semana.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => moveWeek(-1)} className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600"><ArrowLeft className="size-4" /></button>
          <div className="min-w-40 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-bold">{formatWeek(weekStart)}</div>
          <button onClick={() => moveWeek(1)} disabled={weekStart >= iso(currentWeek)} className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30"><ArrowRight className="size-4" /></button>
        </div>
      </div>

      {feedback && <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700">{feedback}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Zap className="size-5" />} label="XP ganho" value={`+${metrics.xpGained}`} detail={`Saldo da semana: ${netXp >= 0 ? "+" : ""}${netXp} XP`} />
        <Metric icon={<TrendingDown className="size-5" />} label="XP perdido" value={`-${metrics.xpLost}`} detail="Deméritos registrados" />
        <Metric icon={<CheckCircle2 className="size-5" />} label="Tarefas concluídas" value={String(metrics.tasksCompleted)} detail={`${metrics.overdueTasks} atrasadas ao fim da semana`} />
        <Metric icon={<Flame className="size-5" />} label="Hábitos cumpridos" value={String(metrics.habitsCompleted)} detail="Check-ins realizados" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={<Clock3 className="size-5" />} label="Tempo planejado" value={hours(metrics.plannedMinutes)} detail="Tarefas com prazo na semana" />
        <Metric icon={<Trophy className="size-5" />} label="Área mais priorizada" value={AREA_NAMES[metrics.topArea] ?? metrics.topArea ?? "—"} detail="Mais ações concluídas" />
        <Metric icon={<Target className="size-5" />} label="Área negligenciada" value={AREA_NAMES[metrics.neglectedArea] ?? metrics.neglectedArea ?? "—"} detail="Menos ações concluídas" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><Trophy className="size-5 text-amber-500" /><h3 className="text-lg font-bold">Principais vitórias</h3></div>
          <p className="mt-1 text-sm text-slate-500">O que você fez nesta semana que vale reconhecer?</p>
          <textarea value={wins} onChange={(e) => setWins(e.target.value)} rows={5} className="input mt-4 resize-none" placeholder="Ex.: Entreguei algo importante, mantive meu hábito, resolvi uma pendência difícil..." />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><CalendarRange className="size-5 text-slate-500" /><h3 className="text-lg font-bold">O que ficou pendente</h3></div>
          <p className="mt-1 text-sm text-slate-500">{metrics.pendingTasks} tarefas estavam pendentes ao final da semana.</p>
          <div className="mt-4 space-y-2">
            {pendingTasks.slice(0, 5).map((task) => <div key={task.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{task.title}</div>)}
            {pendingTasks.length === 0 && <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">Nada pendente nesta semana.</p>}
          </div>
          <textarea value={pendingNotes} onChange={(e) => setPendingNotes(e.target.value)} rows={3} className="input mt-4 resize-none" placeholder="O que precisa ser carregado para a próxima semana?" />
        </div>
      </div>

      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Próxima semana</p>
        <h3 className="mt-2 text-2xl font-bold">O que eu quero priorizar na próxima semana?</h3>
        <textarea value={nextWeekPriority} onChange={(e) => setNextWeekPriority(e.target.value)} rows={3} className="mt-4 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400" placeholder="Defina uma prioridade clara para orientar suas decisões..." />
        <button onClick={() => void save()} disabled={saving} className="mt-4 flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-60"><Save className="size-4" />{saving ? "Salvando..." : "Salvar revisão"}</button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-bold text-violet-600">EVOLUÇÃO</p><h3 className="mt-1 text-2xl font-bold">Semana a semana</h3></div>
          <p className="text-sm text-slate-500">Últimas 8 semanas</p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <div className="flex min-w-[760px] items-end gap-3">
            {evolution.map((week) => {
              const gainedHeight = Math.max(8, Math.round((week.xpGained / maxEvolutionXp) * 120));
              const lostHeight = Math.max(4, Math.round((week.xpLost / maxEvolutionXp) * 120));
              return <div key={week.weekStart} className="flex flex-1 flex-col items-center">
                <div className="mb-2 text-center text-xs font-bold text-slate-500">{week.tasksCompleted} tarefas<br />{week.habitsCompleted} hábitos</div>
                <div className="flex h-32 items-end gap-1.5">
                  <div title={`${week.xpGained} XP ganhos`} className="w-5 rounded-t-md bg-emerald-400" style={{ height: gainedHeight }} />
                  <div title={`${week.xpLost} XP perdidos`} className="w-5 rounded-t-md bg-red-300" style={{ height: lostHeight }} />
                </div>
                <div className="mt-2 text-center text-[11px] font-bold text-slate-500">{formatWeek(week.weekStart).split(" — ")[0]}</div>
                <div className="mt-1 text-xs font-bold text-slate-800">{week.xpGained - week.xpLost >= 0 ? "+" : ""}{week.xpGained - week.xpLost} XP</div>
              </div>;
            })}
          </div>
        </div>

        <div className="mt-5 flex gap-4 text-xs font-semibold text-slate-500"><span><span className="mr-1 inline-block size-2 rounded-full bg-emerald-400" />XP ganho</span><span><span className="mr-1 inline-block size-2 rounded-full bg-red-300" />XP perdido</span></div>
      </div>
    </section>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-xs font-bold uppercase tracking-wider">{label}</span></div><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-xs font-semibold text-slate-400">{detail}</p></div>;
}
