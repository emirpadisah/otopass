export function parsePagination(input: { q?: string; status?: string; page?: string; pageSize?: string; sort?: string }) {
  const page = Math.max(1, Number.parseInt(input.page || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(input.pageSize || "25", 10) || 25));
  return { q: (input.q || "").trim().slice(0, 120), status: (input.status || "").trim().slice(0, 40), page, pageSize, sort: (input.sort || "newest").trim() };
}

export function safeSearchTerm(value: string): string {
  return value.replace(/[%_,()]/g, " ").trim();
}
