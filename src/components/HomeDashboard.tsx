import {
  AlertTriangle,
  ArrowRight,
  Bolt,
  CalendarDays,
  Check,
  Clock3,
  Flame,
  Gauge,
  Plus,
  Repeat2,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  fetchHabits,
  toggleHabitCompletion,
  type Habit,
} from "@/lib/habits-data";
import { calcXp, type Project, type Task } from "@/lib/taskmaster-data";

type LifeArea = {
  id: string;
  name: string;
  dot: string;
  soft: string;
  text: string;
  bar: string;
};

const AREAS: LifeArea[] = [
  { id: "fejers", name: "FEJERS", dot: "bg-red-500", soft: "bg-red-50", text: "text-red-700", bar: "bg-red-500" },
  { id: "gera", name: "Gera", dot: "bg-emerald-500", soft: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" },
  { id: "ufrgs", name: "UFRGS", dot: "bg-amber-400", soft: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-400" },
  { id: "saude", name: "Saúde", dot: "bg-blue-500", soft: "bg-blue-50", text: "text-blue-700", bar: "bg-blue-500" },
  { id: "conhecimento", name: "Conhecimento", dot: "bg-pink-500", soft: "bg-pink-50", text: "text-pink-700", bar: "bg-pink-500" },
  { id: "financeiro", name: "Financeiro", dot: "bg-purple-500", soft: "bg-purple-50", text: "text-purple-700", bar: "bg-purple-500" },
];

const priorityWeight: Record<string, number> = { Baixa: 1, Média: 2, Alta: 4, Urgente: 7 };
const difficultyWeight: Record<string, number> = { "Muito fácil": 0, Fácil: 1, Média: 2, Difícil: 3, Boss: 5 };

function dateOnly(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function localIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDue(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function isSameDay(a: Date, b: Date) {
  return dateOnly(a).getTime() === dateOnly(b).getTime();
}

function taskXp(task: Task) {
  return task.xp || calcXp(task.difficulty, task.priority);
}

function priorityScore(task: Task, today: Date) {
  let score = (priorityWeight[task.priority] ?? 2) * 10 + (difficultyWeight[task.difficulty] ?? 2) * 2;
  const due = parseDue(task.dueDate);
  if (!due) return score;
  const diffDays = Math.round((dateOnly(due).getTime() - dateOnly(today).getTime()) / 86400000);
  if (diffDays < 0) score += 100 + Math.min(Math.abs(diffDays) * 5, 30);
  else if (diffDays === 0) score += 70;
  else if (diffDays === 1) score += 35;
  else if (diffDays <= 3) score += 15;
  return score;
}

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatLongDate(now: Date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(now);
}

function startOfWeek(date: Date) {
  const copy = dateOnly(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  return copy;
}

function habitIsDueToday(habit: Habit, today: Date) {
  if (!habit.isActive) return false;
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "custom") return habit.weekdays.includes(today.getDay());

  const weekStart = startOfWeek(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const completionsThisWeek = habit.completions.filter((completion) => {
    const date = new Date(`${completion.completedOn}T00:00:00`);
    return date >= weekStart && date < weekEnd;
  }).length;
  return completionsThisWeek < habit.targetPerWeek;
}

export function HomeDashboard({
  userId,
  tasks,
  projects,
  loading,
  onNewTask,
  onOpenTasks,
  onOpenHabits,
  onEditTask,
  onCompleteTask,
}: {
  userId: string;
  tasks: Task[];
  projects: Project[];
  loading: boolean;
  onNewTask: () => void;
  onOpenTasks: () => void;
  onOpenHabits: () => void;
  onEditTask: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
}) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(true);
  const [habitSavingId, setHabitSavingId] = useState<string | null>(null);

  async function reloadHabits() {
    setHabitsLoading(true);
    try {
      setHabits(await fetchHabits());
    } finally {
      setHabitsLoading(false);
    }
  }

  useEffect(() => {
    void reloadHabits();
  }, [userId]);

  const now = new Date();
  const today = dateOnly(now);
  const todayKey = localIso(today);
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const openTasks = tasks.filter((task) => task.status !== "Concluída");
  const todayTasks = openTasks.filter((task) => {
    const due = parseDue(task.dueDate);
    return due ? isSameDay(due, today) : false;
  });
  const overdueTasks = openTasks
    .filter((task) => {
      const due = parseDue(task.dueDate);
      return due ? dateOnly(due) < today : false;
    })
    .sort((a, b) => priorityScore(b, today) - priorityScore(a, today));
  const quickTasks = openTasks
    .filter((task) => Number(task.duration || 0) > 0 && Number(task.duration) <= 15)
    .sort((a, b) => priorityScore(b, today) - priorityScore(a, today))
    .slice(0, 4);

  const ranked = [...openTasks].sort((a, b) => priorityScore(b, today) - priorityScore(a, today));
  const mainTask = ranked[0] ?? null;
  const priorities = ranked.slice(0, 3);

  const completedToday = tasks.filter((task) => {
    if (task.status !== "Concluída" || !task.completedAt) return false;
    return isSameDay(new Date(task.completedAt), today);
  });

  const habitsToday = useMemo(
    () => habits.filter((habit) => habitIsDueToday(habit, today)),
    [habits, todayKey],
  );
  const completedHabitsToday = habitsToday.filter((habit) => habit.completions.some((c) => c.completedOn === todayKey));
  const pendingHabitsToday = habitsToday.filter((habit) => !habit.completions.some((c) => c.completedOn === todayKey));

  const taskXpToday = completedToday.reduce((sum, task) => sum + taskXp(task), 0);
  const habitXpToday = completedHabitsToday.reduce((sum, habit) => sum + habit.xpReward, 0);
  const xpToday = taskXpToday + habitXpToday;
  const availableXpToday = todayTasks.reduce((sum, task) => sum + taskXp(task), 0) + pendingHabitsToday.reduce((sum, habit) => sum + habit.xpReward, 0);
  const minutesToday = todayTasks.reduce((sum, task) => sum + Number(task.duration || 0), 0);
  const totalDayItems = todayTasks.length + completedToday.length + habitsToday.length;
  const completedDayItems = completedToday.length + completedHabitsToday.length;
  const progress = totalDayItems === 0 ? 0 : Math.round((completedDayItems / totalDayItems) * 100);

  const weeklyTasks = tasks.filter((task) => {
    const date = task.completedAt ? new Date(task.completedAt) : parseDue(task.dueDate);
    return date ? date >= weekStart && date <= weekEnd : false;
  });
  const areaCounts = AREAS.map((area) => ({
    ...area,
    count: weeklyTasks.filter((task) => task.area === area.id).length + habits.filter((habit) => habit.area === area.id && habit.completions.some((c) => {
      const d = new Date(`${c.completedOn}T00:00:00`);
      return d >= weekStart && d <= weekEnd;
    })).length,
  }));
  const weeklyTotal = Math.max(areaCounts.reduce((sum, area) => sum + area.count, 0), 1);

  async function toggleHabit(habit: Habit) {
    setHabitSavingId(habit.id);
    try {
      await toggleHabitCompletion(userId, habit, todayKey);
      await reloadHabits();
    } finally {
      setHabitSavingId(null);
    }
  }

  if (loading || habitsLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-sm">
        Preparando seu painel de hoje...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">Painel de hoje</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{greeting(now)} 👋</h2>
          <p className="mt-2 capitalize text-slate-500">{formatLongDate(now)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onOpenHabits} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
            <Repeat2 className="size-4" /> Criar hábito
          </button>
          <button onClick={onNewTask} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800">
            <Plus className="size-4" /> Nova missão
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<CalendarDays className="size-5" />} label="Missões hoje" value={String(todayTasks.length + habitsToday.length)} helper={`${completedDayItems} concluídas hoje`} />
        <MetricCard icon={<AlertTriangle className="size-5" />} label="Atrasadas" value={String(overdueTasks.length)} helper={overdueTasks.length ? "Precisam de atenção" : "Tudo em dia ✨"} tone={overdueTasks.length ? "danger" : "neutral"} />
        <MetricCard icon={<Zap className="size-5" />} label="XP disponível" value={`${availableXpToday} XP`} helper={`+${xpToday} XP conquistados hoje`} />
        <MetricCard icon={<Repeat2 className="size-5" />} label="Hábitos hoje" value={`${completedHabitsToday.length}/${habitsToday.length}`} helper={habitsToday.length ? "Check-ins do dia" : "Nenhum hábito programado"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.45fr_0.75fr]">
        <div className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-200 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-300"><Target className="size-4" /> Missão principal</div>
            {mainTask && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">+{taskXp(mainTask)} XP</span>}
          </div>
          {mainTask ? (
            <>
              <h3 className="mt-6 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">{mainTask.title}</h3>
              {mainTask.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{mainTask.description}</p>}
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-white/10 px-3 py-2">{areaName(mainTask.area)}</span>
                {mainTask.projectId && <span className="rounded-full bg-white/10 px-3 py-2">{projects.find((p) => p.id === mainTask.projectId)?.name ?? "Projeto"}</span>}
                <span className="rounded-full bg-white/10 px-3 py-2">{mainTask.priority}</span>
                <span className="rounded-full bg-white/10 px-3 py-2">{mainTask.difficulty}</span>
                <span className="rounded-full bg-white/10 px-3 py-2"><Clock3 className="mr-1 inline size-3.5" />{mainTask.duration || 0} min</span>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={() => onEditTask(mainTask)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100">Abrir missão <ArrowRight className="size-4" /></button>
                <button onClick={() => onCompleteTask(mainTask)} className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"><Check className="size-4" /> Concluir</button>
              </div>
            </>
          ) : (
            <div className="py-10">
              <Sparkles className="mb-4 size-8 text-violet-300" />
              <h3 className="text-2xl font-bold">Seu radar está limpo.</h3>
              <p className="mt-2 text-sm text-slate-300">Crie uma nova missão para começar sua próxima quest.</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold"><Gauge className="size-5 text-violet-600" /> Progresso de hoje</div>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div><p className="text-4xl font-bold tracking-tight">{progress}%</p><p className="mt-1 text-sm text-slate-500">{completedDayItems} de {totalDayItems} missões concluídas</p></div>
            <div className="rounded-2xl bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700">+{xpToday} XP</div>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-950 transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="mt-4 text-xs font-semibold text-slate-400">Ainda disponíveis hoje: +{availableXpToday} XP</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><p className="text-sm font-bold text-slate-900">Hábitos de hoje</p><p className="mt-1 text-sm text-slate-500">Aparecem como missões diárias. Marque quando concluir.</p></div>
          <button onClick={onOpenHabits} className="text-sm font-bold text-violet-600">Gerenciar hábitos</button>
        </div>
        <div className="mt-5 space-y-3">
          {habitsToday.length ? habitsToday.map((habit) => {
            const completed = habit.completions.some((c) => c.completedOn === todayKey);
            const area = AREAS.find((a) => a.id === habit.area) ?? AREAS[0]!;
            return (
              <div key={habit.id} className={`flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition ${completed ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
                <button
                  onClick={() => void toggleHabit(habit)}
                  disabled={habitSavingId === habit.id}
                  className={`grid size-8 shrink-0 place-items-center rounded-full border-2 transition disabled:opacity-50 ${completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500"}`}
                  title={completed ? "Desmarcar hábito" : "Concluir hábito"}
                >
                  <Check className="size-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-bold ${completed ? "text-slate-400 line-through" : "text-slate-900"}`}>{habit.name}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${area.soft} ${area.text}`}>{area.name}</span>
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">Hábito</span>
                  </div>
                  {habit.description && <p className="mt-1 line-clamp-1 text-sm text-slate-500">{habit.description}</p>}
                  <p className="mt-2 text-xs font-semibold text-slate-500">{habit.frequency === "daily" ? "Todos os dias" : habit.frequency === "weekly" ? `${habit.targetPerWeek}x por semana` : "Dias específicos"}</p>
                </div>
                <span className={`shrink-0 text-sm font-bold ${completed ? "text-emerald-600" : "text-violet-600"}`}>{completed ? `+${habit.xpReward} XP ✓` : `+${habit.xpReward} XP`}</span>
              </div>
            );
          }) : (
            <div className="rounded-2xl bg-slate-50 px-5 py-8 text-center">
              <Repeat2 className="mx-auto mb-3 size-7 text-slate-300" />
              <p className="font-bold text-slate-700">Nenhum hábito para hoje</p>
              <p className="mt-1 text-sm text-slate-500">Crie um hábito e ele aparecerá aqui automaticamente nos dias programados.</p>
              <button onClick={onOpenHabits} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Criar meu primeiro hábito</button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><p className="text-sm font-bold text-slate-900">Seu foco de hoje</p><p className="mt-1 text-sm text-slate-500">As 3 tarefas que mais merecem sua atenção agora.</p></div>
          <button onClick={onOpenTasks} className="text-sm font-bold text-violet-600">Ver todas as tarefas</button>
        </div>
        <div className="mt-5 space-y-3">
          {priorities.length ? priorities.map((task, index) => (
            <button key={task.id} onClick={() => onEditTask(task)} className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 px-4 py-3.5 text-left transition hover:bg-slate-50">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white">{index + 1}</span>
              <div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-900">{task.title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{areaName(task.area)} · {task.priority}{task.dueDate ? ` · ${dueLabel(task.dueDate, today)}` : ""}</p></div>
              <span className="shrink-0 text-sm font-bold text-violet-600">+{taskXp(task)} XP</span>
            </button>
          )) : <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">Nenhuma tarefa em aberto.</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title="Precisa de atenção" icon={<AlertTriangle className="size-5 text-red-500" />} helper="Missões atrasadas">
          {overdueTasks.length ? <div className="space-y-3">{overdueTasks.slice(0, 4).map((task) => <CompactTask key={task.id} task={task} accent="danger" onClick={() => onEditTask(task)} />)}</div> : <EmptyState icon={<Trophy className="size-6" />} title="Tudo em dia ✨" text="Nenhuma missão atrasada por enquanto." />}
        </DashboardCard>

        <DashboardCard title="Missões rápidas" icon={<Bolt className="size-5 text-amber-500" />} helper="Até 15 minutos">
          {quickTasks.length ? <div className="space-y-3">{quickTasks.map((task) => <CompactTask key={task.id} task={task} accent="quick" onClick={() => onEditTask(task)} />)}</div> : <EmptyState icon={<TimerReset className="size-6" />} title="Sem missões rápidas" text="Tarefas de até 15 minutos aparecem aqui." />}
        </DashboardCard>
      </div>

      <DashboardCard title="Seu foco esta semana" icon={<Flame className="size-5 text-violet-600" />} helper="Distribuição das missões e hábitos por área da vida">
        <div className="space-y-4">
          {areaCounts.map((area) => {
            const percentage = Math.round((area.count / weeklyTotal) * 100);
            return <div key={area.id}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 font-semibold text-slate-700"><span className={`size-2.5 rounded-full ${area.dot}`} />{area.name}</span><span className="font-bold text-slate-500">{percentage}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${area.bar}`} style={{ width: `${percentage}%` }} /></div></div>;
          })}
        </div>
      </DashboardCard>
    </section>
  );
}

function MetricCard({ icon, label, value, helper, tone = "neutral" }: { icon: React.ReactNode; label: string; value: string; helper: string; tone?: "neutral" | "danger" }) {
  return <div className={`rounded-3xl border p-5 shadow-sm ${tone === "danger" ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-white"}`}><div className={`mb-4 grid size-10 place-items-center rounded-2xl ${tone === "danger" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-700"}`}>{icon}</div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className={`mt-2 text-xs font-semibold ${tone === "danger" ? "text-red-600" : "text-slate-400"}`}>{helper}</p></div>;
}

function DashboardCard({ title, icon, helper, children }: { title: string; icon: React.ReactNode; helper: string; children: React.ReactNode }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="mb-5 flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 font-bold text-slate-900">{icon}{title}</div><p className="mt-1 text-sm text-slate-500">{helper}</p></div></div>{children}</div>;
}

function CompactTask({ task, accent, onClick }: { task: Task; accent: "danger" | "quick"; onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50"><span className={`size-2.5 shrink-0 rounded-full ${accent === "danger" ? "bg-red-500" : "bg-amber-400"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{task.title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{accent === "danger" ? dueLabel(task.dueDate, dateOnly(new Date())) : `${task.duration} min`} · {areaName(task.area)}</p></div><span className="text-xs font-bold text-violet-600">+{taskXp(task)} XP</span></button>;
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl bg-slate-50 px-5 py-8 text-center text-slate-400"><div className="mx-auto mb-3 grid size-10 place-items-center rounded-2xl bg-white shadow-sm">{icon}</div><p className="font-bold text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-500">{text}</p></div>;
}

function areaName(areaId: string) {
  return AREAS.find((area) => area.id === areaId)?.name ?? "Área";
}

function dueLabel(value: string, today: Date) {
  const due = parseDue(value);
  if (!due) return "Sem prazo";
  const diff = Math.round((dateOnly(due).getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `Atrasada há ${Math.abs(diff)} dia${Math.abs(diff) === 1 ? "" : "s"}`;
  if (diff === 0) return "Prazo hoje";
  if (diff === 1) return "Prazo amanhã";
  return `Prazo em ${diff} dias`;
}
