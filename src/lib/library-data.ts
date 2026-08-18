import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export const BOOK_CATEGORIES = [
  "Ficção",
  "Não ficção",
  "Desenvolvimento pessoal",
  "Negócios & Gestão",
  "Finanças",
  "Psicologia",
  "Filosofia",
  "História & Biografia",
  "Ciência & Tecnologia",
  "Política & Sociedade",
  "Literatura clássica",
  "Romance",
  "Fantasia",
  "Mistério & Suspense",
  "Saúde & Bem-estar",
  "Outros",
] as const;

export const SUGGESTED_BOOK_TAGS = [
  "Produtividade",
  "Liderança",
  "Carreira",
  "Empreendedorismo",
  "Investimentos",
  "Comportamento",
  "Autoconhecimento",
  "Relacionamentos",
  "Biografia",
  "Brasil",
  "Feminismo",
  "Política",
  "História",
  "Tecnologia",
  "Clássico",
  "Contemporâneo",
] as const;

export type BookStatus = "Quero ler" | "Lendo" | "Concluído";

export type Book = {
  id: string;
  title: string;
  author: string;
  status: BookStatus;
  totalPages: number;
  currentPage: number;
  primaryCategory: string;
  tags: string[];
  coverUrl: string;
  notes: string;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
};

export type BookInput = Omit<Book, "id" | "createdAt">;

function mapBook(row: any): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author ?? "",
    status: row.status,
    totalPages: Number(row.total_pages ?? 1),
    currentPage: Number(row.current_page ?? 0),
    primaryCategory: row.primary_category ?? "Outros",
    tags: Array.isArray(row.tags) ? row.tags : [],
    coverUrl: row.cover_url ?? "",
    notes: row.notes ?? "",
    startedAt: row.started_at ?? "",
    finishedAt: row.finished_at ?? "",
    createdAt: row.created_at,
  };
}

export async function fetchBooks(): Promise<Book[]> {
  const { data, error } = await db.from("books").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapBook);
}

export async function createBook(userId: string, input: BookInput): Promise<Book> {
  const { data, error } = await db
    .from("books")
    .insert({
      user_id: userId,
      title: input.title,
      author: input.author,
      status: input.status,
      total_pages: input.totalPages,
      current_page: Math.min(input.currentPage, input.totalPages),
      primary_category: input.primaryCategory,
      tags: input.tags,
      cover_url: input.coverUrl || null,
      notes: input.notes || null,
      started_at: input.startedAt || null,
      finished_at: input.finishedAt || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapBook(data);
}

export async function updateBook(id: string, input: BookInput): Promise<Book> {
  const { data, error } = await db
    .from("books")
    .update({
      title: input.title,
      author: input.author,
      status: input.status,
      total_pages: input.totalPages,
      current_page: Math.min(input.currentPage, input.totalPages),
      primary_category: input.primaryCategory,
      tags: input.tags,
      cover_url: input.coverUrl || null,
      notes: input.notes || null,
      started_at: input.startedAt || null,
      finished_at: input.finishedAt || null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapBook(data);
}

export async function updateBookProgress(id: string, currentPage: number, totalPages: number): Promise<Book> {
  const safePage = Math.max(0, Math.min(currentPage, totalPages));
  const { data, error } = await db
    .from("books")
    .update({ current_page: safePage })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapBook(data);
}

export async function deleteBook(id: string) {
  const { error } = await db.from("books").delete().eq("id", id);
  if (error) throw error;
}
