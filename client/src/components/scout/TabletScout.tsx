import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  RotateCw,
  Sparkles,
  Undo2,
  Volleyball,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PlanGate } from "@/components/PlanGate";
import { LivePlayerStatsPanel } from "@/components/scout/LivePlayerStatsPanel";
import { SuggestionsPanel } from "@/components/scout/SuggestionsPanel";
import { TacticalAssistantPanel } from "@/components/scout/TacticalAssistantPanel";
import type { ScoutDispatch, ScoutState } from "@/hooks/useScoutState";
import type { Player } from "@shared/schema";
import {
  ACTION_LABEL,
  ACTION_TYPES,
  RESULT_COLOR,
  RESULT_LABEL,
  RESULTS_BY_ACTION,
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
  teamId: string;
  matchId: string;
  suggestions: ReturnType<typeof import("@/lib/suggestions").buildSuggestions>;
  hasHistory: boolean;
  rotationStats: Array<{ rotation: number; sideOutPct: number }>;
  players: Player[];
}

type SheetTab = "suggestions" | "stats";

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
  teamId,
  matchId,
  suggestions,
  hasHistory,
  rotationStats,
  players,
}: TabletScoutProps) {
  const { step, playerId, actionType } = state;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<SheetTab>("suggestions");

  // Tablet mode não usa o campo — salta os passos de zona automaticamente.
  useEffect(() => {
    if (step === "zone" || step === "zoneFrom" || step === "zoneTo") {
      dispatch({ kind: "skipZone" });
    }
  }, [step, dispatch]);

  const results = actionType ? RESULTS_BY_ACTION[actionType] : [];

  const playerActive = step === "idle" || step === "player";
  const actionActive = step === "action";
  const resultActive = step === "result";

  const colBase = "flex flex-col gap-2 overflow-y-auto p-3 h-full";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground select-none">

      {/* ── Score bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col border-b bg-card shrink-0">
        {/* Top row */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-sm font-medium text-muted-foreground">Set {setNumber}</span>
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
              variant={sheetOpen ? "secondary" : "outline"}
              className="h-10 px-3 gap-1.5"
              onClick={() => setSheetOpen((v) => !v)}
              title="Assistente tático"
            >
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Assistente</span>
            </Button>
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

        {/* Formation row */}
        <div className="flex items-center gap-3 px-4 pb-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rot</span>
            <span className="text-sm font-bold tabular-nums bg-muted px-2 py-0.5 rounded-md">{state.rotation}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Volleyball className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-muted-foreground">
              {state.servingTeam === "home" ? "A servir" : "A receber"}
            </span>
          </div>
          {/* Mini court */}
          <div className="flex flex-col gap-0.5 mx-2">
            <div className="flex gap-1">
              {[4, 3, 2].map((pos) => {
                const player = lineup[(pos - state.rotation + 6) % 6];
                return (
                  <div
                    key={pos}
                    className={cn(
                      "w-9 h-7 rounded flex items-center justify-center text-xs font-bold tabular-nums border",
                      player ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground",
                    )}
                    title={player ? `${player.firstName} ${player.lastName} (P${pos})` : `P${pos} vazio`}
                  >
                    {player?.number ?? "—"}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1">
              {[5, 6, 1].map((pos) => {
                const player = lineup[(pos - state.rotation + 6) % 6];
                const isServePos = pos === 1;
                return (
                  <div
                    key={pos}
                    className={cn(
                      "w-9 h-7 rounded flex items-center justify-center text-xs font-bold tabular-nums border",
                      player ? "bg-card border-border text-foreground" : "bg-muted border-border text-muted-foreground",
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
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest -ml-1 hidden sm:block">rede ↑</span>
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

      {/* ── Quick points (só no passo idle) ───────────────────────── */}
      <AnimatePresence>
        {step === "idle" && (
          <motion.div
            className="flex gap-2 px-3 py-2 border-b bg-muted/20 shrink-0"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 transition-all"
              onClick={() => dispatch({ kind: "quickPoint", winner: "home" })}
            >
              <span className="text-lg leading-none">✓</span>
              Ponto nosso
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm bg-red-600 hover:bg-red-500 text-white active:scale-95 transition-all"
              onClick={() => dispatch({ kind: "quickPoint", winner: "away" })}
            >
              <span className="text-lg leading-none">✗</span>
              Ponto deles
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3-column grid ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 divide-x">

        {/* Column 1 — Players (grid) ──────────────────────────────── */}
        <div className={cn(colBase, "w-[34%]", !playerActive && "opacity-40 pointer-events-none")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 shrink-0">
            Jogadora
          </p>

          {onCourt.length > 0 && (
            <>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide px-1 -mb-0.5 shrink-0">
                Em campo
              </p>
              <div className="grid grid-cols-3 gap-1.5 shrink-0">
                {onCourt.map((p) => {
                  const selected = playerId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => dispatch({ kind: "selectPlayer", playerId: p.id })}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl py-2.5 px-1 border transition-all active:scale-95",
                        selected
                          ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-1"
                          : "bg-card border-border hover:bg-accent",
                      )}
                    >
                      <span className={cn("text-xl font-black tabular-nums leading-none",
                        selected ? "text-primary-foreground" : "text-primary")}>
                        {p.number}
                      </span>
                      <span className={cn("text-[10px] mt-0.5 truncate w-full text-center leading-tight",
                        selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {p.firstName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {bench.length > 0 && (
            <>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide px-1 mt-1 -mb-0.5 shrink-0">
                Banco
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {bench.map((p) => {
                  const selected = playerId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => dispatch({ kind: "selectPlayer", playerId: p.id })}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl py-2.5 px-1 border transition-all active:scale-95",
                        selected
                          ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-1 opacity-100"
                          : "bg-card border-border hover:bg-accent opacity-50",
                      )}
                    >
                      <span className={cn("text-xl font-black tabular-nums leading-none",
                        selected ? "text-primary-foreground" : "text-muted-foreground")}>
                        {p.number}
                      </span>
                      <span className={cn("text-[10px] mt-0.5 truncate w-full text-center leading-tight",
                        selected ? "text-primary-foreground/80" : "text-muted-foreground/60")}>
                        {p.firstName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {onCourt.length === 0 && bench.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">Sem jogadoras configuradas.</p>
          )}
        </div>

        {/* Column 2 — Actions ──────────────────────────────────────── */}
        <div className={cn(colBase, "w-[33%]", !actionActive && "opacity-40 pointer-events-none")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 shrink-0">
            Acção
          </p>
          {ACTION_TYPES.map((at) => {
            const selected = actionType === at;
            return (
              <button
                key={at}
                onClick={() => dispatch({ kind: "selectAction", actionType: at })}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all text-white active:scale-95",
                  ACTION_BG[at],
                  selected ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-[1.02]" : "",
                )}
              >
                <span className="text-xl font-bold w-7 text-center shrink-0">{ACTION_ICON[at]}</span>
                <span className="flex-1 font-semibold text-sm">{ACTION_LABEL[at]}</span>
              </button>
            );
          })}
        </div>

        {/* Column 3 — Results ─────────────────────────────────────── */}
        <div className={cn(colBase, "w-[33%]", !resultActive && "opacity-40 pointer-events-none")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 shrink-0">
            Resultado
          </p>
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">Seleciona jogadora e acção primeiro.</p>
          )}
          {results.map((r) => (
            <button
              key={r}
              onClick={() => resultActive ? dispatch({ kind: "selectResult", result: r }) : undefined}
              disabled={!resultActive}
              className={cn(
                "w-full rounded-xl px-4 py-4 text-left font-bold text-base transition-all active:scale-95",
                RESULT_COLOR[r],
                resultActive ? "" : "cursor-default",
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
        <span className="ml-auto font-medium">{state.log.length} acções</span>
      </div>

      {/* ── Bottom sheet ──────────────────────────────────────────── */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              className="absolute inset-0 bg-black/40 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-20 bg-background border-t rounded-t-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "65vh" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              {/* Sheet header */}
              <div className="flex items-center gap-1 px-4 py-3 border-b shrink-0">
                <button
                  onClick={() => setSheetTab("suggestions")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    sheetTab === "suggestions"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Sugestões
                </button>
                <button
                  onClick={() => setSheetTab("stats")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    sheetTab === "stats"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Estatísticas
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-8 w-8 p-0"
                  onClick={() => setSheetOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Sheet content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sheetTab === "suggestions" && (
                  <>
                    <TacticalAssistantPanel
                      teamId={teamId}
                      matchId={matchId}
                      opponent={opponentName}
                      setNumber={state.setNumber}
                      homeScore={state.homeScore}
                      awayScore={state.awayScore}
                      servingTeam={state.servingTeam}
                      rotation={state.rotation}
                      log={state.log}
                      onCourt={onCourt}
                      rotationStats={rotationStats}
                    />
                    <PlanGate feature="aiLiveSuggestions" overlay>
                      <SuggestionsPanel
                        suggestions={suggestions}
                        hasLog={state.log.length > 0}
                        hasHistory={hasHistory}
                      />
                    </PlanGate>
                  </>
                )}
                {sheetTab === "stats" && (
                  <LivePlayerStatsPanel
                    log={state.log}
                    players={players}
                    onCourt={onCourt}
                    currentSet={state.setNumber}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
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
