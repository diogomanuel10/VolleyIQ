import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  downloadTemplate,
  parseSpreadsheet,
  validateRows,
  type RawRow,
  type ValidationResult,
} from "@/lib/matchImport";
import { api } from "@/lib/api";
import type { Match } from "@shared/schema";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  teamId: string;
  existingMatches: Match[];
}

const VENUE_LABEL: Record<"home" | "away" | "neutral", string> = {
  home: "Casa",
  away: "Fora",
  neutral: "Neutro",
};

const STATUS_LABEL: Record<Match["status"], string> = {
  scheduled: "Agendado",
  live: "Live",
  finished: "Terminado",
  cancelled: "Cancelado",
};

export function MatchImportDialog({
  open,
  onOpenChange,
  teamId,
  existingMatches,
}: Props) {
  const [rows, setRows] = useState<RawRow[]>([]);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const existingForComparison = useMemo(
    () =>
      existingMatches.map((m) => ({
        opponent: m.opponent,
        date: new Date(m.date),
      })),
    [existingMatches],
  );

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!result || result.valid.length === 0)
        throw new Error("Nada para importar");
      return api.post<{ inserted: number; matches: Match[] }>(
        "/api/matches/bulk",
        {
          teamId,
          matches: result.valid.map((v) => ({
            opponent: v.match.opponent,
            date: v.match.date,
            venue: v.match.venue,
            competition: v.match.competition,
            notes: v.match.notes,
            setsWon: v.match.setsWon,
            setsLost: v.match.setsLost,
            status: v.match.status,
          })),
        },
      );
    },
    onSuccess: (data) => {
      toast.success(`${data.inserted} jogo(s) importado(s)`);
      qc.invalidateQueries({ queryKey: ["matches", teamId] });
      reset();
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error("Import falhou", {
        description: err instanceof Error ? err.message : String(err),
      }),
  });

  function reset() {
    setRows([]);
    setResult(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setParsing(true);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const parsed = await parseSpreadsheet(buf);
      setRows(parsed);
      setResult(validateRows(parsed, existingForComparison));
      if (parsed.length === 0) {
        toast.warning("Ficheiro vazio ou sem dados reconhecíveis");
      }
    } catch (err) {
      toast.error("Não consegui ler o ficheiro", {
        description: err instanceof Error ? err.message : String(err),
      });
      reset();
    } finally {
      setParsing(false);
    }
  }

  const validByRow = useMemo(() => {
    const m = new Map<
      number,
      ValidationResult["valid"][number]["match"]
    >();
    result?.valid.forEach((v) => m.set(v.rowNumber, v.match));
    return m;
  }, [result]);

  const errorsByRow = useMemo(() => {
    const m = new Map<number, string[]>();
    result?.errors.forEach((e) => {
      const list = m.get(e.rowNumber) ?? [];
      list.push(`${e.field}: ${e.message}`);
      m.set(e.rowNumber, list);
    });
    return m;
  }, [result]);

  const warningsByRow = useMemo(() => {
    const m = new Map<number, string[]>();
    result?.warnings.forEach((w) => {
      const list = m.get(w.rowNumber) ?? [];
      list.push(`${w.field}: ${w.message}`);
      m.set(w.rowNumber, list);
    });
    return m;
  }, [result]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar calendário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Suporta CSV, XLS e XLSX. Colunas obrigatórias: <b>Adversário</b> e{" "}
            <b>Data</b>. Datas aceites em formato <code>YYYY-MM-DD</code> ou{" "}
            <code>DD/MM/YYYY</code>. Jogos com data no passado ficam marcados
            como "Terminados" (preenches o resultado depois).
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadTemplate()}
            >
              <Download className="h-4 w-4" />
              Descarregar template (CSV)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={parsing || importMutation.isPending}
            >
              <Upload className="h-4 w-4" />
              Escolher ficheiro
            </Button>
            {fileName && (
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                {fileName}
                <button
                  type="button"
                  onClick={reset}
                  className="hover:text-foreground"
                  aria-label="Remover ficheiro"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {result && (
            <Summary
              valid={result.valid.length}
              errors={result.errors.length}
              warnings={result.warnings.length}
              total={rows.length}
            />
          )}

          {rows.length > 0 && (
            <div className="rounded-md border overflow-hidden">
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left">#</th>
                      <th className="px-2 py-1.5 text-left">Adversário</th>
                      <th className="px-2 py-1.5 text-left">Data</th>
                      <th className="px-2 py-1.5 text-left">Local</th>
                      <th className="px-2 py-1.5 text-left">Estado</th>
                      <th className="px-2 py-1.5 text-left">Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const errs = errorsByRow.get(r.rowNumber) ?? [];
                      const warns = warningsByRow.get(r.rowNumber) ?? [];
                      const parsed = validByRow.get(r.rowNumber);
                      const status: "ok" | "warn" | "error" = errs.length
                        ? "error"
                        : warns.length
                          ? "warn"
                          : "ok";
                      return (
                        <tr
                          key={r.rowNumber}
                          className={
                            status === "error"
                              ? "bg-destructive/10"
                              : status === "warn"
                                ? "bg-amber-500/10"
                                : "odd:bg-background even:bg-muted/30"
                          }
                        >
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {r.rowNumber}
                          </td>
                          <td className="px-2 py-1.5">{r.opponent}</td>
                          <td className="px-2 py-1.5">
                            {parsed
                              ? formatDt(parsed.date)
                              : `${r.date ?? ""} ${r.time ?? ""}`.trim()}
                          </td>
                          <td className="px-2 py-1.5">
                            {parsed ? VENUE_LABEL[parsed.venue] : r.venue}
                          </td>
                          <td className="px-2 py-1.5">
                            {parsed?.status
                              ? STATUS_LABEL[parsed.status]
                              : ""}
                          </td>
                          <td className="px-2 py-1.5 text-xs">
                            {status === "ok" && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                OK
                              </span>
                            )}
                            {status === "warn" && (
                              <span className="text-amber-600 dark:text-amber-400">
                                {warns.join("; ")}
                              </span>
                            )}
                            {status === "error" && (
                              <span className="text-destructive">
                                {errs.join("; ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={importMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => importMutation.mutate()}
            disabled={
              !result ||
              result.valid.length === 0 ||
              importMutation.isPending ||
              parsing
            }
          >
            {importMutation.isPending
              ? "A importar…"
              : result
                ? `Importar ${result.valid.length} jogo(s)`
                : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Summary({
  valid,
  errors,
  warnings,
  total,
}: {
  valid: number;
  errors: number;
  warnings: number;
  total: number;
}) {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <span>
        <b>{total}</b> linha(s) lida(s)
      </span>
      <span className="text-emerald-600 dark:text-emerald-400">
        <b>{valid}</b> válida(s)
      </span>
      {errors > 0 && (
        <span className="text-destructive">
          <b>{errors}</b> erro(s)
        </span>
      )}
      {warnings > 0 && (
        <span className="text-amber-600 dark:text-amber-400">
          <b>{warnings}</b> aviso(s)
        </span>
      )}
    </div>
  );
}

function formatDt(d: Date): string {
  const day = d.toISOString().slice(0, 10);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  if (h === 0 && m === 0) return day;
  return `${day} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
