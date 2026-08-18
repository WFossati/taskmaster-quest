import { BookOpen, Check, Edit3, Library, Plus, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  BOOK_CATEGORIES,
  SUGGESTED_BOOK_TAGS,
  createBook,
  deleteBook,
  fetchBooks,
  updateBook,
  updateBookProgress,
  type Book,
  type BookInput,
  type BookStatus,
} from "@/lib/library-data";

const emptyBook: BookInput = {
  title: "",
  author: "",
  status: "Lendo",
  totalPages: 200,
  currentPage: 0,
  primaryCategory: "Não ficção",
  tags: [],
  coverUrl: "",
  notes: "",
  startedAt: "",
  finishedAt: "",
};

const statuses: BookStatus[] = ["Quero ler", "Lendo", "Concluído"];

export function LibraryDashboard({ userId }: { userId: string }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookInput>(emptyBook);
  const [customTag, setCustomTag] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | BookStatus>("Todos");

  async function load() {
    setError(null);
    try {
      setBooks(await fetchBooks());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar sua biblioteca.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [userId]);

  const categoryDistribution = useMemo(() => {
    if (!books.length) return [];
    const counts = new Map<string, number>();
    books.forEach((book) => counts.set(book.primaryCategory, (counts.get(book.primaryCategory) ?? 0) + 1));
    return [...counts.entries()]
      .map(([category, count]) => ({ category, count, percentage: Math.round((count / books.length) * 100) }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  }, [books]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((book) => {
      if (statusFilter !== "Todos" && book.status !== statusFilter) return false;
      if (!q) return true;
      return `${book.title} ${book.author} ${book.primaryCategory} ${book.tags.join(" ")}`.toLowerCase().includes(q);
    });
  }, [books, search, statusFilter]);

  const reading = books.filter((book) => book.status === "Lendo");
  const finished = books.filter((book) => book.status === "Concluído");
  const pagesRead = books.reduce((sum, book) => sum + book.currentPage, 0);

  function resetForm() {
    setEditingId(null);
    setForm(emptyBook);
    setCustomTag("");
    setFormOpen(false);
  }

  function edit(book: Book) {
    setEditingId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      status: book.status,
      totalPages: book.totalPages,
      currentPage: book.currentPage,
      primaryCategory: book.primaryCategory,
      tags: book.tags,
      coverUrl: book.coverUrl,
      notes: book.notes,
      startedAt: book.startedAt,
      finishedAt: book.finishedAt,
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleTag(tag: string) {
    setForm((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
    }));
  }

  function addCustomTag() {
    const clean = customTag.trim().replace(/^#/, "");
    if (!clean) return;
    if (!form.tags.some((tag) => tag.toLowerCase() === clean.toLowerCase())) {
      setForm((current) => ({ ...current, tags: [...current.tags, clean] }));
    }
    setCustomTag("");
  }

  async function saveBook() {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload: BookInput = {
        ...form,
        title: form.title.trim(),
        author: form.author.trim(),
        totalPages: Math.max(1, Number(form.totalPages) || 1),
        currentPage: Math.max(0, Math.min(Number(form.currentPage) || 0, Math.max(1, Number(form.totalPages) || 1))),
      };
      if (editingId) await updateBook(editingId, payload);
      else await createBook(userId, payload);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o livro.");
    } finally {
      setSaving(false);
    }
  }

  async function updateProgress(book: Book, page: number) {
    try {
      const updated = await updateBookProgress(book.id, page, book.totalPages);
      setBooks((current) => current.map((item) => (item.id === book.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a leitura.");
    }
  }

  async function remove(book: Book) {
    if (!window.confirm(`Excluir “${book.title}” da biblioteca?`)) return;
    try {
      await deleteBook(book.id);
      setBooks((current) => current.filter((item) => item.id !== book.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o livro.");
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Abrindo sua biblioteca...</div>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-500"><Library className="size-5" /><p className="text-xs font-bold uppercase tracking-[0.2em]">Biblioteca</p></div>
          <h2 className="mt-2 text-3xl font-black tracking-tight">O que estou construindo através da leitura</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Acompanhe livros, páginas lidas, progresso e o equilíbrio dos temas que fazem parte da sua biblioteca.</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm(emptyBook); setFormOpen(true); }} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"><Plus className="size-4" /> Adicionar livro</button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      {formOpen && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{editingId ? "Editar livro" : "Novo livro"}</p><h3 className="mt-1 text-xl font-bold">Dados da leitura</h3></div>
            <button onClick={resetForm} className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500"><X className="size-4" /></button>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Livro"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Rápido e Devagar" /></Field>
            <Field label="Autor"><input className="input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Daniel Kahneman" /></Field>
            <Field label="Status"><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BookStatus })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></Field>
            <Field label="Páginas totais"><input className="input" type="number" min="1" value={form.totalPages} onChange={(e) => setForm({ ...form, totalPages: Number(e.target.value) })} /></Field>
            <Field label="Página atual"><input className="input" type="number" min="0" max={form.totalPages} value={form.currentPage} onChange={(e) => setForm({ ...form, currentPage: Number(e.target.value) })} /></Field>
            <Field label="Categoria principal"><select className="input" value={form.primaryCategory} onChange={(e) => setForm({ ...form, primaryCategory: e.target.value })}>{BOOK_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></Field>
            <Field label="Início"><input className="input" type="date" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })} /></Field>
            <Field label="Conclusão"><input className="input" type="date" value={form.finishedAt} onChange={(e) => setForm({ ...form, finishedAt: e.target.value })} /></Field>
            <Field label="URL da capa (opcional)"><input className="input" value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} placeholder="https://..." /></Field>
          </div>

          <div className="mt-5">
            <p className="text-sm font-bold text-slate-700">Tags</p>
            <p className="mt-1 text-xs text-slate-500">Use tags para temas secundários. A categoria principal é a que entra no percentual da biblioteca.</p>
            <div className="mt-3 flex flex-wrap gap-2">{SUGGESTED_BOOK_TAGS.map((tag) => <button type="button" key={tag} onClick={() => toggleTag(tag)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${form.tags.includes(tag) ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}>#{tag}</button>)}</div>
            <div className="mt-3 flex max-w-md gap-2"><input className="input" value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }} placeholder="Criar outra tag" /><button type="button" onClick={addCustomTag} className="rounded-xl border border-slate-200 px-3"><Plus className="size-4" /></button></div>
            {form.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{form.tags.filter((tag) => !SUGGESTED_BOOK_TAGS.includes(tag as any)).map((tag) => <button key={tag} type="button" onClick={() => toggleTag(tag)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">#{tag} ×</button>)}</div>}
          </div>

          <Field label="Notas"><textarea className="input mt-2 resize-none" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ideias, aprendizados, por que estou lendo..." /></Field>

          <button disabled={saving || !form.title.trim()} onClick={() => void saveBook()} className="mt-5 flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Save className="size-4" /> {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar à biblioteca"}</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Livros na biblioteca" value={books.length} />
        <Stat label="Lendo agora" value={reading.length} />
        <Stat label="Concluídos" value={finished.length} />
        <Stat label="Páginas registradas" value={pagesRead} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Leitura atual</p>
          <h3 className="mt-1 text-xl font-bold">Livros em andamento</h3>
          <div className="mt-5 space-y-4">
            {reading.length === 0 ? <Empty>Nenhum livro marcado como “Lendo”.</Empty> : reading.map((book) => <ReadingCard key={book.id} book={book} onProgress={updateProgress} onEdit={edit} />)}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Mix da biblioteca</p>
          <h3 className="mt-1 text-xl font-bold">% por categoria</h3>
          <p className="mt-1 text-sm text-slate-500">Distribuição baseada na categoria principal de cada livro.</p>
          <div className="mt-5 space-y-4">
            {categoryDistribution.length === 0 ? <Empty>Adicione livros para formar sua distribuição.</Empty> : categoryDistribution.map((item) => <div key={item.category}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-bold text-slate-700">{item.category}</span><span className="font-bold text-slate-500">{item.percentage}% · {item.count}</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-950" style={{ width: `${item.percentage}%` }} /></div>
            </div>)}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Acervo</p><h3 className="mt-1 text-xl font-bold">Todos os livros</h3></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar livro, autor ou tag..." /></div>
            <select className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "Todos" | BookStatus)}><option>Todos</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.length === 0 ? <div className="md:col-span-2 xl:col-span-3"><Empty>Nenhum livro encontrado.</Empty></div> : filtered.map((book) => <BookCard key={book.id} book={book} onEdit={edit} onDelete={remove} />)}
        </div>
      </div>
    </section>
  );
}

function ReadingCard({ book, onProgress, onEdit }: { book: Book; onProgress: (book: Book, page: number) => Promise<void>; onEdit: (book: Book) => void }) {
  const [page, setPage] = useState(book.currentPage);
  useEffect(() => setPage(book.currentPage), [book.currentPage]);
  const progress = Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex gap-4">
      <Cover book={book} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-900">{book.title}</p><p className="mt-0.5 text-sm text-slate-500">{book.author || "Autor não informado"}</p></div><button onClick={() => onEdit(book)} className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500"><Edit3 className="size-3.5" /></button></div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-slate-950" style={{ width: `${progress}%` }} /></div>
        <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-500"><span>{book.currentPage} / {book.totalPages} páginas</span><span>{progress}%</span></div>
        <div className="mt-3 flex gap-2"><input type="number" min="0" max={book.totalPages} value={page} onChange={(e) => setPage(Number(e.target.value))} className="input h-10" /><button onClick={() => void onProgress(book, page)} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white"><Check className="size-3.5" /> Atualizar</button></div>
      </div>
    </div>
  </div>;
}

function BookCard({ book, onEdit, onDelete }: { book: Book; onEdit: (book: Book) => void; onDelete: (book: Book) => void }) {
  const progress = Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
  return <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex gap-4"><Cover book={book} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="line-clamp-2 font-black text-slate-900">{book.title}</p><p className="mt-0.5 text-sm text-slate-500">{book.author || "Autor não informado"}</p></div><div className="flex gap-1"><button onClick={() => onEdit(book)} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500"><Edit3 className="size-3.5" /></button><button onClick={() => void onDelete(book)} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500"><Trash2 className="size-3.5" /></button></div></div>
      <div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold text-white">{book.status}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{book.primaryCategory}</span>{book.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">#{tag}</span>)}</div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-950" style={{ width: `${progress}%` }} /></div><div className="mt-1.5 flex justify-between text-[11px] font-bold text-slate-400"><span>{book.currentPage}/{book.totalPages}</span><span>{progress}%</span></div>
    </div></div>
  </div>;
}

function Cover({ book }: { book: Book }) {
  return book.coverUrl ? <img src={book.coverUrl} alt={`Capa de ${book.title}`} className="h-28 w-20 shrink-0 rounded-xl object-cover shadow-sm" /> : <div className="grid h-28 w-20 shrink-0 place-items-center rounded-xl bg-slate-200 text-slate-500"><BookOpen className="size-7" /></div>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{new Intl.NumberFormat("pt-BR").format(value)}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>{children}</label>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">{children}</div>;
}
