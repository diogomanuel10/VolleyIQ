import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPct(n: number, digits = 1) {
  return `${n.toFixed(digits)}%`;
}

export function formatDate(d: Date | string | number) {
  const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Normaliza texto para pesquisa: minúsculas e sem acentos, para que
 * "adversario" encontre "Adversário" e "sao" encontre "São".
 */
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** `true` se todos os termos da query aparecem em algum dos campos. */
export function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalizeSearch(fields.filter(Boolean).join(" "));
  return terms.every((term) => haystack.includes(term));
}
