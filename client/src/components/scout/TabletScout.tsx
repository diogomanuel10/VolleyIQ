import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight, Brain, ChevronLeft, ChevronRight,
  RotateCw, Sparkles, Undo2, Volleyball, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { PlanGate } from "@/components/PlanGate";
import { SuggestionsPanel } from "@/components/scout/SuggestionsPanel";
import { TacticalAssistantPanel } from "@/components/scout/TacticalAssistantPanel";
import type { LoggedAction, ScoutDispatch, ScoutState } from "@/hooks/useScoutState";
import type { Player, Substitution } from "@shared/schema";
import {
  ACTION_LABEL,
  ACTION_TYPES,
  RESULT_COLOR,
  RESULT_LABEL,
  RESULTS_BY_ACTION,
  type ActionType,
} from "@shared/types";

// ── Compact strip stats (all players) ─────────────────────────────────────
function useCompactStats(log: LoggedAction[], players: Player[], setFilter: number | null) {
  return useMemo(() => {
    const filtered = setFilter != null ? log.filter((a) => a.setNumber === setFilter) : log;
    const map = new Map<string, { pts: number; kills: number; errors: number; aces: number }>();
    for (const a of filtered) {
      if (!a.playerId) continue;
      const s = map.get(a.playerId) ?? { pts: 0, kills: 0, errors: 0, aces: 0 };
      if ((a.type === "attack" && a.result === "kill") || (a.type === "block" && a.result === "stuff")) {
        s.kills++; s.pts++;
      } else if (a.type === "serve" && a.result === "ace") {
        s.aces++; s.pts++;
      } else if (a.result === "error" || (a.type === "attack" && a.result === "blocked")) {
        s.errors++;
      }
      map.set(a.playerId, s);
    }
    return players
      .filter((p) => map.has(p.id))
      .map((p) => ({ player: p, ...map.get(p.id)! }))
      .sort((a, b) => b.pts - a.pts || b.kills - a.kills);
  }, [log, players, setFilter]);
}

// ── Detailed stats for one player ─────────────────────────────────────────
function usePlayerDetailStats(log: LoggedAction[], playerId: string | null, setFilter: number | null) {
  return useMemo(() => {
    if (!playerId) return null;
    const filtered = setFilter != null ? log.filter((a) => a.setNumber === setFilter) : log;
    const s = {
      attacks: 0, kills: 0, errors: 0, aces: 0, stuffs: 0,
      serves: 0, receptions: 0, recPerfect: 0, recGood: 0, recPoor: 0, recError: 0,
      blocks: 0, digs: 0, pts: 0,
    };
    for (const a of filtered) {
      if (a.playerId !== playerId || a.side !== "home") continue;
      if (a.type === "attack") {
        s.attacks++;
        if (a.result === "kill") { s.kills++; s.pts++; }
        else if (a.result === "error" || a.result === "blocked") s.errors++;
      } else if (a.type === "serve") {
        s.serves++;
        if (a.result === "ace") { s.aces++; s.pts++; }
        else if (a.result === "error") s.errors++;
      } else if (a.type === "reception") {
        s.receptions++;
        if (a.result === "perfect") s.recPerfect++;
        else if (a.result === "good") s.recGood++;
        else if (a.result === "poor") s.recPoor++;
        else if (a.result === "error") { s.recError++; s.errors++; }
      } else if (a.type === "block") {
        s.blocks++;
        if (a.result === "stuff") { s.stuffs++; s.pts++; }
        else if (a.result === "error") s.errors++;
      } else if (a.type === "dig") {
        s.digs++;
      }
    }
    const recTotal = s.recPerfect + s.recGood + s.recPoor + s.recError;
    const killPct = s.attacks > 0 ? Math.round((s.kills / s.attacks) * 100) : null;
    const passRating = recTotal > 0
      ? Math.round(((s.recPerfect * 3 + s.recGood * 2 + s.recPoor * 1) / (recTotal * 3)) * 10) / 10
      : null;
    const hasData = s.attacks + s.serves + s.receptions + s.blocks + s.digs > 0;
    return hasData ? { ...s, killPct, passRating, recTotal } : null;
  }, [log, playerId, setFilter]);
}

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
  onSubCreated?: (sub: Substitution) => void;
}

const ACTION_ICON: Record<ActionType, string> = {
  serve: "S", reception: "R", set: "E",
  attack: "A", block: "B", dig: "D", freeball: "F",
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
  onSubCreated,
}: TabletScoutProps) {
  const { step, playerId, actionType } = state;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [subSheetOpen, setSubSheetOpen] = useState(false);
  const [subOut, setSubOut] = useState<Player | null>(null);
  const [statsSetFilter, setStatsSetFilter] = useState<number | null>(null);

  const availableSets = useMemo(() => {
    const s = new Set(state.log.map((a) => a.setNumber));
    return Array.from(s).sort((a, b) => a - b);
  }, [state.log]);

  const compactStats = useCompactStats(state.log, players, statsSetFilter);
  const selectedPlayer = players.find((p) => p.id === playerId) ?? null;
  const playerDetail = usePlayerDetailStats(state.log, playerId, statsSetFilter);

  // Substitution mutation
  const subMutation = useMutation({
    mutationFn: ({ outId, inId }: { outId: string; inId: string }) =>
      api.post<Substitution>(`/api/matches/${matchId}/substitutions`, {
        setNumber: state.setNumber,
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        playerOutId: outId,
        playerInId: inId,
      }),
    onSuccess: (sub) => {
      toast.success("Substituição registada");
      onSubCreated?.(sub);
      setSubOut(null);
      setSubSheetOpen(false);
    },
    onError: () => toast.error("Erro ao registar substituição"),
  });

  // Tablet mode — skip zone steps
  useEffect(() => {
    if (step === "zone" || step === "zoneFrom" || step === "zoneTo") {
      dispatch({ kind: "skipZone" });
    }
  }, [step, dispatch]);

  const results = actionType ? RESULTS_BY_ACTION[actionType] : [];
  const actionActive = step === "action";
  const resultActive = step === "result";
  const colBase = "flex flex-col gap-2 overflow-y-auto p-3 h-full";

  // Last 6 actions reversed (most recent first)
  const recentActions = useMemo(
    () => [...state.log].reverse().slice(0, 7),
    [state.log],
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground select-none">

      {/* ── Score bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col border-b bg-card shrink-0">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Set navigation */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors disabled:opacity-30"
                onClick={() => dispatch({ kind: "prevSet" })}
                disabled={state.setNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold px-1 tabular-nums">Set {setNumber}</span>
              <button
                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors disabled:opacity-30"
                onClick={() => dispatch({ kind: "nextSet" })}
                disabled={state.setNumber >= 5}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

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
              className="h-10 px-3 gap-1.5"
              onClick={() => { setSubSheetOpen(true); setSubOut(null); }}
              title="Substituição"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Sub</span>
            </Button>
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
                const isServe = pos === 1 && state.servingTeam === "home";
                return (
                  <div
                    key={pos}
                    className={cn(
                      "w-9 h-7 rounded flex items-center justify-center text-xs font-bold tabular-nums border",
                      player ? "bg-card border-border text-foreground" : "bg-muted border-border text-muted-foreground",
                      isServe && "ring-1 ring-amber-400 bg-amber-50 dark:bg-amber-950/20",
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
            size="sm" variant="ghost"
            className="h-8 px-2 ml-auto shrink-0"
            onClick={() => dispatch({ kind: "rotate", direction: 1 })}
          >
            <RotateCw className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Rodar</span>
          </Button>
        </div>
      </div>

      {/* ── Quick points (idle only) ───────────────────────────────── */}
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
              <span className="text-lg leading-none">✓</span> Ponto nosso
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm bg-red-600 hover:bg-red-500 text-white active:scale-95 transition-all"
              onClick={() => dispatch({ kind: "quickPoint", winner: "away" })}
            >
              <span className="text-lg leading-none">✗</span> Ponto deles
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3-column grid ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 divide-x">

        {/* Column 1 — Players ─────────────────────────────────────── */}
        <div className={cn(colBase, "w-[34%]")}>
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

        {/* Column 2 — Actions (square grid) ───────────────────────── */}
        <div className={cn(colBase, "w-[33%]", !actionActive && "opacity-40 pointer-events-none")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 shrink-0">
            Acção
          </p>
          <div className="grid grid-cols-2 gap-2 flex-1">
            {ACTION_TYPES.map((at, i) => {
              const selected = actionType === at;
              const isLast = i === ACTION_TYPES.length - 1;
              const isOdd = ACTION_TYPES.length % 2 !== 0;
              return (
                <button
                  key={at}
                  onClick={() => dispatch({ kind: "selectAction", actionType: at })}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-xl text-white active:scale-95 transition-all min-h-[72px]",
                    ACTION_BG[at],
                    selected && "ring-2 ring-white ring-offset-2 ring-offset-background scale-[1.02]",
                    isLast && isOdd && "col-span-2",
                  )}
                >
                  <span className="text-2xl font-black leading-none">{ACTION_ICON[at]}</span>
                  <span className="text-xs font-semibold leading-none">{ACTION_LABEL[at]}</span>
                </button>
              );
            })}
          </div>
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
                !resultActive && "cursor-default",
              )}
            >
              {RESULT_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats em jogo ─────────────────────────────────────────── */}
      {state.log.length > 0 && (
        <div className="shrink-0 border-t bg-muted/20">

          {/* Header: label + set filter tabs */}
          <div className="flex items-center gap-2 px-3 py-1 border-b border-border/40">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
              Stats
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setStatsSetFilter(null)}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors",
                  statsSetFilter === null
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Tudo
              </button>
              {availableSets.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatsSetFilter(s)}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors",
                    statsSetFilter === s
                      ? "bg-primary text-primary-foreground"
                      : s === setNumber
                        ? "text-foreground ring-1 ring-primary/40"
                        : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  S{s}
                </button>
              ))}
            </div>
            <span className="ml-auto text-[10px] text-muted-foreground/50 tabular-nums">
              {state.log.length} ações
            </span>
          </div>

          {/* Selected player detail */}
          <AnimatePresence>
            {selectedPlayer && playerDetail && (
              <motion.div
                key={selectedPlayer.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="px-3 py-2 bg-primary/5 border-b border-border/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-black text-sm text-primary tabular-nums">#{selectedPlayer.number}</span>
                    <span className="text-xs font-semibold">{selectedPlayer.firstName} {selectedPlayer.lastName}</span>
                    <span className="ml-auto text-xs font-bold text-emerald-600 tabular-nums">{playerDetail.pts} pts</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {playerDetail.attacks > 0 && (
                      <StatChip label="Ataque" main={`${playerDetail.kills}/${playerDetail.attacks}`}
                        sub={playerDetail.killPct != null ? `${playerDetail.killPct}% K` : undefined} color="emerald" />
                    )}
                    {playerDetail.serves > 0 && (
                      <StatChip label="Serviço" main={`${playerDetail.serves}`}
                        sub={playerDetail.aces > 0 ? `${playerDetail.aces} ace` : undefined} color="sky" />
                    )}
                    {playerDetail.receptions > 0 && (
                      <StatChip label="Recepção" main={`${playerDetail.receptions}`}
                        sub={playerDetail.passRating != null ? `★ ${playerDetail.passRating.toFixed(1)}` : undefined} color="violet" />
                    )}
                    {playerDetail.blocks > 0 && (
                      <StatChip label="Bloco" main={`${playerDetail.blocks}`}
                        sub={playerDetail.stuffs > 0 ? `${playerDetail.stuffs} pt` : undefined} color="slate" />
                    )}
                    {playerDetail.digs > 0 && (
                      <StatChip label="Defesa" main={`${playerDetail.digs}`} color="teal" />
                    )}
                    {playerDetail.errors > 0 && (
                      <StatChip label="Erros" main={`${playerDetail.errors}`} color="red" />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compact strip — all players */}
          {compactStats.length > 0 && (
            <div className="px-3 py-1.5 overflow-x-auto">
              <div className="flex gap-1.5 min-w-max">
                {compactStats.map(({ player, kills, errors, aces, pts }) => {
                  const isOnCourt = onCourt.some((p) => p.id === player.id);
                  const isSelected = player.id === playerId;
                  return (
                    <button
                      key={player.id}
                      onClick={() => dispatch({ kind: "selectPlayer", playerId: player.id })}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2 py-1 border text-xs transition-all active:scale-95",
                        isSelected
                          ? "bg-primary/10 border-primary ring-1 ring-primary"
                          : isOnCourt
                            ? "bg-card border-border hover:bg-accent"
                            : "bg-muted/40 border-border/50 opacity-60 hover:opacity-80",
                      )}
                    >
                      <span className="font-bold text-primary tabular-nums w-5 text-center">{player.number}</span>
                      <span className="text-muted-foreground truncate max-w-[52px]">{player.firstName}</span>
                      <div className="flex items-center gap-1 font-medium tabular-nums">
                        {kills > 0 && <span className="text-emerald-600">{kills}K</span>}
                        {aces > 0 && <span className="text-sky-500">{aces}A</span>}
                        {errors > 0 && <span className="text-red-500">{errors}E</span>}
                        <span className="text-muted-foreground/50 font-normal">{pts}p</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Últimas ações ─────────────────────────────────────────── */}
      {recentActions.length > 0 && (
        <div className="shrink-0 border-t bg-background px-3 py-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max items-center">
            <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground/60 shrink-0 mr-1">
              Últimas
            </span>
            {recentActions.map((a, i) => {
              const p = players.find((pl) => pl.id === a.playerId);
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-sm"
                >
                  {p && (
                    <span className="font-black text-primary tabular-nums">#{p.number}</span>
                  )}
                  <span className="font-bold text-muted-foreground">
                    {ACTION_ICON[a.type as ActionType] ?? a.type}
                  </span>
                  <span className={cn("font-semibold", RESULT_COLOR[a.result as keyof typeof RESULT_COLOR])}>
                    {RESULT_LABEL[a.result as keyof typeof RESULT_LABEL] ?? a.result}
                  </span>
                  {a.side === "away" && (
                    <span className="text-[10px] text-muted-foreground/50">(adv)</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step hint bar ─────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-1.5 border-t bg-muted/40 flex items-center gap-2 text-xs text-muted-foreground">
        <StepDot active={step === "idle" || step === "player"} done={step === "action" || step === "result"} label="Jogadora" />
        <span className="opacity-30">›</span>
        <StepDot active={step === "action"} done={step === "result"} label="Acção" />
        <span className="opacity-30">›</span>
        <StepDot active={step === "result"} done={false} label="Resultado" />
      </div>

      {/* ── Bottom sheet: Assistente ──────────────────────────────── */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div className="absolute inset-0 bg-black/40 z-10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)} />
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-20 bg-background border-t rounded-t-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "65vh" }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Assistente tático</span>
                <Button size="sm" variant="ghost" className="ml-auto h-8 w-8 p-0" onClick={() => setSheetOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <TacticalAssistantPanel
                  teamId={teamId} matchId={matchId} opponent={opponentName}
                  setNumber={state.setNumber} homeScore={state.homeScore} awayScore={state.awayScore}
                  servingTeam={state.servingTeam} rotation={state.rotation}
                  log={state.log} onCourt={onCourt} rotationStats={rotationStats}
                />
                <PlanGate feature="aiLiveSuggestions" overlay>
                  <SuggestionsPanel suggestions={suggestions} hasLog={state.log.length > 0} hasHistory={hasHistory} />
                </PlanGate>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Bottom sheet: Substituição ────────────────────────────── */}
      <AnimatePresence>
        {subSheetOpen && (
          <>
            <motion.div className="absolute inset-0 bg-black/40 z-10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setSubSheetOpen(false); setSubOut(null); }} />
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-20 bg-background border-t rounded-t-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "70vh" }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">
                  {subOut ? "Quem entra?" : "Quem sai?"}
                </span>
                {subOut && (
                  <span className="ml-2 text-xs bg-muted rounded px-2 py-0.5 font-medium">
                    #{subOut.number} {subOut.firstName} sai
                  </span>
                )}
                <Button size="sm" variant="ghost" className="ml-auto h-8 w-8 p-0"
                  onClick={() => { setSubSheetOpen(false); setSubOut(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!subOut ? (
                  <>
                    <p className="text-xs text-muted-foreground">Seleciona a jogadora que vai sair de campo:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {onCourt.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSubOut(p)}
                          className="flex flex-col items-center justify-center rounded-xl py-4 px-2 border-2 border-border hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all active:scale-95"
                        >
                          <span className="text-2xl font-black tabular-nums text-primary leading-none">{p.number}</span>
                          <span className="text-xs mt-1 text-muted-foreground truncate w-full text-center">{p.firstName}</span>
                          <span className="text-[10px] text-red-500 mt-0.5 font-medium">Sai</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Seleciona a jogadora que vai entrar:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {bench.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => subMutation.mutate({ outId: subOut.id, inId: p.id })}
                          disabled={subMutation.isPending}
                          className="flex flex-col items-center justify-center rounded-xl py-4 px-2 border-2 border-border hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <span className="text-2xl font-black tabular-nums text-muted-foreground leading-none">{p.number}</span>
                          <span className="text-xs mt-1 text-muted-foreground truncate w-full text-center">{p.firstName}</span>
                          <span className="text-[10px] text-emerald-600 mt-0.5 font-medium">Entra</span>
                        </button>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setSubOut(null)}>
                      ← Escolher outra jogadora para sair
                    </Button>
                  </>
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
    <span className={cn(
      "px-2 py-0.5 rounded-full font-medium transition-colors",
      active ? "bg-primary text-primary-foreground" : done ? "text-emerald-600" : "text-muted-foreground/50",
    )}>
      {label}
    </span>
  );
}

type ChipColor = "emerald" | "sky" | "violet" | "slate" | "teal" | "red";
const CHIP_COLOR: Record<ChipColor, string> = {
  emerald: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  sky:     "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800",
  violet:  "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
  slate:   "bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800",
  teal:    "bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800",
  red:     "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
};
const CHIP_TEXT: Record<ChipColor, string> = {
  emerald: "text-emerald-700 dark:text-emerald-400",
  sky:     "text-sky-700 dark:text-sky-400",
  violet:  "text-violet-700 dark:text-violet-400",
  slate:   "text-slate-700 dark:text-slate-400",
  teal:    "text-teal-700 dark:text-teal-400",
  red:     "text-red-600 dark:text-red-400",
};

function StatChip({ label, main, sub, color }: {
  label: string; main: string; sub?: string; color: ChipColor;
}) {
  return (
    <div className={cn("flex flex-col rounded border px-2 py-1 min-w-[52px]", CHIP_COLOR[color])}>
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none mb-0.5">{label}</span>
      <span className={cn("text-sm font-bold tabular-nums leading-none", CHIP_TEXT[color])}>{main}</span>
      {sub && <span className="text-[10px] text-muted-foreground mt-0.5 leading-none">{sub}</span>}
    </div>
  );
}
