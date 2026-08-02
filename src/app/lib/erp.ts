export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function clampPage(page: number, totalPages: number) {
  if (totalPages <= 0) {
    return 1;
  }

  return Math.min(Math.max(page, 1), totalPages);
}

export function getTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const totalPages = getTotalPages(rows.length, pageSize);
  const safePage = clampPage(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    totalPages,
    rows: rows.slice(start, start + pageSize),
    start,
    end: Math.min(start + pageSize, rows.length),
  };
}

export function getPageNumbers(page: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);

  return Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
}

export function formatMoney(value: number, currency = "OMR") {
  return `${Number(value || 0).toFixed(3)} ${currency}`;
}

export function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsedDate);
}

export function matchesSearch(values: Array<string | null | undefined>, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export function toStartOfDayIso(date: string) {
  return `${date}T00:00:00Z`;
}

export function toEndOfDayIso(date: string) {
  return `${date}T23:59:59.999Z`;
}
