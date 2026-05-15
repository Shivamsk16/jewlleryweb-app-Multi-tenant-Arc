export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 200;

export function parsePagination(query: Record<string, string | undefined>) {
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const requested = Number.parseInt(query.limit ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, requested));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function toPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
