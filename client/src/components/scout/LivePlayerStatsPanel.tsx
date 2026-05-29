import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Gauge } from "lucide-react";
import type { Player } from "@shared/schema";
import type { LoggedAction } from "@/hooks/useScoutState";

interface PlayerStats {
  player: Player;
  kills: number;
  errors: number;
  aces: number;
  stuffs: number;
  attacks: number;
  serves: number;
  serveGood: number;
  servePoor: number;
  receptions: number;
  recPerfect: number;
  recGood: number;
  recPoor: number;
  recError: number;
  pts: number;
  killPct: number | null;
  passRating: number | null;
  serveEffPct: number | null;
}

function computeStats(log: LoggedAction[], players: Player[], setFilter: number | null): PlayerStats[] {
  const filtered = setFilter != null ? log.filter((a) => a.setNumber === setFilter) : log;

  const map = new Map<string, PlayerStats>();
  for (const p of players) {
    map.set(p.id, {
      player: p,
      kills: 0, errors: 0, aces: 0, stuffs: 0,
      attacks: 0, serves: 0, serveGood: 0, servePoor: 0, receptions: 0,
      recPerfect: 0, recGood: 0, recPoor: 0, recError: 0,
      pts: 0, killPct: null, passRating: null, serveEffPct: null,
    });
  }

  for (const a of filtered) {
    if (!a.playerId || a.side !== "home") continue;
    const s = map.get(a.playerId);
    if (!s) continue;

    if (a.type === "attack") {
      s.attacks++;
      if (a.result === "kill") { s.kills++; s.pts++; }
      else if (a.result === "error" || a.result === "blocked") s.errors++;
    } else if (a.type === "serve") {
      s.serves++;
      if (a.result === "ace") { s.aces++; s.pts++; }
      else if (a.result === "error") s.errors++;
      else if (a.result === "good") s.serveGood++;
      else if (a.result === "poor") s.servePoor++;
    } else if (a.type === "reception") {
      s.receptions++;
      if (a.result === "perfect") s.recPerfect++;
      else if (a.result === "good") s.recGood++;
      else if (a.result === "poor") s.recPoor++;
      else if (a.result === "error") { s.recError++; s.errors++; }
    } else if (a.type === "block") {
      if (a.result === "stuff") { s.stuffs++; s.pts++; }
      else if (a.result === "error") s.errors++;
    }
  }

  for (const s of map.values()) {
    s.killPct = s.attacks > 0 ? Math.round((s.kills / s.attacks) * 100) : null;
    const recTotal = s.recPerfect + s.recGood + s.recPoor + s.recError;
    s.passRating = recTotal > 0
      ? Math.round(((s.recPerfect * 3 + s.recGood * 2 + s.recPoor * 1) / (recTotal * 3)) * 10) / 10
      : null;
    s.serveEffPct = s.serves > 0
      ? Math.round(((s.aces - s.errors) / s.serves) * 100)
      : null;
  }

  return [...map.values()].filter((s) =>
    s.attacks + s.serves + s.receptions + s.stuffs > 0,
  );
}

interface Props {
  log: LoggedAction[];
  players: Player[];
  onCourt: Player[];
  currentSet: number;
}

export function LivePlayerStatsPanel({ log, players, onCourt, currentSet }: Props) {
  const [setFilter, setSetFilter] = useState<number | null>(null);

  const sets = useMemo(() => {
    const s = new Set(log.map((a) => a.setNumber));
    return Array.from(s).sort((a, b) => a - b);
  }, [log]);

  const stats = useMemo(
    () => computeStats(log, players, setFilter),
    [log, players, setFilter],
  );

  const onCourtIds = useMemo(() => new Set(onCourt.map((p) => p.id)), [onCourt]);

  if (log.length === 0) return null;

  // Sort: on-court first, then by pts desc.
  const sorted = [...stats].sort((a, b) => {
    const aOnCourt = onCourtIds.has(a.player.id) ? 0 : 1;
    const bOnCourt = onCourtIds.has(b.player.id) ? 0 : 1;
    if (aOnCourt !== bOnCourt) return aOnCourt - bOnCourt;
    return b.pts - a.pts;
  });

  return (
    <div className="rounded-xl border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" />
          Stats em jogo
        </div>
        {/* Set filter tabs */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setSetFilter(null)}
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors",
              setFilter == null
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Tudo
          </button>
          {sets.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSetFilter(s)}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors",
                setFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
                s === currentSet && setFilter !== s && "ring-1 ring-primary/40",
              )}
            >
              S{s}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          Sem dados para este set.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs min-w-[280px]">
            <thead>
              <tr className="text-muted-foreground text-[10px]">
                <th className="text-left font-medium pb-1 pl-1 w-full">Jogadora</th>
                <th className="text-center font-medium pb-1 w-7">Pts</th>
                <th className="text-center font-medium pb-1 w-7">K%</th>
                <th className="text-center font-medium pb-1 w-7">Err</th>
                <th className="text-center font-medium pb-1 w-10" title="Aces e % serviços positivos">Srv</th>
                <th className="text-center font-medium pb-1 w-7">Rec</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {sorted.map(({ player, kills, errors, aces, stuffs, attacks, serves, serveGood, receptions, killPct, passRating, serveEffPct }) => {
                const isOnCourt = onCourtIds.has(player.id);
                const servePosPct = serves > 0 ? Math.round(((aces + serveGood) / serves) * 100) : null;
                return (
                  <tr
                    key={player.id}
                    className={cn(
                      "transition-colors",
                      isOnCourt ? "opacity-100" : "opacity-50",
                    )}
                  >
                    <td className="py-1 pl-1">
                      <span className="font-semibold text-muted-foreground mr-1">
                        #{player.number}
                      </span>
                      <span className="truncate max-w-[80px] inline-block align-bottom">
                        {player.firstName}
                      </span>
                      {!isOnCourt && (
                        <span className="ml-1 text-[9px] text-muted-foreground">(banco)</span>
                      )}
                    </td>
                    <td className="text-center py-1">
                      <span className={cn("font-bold", (kills + aces + stuffs) > 0 && "text-emerald-600 dark:text-emerald-400")}>
                        {kills + aces + stuffs}
                      </span>
                    </td>
                    <td className="text-center py-1">
                      {attacks > 0 ? (
                        <span className={cn(
                          "font-medium",
                          (killPct ?? 0) >= 40 ? "text-emerald-600 dark:text-emerald-400"
                            : (killPct ?? 0) >= 25 ? "text-foreground"
                            : "text-red-500",
                        )}>
                          {killPct}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="text-center py-1">
                      <span className={cn(errors > 0 && "text-red-500 font-medium")}>
                        {errors > 0 ? errors : "—"}
                      </span>
                    </td>
                    <td className="text-center py-1">
                      {serves > 0 ? (
                        <span className={cn(
                          "font-medium text-[10px]",
                          (servePosPct ?? 0) >= 50 ? "text-emerald-600 dark:text-emerald-400"
                            : (servePosPct ?? 0) >= 25 ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                          title={`Serviços: ${serves} · Aces: ${aces} · Positivos: ${serveGood}${serveEffPct != null ? ` · Eficiência DV: ${serveEffPct >= 0 ? "+" : ""}${serveEffPct}%` : ""}`}
                        >
                          {aces > 0 ? `${aces}A` : "—"}
                          {servePosPct != null && servePosPct > 0 && (
                            <span className="text-muted-foreground/60"> {servePosPct}%</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="text-center py-1">
                      {receptions > 0 ? (
                        <span className={cn(
                          "font-medium text-[10px]",
                          (passRating ?? 0) >= 0.7 ? "text-emerald-600 dark:text-emerald-400"
                            : (passRating ?? 0) >= 0.5 ? "text-foreground"
                            : "text-red-500",
                        )}>
                          {passRating?.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[9px] text-muted-foreground/50">
        Pts = kills + aces + blocos · K% = kill% · Srv = aces + % serviços positivos · Rec = rating recepção
      </p>
    </div>
  );
}
