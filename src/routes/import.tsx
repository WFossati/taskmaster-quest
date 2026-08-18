import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ClipboardPaste, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  createProject,
  createTask,
  fetchProjects,
  fetchTasks,
  type Project,
  type Task,
  type TaskInput,
} from "@/lib/taskmaster-data";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Importar missões — Vamo Dale!!" },
      { name: "description", content: "Transforme listas em missões com prévia e verificação de duplicidades." },
    ],
  }),
  component: ImportMissionsPage,
});

type DraftMission = {
  id: string;
  title: string;
  project: string;
  area: string;
  dueDate: string;
  xp: number;
  priority: string;
  recurrence: string;
  duplicate: boolean;
  selected: boolean;
};

const AREAS: Record<string, string> = {
  fejers: "fejers",
  gera: "gera",
  ufrgs: "ufrgs",
  saúde: "saude",
  saude: "saude",
  conhecimento: "conhecimento",
  financeiro: "financeiro",
};

const STOP_WORDS = new Set([
  "a", "ao", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "o", "os",
  "para", "por", "que", "um", "uma", "antes", "caso", "se", "todas", "todos",
]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function words(value: string) {
  return new Set(normalize(value).split(" ").filter((word) => word.length > 2 && !STOP_WORDS.has(word)));
}

function similarity(a: string, b: string) {
  const first = words(a);
  const second = words(b);
  if (!first.size || !second.size) return 0;
  let matches = 0;
  first.forEach((word) => { if (second.has(word)) matches += 1; });
  return matches / Math.min(first.size, second.size);
}

function parseDate(text: string) {
  const match = text.match(/(?:prazo[^\n]*?|dia\s+)(\d{1,2})[\/]?(\d{1,2})(?:[\/](\d{2,4}))?/i);
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = match[3] ? Number(match[3]) : new Date().getFullYear();
  if (year < 100) year += 2000;
  if (day < 1 || day > 31 || month < 1 || month > 12) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseLineDate(value: string) {
  const match = value.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/);
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  if (day < 1 || day > 31 || month < 1 || month > 12) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseArea(text: string) {
  const quoted = text.match(/(?:área|parte)\s+(?:da\s+)?vida[^"'\n]*["']([^"']+)["']/i)?.[1];
  const candidate = quoted ?? Object.keys(AREAS).find((area) => normalize(text).includes(normalize(area)));
  return candidate ? (AREAS[candidate.toLowerCase()] ?? "fejers") : "fejers";
}

function extractProjectAndRule(value: string) {
  const withoutRank = value.replace(/^\*{0,2}\d+[.)]\s*/, "").replace(/\*\*/g, "").trim();
  const colon = withoutRank.indexOf(":");
  return colon >= 0
    ? { project: withoutRank.slice(0, colon).trim(), rule: withoutRank.slice(colon + 1).trim() }
    : { project: "", rule: withoutRank };
}

function parseMissions(text: string, existingTasks: Task[], existingProjects: Project[]): DraftMission[] {
  const dueDate = parseDate(text);
  const xp = Number(text.match(/(\d+)\s*xp/i)?.[1] ?? 50);
  const area = parseArea(text);
  const lines = text.split(/\r?\n/);
  const raw: Array<{ title: string; project: string; dueDate?: string; recurrence?: string }> = [];
  const rules: Array<{ project: string; rule: string; rank: number }> = [];
  let project = "";
  let inPriorities = false;

  lines.forEach((source) => {
    const line = source.trim();
    if (!line) return;
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const name = heading[1]!.replace(/\*\*/g, "").trim();
      inPriorities = /prioridades?/i.test(name);
      if (!inPriorities) project = name;
      return;
    }
    const flatItem = line.match(/^\[([^\]]+)\](?:\s*\[([^\]]+)\])?(?:\s*\[([^\]]+)\])?\s*[-–—:]\s*(.+)$/);
    if (flatItem && !/^\s*[xX ]\s*$/.test(flatItem[1]!)) {
      const flatProject = flatItem[1]!.replace(/\*\*/g, "").trim();
      const tokens = [flatItem[2], flatItem[3]].filter(Boolean).map((value) => value!.trim());
      const flatDueDate = tokens.map(parseLineDate).find(Boolean) ?? "";
      const flatRecurrence = tokens.find((value) => /^(diariamente|semanalmente|mensalmente|personalizada)$/i.test(value)) ?? "Não se repete";
      const flatTitle = flatItem[4]!.replace(/\*\*/g, "").trim();
      if (flatProject && flatTitle) raw.push({ title: flatTitle, project: flatProject, dueDate: flatDueDate, recurrence: flatRecurrence });
      return;
    }

    const item = line.match(/^(?:[-*]\s*)?\[[ xX]\]\s*(.+)$/);
    if (!item) return;
    const title = item[1]!.replace(/\*\*/g, "").trim();
    if (inPriorities) {
      const parsed = extractProjectAndRule(title);
      const rank = Number(title.match(/\d+/)?.[0] ?? rules.length + 1);
      rules.push({ ...parsed, rank });
    } else if (project) {
      raw.push({ title, project });
    }
  });

  const projectById = new Map(existingProjects.map((item) => [item.id, item.name]));
  return raw.map((item, index) => {
    const matchedRule = rules
      .filter((rule) => !rule.project || normalize(rule.project) === normalize(item.project))
      .map((rule) => ({ ...rule, score: similarity(item.title, rule.rule) }))
      .filter((rule) => rule.score >= 0.34)
      .sort((a, b) => b.score - a.score)[0];
    const duplicate = existingTasks.some((task) =>
      normalize(task.title) === normalize(item.title)
      && normalize(projectById.get(task.projectId) ?? "") === normalize(item.project),
    );
    return {
      id: `${index}-${normalize(item.project)}-${normalize(item.title)}`,
      title: item.title,
      project: item.project,
      area,
      dueDate: item.dueDate || dueDate,
      xp,
      priority: matchedRule ? (matchedRule.rank <= 2 ? "Urgente" : "Alta") : "Média",
      recurrence: item.recurrence || "Não se repete",
      duplicate,
      selected: !duplicate,
    };
  });
}

function ImportMissionsPage() {
  const [userId, setUserId] = useState("");
  const [text, setText] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [drafts, setDrafts] = useState<DraftMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data }, currentTasks, currentProjects] = await Promise.all([
        supabase.auth.getUser(),
        fetchTasks(),
        fetchProjects(),
      ]);
      setUserId(data.user?.id ?? "");
      setTasks(currentTasks);
      setProjects(currentProjects);
      setLoading(false);
    }
    void load().catch((error) => {
      setFeedback(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
      setLoading(false);
    });
  }, []);

  const selected = useMemo(() => drafts.filter((item) => item.selected && !item.duplicate), [drafts]);
  const duplicates = drafts.filter((item) => item.duplicate).length;
  const projectCount = new Set(drafts.map((item) => normalize(item.project))).size;

  function preview() {
    const parsed = parseMissions(text, tasks, projects);
    setDrafts(parsed);
    setFeedback(parsed.length ? "" : "Nenhuma missão foi identificada. Use [Projeto] - tarefa ou títulos com ## e itens com [ ].");
  }

  function patch(id: string, change: Partial<DraftMission>) {
    setDrafts((current) => current.map((item) => item.id === id ? { ...item, ...change } : item));
  }

  async function save() {
    if (!userId || selected.length === 0) return;
    if (!window.confirm(`Cadastrar ${selected.length} missões? Itens duplicados serão ignorados.`)) return;
    setSaving(true);
    setFeedback("");
    try {
      const projectMap = new Map(projects.map((item) => [normalize(item.name), item]));
      for (const draft of selected) {
        let missionProject = projectMap.get(normalize(draft.project));
        if (!missionProject) {
          missionProject = await createProject(userId, draft.project);
          projectMap.set(normalize(draft.project), missionProject);
        }
        const input: TaskInput = {
          title: draft.title,
          description: "",
          area: draft.area,
          projectId: missionProject.id,
          priority: draft.priority,
          dueDate: draft.dueDate,
          duration: "30",
          energy: "Média",
          difficulty: "Média",
          recurrence: draft.recurrence,
          subtasks: [],
          status: "Inbox",
          tagIds: [],
          xp: draft.xp,
        };
        await createTask(userId, input);
      }
      const currentTasks = await fetchTasks();
      setTasks(currentTasks);
      setDrafts((current) => current.map((item) =>
        selected.some((saved) => saved.id === item.id) ? { ...item, duplicate: true, selected: false } : item,
      ));
      setFeedback(`${selected.length} missões cadastradas com sucesso!`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "O cadastro foi interrompido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-5 py-7 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-white">
              <ClipboardPaste className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-violet-600">IMPORTAÇÃO EM LOTE</p>
              <h1 className="text-2xl font-bold">Transforme sua lista em missões</h1>
              <p className="mt-1 text-sm text-slate-500">Cole a lista completa. Nada será cadastrado antes da sua confirmação.</p>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="mt-6 min-h-72 w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-violet-400"
            placeholder={'Ex.:\nPrazo 20/08, 10 XP, área "Gera".\n\n[Cliente] - Preparar apresentação'}
          />
          <button
            type="button"
            onClick={preview}
            disabled={loading || !text.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <Sparkles className="size-4" /> Gerar prévia
          </button>
          {feedback && <p className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700">{feedback}</p>}
        </section>

        {drafts.length > 0 && (
          <section className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold">Confira antes de cadastrar</h2>
              <p className="mt-1 text-sm text-slate-500">
                {drafts.length} missões · {projectCount} projetos · {duplicates} duplicidades ignoradas · {selected.length} selecionadas
              </p>
            </div>
            {drafts.map((item) => (
              <article key={item.id} className={`rounded-2xl border bg-white p-4 ${item.duplicate ? "border-amber-200 opacity-70" : "border-slate-200"}`}>
                <div className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    disabled={item.duplicate}
                    onChange={(event) => patch(item.id, { selected: event.target.checked })}
                    className="mt-3 size-4"
                  />
                  <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[1fr_180px_120px]">
                    <input value={item.title} onChange={(event) => patch(item.id, { title: event.target.value })} className="input" />
                    <input value={item.project} onChange={(event) => patch(item.id, { project: event.target.value })} className="input" />
                    <select value={item.priority} onChange={(event) => patch(item.id, { priority: event.target.value })} className="input">
                      {["Baixa", "Média", "Alta", "Urgente"].map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </div>
                  <button type="button" title="Remover da prévia" onClick={() => setDrafts((current) => current.filter((draft) => draft.id !== item.id))}>
                    <Trash2 className="size-4 text-slate-400" />
                  </button>
                </div>
                <div className="ml-7 mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  <span>{item.area}</span><span>{item.dueDate || "Sem prazo"}</span><span>{item.recurrence}</span><span>{item.xp} XP</span>
                  {item.duplicate && <span className="text-amber-700">Missão equivalente já existente</span>}
                </div>
              </article>
            ))}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || selected.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 font-bold text-white disabled:opacity-50"
            >
              <Check className="size-5" /> {saving ? "Cadastrando..." : `Confirmar e cadastrar ${selected.length} missões`}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
