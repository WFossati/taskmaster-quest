import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  Pencil,
  Plus,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { calcXp, type Project, type Task } from "@/lib/taskmaster-data";

type CalendarViewProps = {
  tasks: Task[];
  projects: Project[];
  loading: boolean;
  onNewTask: () => void;
  onEditTask: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
};

type ViewMode = "month" | "week";

type AreaStyle = {
  name: string;
  dot: string;
  chip: string;
  border: string;
};

const AREAS: Record<string, AreaStyle> = {
  fejers: { name: "FEJERS", dot: "bg-red-500", chip: "bg-red-50 text-red-700", border: "border-red-200" },
  gera: { name: "Gera", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700", border: "border-emerald-200" },
  ufrgs: { name: "UFRGS", dot: "bg-amber-400", chip: "bg-amber-50 text-amber-700", border: "border-amber-200" },
  saude: { name: "Saúde", dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700", border: "border-blue-200" },
  conhecimento: { name: "Conhecimento", dot: "bg-pink-500", chip: "bg-pink-50 text-pink-700", border: "border-pink-200" },
  financeiro: { name: "Financeiro", dot: "bg-purple-500", chip: "bg-purple-50 text-purple-700", border: "border-purple-200" },
};

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTaskDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const distanceToMonday = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + distanceToMonday);
  return copy;
}

function monthGrid(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function sameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

function formatPeriodTitle(anchor: Date, view: ViewMode) {
  if (view === "month") {
    return anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }
  const start = startOfWeek(anchor);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} de ${end.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;
  }
  return `${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
}

function taskXp(task: Task) {
  return task.xp || calcXp(task.difficulty, task.priority);
}

export function CalendarView({ tasks, projects, loading, onNewTask, onEditTask, onCompleteTask }: CalendarViewProps) {
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [areaFilter, setAreaFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const today = useMemo(() => startOfDay(new Date()), []);

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

  const datedTasks = useMemo(
    () => tasks.filter((task) => {
      if (!task.dueDate) return false;
      if (areaFilter !== "all" && task.area !== areaFilter) return false;
      if (projectFilter !== "all" && task.projectId !== projectFilter) return false;
      return true;
    }),
    [tasks, areaFilter, projectFilter],
  );

  const undatedCount = useMemo(
    () => tasks.filter((task) => !task.dueDate && task.status !== "Concluída").length,
    [tasks],
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    datedTasks.forEach((task) => {
      const current = map.get(task.dueDate) ?? [];
      current.push(task);
      map.set(task.dueDate, current);
    });
    for (const [, current] of map) {
      current.sort((a, b) => {
        if (a.status === "Concluída" && b.status !== "Concluída") return 1;
        if (b.status === "Concluída" && a.status !== "Concluída") return -1;
        const priority = { Urgente: 4, Alta: 3, Média: 2, Baixa: 1 } as Record<string, number>;
        return (priority[b.priority] ?? 0) - (priority[a.priority] ?? 0);
      });
    }
    return map;
  }, [datedTasks]);

  const visibleDates = useMemo(() => view === "month" ? monthGrid(anchor) : Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(anchor), index)), [anchor, view]);

  const visibleTasks = useMemo(() => {
    const keys = new Set(visibleDates.map(dateKey));
    return datedTasks.filter((task) => keys.has(task.dueDate));
  }, [datedTasks, visibleDates]);

  const openVisible = visibleTasks.filter((task) => task.status !== "Concluída");
  const completedVisible = visibleTasks.filter((task) => task.status === "Concluída");
  const visibleMinutes = openVisible.reduce((sum, task) => sum + (Number(task.duration) || 0), 0);
  const visibleXp = openVisible.reduce((sum, task) => sum + taskXp(task), 0);

  function movePeriod(direction: number) {
    setAnchor((current) => {
      const next = new Date(current);
      if (view === "month") next.setMonth(next.getMonth() + direction);
      else next.setDate(next.getDate() + direction * 7);
      return next;
    });
  }

  function jumpToToday() {
    setAnchor(new Date());
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-violet-600">CALENDÁRIO</p>
          <h2 className="text-3xl font-bold tracking-tight">Sua rotina no tempo</h2>
          <p className="mt-1 text-sm text-slate-500">Visualize prazos, carga da semana e o que está disputando espaço no seu dia.</p>
        </div>
        <button type="button" onClick={onNewTask} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">
          <Plus className="size-4" /> Nova missão
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={view === "month" ? "Missões no mês" : "Missões na semana"} value={String(visibleTasks.length)} helper={`${completedVisible.length} concluídas`} />
        <Metric label="Tempo planejado" value={formatMinutes(visibleMinutes)} helper="tarefas abertas" />
        <Metric label="XP disponível" value={`${visibleXp} XP`} helper="se concluir as abertas" />
        <Metric label="Sem prazo" value={String(undatedCount)} helper="missões para organizar" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => movePeriod(-1)} className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" title="Período anterior"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={jumpToToday} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Hoje</button>
            <button type="button" onClick={() => movePeriod(1)} className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" title="Próximo período"><ChevronRight className="size-5" /></button>
            <h3 className="ml-2 text-lg font-bold capitalize text-slate-900">{formatPeriodTitle(anchor, view)}</h3>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
              <option value="all">Todas as áreas</option>
              {Object.entries(AREAS).map(([id, area]) => <option key={id} value={id}>{area.name}</option>)}
            </select>
            <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
              <option value="all">Todos os projetos</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => setView("month")} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold ${view === "month" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}><LayoutGrid className="size-4" /> Mês</button>
              <button type="button" onClick={() => setView("week")} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold ${view === "week" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}><CalendarRange className="size-4" /> Semana</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid min-h-80 place-items-center p-8 text-sm font-semibold text-slate-500">Carregando calendário...</div>
        ) : view === "month" ? (
          <MonthView dates={visibleDates} anchor={anchor} today={today} tasksByDate={tasksByDate} projectMap={projectMap} onEditTask={onEditTask} />
        ) : (
          <WeekView dates={visibleDates} today={today} tasksByDate={tasksByDate} projectMap={projectMap} onEditTask={onEditTask} onCompleteTask={onCompleteTask} />
        )}
      </div>

      <div className="rounded-3xl border border-violet-100 bg-violet-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div className="flex gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-violet-600"><CalendarDays className="size-5" /></div>
          <div>
            <p className="font-bold text-slate-900">Pronto para o Google Calendar</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Esta primeira versão usa o prazo das missões. Na próxima etapa podemos sincronizar eventos reais e adicionar horário de início/fim, sem mudar a estrutura visual deste módulo.</p>
          </div>
        </div>
        <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-bold text-violet-700 sm:mt-0">Próxima evolução</span>
      </div>
    </section>
  );
}

function MonthView({ dates, anchor, today, tasksByDate, projectMap, onEditTask }: {
  dates: Date[];
  anchor: Date;
  today: Date;
  tasksByDate: Map<string, Task[]>;
  projectMap: Map<string, string>;
  onEditTask: (task: Task) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
          {WEEKDAYS.map((day) => <div key={day} className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-slate-400">{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {dates.map((date) => {
            const key = dateKey(date);
            const dayTasks = tasksByDate.get(key) ?? [];
            const isCurrentMonth = date.getMonth() === anchor.getMonth();
            const isToday = sameDay(date, today);
            return (
              <div key={key} className={`min-h-36 border-b border-r border-slate-100 p-2.5 ${!isCurrentMonth ? "bg-slate-50/50" : "bg-white"}`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className={`grid size-7 place-items-center rounded-full text-sm font-bold ${isToday ? "bg-slate-950 text-white" : isCurrentMonth ? "text-slate-700" : "text-slate-300"}`}>{date.getDate()}</span>
                  {dayTasks.length > 0 && <span className="text-[11px] font-bold text-slate-300">{dayTasks.length}</span>}
                </div>
                <div className="space-y-1.5">
                  {dayTasks.slice(0, 3).map((task) => <MonthTask key={task.id} task={task} project={projectMap.get(task.projectId)} onClick={() => onEditTask(task)} />)}
                  {dayTasks.length > 3 && <p className="px-1 text-xs font-bold text-slate-400">+ {dayTasks.length - 3} missões</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthTask({ task, project, onClick }: { task: Task; project?: string; onClick: () => void }) {
  const area = AREAS[task.area] ?? AREAS.fejers;
  const done = task.status === "Concluída";
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-lg border px-2 py-1.5 text-left transition hover:brightness-95 ${area.chip} ${area.border} ${done ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-1.5">
        <span className={`size-1.5 shrink-0 rounded-full ${area.dot}`} />
        <span className={`truncate text-xs font-bold ${done ? "line-through" : ""}`}>{task.title}</span>
      </div>
      {project && <p className="mt-0.5 truncate pl-3 text-[10px] font-semibold opacity-70">{project}</p>}
    </button>
  );
}

function WeekView({ dates, today, tasksByDate, projectMap, onEditTask, onCompleteTask }: {
  dates: Date[];
  today: Date;
  tasksByDate: Map<string, Task[]>;
  projectMap: Map<string, string>;
  onEditTask: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
}) {
  return (
    <div className="overflow-x-auto p-4 sm:p-5">
      <div className="grid min-w-[900px] grid-cols-7 gap-3">
        {dates.map((date, index) => {
          const tasks = tasksByDate.get(dateKey(date)) ?? [];
          const isToday = sameDay(date, today);
          return (
            <div key={dateKey(date)} className={`rounded-2xl border p-3 ${isToday ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white"}`}>
              <div className="mb-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{WEEKDAYS[index]}</p>
                <p className={`mx-auto mt-1 grid size-9 place-items-center rounded-full text-lg font-bold ${isToday ? "bg-slate-950 text-white" : "text-slate-800"}`}>{date.getDate()}</p>
              </div>
              <div className="space-y-2">
                {tasks.length === 0 ? <p className="py-5 text-center text-xs font-medium text-slate-300">Livre</p> : tasks.map((task) => (
                  <WeekTask key={task.id} task={task} project={projectMap.get(task.projectId)} onEdit={() => onEditTask(task)} onComplete={() => onCompleteTask(task)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekTask({ task, project, onEdit, onComplete }: { task: Task; project?: string; onEdit: () => void; onComplete: () => void }) {
  const area = AREAS[task.area] ?? AREAS.fejers;
  const done = task.status === "Concluída";
  return (
    <div className={`rounded-xl border p-2.5 ${area.border} ${done ? "bg-slate-50 opacity-60" : "bg-white"}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-1 size-2 shrink-0 rounded-full ${area.dot}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold leading-4 text-slate-800 ${done ? "line-through" : ""}`}>{task.title}</p>
          {project && <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">{project}</p>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold text-slate-400">
        <span className="rounded-md bg-slate-50 px-1.5 py-1"><Clock3 className="mr-1 inline size-3" />{Number(task.duration) || 0}m</span>
        <span className="rounded-md bg-slate-50 px-1.5 py-1"><Zap className="mr-1 inline size-3" />{taskXp(task)}</span>
      </div>
      <div className="mt-2 flex gap-1">
        <button type="button" onClick={onEdit} className="grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800" title="Editar"><Pencil className="size-3.5" /></button>
        {!done && <button type="button" onClick={onComplete} className="grid size-7 place-items-center rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50" title="Concluir"><Check className="size-3.5" /></button>}
      </div>
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function formatMinutes(total: number) {
  if (!total) return "0 min";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}
