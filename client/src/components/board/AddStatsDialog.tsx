import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RotationChartBoardElement } from "@shared/boardTypes";

// ─── Add Stats dialog ─────────────────────────────────────────────────────────

export interface StatOption {
  group: string;
  label: string;
  value: string;
  sublabel: string;
}

export function AddStatsDialog({
  open,
  teamId,
  teamName,
  onClose,
  onAdd,
  onAddRotation,
  onAddPlayerStats,
  onAddZoneHeatmap,
}: {
  open: boolean;
  teamId: string;
  teamName: string;
  onClose: () => void;
  onAdd: (opt: StatOption) => void;
  onAddRotation: (title: string, metric: "sideOut" | "breakPoint", rotations: RotationChartBoardElement["rotations"]) => void;
  onAddPlayerStats: (playerName: string, playerNumber: number, playerPosition: string, metrics: Array<{ label: string; value: string }>) => void;
  onAddZoneHeatmap: (title: string, actionType: "attack" | "serve" | "reception", zones: Array<{ zone: number; count: number; pct: number }>, maxCount: number) => void;
}) {
  const [tab, setTab] = useState<"kpi" | "rotations" | "player" | "zones">("kpi");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: ["stats", teamId, "dashboard"],
    queryFn: () => api.get<{
      sampleMatches: number;
      kpis: { killPct: number; sideOutPct: number; passRating: number; serveAcePct: number; attackEfficiency: number; record: string };
      topScorers: Array<{ playerId: string; name: string; number: number; position: string; kills: number; aces: number; blocks: number; points: number }>;
      rotationStats: Array<{ rotation: number; totalRallies: number; sideOutPct: number; breakPointPct: number; serveRallies: number; receiveRallies: number }>;
    }>(`/api/stats/team/${teamId}/dashboard?teamId=${teamId}`),
    enabled: open,
  });

  const playerSummaryQuery = useQuery({
    queryKey: ["player-summary", selectedPlayerId],
    queryFn: () => api.get<{
      kpis: { killPct: number; attackEff: number; passRating: number; serveAcePct: number; blocks: number };
      attackHeatmap: { zones: Array<{ zone: number; count: number; kills?: number }>; total: number; maxCount: number };
      serveHeatmap: { zones: Array<{ zone: number; count: number; kills?: number }>; total: number; maxCount: number };
      receptionHeatmap: { zones: Array<{ zone: number; count: number }>; total: number; maxCount: number };
    }>(`/api/players/${selectedPlayerId}/summary`),
    enabled: !!selectedPlayerId,
  });

  const stats = statsQuery.data;

  // KPI options (same as before)
  const kpiOptions: StatOption[] = [];
  if (stats) {
    const sub = `${teamName} · ${stats.sampleMatches} jogo${stats.sampleMatches !== 1 ? "s" : ""}`;
    kpiOptions.push(
      { group: "Equipa", label: "Kill %", value: `${stats.kpis.killPct.toFixed(1)}%`, sublabel: sub },
      { group: "Equipa", label: "Side-Out %", value: `${stats.kpis.sideOutPct.toFixed(1)}%`, sublabel: sub },
      { group: "Equipa", label: "Pass Rating", value: stats.kpis.passRating.toFixed(2), sublabel: sub },
      { group: "Equipa", label: "Serve Ace %", value: `${stats.kpis.serveAcePct.toFixed(1)}%`, sublabel: sub },
      { group: "Equipa", label: "Attack Eff.", value: stats.kpis.attackEfficiency.toFixed(3), sublabel: sub },
      { group: "Equipa", label: "Record", value: stats.kpis.record, sublabel: sub },
    );
    for (const p of stats.topScorers) {
      const ps = `#${p.number} ${p.name}`;
      kpiOptions.push(
        { group: p.name, label: "Pontos", value: String(p.points), sublabel: ps },
        { group: p.name, label: "Kills", value: String(p.kills), sublabel: ps },
        { group: p.name, label: "Aces", value: String(p.aces), sublabel: ps },
        { group: p.name, label: "Blocos", value: String(p.blocks), sublabel: ps },
      );
    }
  }
  const kpiGroups = [...new Set(kpiOptions.map((o) => o.group))];

  function handleClose() {
    setSelectedPlayerId(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Inserir estatística</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b pb-2">
          {(["kpi", "rotations", "player", "zones"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedPlayerId(null); }}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              {t === "kpi" ? "Número" : t === "rotations" ? "Rotações" : t === "player" ? "Jogador" : "Zonas"}
            </button>
          ))}
        </div>

        {statsQuery.isLoading && <p className="text-sm text-muted-foreground text-center py-6">A carregar…</p>}

        {/* KPI tab */}
        {!statsQuery.isLoading && tab === "kpi" && (
          <div className="max-h-72 overflow-y-auto space-y-4 mt-1">
            {kpiOptions.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Ainda não há dados suficientes.</p>}
            {kpiGroups.map((group) => (
              <div key={group}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-1">{group}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {kpiOptions.filter((o) => o.group === group).map((opt) => (
                    <button
                      key={`${opt.group}-${opt.label}`}
                      onClick={() => { onAdd(opt); handleClose(); }}
                      className="flex flex-col items-start p-2.5 rounded-lg border hover:bg-accent text-left transition-colors"
                    >
                      <span className="text-xs text-muted-foreground">{opt.label}</span>
                      <span className="text-xl font-black tabular-nums leading-tight">{opt.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rotations tab */}
        {!statsQuery.isLoading && tab === "rotations" && (
          <div className="space-y-3 mt-1">
            {(!stats?.rotationStats?.length) && <p className="text-sm text-muted-foreground text-center py-6">Ainda não há dados de rotações.</p>}
            {stats?.rotationStats && stats.rotationStats.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {(["sideOut", "breakPoint"] as const).map((metric) => {
                    const label = metric === "sideOut" ? "Side-Out por Rotação" : "Break Point por Rotação";
                    const rotations = stats.rotationStats.map((r) => ({
                      rotation: r.rotation,
                      value: metric === "sideOut" ? r.sideOutPct : r.breakPointPct,
                      rallies: metric === "sideOut" ? r.receiveRallies : r.serveRallies,
                    }));
                    return (
                      <button
                        key={metric}
                        onClick={() => { onAddRotation(label, metric, rotations); handleClose(); }}
                        className="p-3 rounded-lg border hover:bg-accent text-left transition-colors"
                      >
                        <p className="text-xs font-semibold mb-2">{label}</p>
                        <div className="flex items-end gap-1 h-12">
                          {rotations.map((r) => {
                            const h = r.rallies === 0 ? 4 : Math.max(4, (r.value / 100) * 40);
                            const col = r.rallies === 0 ? "#6b7280" : r.value >= 60 ? "#22c55e" : r.value < 40 ? "#ef4444" : "#f59e0b";
                            return (
                              <div key={r.rotation} className="flex-1 flex flex-col items-center gap-0.5">
                                <div className="w-full rounded-sm" style={{ height: h, background: col, opacity: 0.85 }} />
                                <span className="text-[8px] text-muted-foreground">R{r.rotation}</span>
                              </div>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Player tab */}
        {!statsQuery.isLoading && tab === "player" && (
          <div className="max-h-72 overflow-y-auto space-y-1 mt-1">
            {(!stats?.topScorers?.length) && <p className="text-sm text-muted-foreground text-center py-6">Ainda não há dados de jogadores.</p>}
            {stats?.topScorers?.map((p) => {
              const metrics = [
                { label: "Kills", value: String(p.kills) },
                { label: "Aces", value: String(p.aces) },
                { label: "Blocos", value: String(p.blocks) },
                { label: "Pontos", value: String(p.points) },
              ];
              return (
                <button
                  key={p.playerId}
                  onClick={() => { onAddPlayerStats(p.name, p.number, p.position, metrics); handleClose(); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg border hover:bg-accent text-left transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                    #{p.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.position} · {p.points} pts · {p.kills} kills</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Zones tab */}
        {!statsQuery.isLoading && tab === "zones" && (
          <div className="mt-1">
            {!selectedPlayerId ? (
              <div className="max-h-64 overflow-y-auto space-y-1">
                <p className="text-xs text-muted-foreground mb-2">Seleciona um jogador:</p>
                {(!stats?.topScorers?.length) && <p className="text-sm text-muted-foreground text-center py-6">Ainda não há dados de jogadores.</p>}
                {stats?.topScorers?.map((p) => (
                  <button
                    key={p.playerId}
                    onClick={() => setSelectedPlayerId(p.playerId)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border hover:bg-accent text-left transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0">#{p.number}</div>
                    <span className="text-sm font-medium">{p.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <button onClick={() => setSelectedPlayerId(null)} className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                  ← Voltar
                </button>
                {playerSummaryQuery.isLoading && <p className="text-sm text-muted-foreground text-center py-4">A carregar…</p>}
                {playerSummaryQuery.data && (() => {
                  const ps = playerSummaryQuery.data;
                  const player = stats?.topScorers?.find((p) => p.playerId === selectedPlayerId);
                  const playerName = player?.name ?? "Jogador";
                  const heatmaps: Array<{ key: "attack" | "serve" | "reception"; label: string; data: typeof ps.attackHeatmap }> = [
                    { key: "attack", label: "Ataque", data: ps.attackHeatmap },
                    { key: "serve", label: "Serviço", data: ps.serveHeatmap },
                    { key: "reception", label: "Receção", data: ps.receptionHeatmap },
                  ];
                  return (
                    <div className="grid grid-cols-3 gap-2">
                      {heatmaps.map(({ key, label, data }) => {
                        if (!data || data.total === 0) return null;
                        const zones = data.zones
                          .filter((z) => z.count > 0)
                          .map((z) => ({ zone: z.zone, count: z.count, pct: Math.round((z.count / data.total) * 100) }));
                        return (
                          <button
                            key={key}
                            onClick={() => { onAddZoneHeatmap(`${playerName} · ${label}`, key, zones, data.maxCount); handleClose(); }}
                            className="p-2 rounded-lg border hover:bg-accent text-left transition-colors"
                          >
                            <p className="text-xs font-semibold mb-1">{label}</p>
                            <div className="grid grid-cols-3 gap-0.5">
                              {([4,3,2,7,8,9,5,6,1] as number[]).map((zone) => {
                                const zd = data.zones.find((z) => z.zone === zone);
                                const op = zd && data.maxCount > 0 ? 0.1 + (zd.count / data.maxCount) * 0.8 : 0.05;
                                return (
                                  <div key={zone} className="aspect-square rounded-sm flex items-center justify-center text-[8px] text-white/70"
                                    style={{ background: `rgba(34,197,94,${op})` }}>
                                    {zone}
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-1">{data.total} ações</p>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
