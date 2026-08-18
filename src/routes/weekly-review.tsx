import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { AuthScreen } from "@/components/AuthScreen";
import { WeeklyReviewDashboard } from "@/components/WeeklyReviewDashboard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/weekly-review")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vamo Dale!!" },
      { name: "description", content: "Acompanhe sua semana, evolução, hábitos, execução e prioridades em um único dashboard." },
    ],
  }),
  component: WeeklyReviewPage,
});

function WeeklyReviewPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setAuthReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!authReady) return <main className="grid min-h-screen place-items-center bg-[#f7f8fb] text-sm font-semibold text-slate-500">Carregando...</main>;
  if (!userId) return <AuthScreen />;

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-white"><Sparkles className="size-5" /></div>
            <div><p className="text-sm font-medium text-slate-500">Vamo Dale!!</p><h1 className="font-bold">Dashboard</h1></div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft className="size-4" /><span className="hidden sm:inline">Voltar</span></Link>
            <button type="button" title="Sair" onClick={() => void supabase.auth.signOut()} className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"><LogOut className="size-4" /></button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8"><WeeklyReviewDashboard userId={userId} /></div>
    </main>
  );
}
