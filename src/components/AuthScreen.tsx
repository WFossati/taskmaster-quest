import { Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage("Conta criada! Confirme o e-mail que enviamos para entrar.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8fb] px-5 text-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-white">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">TaskMaster Quest</p>
            <h1 className="font-bold">Sistema pessoal de missões</h1>
          </div>
        </div>

        <p className="mb-1 text-sm font-bold text-violet-600">
          {mode === "login" ? "ENTRAR" : "CRIAR CONTA"}
        </p>
        <h2 className="mb-6 text-2xl font-bold">
          {mode === "login" ? "Bem-vindo de volta" : "Comece sua jornada"}
        </h2>

        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full rounded-xl border border-slate-200 px-3 py-2.5"
              placeholder="voce@email.com"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Senha</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full rounded-xl border border-slate-200 px-3 py-2.5"
              placeholder="Mínimo de 6 caracteres"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 font-bold text-white disabled:opacity-60"
          >
            {loading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setMessage(null);
          }}
          className="mt-4 w-full text-sm font-semibold text-violet-600"
        >
          {mode === "login" ? "Não tenho conta — criar agora" : "Já tenho conta — entrar"}
        </button>
      </div>
    </main>
  );
}
