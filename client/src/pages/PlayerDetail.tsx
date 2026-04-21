import { Link, useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Loader2, Clock } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Player } from "@shared/schema";
import type {
  TrainingFocus,
  TrainingPriority,
  TrainingRecommendation,
} from "@shared/types";

const POSITION_LABEL: Record<string, string> = {
  OH: "Ponta (Outside Hitter)",
  OPP: "Oposto (Opposite)",
  MB: "Central (Middle Blocker)",
  S: "Distribuidor (Setter)",
  L: "Líbero",
  DS: "Defensivo (Defensive Specialist)",
};

const FOCUS_LABEL: Record<TrainingFocus, string> = {
  serve: "Serviço",
  attack: "Ataque",
  reception: "Recepção",
  block: "Bloco",
  defense: "Defesa",
  setting: "Distribuição",
};

const PRIORITY_STYLE: Record<TrainingPriority, string> = {
  high: "bg-red-600 text-white hover:bg-red-600/90",
  medium: "bg-amber-500 text-white hover:bg-amber-500/90",
  low: "bg-slate-500 text-white hover:bg-slate-500/90",
};

interface PlayerSummary {
  player: Player;
  actions: number;
  kpis: {
    killPct: number;
    attackEff: number;
    passRating: number;
    serveAcePct: number;
    blocks: number;
    digs: number;
  };
  weaknesses: string[];
}

interface TrainingLog {
  id: string;
  playerId: string;
  priority: TrainingPriority;
  status: string;
  createdAt: string;
  rec: TrainingRecommendation;
}

export default function PlayerDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { team } = useTeam();
  const qc = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: ["player-summary", team?.id, params.id],
    queryFn: () =>
      api.get<PlayerSummary>(
        `/api/players/${params.id}/summary?teamId=${team!.id}`,
      ),
    enabled: !!team && !!params.id,
  });

  const logsQuery = useQuery({
    queryKey: ["training-logs", team?.id, params.id],
    queryFn: () =>
      api.get<TrainingLog[]>(
        `/api/training/${params.id}?teamId=${team!.id}`,
      ),
    enabled: !!team && !!params.id,
  });

  const generate = useMutation({
    mutationFn: () =>
      api.post<{ recommendations: TrainingRecommendation[] }>(
        `/api/ai/training/${params.id}?teamId=${team!.id}`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["training-logs", team?.id, params.id],
      });
    },
  });

  if (!team) return null;

  const summary = summaryQuery.data;
  const player = summary?.player;
  const logs = logsQuery.data ?? [];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/players")}>
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      {summaryQuery.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !player ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Jogadora não encontrada.{" "}
            <Link href="/players" className="text-primary hover:underline">
              Voltar ao roster
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-6 flex flex-wrap items-center gap-5">
              <Avatar className="h-20 w-20 text-xl">
                <AvatarFallback>
                  {player.firstName[0]}
                  {player.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-[200px]">
                <div className="text-2xl font-bold">
                  {player.firstName} {player.lastName}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Badge variant="secondary">#{player.number}</Badge>
                  <span>{POSITION_LABEL[player.position]}</span>
                  {player.heightCm && <span>· {player.heightCm} cm</span>}
                  {!player.active && (
                    <Badge variant="outline">Inactiva</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {summary!.actions > 0
                    ? `${summary!.actions} acções nos últimos jogos`
                    : "Sem acções registadas nos últimos jogos"}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard
              label="Kill %"
              value={
                summary!.kpis.killPct > 0 ? `${summary!.kpis.killPct}%` : "—"
              }
              hint="ataques convertidos"
            />
            <KpiCard
              label="Attack Eff"
              value={
                summary!.kpis.attackEff !== 0
                  ? summary!.kpis.attackEff.toFixed(3)
                  : "—"
              }
              hint="(kills − erros) / tentativas"
            />
            <KpiCard
              label="Pass Rating"
              value={
                summary!.kpis.passRating > 0
                  ? summary!.kpis.passRating.toFixed(2)
                  : "—"
              }
              hint="escala 0–3"
            />
            <KpiCard
              label="Serve Ace %"
              value={
                summary!.kpis.serveAcePct > 0
                  ? `${summary!.kpis.serveAcePct}%`
                  : "—"
              }
              hint="serviços directos"
            />
            <KpiCard
              label="Blocks"
              value={summary!.kpis.blocks || "—"}
              hint="stuff blocks"
            />
            <KpiCard
              label="Digs"
              value={summary!.kpis.digs || "—"}
              hint="defesas perfeitas/boas"
            />
          </div>

          {summary!.weaknesses.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fraquezas detectadas</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {summary!.weaknesses.map((w, i) => (
                  <div key={i}>· {w}</div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Recomendações de treino (IA)
              </CardTitle>
              <Button
                size="sm"
                onClick={() => generate.mutate()}
                disabled={generate.isPending || summary!.actions === 0}
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> A gerar…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Gerar recomendações
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {generate.isError && (
                <div className="text-sm text-red-500">
                  Falha ao gerar recomendações. Tenta novamente.
                </div>
              )}
              {summary!.actions === 0 && (
                <div className="text-sm text-muted-foreground">
                  Sem acções scouted para esta atleta — regista jogos no Live
                  Scout para desbloquear recomendações.
                </div>
              )}
              {logsQuery.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : logs.length === 0 ? (
                summary!.actions > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Ainda não há recomendações. Clica em “Gerar recomendações”
                    para produzir um plano baseado nos KPIs acima.
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <RecommendationCard key={log.id} log={log} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ log }: { log: TrainingLog }) {
  const r = log.rec;
  const totalMin = r.drills.reduce((acc, d) => acc + d.durationMin, 0);
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{r.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Foco: {FOCUS_LABEL[r.focus]} · {totalMin} min total
          </div>
        </div>
        <Badge className={PRIORITY_STYLE[r.priority]}>
          {r.priority === "high"
            ? "Alta"
            : r.priority === "medium"
              ? "Média"
              : "Baixa"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{r.rationale}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {r.drills.map((d, i) => (
          <div
            key={i}
            className="rounded-md bg-muted/50 p-3 text-sm space-y-1"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{d.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {d.durationMin}m
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{d.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
