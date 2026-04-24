import type { InsertMatch } from "@shared/schema";

export interface RawRow {
  rowNumber: number;
  opponent?: string;
  date?: string;
  time?: string;
  venue?: string;
  competition?: string;
  notes?: string;
}

type Venue = "home" | "away" | "neutral";

/**
 * Payload pronto a inserir — extraímos `teamId` e `status` no caller porque
 * dependem do contexto (equipa actual + relação com a data de hoje).
 */
export interface ImportMatch {
  opponent: string;
  date: Date;
  venue: Venue;
  competition: string | null;
  notes: string | null;
  setsWon: number;
  setsLost: number;
  status: InsertMatch["status"];
}

export interface RowError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: Array<{ rowNumber: number; match: ImportMatch }>;
  errors: RowError[];
  warnings: RowError[];
}

// ── Header aliases (PT + EN, case/accent insensitive) ─────────────────────

const HEADERS: Record<keyof Omit<RawRow, "rowNumber">, string[]> = {
  opponent: ["adversario", "adversário", "opponent", "opposing team", "vs"],
  date: ["data", "date"],
  time: ["hora", "time"],
  venue: ["local", "venue", "casa fora", "home away"],
  competition: ["competicao", "competição", "competition", "prova", "liga"],
  notes: ["notas", "observacoes", "observações", "notes", "comentarios"],
};

function normalise(s: string): string {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function matchHeader(header: string): keyof Omit<RawRow, "rowNumber"> | null {
  const h = normalise(header);
  for (const [field, aliases] of Object.entries(HEADERS) as Array<
    [keyof Omit<RawRow, "rowNumber">, string[]]
  >) {
    if (aliases.some((a) => normalise(a) === h)) return field;
  }
  return null;
}

export async function parseSpreadsheet(
  source: ArrayBuffer | string,
): Promise<RawRow[]> {
  const XLSX = await import("xlsx");
  const wb =
    typeof source === "string"
      ? XLSX.read(source, { type: "string" })
      : XLSX.read(source, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });
  if (!matrix.length) return [];

  const [headerRow, ...dataRows] = matrix;
  const columnMap: Array<keyof Omit<RawRow, "rowNumber"> | null> =
    headerRow.map((h) => matchHeader(String(h ?? "")));

  const rows: RawRow[] = [];
  dataRows.forEach((row, i) => {
    if (row.every((c) => !c || !String(c).trim())) return;
    const raw: RawRow = { rowNumber: i + 1 };
    row.forEach((cell, idx) => {
      const field = columnMap[idx];
      if (!field) return;
      const value = cell == null ? "" : String(cell).trim();
      if (value) raw[field] = value;
    });
    rows.push(raw);
  });
  return rows;
}

// ── Normalização / validação ─────────────────────────────────────────────

const VENUE_MAP: Record<string, Venue> = {
  casa: "home",
  home: "home",
  "em casa": "home",
  h: "home",
  c: "home",
  fora: "away",
  away: "away",
  "em fora": "away",
  a: "away",
  f: "away",
  neutro: "neutral",
  neutral: "neutral",
  n: "neutral",
};

function parseVenue(raw: string | undefined): Venue {
  if (!raw) return "home";
  return VENUE_MAP[normalise(raw)] ?? "home";
}

/**
 * Aceita ISO (`YYYY-MM-DD`), formato português (`DD/MM/YYYY`, `DD-MM-YYYY`),
 * e o número-serial do Excel quando a célula foi lida como string numérica.
 * Hora opcional (`HH:MM` ou `HH:MM:SS`) é fundida.
 */
function parseDateTime(dateStr: string, timeStr?: string): Date | null {
  const s = dateStr.trim();
  let y: number, m: number, d: number;

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [yy, mm, dd] = s.split("-").map(Number);
    y = yy;
    m = mm;
    d = dd;
  } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(s)) {
    const [dd, mm, yy] = s.split(/[/-]/).map(Number);
    y = yy;
    m = mm;
    d = dd;
  } else if (/^\d+(\.\d+)?$/.test(s)) {
    // Excel serial date (dias desde 1900-01-00). Deixa o Excel resolver: o
    // parser da SheetJS converte células de data para "YYYY-MM-DD" por
    // defeito, mas se chegarmos aqui é porque veio como número; melhor
    // pedir ao utilizador formato claro.
    return null;
  } else {
    return null;
  }

  if (
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d) ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > 31
  ) {
    return null;
  }

  let hh = 0;
  let mm2 = 0;
  if (timeStr) {
    const tm = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (tm) {
      hh = Number(tm[1]);
      mm2 = Number(tm[2]);
      if (hh < 0 || hh > 23 || mm2 < 0 || mm2 > 59) return null;
    } else {
      return null;
    }
  }

  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm2));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function deriveStatus(date: Date): InsertMatch["status"] {
  // Jogos com mais de 6h de passado são marcados como "finished" (o treinador
  // preenche o resultado depois). Futuros ou presentes ficam "scheduled".
  const now = Date.now();
  return date.getTime() < now - 6 * 3600_000 ? "finished" : "scheduled";
}

export function validateRows(
  rows: RawRow[],
  existingOpponentsByDate: Array<{ opponent: string; date: Date }> = [],
): ValidationResult {
  const valid: Array<{ rowNumber: number; match: ImportMatch }> = [];
  const errors: RowError[] = [];
  const warnings: RowError[] = [];

  for (const row of rows) {
    const rowErrors: RowError[] = [];

    const opponent = row.opponent?.trim();
    if (!opponent)
      rowErrors.push({
        rowNumber: row.rowNumber,
        field: "Adversário",
        message: "Obrigatório",
      });

    if (!row.date)
      rowErrors.push({
        rowNumber: row.rowNumber,
        field: "Data",
        message: "Obrigatório",
      });

    let date: Date | null = null;
    if (row.date) {
      date = parseDateTime(row.date, row.time);
      if (!date)
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: "Data",
          message:
            "Formato não reconhecido. Usa YYYY-MM-DD ou DD/MM/YYYY e hora HH:MM",
        });
    }

    if (row.venue && !VENUE_MAP[normalise(row.venue)]) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        field: "Local",
        message: `'${row.venue}' não reconhecido (usa casa/fora/neutro)`,
      });
    }

    if (rowErrors.length) {
      errors.push(...rowErrors);
      continue;
    }

    const match: ImportMatch = {
      opponent: opponent!,
      date: date!,
      venue: parseVenue(row.venue),
      competition: row.competition?.trim() || null,
      notes: row.notes?.trim() || null,
      setsWon: 0,
      setsLost: 0,
      status: deriveStatus(date!),
    };

    const dup = existingOpponentsByDate.find(
      (e) =>
        e.opponent.toLowerCase() === match.opponent.toLowerCase() &&
        Math.abs(e.date.getTime() - match.date.getTime()) < 24 * 3600_000,
    );
    if (dup) {
      warnings.push({
        rowNumber: row.rowNumber,
        field: "Adversário",
        message: `Já existe um jogo contra '${dup.opponent}' a ${dup.date
          .toISOString()
          .slice(0, 10)}`,
      });
    }

    valid.push({ rowNumber: row.rowNumber, match });
  }

  return { valid, errors, warnings };
}

// ── Template ──────────────────────────────────────────────────────────────

export function buildCsvTemplate(): string {
  const header = [
    "Adversário",
    "Data",
    "Hora",
    "Local",
    "Competição",
    "Notas",
  ];
  const examples = [
    ["Porto VC", "2025-10-18", "20:00", "casa", "Divisão A1", "Jogo de abertura"],
    ["Benfica", "25/10/2025", "18:30", "fora", "Divisão A1", ""],
    ["Leixões", "2025-11-01", "", "neutro", "Taça", ""],
  ];
  return (
    [header, ...examples].map((r) => r.join(",")).join("\n") + "\n"
  );
}

export function downloadTemplate(filename = "template-calendario.csv") {
  const blob = new Blob(["﻿" + buildCsvTemplate()], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
