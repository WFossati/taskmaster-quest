import { AlertTriangle, Edit3, History, MinusCircle, Plus, RotateCcw, ShieldAlert, Trash2, X, Zap } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createDemerit,
  deleteDemerit,
  deleteDemeritOccurrence,
  fetchDemerits,
  recordDemerit,
  updateDemerit,
  type Demerit,
  type DemeritInput,
  type DemeritOccurrence,
} from "@/lib/demerits-data";

const emptyForm: DemeritInput = { title: "", description: "", xpPenalty: 20, isActive: true };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function DemeritsDashboard({ userId }: { userId: string }) {
  const [demerits, setDemerits] = useState<Demerit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DemeritInput>(emptyForm);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function reload() {
    setLoading(true);
    try {
      setDemerits(await fetchDemerits());
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível carregar os deméritos." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, [userId]);

  const occurrences = useMemo(
    () => demerits.flatMap((item) => item.occurrences.map((occurrence) => ({ ...occurrence, title: item.title }))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [demerits],
  );
  const lostTotal = occurrences.reduce((sum, item) => sum + item.xpLost, 0);
  const lostToday = occurrences.filter((item) => item.occurredOn === todayIso()).reduce((sum, item) => sum + item.xpLost, 0);
  const todayCount = occurrences.filter((item) => item.occurredOn === todayIso()).length;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(item: Demerit) {
    setEditingId(item.id);
    setForm({ title: item.title, description: item.description, xpPenalty: item.xpPenalty, isActive: item.isActive });
    setShowForm(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), description: form.description.trim(), xpPenalty: Math.max(0, form.xpPenalty) };
      if (editingId) await updateDemerit(editingId, payload);
      else await createDemerit(userId, payload);
      await reload();
      setShowForm(false);
      setEditingId(null);
      setFeedback({ kind: "ok", text: editingId ? "Demérito atualizado." : "Novo demérito criado." });
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  }

  async function register(item: Demerit) {
    if (saving) return;
    setSaving(true);
    try {
      await recordDemerit(item.id, noteFor === item.id ? note : "");
      await reload();
      setNoteFor(null);
      setNote("");
      setFeedback({ kind: "ok", text: `−${item.xpPenalty} XP registrado por “${item.title}”.` });
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível registrar a ocorrência." });
    } finally {
      setSaving(false);
    }
  }

  async function removeOccurrence(occurrence: DemeritOccurrence) {
    if (!window.confirm(`Desfazer esta ocorrência e devolver ${occurrence.xpLost} XP ao saldo disponível?`)) return;
    await deleteDemeritOccurrence(occurrence.id);
    await reload();
    setFeedback({ kind: "ok", text: `${occurrence.xpLost} XP devolvidos ao saldo disponível.` });
  }

  async function remove(item: Demerit) {
    if (!window.confirm(`Excluir “${item.title}” e todo o histórico desse demérito?`)) return;
    await deleteDemerit(item.id);
    await reload();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-600">Deméritos</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Menos do que te afasta da pessoa que você quer ser.</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Cadastre comportamentos que quer reduzir. Cada ocorrência tira XP disponível, sem apagar o histórico do que você já conquistou.</p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white"><Plus className="size-4" /> Novo demérito</button>
      </div>

      {feedback && <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${feedback.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{feedback.text}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={<ShieldAlert className="size-5" />} label="Regras ativas" value={String(demerits.filter((item) => item.isActive).length)} />
        <Metric icon={<MinusCircle className="size-5" />} label="XP perdido hoje" value={`−${lostToday} XP`} />
        <Metric icon={<Zap className="size-5" />} label="XP perdido total" value={`−${lostTotal} XP`} />
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div><p className="text-sm font-bold text-red-600">{editingId ? "EDITAR DEMÉRITO" : "NOVO DEMÉRITO"}</p><h3 className="mt-1 text-xl font-bold">{editingId ? "Ajuste a regra" : "O que você quer fazer menos?"}</h3></div>
            <button type="button" onClick={() => setShowForm(false)}><X className="size-5 text-slate-400" /></button>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-700">Título *</span><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Passar mais de 1h no TikTok" /></label>
            <label className="md:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-700">Descrição</span><textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Defina claramente quando essa regra deve ser registrada." /></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-700">XP perdido por ocorrência</span><input type="number" min="0" step="1" className="input" value={form.xpPenalty} onChange={(e) => setForm({ ...form, xpPenalty: Math.max(0, Number(e.target.value) || 0) })} /></label>
            <label className="flex items-center gap-3 self-end rounded-2xl border border-slate-200 px-4 py-3.5"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /><span className="text-sm font-bold text-slate-700">Regra ativa</span></label>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">Cancelar</button><button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar demérito"}</button></div>
        </form>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-4">
          <div><h3 className="text-lg font-bold">Minhas regras</h3><p className="text-sm text-slate-500">Quando acontecer, registre. Sem culpa; só dados e consequência.</p></div>
          {loading ? <Empty text="Carregando deméritos..." /> : demerits.length === 0 ? <Empty text="Nenhum demérito criado ainda." /> : demerits.map((item) => (
            <article key={item.id} className={`rounded-3xl border bg-white p-5 shadow-sm ${item.isActive ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">−{item.xpPenalty} XP</span>{!item.isActive && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">Pausado</span>}</div><h4 className="mt-3 text-lg font-bold">{item.title}</h4>{item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}<p className="mt-3 text-xs font-semibold text-slate-400">{item.occurrences.length} {item.occurrences.length === 1 ? "ocorrência" : "ocorrências"} · −{item.occurrences.reduce((sum, occurrence) => sum + occurrence.xpLost, 0)} XP</p></div>
                <div className="flex gap-1"><IconButton label="Editar" onClick={() => openEdit(item)}><Edit3 className="size-4" /></IconButton><IconButton label="Excluir" danger onClick={() => void remove(item)}><Trash2 className="size-4" /></IconButton></div>
              </div>
              {item.isActive && <div className="mt-5 border-t border-slate-100 pt-4">{noteFor === item.id && <input autoFocus className="input mb-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observação opcional: o que aconteceu?" />}<div className="flex flex-wrap gap-2"><button onClick={() => void register(item)} disabled={saving} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><AlertTriangle className="size-4" /> Aconteceu · −{item.xpPenalty} XP</button><button onClick={() => { setNoteFor(noteFor === item.id ? null : item.id); setNote(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">{noteFor === item.id ? "Sem observação" : "Adicionar observação"}</button></div></div>}
            </article>
          ))}
        </div>

        <div className="space-y-4">
          <div><h3 className="flex items-center gap-2 text-lg font-bold"><History className="size-5" /> Histórico</h3><p className="text-sm text-slate-500">{todayCount} registros hoje.</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            {occurrences.length === 0 ? <p className="py-8 text-center text-sm font-semibold text-slate-400">Nenhuma ocorrência registrada.</p> : <div className="space-y-2">{occurrences.slice(0, 20).map((occurrence) => (
              <div key={occurrence.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600"><MinusCircle className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold">{occurrence.title}</p><span className="shrink-0 text-sm font-black text-red-600">−{occurrence.xpLost}</span></div><p className="mt-0.5 text-xs text-slate-400">{new Date(`${occurrence.occurredOn}T12:00:00`).toLocaleDateString("pt-BR")}{occurrence.note ? ` · ${occurrence.note}` : ""}</p></div><button title="Desfazer ocorrência" onClick={() => void removeOccurrence(occurrence)} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"><RotateCcw className="size-4" /></button></div>
            ))}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-xs font-bold uppercase tracking-wider">{label}</span></div><p className="mt-3 text-2xl font-bold">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-400">{text}</div>; }
function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) { return <button type="button" title={label} onClick={onClick} className={`grid size-9 place-items-center rounded-xl border ${danger ? "border-red-100 text-red-500 hover:bg-red-50" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{children}</button>; }
