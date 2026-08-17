import { Banknote, Edit3, Landmark, PiggyBank, Plus, Target, Trash2, TrendingUp, WalletCards, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createInvestment,
  deleteInvestment,
  fetchInvestments,
  updateInvestment,
  type Investment,
  type InvestmentInput,
} from "@/lib/investments-data";

const GOAL = 50000;
const emptyForm: InvestmentInput = {
  name: "",
  assetType: "Renda fixa",
  institution: "",
  investedValue: 0,
  earnings: 0,
  notes: "",
};

const assetTypes = ["Renda fixa", "Ações", "ETF", "FII", "Criptomoeda", "Previdência", "Caixa", "Outro"];

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function InvestmentsDashboard({ userId }: { userId: string }) {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InvestmentInput>(emptyForm);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      setInvestments(await fetchInvestments());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [userId]);

  const invested = useMemo(() => investments.reduce((sum, item) => sum + item.investedValue, 0), [investments]);
  const earnings = useMemo(() => investments.reduce((sum, item) => sum + item.earnings, 0), [investments]);
  const currentValue = invested + earnings;
  const progress = Math.max(0, Math.min(100, (currentValue / GOAL) * 100));
  const remaining = Math.max(0, GOAL - currentValue);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(item: Investment) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      assetType: item.assetType,
      institution: item.institution,
      investedValue: item.investedValue,
      earnings: item.earnings,
      notes: item.notes,
    });
    setShowForm(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.institution.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        institution: form.institution.trim(),
        notes: form.notes.trim(),
      };
      if (editingId) await updateInvestment(userId, editingId, payload);
      else await createInvestment(userId, payload);
      await reload();
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setFeedback(editingId ? "Investimento atualizado." : "Investimento adicionado.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível salvar o investimento.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Investment) {
    if (!window.confirm(`Excluir “${item.name}”?`)) return;
    await deleteInvestment(item.id);
    await reload();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-600">Meus investimentos</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Rumo aos primeiros R$ 50 mil.</h2>
          <p className="mt-2 text-sm text-slate-500">Registre o que você já tem e acompanhe seu patrimônio sem complicação.</p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white"><Plus className="size-4" /> Adicionar investimento</button>
      </div>

      {feedback && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{feedback}</div>}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500"><Target className="size-4" /> META DE PATRIMÔNIO</div>
            <div className="mt-3 flex flex-wrap items-baseline gap-2"><span className="text-4xl font-black tracking-tight">{money(currentValue)}</span><span className="text-lg font-bold text-slate-400">/ {money(GOAL)}</span></div>
            <p className="mt-2 text-sm font-semibold text-slate-500">{remaining > 0 ? `Faltam ${money(remaining)} para chegar aos R$ 50 mil.` : "Meta alcançada! 🎉"}</p>
          </div>
          <div className="text-left sm:text-right"><p className="text-3xl font-black">{progress.toFixed(1)}%</p><p className="text-xs font-bold uppercase tracking-wider text-slate-400">da meta</p></div>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-950 transition-all" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary icon={<PiggyBank className="size-5" />} label="Valor investido" value={money(invested)} />
        <Summary icon={<TrendingUp className="size-5" />} label="Rendimentos" value={money(earnings)} tone={earnings < 0 ? "negative" : "positive"} />
        <Summary icon={<WalletCards className="size-5" />} label="Patrimônio atual" value={money(currentValue)} />
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-emerald-600">{editingId ? "EDITAR INVESTIMENTO" : "NOVO INVESTIMENTO"}</p><h3 className="mt-1 text-xl font-bold">{editingId ? "Atualize os valores" : "Adicione um card à sua carteira"}</h3></div><button type="button" onClick={() => setShowForm(false)}><X className="size-5 text-slate-400" /></button></div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Nome do investimento"><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Tesouro Selic" /></Field>
            <Field label="Tipo de ativo"><select className="input" value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value })}>{assetTypes.map((type) => <option key={type}>{type}</option>)}</select></Field>
            <Field label="Banco / corretora"><input required className="input" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="Ex.: Nubank" /></Field>
            <Field label="Valor investido"><input type="number" min="0" step="0.01" className="input" value={form.investedValue} onChange={(e) => setForm({ ...form, investedValue: Number(e.target.value) || 0 })} /></Field>
            <Field label="Rendimentos"><input type="number" step="0.01" className="input" value={form.earnings} onChange={(e) => setForm({ ...form, earnings: Number(e.target.value) || 0 })} /><span className="mt-1.5 block text-xs text-slate-400">Pode ser negativo caso o investimento esteja abaixo do valor aplicado.</span></Field>
            <Field label="Valor atual"><div className="input flex items-center bg-slate-50 font-bold text-slate-700">{money(form.investedValue + form.earnings)}</div></Field>
            <label className="md:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-700">Observação</span><textarea className="input resize-none" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opcional" /></label>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">Cancelar</button><button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar investimento"}</button></div>
        </form>
      )}

      <div>
        <div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Carteira</p><h3 className="mt-1 text-2xl font-bold">Seus investimentos</h3></div><span className="text-sm font-semibold text-slate-400">{investments.length} {investments.length === 1 ? "card" : "cards"}</span></div>
        {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Carregando investimentos...</div> : investments.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><Banknote className="mx-auto size-10 text-slate-300" /><h4 className="mt-3 font-bold">Nenhum investimento cadastrado</h4><p className="mt-1 text-sm text-slate-500">Adicione o primeiro para começar a acompanhar sua meta.</p><button onClick={openCreate} className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Adicionar investimento</button></div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{investments.map((item) => <InvestmentCard key={item.id} item={item} onEdit={() => openEdit(item)} onDelete={() => void remove(item)} />)}</div>}
      </div>
    </section>
  );
}

function InvestmentCard({ item, onEdit, onDelete }: { item: Investment; onEdit: () => void; onDelete: () => void }) {
  const current = item.investedValue + item.earnings;
  const rate = item.investedValue > 0 ? (item.earnings / item.investedValue) * 100 : 0;
  return <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{item.assetType}</span><h4 className="mt-3 text-xl font-bold">{item.name}</h4><p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500"><Landmark className="size-4" /> {item.institution}</p></div><div className="flex gap-1"><button onClick={onEdit} title="Editar" className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500"><Edit3 className="size-4" /></button><button onClick={onDelete} title="Excluir" className="grid size-9 place-items-center rounded-xl border border-red-100 text-red-500"><Trash2 className="size-4" /></button></div></div>
    <div className="mt-6 space-y-3 text-sm"><Row label="Valor investido" value={money(item.investedValue)} /><Row label="Rendimentos" value={`${item.earnings >= 0 ? "+" : ""}${money(item.earnings)}`} valueClass={item.earnings >= 0 ? "text-emerald-600" : "text-red-600"} /><Row label="Rentabilidade" value={`${rate >= 0 ? "+" : ""}${rate.toFixed(1)}%`} valueClass={rate >= 0 ? "text-emerald-600" : "text-red-600"} /></div>
    <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Valor atual</p><p className="mt-1 text-2xl font-black">{money(current)}</p></div>
    {item.notes && <p className="mt-4 text-sm text-slate-500">{item.notes}</p>}
  </article>;
}

function Summary({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "positive" | "negative" }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-xs font-bold uppercase tracking-wider">{label}</span></div><p className={`mt-3 text-2xl font-black ${tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-slate-950"}`}>{value}</p></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>{children}</label>; }
function Row({ label, value, valueClass = "text-slate-900" }: { label: string; value: string; valueClass?: string }) { return <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{label}</span><span className={`font-bold ${valueClass}`}>{value}</span></div>; }
