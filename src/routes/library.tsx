import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { AuthScreen } from "@/components/AuthScreen";
import { LibraryDashboard } from "@/components/LibraryDashboard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Biblioteca — Vamo Dale!!" },
      { name: "description", content: "Acompanhe livros, páginas lidas, progresso e categorias da sua biblioteca." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <main className="grid min-h-screen place-items-center bg-[#f7f8fb] text-sm font-semibold text-slate-500">Carregando...</main>;
  if (!userId) return <AuthScreen />;

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div><p className="text-sm font-medium text-slate-500">Vamo Dale!!</p><h1 className="font-bold">Minha biblioteca</h1></div>
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft className="size-4" /> Início</Link>
            <button onClick={() => void supabase.auth.signOut()} className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><LogOut className="size-4" /></button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8"><LibraryDashboard userId={userId} /></div>
    </main>
  );
}
