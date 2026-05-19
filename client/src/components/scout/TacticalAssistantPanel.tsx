import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Brain,
  Zap,
  Clock,
  Target,
  RefreshCw,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { LoggedAction, Side } from "@/hooks/useScoutState";
import type { Player } from "@shared/schema";

interface TacticalSuggestion {
  type: "timeout" | "serve" | "sub" | "rotation" | "attack" | "defense";
  text: string;
  urgency: "high" | "medium" | "low";
}

interface Props {
  teamId: string;
  matchId: string;
  opponent: string;
  setNumber: number;
  homeScore: number;
  awayScore: number;
  servingTeam: Side;
  rotation: number;
  log: LoggedAction[];
  onCourt: Player[];
  rotationStats: Array<{ rotation: number; sideOutPct: number }>;
}

const TYPE_META = {
  timeout: {
    icon: Clock,
    color:
      "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:text-red-400",
  },
  serve: {
    icon: Zap,
    color:
      "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400",
  },
  sub: {
    icon: ArrowRight,
    color:
      "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400",
  },
  rotation: {
    icon: Brain,
    color:
      "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  },
  attack: {
    icon: Target,
    color:
      "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  defense: {
    icon: Shield,
    color:
      "text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400",
  },
};

export function TacticalAssistantPanel({
  teamId,
  matchId: _matchId,
  opponent,
  setNumber,
  homeScore,
  awayScore,
  servingTeam,
  rotation,
  log,
  onCourt,
  rotationStats,
}: Props) {
  const [aiSuggestions, setAiSuggestions] = useState<TacticalSuggestion[]>([]);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null);
  const lastRotationRef = useRef(rotation);

  const terminalResults = ["kill", "ace", "error", "blocked", "stuff", "won", "lost"];

  // Rule-based auto alerts (instant, no AI call needed)
  const autoAlerts = useMemo(() => {
    const alerts: Array<{
      type: TacticalSuggestion["type"];
      text: string;
      urgency: TacticalSuggestion["urgency"];
      auto: boolean;
    }> = [];

    // Opponent run: count consecutive actions where opponent scored
    const rallies = log
      .filter((a) => terminalResults.includes(a.result))
      .slice(-6);
    let run = 0;
    for (let i = rallies.length - 1; i >= 0; i--) {
      const a = rallies[i];
      const opponentScored =
        (a.side === "home" && (a.result === "error" || a.result === "blocked")) ||
        (a.side === "away" && (a.result === "kill" || a.result === "ace"));
      if (opponentScored) run++;
      else break;
    }

    if (run >= 3) {
      alerts.push({
        type: "timeout",
        text: `Adversário em ${run} pontos consecutivos — considera pedir tempo`,
        urgency: "high",
        auto: true,
      });
    }

    // Rotation weakness alert
    const rotStat = rotationStats.find((r) => r.rotation === rotation);
    if (rotStat && rotStat.sideOutPct < 45 && servingTeam === "away") {
      alerts.push({
        type: "rotation",
        text: `Rotação ${rotation} historicamente fraca (${rotStat.sideOutPct}% side-out) — reforça o bloco`,
        urgency: "medium",
        auto: true,
      });
    }

    // Set point situation
    const maxScore = Math.max(homeScore, awayScore);
    const isSetPoint =
      (maxScore >= 24 && Math.abs(homeScore - awayScore) >= 1) ||
      (setNumber >= 5 && maxScore >= 14 && Math.abs(homeScore - awayScore) >= 1);
    const weLeading = homeScore > awayScore;
    if (isSetPoint) {
      alerts.push({
        type: "attack",
        text: weLeading
          ? "Set Point! Mantém a pressão — não mudes o que está a funcionar"
          : "Set Point adversário — arrisca no serviço, não tens nada a perder",
        urgency: "high",
        auto: true,
      });
    }

    return alerts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log.length, rotation, homeScore, awayScore, servingTeam, rotationStats, setNumber]);

  const mutation = useMutation({
    mutationFn: async () => {
      const recentActions = log.slice(-15).map((a) => ({
        type: a.type,
        result: a.result,
        playerNumber: onCourt.find((p) => p.id === a.playerId)?.number,
        zone: a.zoneFrom ?? undefined,
      }));

      const attacks = log.filter((a) => a.type === "attack" && a.side === "home");
      const teamKillPctToday = attacks.length
        ? Math.round(
            (attacks.filter((a) => a.result === "kill").length / attacks.length) * 100,
          )
        : 0;

      const receptions = log.filter(
        (a) => a.type === "reception" && a.side === "home",
      );
      const teamSideOutPctToday = receptions.length
        ? Math.round(
            (receptions.filter((a) => a.result !== "error").length /
              receptions.length) *
              100,
          )
        : 0;

      // Struggling players: >=4 attacks, kill% < 30%
      const byPlayer = new Map<string, { kills: number; total: number }>();
      for (const a of log) {
        if (a.type !== "attack" || !a.playerId || a.side !== "home") continue;
        const cur = byPlayer.get(a.playerId) ?? { kills: 0, total: 0 };
        cur.total++;
        if (a.result === "kill") cur.kills++;
        byPlayer.set(a.playerId, cur);
      }
      const strugglingPlayers = [...byPlayer.entries()]
        .filter(([, s]) => s.total >= 4 && s.kills / s.total < 0.3)
        .map(([id, s]) => {
          const p = onCourt.find((pl) => pl.id === id);
          return { number: p?.number ?? 0, name: p?.firstName ?? "?", ...s };
        });

      // Opponent run (same logic as autoAlerts)
      const rallies = log
        .filter((a) => terminalResults.includes(a.result))
        .slice(-6);
      let opponentRun = 0;
      for (let i = rallies.length - 1; i >= 0; i--) {
        const a = rallies[i];
        const opponentScored =
          (a.side === "home" &&
            (a.result === "error" || a.result === "blocked")) ||
          (a.side === "away" && (a.result === "kill" || a.result === "ace"));
        if (opponentScored) opponentRun++;
        else break;
      }

      const rotStat = rotationStats.find((r) => r.rotation === rotation);

      return api.post<{ suggestions: TacticalSuggestion[] }>("/api/ai/tactical", {
        teamId,
        context: {
          opponent,
          setNumber,
          homeScore,
          awayScore,
          servingTeam,
          rotation,
          recentActions,
          teamKillPctToday,
          teamSideOutPctToday,
          rotationSeasonSideOut: rotStat?.sideOutPct ?? null,
          strugglingPlayers,
          opponentRun,
        },
      });
    },
    onSuccess: (data) => {
      setAiSuggestions(data.suggestions);
      setLastAnalyzedAt(new Date());
    },
  });

  const requestAnalysis = () => mutation.mutate();

  // Auto-trigger AI when rotation changes (with small delay)
  useEffect(() => {
    if (rotation !== lastRotationRef.current && log.length > 0) {
      lastRotationRef.current = rotation;
      const timer = setTimeout(() => requestAnalysis(), 800);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation]);

  return (
    <div className="rounded-xl border bg-card p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Brain className="h-3.5 w-3.5" />
          Assistente Tático
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5"
          onClick={requestAnalysis}
          disabled={mutation.isPending || log.length < 3}
        >
          {mutation.isPending ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Brain className="h-3 w-3" />
          )}
          {mutation.isPending ? "A analisar…" : "Analisar"}
        </Button>
      </div>

      {/* Auto alerts */}
      {autoAlerts.length > 0 && (
        <ul className="space-y-1.5">
          {autoAlerts.map((a, i) => {
            const meta = TYPE_META[a.type];
            const Icon = meta.icon;
            return (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs",
                  meta.color,
                  a.urgency === "high" && "animate-pulse",
                )}
              >
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{a.text}</span>
              </li>
            );
          })}
        </ul>
      )}

      {/* AI suggestions */}
      {lastAnalyzedAt && aiSuggestions.length > 0 && (
        <>
          {autoAlerts.length > 0 && <div className="border-t" />}
          <div className="text-[10px] text-muted-foreground">
            IA ·{" "}
            {lastAnalyzedAt.toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <ul className="space-y-1.5">
            {aiSuggestions.map((s, i) => {
              const meta = TYPE_META[s.type] ?? TYPE_META.attack;
              const Icon = meta.icon;
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs",
                    meta.color,
                  )}
                >
                  <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{s.text}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Empty state */}
      {autoAlerts.length === 0 && !lastAnalyzedAt && (
        <p className="text-xs text-muted-foreground text-center py-2">
          {log.length < 3
            ? "Regista algumas acções para ativar o assistente"
            : 'Clica "Analisar" para sugestões táticas IA'}
        </p>
      )}
    </div>
  );
}
