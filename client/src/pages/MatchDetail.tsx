import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BarChart3,
  ClipboardCheck,
  Eye,
  FileText,
  MapPin,
  MonitorPlay,
  Radio,
  Trophy,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Action, ChecklistItem, Match } from "@shared/schema";

const STATUS_VARIANT: Record<Match["status"], any> = {
  scheduled: "secondary",
  live: "warning",
  finished: "success",
  cancelled: "destructive",
};

/**
 * Hub de um jogo. Antes, tudo o que dizia respeito a um jogo estava
 * espalhado por ecrãs sem ligação entre si (`/matchday/:id`, `/scout/:id`,
 * `/post-match/:id`), alcançáveis apenas pelo menu lateral. Esta página
 * junta o estado do jogo e todos os destinos num sítio só, e propõe o
 * passo seguinte consoante o jogo esteja por preparar, a decorrer ou
 * terminado.
 */
export default function MatchDetail() {
  const params = useParams<{ id: string }>();
  const matchId = params.id;
  const { team } = useTeam();
  const { t } = useTranslation();

  const matchQuery = useQuery({
    queryKey: ["matches", team?.id],
    queryFn: () => api.get<Match[]>(`/api/matches?teamId=${team!.id}`),
    enabled: !!team,
    select: (all) => all.find((m) => m.id === matchId) ?? null,
  });

  const actionsQuery = useQuery({
    queryKey: ["actions", matchId],
    queryFn: () => api.get<Action[]>(`/api/matches/${matchId}/actions`),
    enabled: !!matchId,
  });

  const checklistQuery = useQuery({
    queryKey: ["checklist", matchId],
    queryFn: () => api.get<ChecklistItem[]>(`/api/matches/${matchId}/checklist`),
    enabled: !!matchId,
  });

  if (!team) return null;

  if (matchQuery.isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-screen-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const match = matchQuery.data;
  if (!match) {
    return (
      <div className="p-4 md:p-8 max-w-screen-lg mx-auto space-y-4">
        <Card>
          <CardContent className="p-10 text-center space-y-3 text-muted-foreground">
            <p>{t("matchDetail.notFound")}</p>
            <Button asChild variant="outline">
              <Link href="/matches">{t("matchDetail.backToMatches")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const actions = actionsQuery.data ?? [];
  const checklist = checklistQuery.data ?? [];
  const checklistDone = checklist.filter((c) => c.done).length;
  const setsPlayed = actions.reduce(
    (max, a) => Math.max(max, a.setNumber ?? 0),
    0,
  );
  const isObservation = match.matchType === "observation";

  return (
    <div className="p-4 md:p-8 max-w-screen-lg mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/matches">
          <ArrowLeft className="h-4 w-4" /> {t("matchDetail.backToMatches")}
        </Link>
      </Button>

      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
              {isObservation ? match.opponent : `vs. ${match.opponent}`}
            </h1>
            <Badge variant={STATUS_VARIANT[match.status]}>
              {t(`matches.status.${match.status}`)}
            </Badge>
            {isObservation && (
              <Badge variant="secondary">
                <Eye className="h-3 w-3" /> {t("matches.observation")}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
            <span>{formatDate(match.date)}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {t(`matches.venue.${match.venue}`)}
            </span>
            {match.competition && <span>{match.competition}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-bold tabular-nums">
            {match.setsWon}–{match.setsLost}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {t("matches.sets")}
          </div>
        </div>
      </header>

      {/* Passo seguinte sugerido */}
      <NextStep
        matchId={match.id}
        status={match.status}
        hasActions={actions.length > 0}
      />

      {/* Números do jogo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat
          label={t("matchDetail.actionsLogged")}
          value={actionsQuery.isLoading ? "—" : String(actions.length)}
        />
        <Stat
          label={t("matchDetail.setsPlayed")}
          value={actionsQuery.isLoading ? "—" : String(setsPlayed)}
        />
        <Stat
          label={t("matchDetail.preparation")}
          value={
            checklistQuery.isLoading || checklist.length === 0
              ? "—"
              : `${checklistDone}/${checklist.length}`
          }
        />
      </div>

      {/* Destinos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("matchDetail.sections")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DestinationCard
            href={`/matchday/${match.id}`}
            icon={ClipboardCheck}
            title={t("nav.matchDay")}
            description={t("matchDetail.matchDayDescription")}
          />
          <DestinationCard
            href={`/scout/${match.id}`}
            icon={Radio}
            title={t("nav.liveScout")}
            description={t("matchDetail.scoutDescription")}
          />
          <DestinationCard
            href={`/post-match/${match.id}`}
            icon={BarChart3}
            title={t("nav.postMatch")}
            description={t("matchDetail.postMatchDescription")}
            disabled={actions.length === 0}
            disabledHint={t("matchDetail.needsActions")}
          />
          <DestinationCard
            href={`/second-screen/${match.id}`}
            icon={MonitorPlay}
            title={t("matchDetail.secondScreen")}
            description={t("matchDetail.secondScreenDescription")}
          />
          {!isObservation && (
            <DestinationCard
              href={`/reports/${encodeURIComponent(match.opponent)}`}
              icon={FileText}
              title={t("nav.scoutingReport")}
              description={t("matchDetail.reportDescription")}
            />
          )}
          {match.videoUrl && (
            <DestinationCard
              href={match.videoUrl}
              external
              icon={Video}
              title={t("matchDetail.video")}
              description={t("matchDetail.videoDescription")}
            />
          )}
        </div>
      </section>

      {match.notes && (
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("matchDetail.notes")}
            </div>
            <p className="text-sm whitespace-pre-wrap">{match.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Acção principal proposta consoante o estado do jogo. */
function NextStep({
  matchId,
  status,
  hasActions,
}: {
  matchId: string;
  status: Match["status"];
  hasActions: boolean;
}) {
  const { t } = useTranslation();

  if (status === "cancelled") return null;

  // Um jogo terminado sem acções registadas não tem análise para mostrar —
  // o passo seguinte é registar o jogo, não abrir um pós-jogo vazio.
  const config =
    status === "live"
      ? { href: `/scout/${matchId}`, icon: Radio, key: "live" as const }
      : status === "finished"
        ? hasActions
          ? { href: `/post-match/${matchId}`, icon: BarChart3, key: "finished" as const }
          : { href: `/scout/${matchId}`, icon: Radio, key: "finishedNoData" as const }
        : { href: `/matchday/${matchId}`, icon: ClipboardCheck, key: "scheduled" as const };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <config.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold">
              {t(`matchDetail.nextStep.${config.key}.title`)}
            </div>
            <div className="text-sm text-muted-foreground">
              {t(`matchDetail.nextStep.${config.key}.description`)}
            </div>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href={config.href}>
            {t(`matchDetail.nextStep.${config.key}.cta`)}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function DestinationCard({
  href,
  icon: Icon,
  title,
  description,
  disabled,
  disabledHint,
  external,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  disabled?: boolean;
  disabledHint?: string;
  external?: boolean;
}) {
  const body = (
    <>
      <div className="h-9 w-9 shrink-0 rounded-lg bg-secondary text-secondary-foreground grid place-items-center">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">
          {disabled ? (disabledHint ?? description) : description}
        </div>
      </div>
    </>
  );

  const className =
    "flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors";

  if (disabled) {
    return (
      <div
        className={`${className} opacity-50 cursor-not-allowed`}
        aria-disabled="true"
      >
        {body}
      </div>
    );
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`${className} hover:bg-accent`}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={`${className} hover:bg-accent`}>
      {body}
    </Link>
  );
}
