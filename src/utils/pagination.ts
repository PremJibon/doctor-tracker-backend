export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export const getPagination = (query: { page?: unknown; limit?: unknown }): PaginationParams => {
  const pageNum = Number(query.page);
  const limitNum = Number(query.limit);

  const page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  const rawLimit = Number.isInteger(limitNum) && limitNum > 0 ? limitNum : 10;
  // Strictly capped at 100 as mandated by security and performance rules
  const limit = Math.min(rawLimit, 100);

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const formatPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> => {
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};
