import { Coins, Gift, Plus, ShoppingBag, Sparkles, Trash2, Trophy, Zap } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  convertXpToCoins,
  createReward,
  deleteReward,
  fetchRewardsPage,
  purchaseReward,
  type Reward,
  type RewardTransaction,
  type WalletSummary,
} from "@/lib/rewards-data";

const EMPTY_SUMMARY: WalletSummary = { totalEarnedXp: 0, convertedXp: 0, availableXp: 0, coinBalance: 0 };

export function RewardsDashboard({ userId }: { userId: string }) {
  const [summary, setSummary] = useState<WalletSummary>(EMPTY_SUMMARY);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [coinsToConvert, setCoinsToConvert] = useState(1);
  const [title, setTitle] = useState("");
  const [coinCost, setCoinCost] = useState(5);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchRewardsPage();
      setSummary(data.summary);
      setRewards(data.rewards);
      setTransactions(data.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar recompensas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload, userId]);

  const xpNeeded = coinsToConvert * 1000;
  const maxConvertibleCoins = Math.floor(summary.availableXp / 1000);
  const canConvert = coinsToConvert > 0 && xpNeeded <= summary.availableXp;
  const nextReward = useMemo(() => [...rewards].filter((reward) => reward.coinCost > summary.coinBalance).sort((a, b) => a.coinCost - b.coinCost)[0] ?? null, [rewards, summary.coinBalance]);

  async function run(action: () => Promise<void>, message: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await action();
      await reload();
      setFeedback(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean || coinCost <= 0) return;
    await run(() => createReward(userId, clean, coinCost), "Recompensa adicionada à loja!");
    setTitle("");
    setCoinCost(5);
  }

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-sm">Abrindo sua loja de recompensas...</div>;

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">Recompensas</p><h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Sua loja pessoal</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Transforme o XP das missões concluídas em moedas e use suas moedas para comprar recompensas reais.</p></div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">1.000 XP = 1 moeda</div>
      </div>

      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
      {feedback && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{feedback}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Zap className="size-5" />} label="XP conquistado" value={`${summary.totalEarnedXp.toLocaleString("pt-BR")} XP`} helper="XP histórico concluído" />
        <Metric icon={<Sparkles className="size-5" />} label="XP disponível" value={`${summary.availableXp.toLocaleString("pt-BR")} XP`} helper={`${summary.convertedXp.toLocaleString("pt-BR")} XP já convertidos`} />
        <Metric icon={<Coins className="size-5" />} label="Suas moedas" value={`${summary.coinBalance} 🪙`} helper="Saldo disponível para compras" />
        <Metric icon={<Trophy className="size-5" />} label="Pode converter" value={`${maxConvertibleCoins} 🪙`} helper="Com seu XP disponível agora" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-200 sm:p-7">
          <div className="flex items-center gap-2 text-sm font-bold text-violet-300"><Coins className="size-5" /> Trocar XP por moedas</div>
          <h3 className="mt-4 text-2xl font-bold">Quanto você quer converter?</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Seu XP histórico continua registrado. Aqui usamos apenas o XP disponível para gerar moedas gastáveis.</p>
          <div className="mt-6 flex items-center gap-3">
            <button type="button" onClick={() => setCoinsToConvert((current) => Math.max(1, current - 1))} className="grid size-11 place-items-center rounded-xl border border-white/15 bg-white/5 text-lg font-bold hover:bg-white/10">−</button>
            <input type="number" min="1" step="1" value={coinsToConvert} onChange={(e) => setCoinsToConvert(Math.max(1, Number(e.target.value) || 1))} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center text-xl font-bold text-white outline-none" />
            <button type="button" onClick={() => setCoinsToConvert((current) => current + 1)} className="grid size-11 place-items-center rounded-xl border border-white/15 bg-white/5 text-lg font-bold hover:bg-white/10">+</button>
          </div>
          <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-300">Você recebe</span><strong>{coinsToConvert} moedas</strong></div><div className="mt-2 flex justify-between gap-3"><span className="text-slate-300">Custo</span><strong>{xpNeeded.toLocaleString("pt-BR")} XP</strong></div></div>
          <button type="button" disabled={!canConvert || busy} onClick={() => void run(() => convertXpToCoins(coinsToConvert), `${coinsToConvert} moeda${coinsToConvert === 1 ? "" : "s"} adicionada${coinsToConvert === 1 ? "" : "s"} ao seu saldo!`)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><Coins className="size-4" /> Converter XP</button>
          {!canConvert && <p className="mt-3 text-center text-xs font-semibold text-slate-400">Você precisa de {xpNeeded.toLocaleString("pt-BR")} XP disponíveis para esta troca.</p>}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-center gap-2 text-sm font-bold"><Plus className="size-5 text-violet-600" /> Cadastrar recompensa</div>
          <p className="mt-1 text-sm text-slate-500">Crie itens que você poderá comprar com as moedas conquistadas.</p>
          <form onSubmit={handleCreate} className="mt-6 space-y-4">
            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Título</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Ex.: McDonald’s" required /></label>
            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Preço em moedas</span><div className="relative"><Coins className="absolute left-3 top-3 size-4 text-amber-500" /><input type="number" min="1" step="1" value={coinCost} onChange={(e) => setCoinCost(Math.max(1, Number(e.target.value) || 1))} className="input pl-10" required /></div></label>
            <button type="submit" disabled={busy || !title.trim()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50"><Gift className="size-4" /> Adicionar à loja</button>
          </form>
          {nextReward && <div className="mt-6 rounded-2xl bg-violet-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Próxima recompensa</p><div className="mt-2 flex items-center justify-between gap-3"><span className="font-bold text-slate-900">{nextReward.title}</span><span className="font-bold text-violet-700">{nextReward.coinCost} 🪙</span></div><p className="mt-2 text-xs font-semibold text-slate-500">Faltam {Math.max(nextReward.coinCost - summary.coinBalance, 0)} moedas.</p></div>}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-4"><div><div className="flex items-center gap-2 font-bold"><ShoppingBag className="size-5 text-violet-600" /> Loja</div><p className="mt-1 text-sm text-slate-500">Suas recompensas cadastradas.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{rewards.length} itens</span></div>
        {rewards.length === 0 ? <div className="mt-5 rounded-2xl bg-slate-50 px-5 py-10 text-center"><Gift className="mx-auto size-8 text-slate-300" /><p className="mt-3 font-bold text-slate-700">Sua loja ainda está vazia</p><p className="mt-1 text-sm text-slate-500">Cadastre sua primeira recompensa acima.</p></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rewards.map((reward) => { const canBuy = summary.coinBalance >= reward.coinCost; return <div key={reward.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex items-start justify-between gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-600"><Gift className="size-5" /></div><button type="button" disabled={busy} onClick={() => { if (window.confirm(`Excluir a recompensa “${reward.title}”?`)) void run(() => deleteReward(reward.id), "Recompensa excluída."); }} className="grid size-8 place-items-center rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="size-4" /></button></div><h3 className="mt-4 text-lg font-bold text-slate-900">{reward.title}</h3><p className="mt-2 text-2xl font-bold text-amber-600">{reward.coinCost} 🪙</p><button type="button" disabled={!canBuy || busy} onClick={() => void run(() => purchaseReward(reward.id), `Você comprou: ${reward.title}! 🎉`)} className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-bold ${canBuy ? "bg-slate-950 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-400"}`}>{canBuy ? "Comprar recompensa" : `Faltam ${reward.coinCost - summary.coinBalance} moedas`}</button></div>; })}</div>}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-center gap-2 font-bold"><Sparkles className="size-5 text-violet-600" /> Histórico</div><p className="mt-1 text-sm text-slate-500">Conversões e recompensas compradas recentemente.</p>
        <div className="mt-5 space-y-3">{transactions.length === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">Nenhuma movimentação ainda.</p> : transactions.map((transaction) => <div key={transaction.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 px-4 py-3"><div className={`grid size-10 shrink-0 place-items-center rounded-2xl ${transaction.type === "xp_conversion" ? "bg-violet-50 text-violet-600" : "bg-amber-50 text-amber-600"}`}>{transaction.type === "xp_conversion" ? <Coins className="size-5" /> : <Gift className="size-5" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{transaction.type === "xp_conversion" ? `Conversão de ${transaction.xpAmount.toLocaleString("pt-BR")} XP` : transaction.rewardTitle || "Recompensa comprada"}</p><p className="mt-1 text-xs font-semibold text-slate-400">{new Date(transaction.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p></div><span className={`shrink-0 text-sm font-bold ${transaction.coinAmount > 0 ? "text-emerald-600" : "text-amber-600"}`}>{transaction.coinAmount > 0 ? "+" : ""}{transaction.coinAmount} 🪙</span></div>)}</div>
      </div>
    </section>
  );
}

function Metric({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">{icon}</div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-2 text-xs font-semibold text-slate-400">{helper}</p></div>;
}
