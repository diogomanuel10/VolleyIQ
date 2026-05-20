import { useEffect } from "react";
import { Undo2, X, ChevronRight, RotateCw, Volleyball } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ScoutState } from "@/hooks/useScoutState";
import type { ScoutDispatch, LoggedAction } from "@/hooks/useScoutState";
import type { Player } from "@shared/schema";
import {
  ACTION_TYPES,
  ACTION_LABEL,
  RESULTS_BY_ACTION,
  RESULT_LABEL,
  RESULT_COLOR,
  type ActionType,
} from "@shared/types";

interface TabletScoutProps {
  state: ScoutState;
  dispatch: ScoutDispatch;
  onCourt: Player[];
  bench: Player[];
  lineup: (Player | null)[];
  homeScore: number;
  awayScore: number;
  setNumber: number;
  opponentName: string;
  onClose: () => void;
}

const ACTION_ICON: Record<ActionType, string> = {
  serve: "S",
  reception: "R",
  set: "E",
  attack: "A",
  block: "B",
  dig: "D",
  freeball: "F",
};

const ACTION_BG: Record<ActionType, string> = {
  serve:     "bg-sky-600 hover:bg-sky-500",
  reception: "bg-violet-600 hover:bg-violet-500",
  set:       "bg-amber-600 hover:bg-amber-500",
  attack:    "bg-rose-600 hover:bg-rose-500",
  block:     "bg-slate-600 hover:bg-slate-500",
  dig:       "bg-teal-600 hover:bg-teal-500",
  freeball:  "bg-emerald-600 hover:bg-emerald-500",
};

export function TabletScout({
  state,
  dispatch,
  onCourt,
  bench,
  lineup,
  homeScore,
  awayScore,
  setNumber,
  opponentName,
  onClose,
}: TabletScoutProps) {
  const { step, playerId, actionType } = state;

  // Auto-skip zone steps — tablet mode doesn't use the court
  useEffect(() => {
    if (step === "zone" || step === "zoneFrom" || step === "zoneTo") {
      dispatch({ kind: "skipZone" });
    }
  }, [step, dispatch]);

  const allPlayers = [...onCourt, ...bench];
  const results = actionType ? RESULTS_BY_ACTION[actionType] : [];

  const colBase =
    "flex flex-col gap-2 overflow-y-auto p-3 h-full";

  const playerActive = step === "idle" || step === "player";
  const actionActive = step === "action";
  const resultActive = step === "result";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground select-none">
      {/* ── Score bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col border-b bg-card shrink-0">
        {/* Top row: set · score · opponent · undo · close */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-sm font-medium text-muted-foreground">
              Set {setNumber}
            </span>
            <div className="flex items-center gap-2 text-3xl font-bold tabular-nums">
              <span className="text-emerald-600">{homeScore}</span>
              <span className="text-muted-foreground/50 text-xl">–</span>
              <span className="text-red-500">{awayScore}</span>
            </div>
            <span className="text-sm text-muted-foreground truncate hidden sm:inline">
              vs {opponentName}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-10 px-3"
              onClick={() => dispatch({ kind: "undo" })}
              disabled={state.log.length === 0 && step === "idle"}
            >
              <Undo2 className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Undo</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="h-10 px-3">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Formation row: rotation badge + mini court + rotate button */}
        <div className="flex items-center gap-3 px-4 pb-2">
          {/* Rotation badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rot
            </span>
            <span className="text-sm font-bold tabular-nums bg-muted px-2 py-0.5 rounded-md">
              {state.rotation}
            </span>
          </div>

          {/* Serving indicator */}
          <div className="flex items-center gap-1 shrink-0">
            <Volleyball className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-muted-foreground">
              {state.servingTeam === "home" ? "A servir" : "A receber"}
            </span>
          </div>

          {/* Mini court formation */}
          <div className="flex flex-col gap-0.5 mx-2">
            {/* Front row (net): positions 4, 3, 2 */}
            <div className="flex gap-1">
              {[4, 3, 2].map((pos) => {
                const player = lineup[(pos - state.rotation + 6) % 6];
                const isServePos = pos === 1;
                return (
                  <div
                    key={pos}
                    className={cn(
                      "w-9 h-7 rounded flex items-center justify-center text-xs font-bold tabular-nums border",
                      player
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted border-border text-muted-foreground",
                      isServePos && state.servingTeam === "home" && "ring-1 ring-amber-400",
                    )}
                    title={player ? `${player.firstName} ${player.lastName} (P${pos})` : `P${pos} vazio`}
                  >
                    {player?.number ?? "—"}
                  </div>
                );
              })}
            </div>
            {/* Back row: positions 5, 6, 1 */}
            <div className="flex gap-1">
              {[5, 6, 1].map((pos) => {
                const player = lineup[(pos - state.rotation + 6) % 6];
                const isServePos = pos === 1;
                return (
                  <div
                    key={pos}
                    className={cn(
                      "w-9 h-7 rounded flex items-center justify-center text-xs font-bold tabular-nums border",
                      player
                        ? "bg-card border-border text-foreground"
                        : "bg-muted border-border text-muted-foreground",
                      isServePos && state.servingTeam === "home" && "ring-1 ring-amber-400 bg-amber-50 dark:bg-amber-950/20",
                    )}
                    title={player ? `${player.firstName} ${player.lastName} (P${pos})` : `P${pos} vazio`}
                  >
                    {player?.number ?? "—"}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Net label */}
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest -ml-1 hidden sm:block">
            rede ↑
          </span>

          {/* Rotate button */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 ml-auto shrink-0"
            onClick={() => dispatch({ kind: "rotate", direction: 1 })}
            title="Rodar"
          >
            <RotateCw className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Rodar</span>
          </Button>
        </div>
      </div>

      {/* ── 3-column grid ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 divide-x">

        {/* Column 1 — Players ─────────────────────────────────────── */}
        <div
          className={cn(
            colBase,
            "w-[34%]",
            !playerActive && "opacity-40 pointer-events-none",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 shrink-0">
            Jogadora
          </p>
          {allPlayers.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">
              Sem jogadoras configuradas.
            </p>
          )}
          {allPlayers.map((p) => {
            const isOnCourt = onCourt.some((oc) => oc.id === p.id);
            const selected = playerId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => dispatch({ kind: "selectPlayer", playerId: p.id })}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors border",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-accent",
                  !isOnCourt && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums w-8 text-center shrink-0 rounded-lg py-0.5",
                    selected ? "text-primary-foreground" : "text-primary",
                  )}
                >
                  {p.number}
                </span>
                <span className="flex-1 truncate font-medium text-sm">
                  {p.firstName} {p.lastName}
                </span>
                {!isOnCourt && (
                  <span className="text-xs text-muted-foreground shrink-0">banco</span>
                )}
                {selected && (
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                )}
              </button>
            );
          })}
        </div>

        {/* Column 2 — Actions ──────────────────────────────────────── */}
        <div
          className={cn(
            colBase,
            "w-[33%]",
            !actionActive && "opacity-40 pointer-events-none",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 shrink-0">
            Acção
          </p>
          {ACTION_TYPES.map((at) => {
            const selected = actionType === at;
            return (
              <button
                key={at}
                onClick={() =>
                  dispatch({ kind: "selectAction", actionType: at })
                }
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors text-white",
                  ACTION_BG[at],
                  selected ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-[1.02]" : "",
                )}
              >
                <span className="text-xl font-bold w-7 text-center shrink-0">
                  {ACTION_ICON[at]}
                </span>
                <span className="flex-1 font-semibold text-sm">
                  {ACTION_LABEL[at]}
                </span>
                {selected && (
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-80" />
                )}
              </button>
            );
          })}
        </div>

        {/* Column 3 — Results ─────────────────────────────────────── */}
        <div
          className={cn(
            colBase,
            "w-[33%]",
            !resultActive && "opacity-40 pointer-events-none",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 shrink-0">
            Resultado
          </p>
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">
              Seleciona jogadora e acção primeiro.
            </p>
          )}
          {results.map((r) => (
            <button
              key={r}
              onClick={() =>
                resultActive
                  ? dispatch({ kind: "selectResult", result: r })
                  : undefined
              }
              disabled={!resultActive}
              className={cn(
                "w-full rounded-xl px-4 py-4 text-left font-bold text-base transition-all",
                RESULT_COLOR[r],
                resultActive ? "active:scale-95" : "cursor-default",
              )}
            >
              {RESULT_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Step hint bar ─────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-1.5 border-t bg-muted/40 flex items-center gap-2 text-xs text-muted-foreground">
        <StepDot active={playerActive} done={step === "action" || step === "result"} label="Jogadora" />
        <span className="opacity-30">›</span>
        <StepDot active={actionActive} done={step === "result"} label="Acção" />
        <span className="opacity-30">›</span>
        <StepDot active={resultActive} done={false} label="Resultado" />
        <span className="ml-auto font-medium">
          {state.log.length} acções registadas
        </span>
      </div>
    </div>
  );
}

function StepDot({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : done
            ? "text-emerald-600"
            : "text-muted-foreground/50",
      )}
    >
      {label}
    </span>
  );
}
