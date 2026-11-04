export const PAGE_SIZE = 20;

export function pageParams(sp: Record<string, string | string[] | undefined>, pageSize = PAGE_SIZE) {
  const page = Math.max(1, Number(sp.page) || 1);
  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 };
}
export const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
/** Escape user search text for PostgREST ilike filters. */
export const likeTerm = (q: string) => `%${q.replace(/[%_,()\\]/g, (c) => "\\" + c)}%`;
