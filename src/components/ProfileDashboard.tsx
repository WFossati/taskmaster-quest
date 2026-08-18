import { BookOpen, Dumbbell, Flame, Medal, Sparkles, Trophy, Zap } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { fetchProfileStats, type ProfileStats } from "@/lib/profile-data";

type Patch = {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  icon: ReactNode;
};

export function ProfileDashboard() {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchProfileStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível carregar seu perfil."))
      .finally(() => setLoading(false));
  }, []);

  const patches = useMemo<Patch[]>(() => {
    if (!stats) return [];
    return [
      {
        id: "exercise-30",
        title: "Em movimento",
        description: "30 dias com exercícios",
        target: 30,
        current: stats.exerciseDays,
        icon: <Dumbbell className="size-7" />,
      },
      {
        id: "reading-50",
        title: "Leitora consistente",
        description: "50 dias de leitura",
        target: 50,
        current: stats.readingDays,
        icon: <BookOpen className="size-7" />,
      },
      {
        id: "tasks-10",
        title: "Primeiro marco",
        description: "10 missões concluídas",
        target: 10,
        current: stats.completedTasks,
        icon: <Medal className="size-7" />,
      },
      {
        id: "tasks-100",
        title: "Execução de elite",
        description: "100 missões concluídas",
        target: 100,
        current: stats.completedTasks,
        icon: <Trophy className="size-7" />,
      },
      {
        id: "habits-100",
        title: "Constância",
        description: "100 hábitos cumpridos",
        target: 100,
        current: stats.completedHabits,
        icon: <Flame className="size-7" />,
      },
      {
        id: "xp-10000",
        title: "Evolução em ação",
        description: "10.000 XP conquistados",
        target: 10000,
        current: stats.totalXp,
        icon: <Zap className="size-7" />,
      },
    ];
  }, [stats]);

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Carregando sua evolução...</div>;
  }

  if (error || !stats) {
    return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">{error ?? "Não foi possível carregar seu perfil."}</div>;
  }

  const earned = patches.filter((patch) => patch.current >= patch.target).length;

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-sm sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-white/10"><Sparkles className="size-7" /></div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Meu perfil</p>
            <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">Buscamos a nossa melhor versão sempre!</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Seu perfil reúne os marcos que você construiu com consistência. Os patches não exigem sequência: cada dia e cada entrega contam para a evolução.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Patches conquistados</p>
            <p className="mt-1 text-4xl font-black">{earned}<span className="text-lg text-slate-500">/{patches.length}</span></p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Missões concluídas" value={stats.completedTasks} />
        <Stat label="Hábitos cumpridos" value={stats.completedHabits} />
        <Stat label="Dias com exercício" value={stats.exerciseDays} />
        <Stat label="Dias de leitura" value={stats.readingDays} />
      </div>

      <div>
        <div className="mb-5">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Conquistas</p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight">Minha coleção de patches</h3>
          <p className="mt-1 text-sm text-slate-500">Continue avançando até desbloquear cada marco.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {patches.map((patch) => <PatchCard key={patch.id} patch={patch} />)}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm sm:p-6">
        <p className="font-bold text-slate-800">Como exercício e leitura são identificados?</p>
        <p className="mt-1 leading-6">O progresso conta dias únicos de conclusão dos seus hábitos. Para exercícios, entram hábitos com nomes como Academia, Treino, Corrida, Caminhada, Pilates ou Yoga. Para leitura, entram hábitos com nomes como Leitura, Ler ou Livro.</p>
      </div>
    </section>
  );
}

function PatchCard({ patch }: { patch: Patch }) {
  const unlocked = patch.current >= patch.target;
  const progress = Math.min(100, Math.round((patch.current / patch.target) * 100));
  return (
    <div className={`rounded-3xl border p-6 shadow-sm transition ${unlocked ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50/70"}`}>
      <div className="flex items-start gap-4">
        <div className={`grid size-16 shrink-0 place-items-center rounded-full border-4 ${unlocked ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-400"}`}>
          {patch.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-slate-900">{patch.title}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{patch.description}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${unlocked ? "bg-slate-950 text-white" : "bg-slate-200 text-slate-500"}`}>{unlocked ? "Conquistado" : "Em progresso"}</span>
          </div>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-950" style={{ width: `${progress}%` }} /></div>
          <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-500"><span>{patch.current} / {patch.target}</span><span>{progress}%</span></div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></div>;
}
