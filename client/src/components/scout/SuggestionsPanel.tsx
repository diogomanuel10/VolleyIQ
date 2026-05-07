import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Snowflake,
  Target,
  Hand,
  RotateCw,
  Compass,
  Lightbulb,
  History,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Suggestion,
  SuggestionCategory,
  SuggestionPriority,
} from "@/lib/suggestions";

/**
 * Painel de sugestões em tempo real. Mostra até 4 cards ordenados por
 * prioridade. Cada card é um insight accionável: forma do jogo (live) ou
 * tendência histórica vs este adversário (history).
 *
 * Empty states distintos:
 *  - sem dados nenhuns        → "À espera de dados"
 *  - dados live mas sem hist  → "Joga este adversário antes p/ histórico"
 */

const CATEGORY_META: Record<
  SuggestionCategory,
  { icon: typeof Flame; tint: string }
> = {
  scorer:    { icon: Flame,     tint: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900" },
  cold:      { icon: Snowflake, tint: "text-sky-600    bg-sky-50    dark:bg-sky-950/30    dark:text-sky-400    border-sky-200    dark:border-sky-900" },
  reception: { icon: Target,    tint: "text-rose-600   bg-rose-50   dark:bg-rose-950/30   dark:text-rose-400   border-rose-200   dark:border-rose-900" },
  setter:    { icon: Hand,      tint: "text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-900" },
  rotation:  { icon: RotateCw,  tint: "text-amber-600  bg-amber-50  dark:bg-amber-950/30  dark:text-amber-400  border-amber-200  dark:border-amber-900" },
  tendency:  { icon: Compass,   tint: "text-slate-600  bg-slate-50  dark:bg-slate-900/40  dark:text-slate-300  border-slate-200  dark:border-slate-800" },
};

const PRIORITY_DOT: Record<SuggestionPriority, string> = {
  high:   "bg-red-500",
  medium: "bg-amber-500",
  low:    "bg-slate-400",
};

interface Props {
  suggestions: Suggestion[];
  hasLog: boolean;
  hasHistory: boolean;
}

export function SuggestionsPanel({ suggestions, hasLog, hasHistory }: Props) {
  const isEmpty = suggestions.length === 0;

  return (
    <div className="rounded-xl border bg-card p-3 md:p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5" /> Sugestões
        </div>
        {!isEmpty && (
          <span className="text-[10px] text-muted-foreground">
            {suggestions.length}
          </span>
        )}
      </div>

      {isEmpty ? (
        <EmptyState hasLog={hasLog} hasHistory={hasHistory} />
      ) : (
        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {suggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const meta = CATEGORY_META[suggestion.category];
  const Icon = meta.icon;
  const SourceIcon = suggestion.source === "live" ? Zap : History;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "rounded-lg border px-2.5 py-2 text-xs",
        meta.tint,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                PRIORITY_DOT[suggestion.priority],
              )}
              aria-label={`prioridade ${suggestion.priority}`}
            />
            <p className="font-semibold leading-tight truncate">
              {suggestion.title}
            </p>
          </div>
          <p className="mt-1 leading-snug opacity-90">
            {suggestion.detail}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-70">
            <SourceIcon className="h-2.5 w-2.5" />
            {suggestion.evidence}
          </div>
        </div>
      </div>
    </motion.li>
  );
}

function EmptyState({
  hasLog,
  hasHistory,
}: {
  hasLog: boolean;
  hasHistory: boolean;
}) {
  let msg: string;
  if (!hasLog && !hasHistory) {
    msg =
      "Acumula dados durante a partida — os primeiros pontos vão revelar tendências.";
  } else if (hasLog && !hasHistory) {
    msg =
      "Sem histórico vs este adversário ainda. As sugestões live vão aparecer assim que houver padrão.";
  } else {
    msg =
      "Sem padrões fortes neste momento. O painel vai actualizar à medida que registas.";
  }
  return (
    <p className="text-xs text-muted-foreground leading-snug py-2">{msg}</p>
  );
}
