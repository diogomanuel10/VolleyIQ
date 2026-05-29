import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Users,
} from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import { useScoutKeyboard } from "@/hooks/useScoutKeyboard";
import { api } from "@/lib/api";
import {
  deriveSuggestion,
  deriveNextSide,
  useScoutState,
  type Side,
} from "@/hooks/useScoutState";
import { useScoutMode, type ScoutMode } from "@/lib/scoutMode";
import { useScoutSession } from "@/hooks/useScoutSession";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Court, type CourtPoint } from "@/components/scout/Court";
import { ActionLog } from "@/components/scout/ActionLog";
import { VideoPanel } from "@/components/scout/VideoPanel";
import { ScorePanel } from "@/components/scout/ScorePanel";
import { LivePlayerStatsPanel } from "@/components/scout/LivePlayerStatsPanel";
import { StepProgress } from "@/components/scout/StepProgress";
import { SuggestionsPanel } from "@/components/scout/SuggestionsPanel";
import { TacticalAssistantPanel } from "@/components/scout/TacticalAssistantPanel";
import { PlanGate } from "@/components/PlanGate";
import { ScoutHeader } from "@/components/scout/ScoutHeader";
import { ActionFlow } from "@/components/scout/ActionFlow";
import type {
  Match,
  Player,
  Team,
  OpponentPlayer,
} from "@shared/schema";
import { type Zone, type ScoutScope } from "@shared/types";
import { LineupWizard } from "@/components/scout/LineupWizard";
import { SubstitutionDialog } from "@/components/scout/SubstitutionDialog";
import {
  KeyboardHelp,
  type ScoutHelpTab,
} from "@/components/scout/KeyboardHelp";
import { WelcomeBanner } from "@/components/scout/WelcomeBanner";
import { TabletScout } from "@/components/scout/TabletScout";
import { Video } from "lucide-react";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";

const WELCOME_KEY = "volleyiq:scout:welcomed";

export default function LiveScout() {
  const params = useParams<{ matchId?: string }>();
  const [, navigate] = useLocation();
  const { team } = useTeam();

  if (!team) return null;
  if (!params.matchId) return <MatchPicker teamId={team.id} />;

  return (
    <Scout
      key={params.matchId}
      matchId={params.matchId}
      team={team}
      onBack={() => navigate("/matches")}
    />
  );
}

// ── Match picker (when /scout without id) ────────────────────────────────
function MatchPicker({ teamId }: { teamId: string }) {
  const { t } = useTranslation();
  const matchesQuery = useQuery({
    queryKey: ["matches", teamId],
    queryFn: () => api.get<Match[]>(`/api/matches?teamId=${teamId}`),
  });
  const list = matchesQuery.data ?? [];
  const selectable = list.filter(
    (m) => m.status === "live" || m.status === "scheduled",
  );

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Live Scout
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("livescout.chooseMatch")}
        </p>
      </header>

      {matchesQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : selectable.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground space-y-3">
            <p>{t("livescout.noScheduledMatches")}</p>
            <Button asChild variant="outline">
              <Link href="/matches">{t("livescout.goToMatches")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {selectable.map((m) => (
            <Link
              key={m.id}
              href={`/scout/${m.id}`}
              className="block rounded-lg border bg-card p-4 hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">vs. {m.opponent}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(m.date).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                    })}
                    {m.competition ? ` · ${m.competition}` : ""}
                  </div>
                </div>
                <Badge variant={m.status === "live" ? "warning" : "secondary"}>
                  {m.status === "live" ? t("matches.status.live") : t("matches.status.scheduled")}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Scout propriamente dito ──────────────────────────────────────────────
function Scout({
  matchId,
  team,
  onBack,
}: {
  matchId: string;
  team: Team;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const teamId = team.id;
  const { mode, canUseComplete, set: setMode } = useScoutMode(
    teamId,
    team.plan,
  );
  const [state, dispatch] = useScoutState(mode);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTab, setHelpTab] = useState<ScoutHelpTab>("shortcuts");
  const [welcomeDismissed, setWelcomeDismissed] = useState(true);
  const [tabletMode, setTabletMode] = useState(() => {
    try {
      const stored = window.localStorage.getItem("volleyiq:scout:tabletMode");
      if (stored === null) return window.innerWidth < 768;
      return stored === "1";
    } catch {
      return false;
    }
  });

  const [videoFocusMode, setVideoFocusMode] = useState(() => {
    try {
      return window.localStorage.getItem("volleyiq:scout:videoFocus") === "1";
    } catch {
      return false;
    }
  });

  function toggleVideoFocus() {
    setVideoFocusMode((v) => {
      const next = !v;
      try {
        window.localStorage.setItem("volleyiq:scout:videoFocus", next ? "1" : "0");
      } catch { /* ignora */ }
      return next;
    });
  }

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(WELCOME_KEY);
      if (!seen) setWelcomeDismissed(false);
    } catch {
      // localStorage indisponível — banner fica oculto.
    }
  }, []);

  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    try {
      window.localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      // ignora
    }
  };

  const openHelp = (tab: ScoutHelpTab = "shortcuts") => {
    setHelpTab(tab);
    setHelpOpen(true);
  };

  const [zoneFromSide, setZoneFromSide] = useState<"opponent" | "ours" | null>(null);
  const [zoneToSide, setZoneToSide] = useState<"opponent" | "ours" | null>(null);
  const [lineupOpen, setLineupOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

  // Sincroniza o reducer com a preferência guardada quando esta muda.
  useEffect(() => {
    dispatch({ kind: "setMode", mode });
    setZoneFromSide(null);
    setZoneToSide(null);
  }, [mode, dispatch]);

  // Após registar o resultado, o reducer limpa zoneFrom/zoneTo e volta a
  // "idle" — alinhamos os sides locais para o dot/seta desaparecerem.
  useEffect(() => {
    if (state.step === "idle" && state.zoneFrom == null && state.zoneTo == null) {
      setZoneFromSide(null);
      setZoneToSide(null);
    }
  }, [state.step, state.zoneFrom, state.zoneTo]);

  const session = useScoutSession({ matchId, teamId, mode, state, dispatch });

  const {
    isLoading,
    match,
    opponentTeamId,
    activePlayers,
    opponentPlayers,
    savedLineup,
    lineup,
    onCourt,
    bench,
    suggestions,
    historyData,
    rotationStats,
    pendingSync,
    videoRef,
    updateMatch,
    lineupsRefetch,
    subsRefetch,
    handleKeyboardUndo,
  } = session;

  const suggested = useMemo(() => deriveSuggestion(state.log), [state.log]);
  const lastLogged = state.log[state.log.length - 1] ?? null;

  useScoutKeyboard(state, dispatch, {
    roster: activePlayers,
    onUndo: handleKeyboardUndo,
    onToggleHelp: () => {
      setHelpTab("shortcuts");
      setHelpOpen((v) => !v);
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <Skeleton className="h-[540px] w-full" />
          <Skeleton className="h-[540px] w-full" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            {t("livescout.matchNotFound")}{" "}
            <Link href="/matches" className="text-primary hover:underline">
              {t("livescout.backToMatches")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activePlayers.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t("livescout.backButton")}
        </Button>
        <Card>
          <CardContent className="p-10 text-center space-y-4">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <div>
              <p className="font-semibold">{t("livescout.noPlayersOnCourt")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("livescout.addPlayersFirst")}
              </p>
            </div>
            <Button asChild>
              <Link href="/players">{t("livescout.goToPlayers")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const step = state.step;

  const progressSteps =
    mode === "complete"
      ? [
          t("livescout.progressSteps.player"),
          t("livescout.progressSteps.action"),
          t("livescout.progressSteps.zoneFrom"),
          t("livescout.progressSteps.zoneTo"),
          t("livescout.progressSteps.result"),
        ]
      : [
          t("livescout.progressSteps.player"),
          t("livescout.progressSteps.action"),
          t("livescout.progressSteps.zone"),
          t("livescout.progressSteps.result"),
        ];
  const stepNumber =
    step === "idle" || step === "player"
      ? 1
      : step === "action"
        ? 2
        : step === "zoneFrom"
          ? 3
          : step === "zone" || step === "zoneTo"
            ? mode === "complete"
              ? 4
              : 3
            : mode === "complete"
              ? 5
              : 4;

  const selectedPlayer = state.playerId
    ? activePlayers.find((p) => p.id === state.playerId) ?? null
    : null;

  const hint =
    step === "idle" || step === "player"
      ? t("livescout.hints.player")
      : step === "action"
        ? selectedPlayer
          ? t("livescout.hints.action", { number: selectedPlayer.number, name: selectedPlayer.firstName })
          : t("livescout.hints.actionGeneric")
        : step === "zoneFrom"
          ? t("livescout.hints.zoneFrom")
          : step === "zoneTo"
            ? t("livescout.hints.zoneTo")
            : step === "zone"
              ? t("livescout.hints.zone")
              : t("livescout.hints.result");

  function handleZoneFromSelect(
    zone: Zone,
    side: "opponent" | "ours",
    point: CourtPoint,
  ) {
    setZoneFromSide(side);
    dispatch({ kind: "selectZoneFrom", zone, x: point.x, y: point.y });
  }
  function handleZoneToSelect(
    zone: Zone,
    side: "opponent" | "ours",
    point: CourtPoint,
  ) {
    setZoneToSide(side);
    if (mode === "complete")
      dispatch({ kind: "selectZoneTo", zone, x: point.x, y: point.y });
    else dispatch({ kind: "selectZone", zone, x: point.x, y: point.y });
  }
  function handleModeChange(next: ScoutMode) {
    if (next === "complete" && !canUseComplete) {
      toast.message(t("livescout.modeLockedComplete"), {
        description: t("pricing.viewPlans"),
        action: {
          label: t("pricing.viewPlans"),
          onClick: () => (window.location.hash = "/pricing"),
        },
      });
      return;
    }
    setMode(next);
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className={cn("p-3 md:p-6 mx-auto flex flex-col gap-3 md:gap-4", !videoFocusMode && "lg:h-full lg:overflow-hidden")}>
      {!welcomeDismissed && (
        <WelcomeBanner
          onOpenHelp={() => {
            openHelp("quickstart");
            dismissWelcome();
          }}
          onDismiss={dismissWelcome}
        />
      )}
      {tabletMode && match && (
        <TabletScout
          state={state}
          dispatch={dispatch}
          onCourt={onCourt}
          bench={bench}
          lineup={lineup}
          homeScore={state.homeScore}
          awayScore={state.awayScore}
          setNumber={state.setNumber}
          opponentName={match.opponent}
          teamId={teamId}
          matchId={matchId}
          suggestions={suggestions}
          hasHistory={Boolean(historyData)}
          rotationStats={rotationStats}
          players={activePlayers}
          onSubCreated={() => {
            lineupsRefetch();
            subsRefetch();
          }}
          onClose={() => {
            setTabletMode(false);
            try {
              window.localStorage.setItem("volleyiq:scout:tabletMode", "0");
            } catch {
              // ignora
            }
          }}
        />
      )}

      <ScoutHeader
        match={match}
        matchId={matchId}
        mode={mode}
        canUseComplete={canUseComplete}
        onModeChange={handleModeChange}
        scoutScope={state.scoutScope}
        opponentTeamId={opponentTeamId}
        onScopeChange={(s) => dispatch({ kind: "setScoutScope", scope: s })}
        savedLineup={savedLineup}
        onOpenLineup={() => setLineupOpen(true)}
        onCourt={onCourt}
        bench={bench}
        onOpenSubs={() => setSubOpen(true)}
        tabletMode={tabletMode}
        onToggleTablet={() => {
          const next = !tabletMode;
          setTabletMode(next);
          try {
            window.localStorage.setItem("volleyiq:scout:tabletMode", next ? "1" : "0");
          } catch { /* ignora */ }
        }}
        videoFocusMode={videoFocusMode}
        onToggleVideoFocus={toggleVideoFocus}
        onOpenHelp={openHelp}
        step={step}
        updateMatch={updateMatch}
        onBack={onBack}
      />

      {/* ── Modo Vídeo: vídeo grande na coluna principal, controlos à direita ── */}
      {videoFocusMode && match.videoUrl ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-3 md:gap-4">
          {/* Coluna principal: vídeo + fluxo de acção */}
          <div className="flex flex-col gap-3">
            {/* Vídeo grande */}
            <div className="rounded-xl overflow-hidden border bg-black">
              <VideoPanel ref={videoRef} url={match.videoUrl} className="w-full" />
            </div>
            <p className="text-[11px] text-muted-foreground -mt-1 px-1">
              {t("livescout.videoTimestamp")}
            </p>

            {/* Score compacto */}
            <ScorePanel
              homeScore={state.homeScore}
              awayScore={state.awayScore}
              setNumber={state.setNumber}
              rotation={state.rotation}
              servingTeam={state.servingTeam}
              onAdjust={(side, delta) => dispatch({ kind: "adjustScore", side, delta })}
              onRotate={(direction) => dispatch({ kind: "rotate", direction })}
              onSetServingTeam={(team) => dispatch({ kind: "setServingTeam", team })}
              onPrevSet={() => dispatch({ kind: "prevSet" })}
              onNextSet={() => dispatch({ kind: "nextSet" })}
            />

            {state.scoutScope !== "home" && (
              <TeamToggle
                activeSide={state.activeSide}
                suggestedSide={deriveNextSide(state.log, state.servingTeam)}
                homeName={match.competition ?? "Nossa equipa"}
                awayName={match.opponent}
                disabled={step !== "idle" && step !== "player"}
                onChange={(side) => dispatch({ kind: "selectSide", side })}
              />
            )}

            {/* Passo actual */}
            <div className="rounded-xl border bg-card px-3 py-2 space-y-1.5">
              <StepProgress steps={progressSteps} current={stepNumber - 1} />
              <p className="text-xs text-muted-foreground text-center">{hint}</p>
            </div>

            {/* Selector compacto de jogadoras em campo (substitui o SVG do campo) */}
            {state.activeSide === "home" && (step === "idle" || step === "player") && (
              <CompactPlayerPicker
                players={onCourt}
                selectedId={state.playerId}
                onSelect={(id) => dispatch({ kind: "selectPlayer", playerId: id })}
              />
            )}

            {/* Fluxo de acção */}
            <ActionFlow
              step={step}
              mode={mode}
              actionType={state.actionType}
              zoneFrom={state.zoneFrom}
              zoneTo={state.zoneTo}
              suggested={suggested}
              lastLogged={lastLogged}
              lastPlayer={lastLogged ? activePlayers.find((p) => p.id === lastLogged.playerId) ?? null : null}
              dispatch={dispatch}
            />

            {/* Adversário */}
            {state.activeSide === "away" && state.scoutScope !== "home" && (step === "idle" || step === "player") && (
              <OpponentPlayerGrid
                players={opponentPlayers}
                selectedId={state.opponentPlayerId}
                onSelect={(id) => dispatch({ kind: "selectOpponentPlayer", opponentPlayerId: id })}
              />
            )}
          </div>

          {/* Sidebar direita: stats + log */}
          <aside className="flex flex-col gap-3 min-w-0">
            <LivePlayerStatsPanel
              log={state.log}
              players={activePlayers}
              onCourt={onCourt}
              currentSet={state.setNumber}
            />
            <div className="rounded-xl border bg-card p-3 md:p-4 flex flex-col">
              <ActionLog
                log={state.log}
                players={activePlayers}
                onUndo={handleKeyboardUndo}
                pendingSync={pendingSync}
              />
            </div>
          </aside>
        </div>
      ) : (

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-3 md:gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        <div className="flex flex-col gap-3 lg:min-h-0 lg:overflow-hidden">
          <ScorePanel
            homeScore={state.homeScore}
            awayScore={state.awayScore}
            setNumber={state.setNumber}
            rotation={state.rotation}
            servingTeam={state.servingTeam}
            onAdjust={(side, delta) =>
              dispatch({ kind: "adjustScore", side, delta })
            }
            onRotate={(direction) => dispatch({ kind: "rotate", direction })}
            onSetServingTeam={(team) =>
              dispatch({ kind: "setServingTeam", team })
            }
            onPrevSet={() => dispatch({ kind: "prevSet" })}
            onNextSet={() => dispatch({ kind: "nextSet" })}
          />

          {/* Team toggle — visível em modo both/neutral */}
          {state.scoutScope !== "home" && (
            <TeamToggle
              activeSide={state.activeSide}
              suggestedSide={deriveNextSide(state.log, state.servingTeam)}
              homeName={match.competition ?? "Nossa equipa"}
              awayName={match.opponent}
              disabled={step !== "idle" && step !== "player"}
              onChange={(side) => dispatch({ kind: "selectSide", side })}
            />
          )}

          {/* Step progress + hint — sempre acima do campo */}
          <div className="rounded-xl border bg-card px-3 py-2 space-y-1.5">
            <StepProgress steps={progressSteps} current={stepNumber - 1} />
            <p className="text-xs text-muted-foreground text-center">{hint}</p>
          </div>

          {/* Fluxo de acção — sempre visível acima do campo, sem necessidade de scroll */}
          <ActionFlow
            step={step}
            mode={mode}
            actionType={state.actionType}
            zoneFrom={state.zoneFrom}
            zoneTo={state.zoneTo}
            suggested={suggested}
            lastLogged={lastLogged}
            lastPlayer={
              lastLogged
                ? activePlayers.find((p) => p.id === lastLogged.playerId) ?? null
                : null
            }
            dispatch={dispatch}
          />

          {/* Lista de jogadores do adversário — acima do campo */}
          {state.activeSide === "away" &&
            state.scoutScope !== "home" &&
            (step === "idle" || step === "player") && (
            <OpponentPlayerGrid
              players={opponentPlayers}
              selectedId={state.opponentPlayerId}
              onSelect={(id) =>
                dispatch({ kind: "selectOpponentPlayer", opponentPlayerId: id })
              }
            />
          )}

          {/* Campo — ocupa todo o espaço restante; SVG escala para caber */}
          <div className="rounded-xl border bg-card p-3 md:p-4 lg:flex-1 lg:min-h-0 lg:relative lg:p-0 lg:overflow-hidden">
            <Court
              selectedZone={state.zoneTo}
              selectedZoneFrom={state.zoneFrom}
              selectedZoneSide={zoneToSide}
              selectedZoneFromSide={zoneFromSide}
              selectedPointFrom={
                state.zoneFromX != null && state.zoneFromY != null && zoneFromSide
                  ? { x: state.zoneFromX, y: state.zoneFromY, side: zoneFromSide }
                  : null
              }
              selectedPointTo={
                state.zoneToX != null && state.zoneToY != null && zoneToSide
                  ? { x: state.zoneToX, y: state.zoneToY, side: zoneToSide }
                  : null
              }
              pickTarget={
                step === "zoneFrom"
                  ? "from"
                  : step === "zoneTo" || step === "zone"
                    ? "to"
                    : null
              }
              onZoneSelect={handleZoneToSelect}
              onZoneFromSelect={handleZoneFromSelect}
              lineup={state.activeSide === "home" ? lineup : [null,null,null,null,null,null]}
              selectedPlayerId={state.activeSide === "home" ? state.playerId : null}
              onPlayerSelect={(id) =>
                dispatch({ kind: "selectPlayer", playerId: id })
              }
              rotation={state.rotation}
              playersDisabled={
                state.activeSide === "away" ||
                (step !== "idle" && step !== "player")
              }
              zonesDisabled={
                step !== "zone" && step !== "zoneFrom" && step !== "zoneTo"
              }
              className="lg:absolute lg:inset-0 lg:w-full lg:h-full"
            />
          </div>
        </div>

        {/* Sugestões + Log lateral + vídeo (opcional) */}
        <aside className="flex flex-col gap-3 min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <div className="lg:shrink-0">
            <TacticalAssistantPanel
              teamId={teamId}
              matchId={matchId}
              opponent={match.opponent}
              setNumber={state.setNumber}
              homeScore={state.homeScore}
              awayScore={state.awayScore}
              servingTeam={state.servingTeam}
              rotation={state.rotation}
              log={state.log}
              onCourt={onCourt}
              rotationStats={rotationStats}
            />
          </div>
          <div className="lg:shrink-0">
            <PlanGate feature="aiLiveSuggestions" overlay>
              <SuggestionsPanel
                suggestions={suggestions}
                hasLog={state.log.length > 0}
                hasHistory={Boolean(historyData)}
              />
            </PlanGate>
          </div>
          {match.videoUrl && (
            <div className="rounded-xl border bg-card p-3 md:p-4 space-y-2 lg:shrink-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Video className="h-3.5 w-3.5" /> {t("livescout.videoLabel")}
              </div>
              <VideoPanel ref={videoRef} url={match.videoUrl} />
              <p className="text-[11px] text-muted-foreground">
                {t("livescout.videoTimestamp")}
              </p>
            </div>
          )}
          <LivePlayerStatsPanel
            log={state.log}
            players={activePlayers}
            onCourt={onCourt}
            currentSet={state.setNumber}
          />
          <div className="rounded-xl border bg-card p-3 md:p-4 flex flex-col max-h-[55vh] lg:max-h-[320px]">
            <ActionLog
              log={state.log}
              players={activePlayers}
              onUndo={handleKeyboardUndo}
              pendingSync={pendingSync}
            />
          </div>
        </aside>
      </div>
      )}

      <LineupWizard
        open={lineupOpen}
        onOpenChange={setLineupOpen}
        matchId={matchId}
        setNumber={state.setNumber}
        rotation={state.rotation}
        roster={activePlayers}
        existing={savedLineup}
        onSaved={() => {
          lineupsRefetch();
        }}
      />

      <SubstitutionDialog
        open={subOpen}
        onOpenChange={setSubOpen}
        matchId={matchId}
        setNumber={state.setNumber}
        homeScore={state.homeScore}
        awayScore={state.awayScore}
        onCourt={onCourt}
        bench={bench}
        onCreated={() => {
          subsRefetch();
        }}
      />

      <KeyboardHelp
        open={helpOpen}
        onOpenChange={setHelpOpen}
        initialTab={helpTab}
      />
    </div>
    </TooltipProvider>
  );
}

// ── Team toggle strip ────────────────────────────────────────────────────────
function TeamToggle({
  activeSide,
  suggestedSide,
  homeName,
  awayName,
  disabled,
  onChange,
}: {
  activeSide: Side;
  suggestedSide: Side;
  homeName: string;
  awayName: string;
  disabled: boolean;
  onChange: (side: Side) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-xs text-muted-foreground shrink-0">{t("livescout.teamLabel")}</span>
      <div className="inline-flex rounded-md border overflow-hidden">
        {(["home", "away"] as const).map((side) => {
          const isActive = activeSide === side;
          const isSuggested = suggestedSide === side && !isActive;
          return (
            <button
              key={side}
              disabled={disabled}
              onClick={() => onChange(side)}
              className={cn(
                "px-3 h-7 text-xs font-medium transition-colors relative",
                isActive
                  ? side === "home"
                    ? "bg-blue-600 text-white"
                    : "bg-rose-600 text-white"
                  : isSuggested
                    ? "bg-accent ring-1 ring-inset ring-primary/40 text-foreground"
                    : "hover:bg-accent text-muted-foreground",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {side === "home" ? homeName : awayName}
              {isSuggested && (
                <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
      {suggestedSide !== activeSide && !disabled && (
        <span className="text-[10px] text-muted-foreground">{t("livescout.teamSuggestion")}</span>
      )}
    </div>
  );
}

// ── Compact player picker (usado no modo vídeo) ─────────────────────────────
function CompactPlayerPicker({
  players,
  selectedId,
  onSelect,
}: {
  players: Player[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (players.length === 0) return null;
  return (
    <div className="rounded-xl border bg-card p-2.5 space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Jogadoras em campo
      </p>
      <div className="grid grid-cols-6 gap-1">
        {players.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={cn(
              "flex flex-col items-center py-1.5 px-1 rounded-lg border text-center transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedId === p.id
                ? "bg-primary/15 border-primary/50 text-primary"
                : "bg-muted/30 border-border/50 hover:bg-accent",
            )}
          >
            <span className="text-sm font-bold leading-none">{p.number}</span>
            <span className="text-[9px] text-muted-foreground mt-0.5 truncate w-full leading-tight">
              {p.firstName.slice(0, 6)}
            </span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/50">
        ou digita o nº da camisola
      </p>
    </div>
  );
}

// ── Opponent player grid ─────────────────────────────────────────────────────
function OpponentPlayerGrid({
  players,
  selectedId,
  onSelect,
}: {
  players: OpponentPlayer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const sorted = [...players].sort((a, b) => (a.number ?? 99) - (b.number ?? 99));

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-center text-muted-foreground py-3">
        {t("livescout.noOpponentPlayers")}
      </p>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground mb-2">{t("livescout.opponentPlayersLabel")}</p>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "inline-flex flex-col items-center justify-center rounded-lg border px-2 py-1 text-xs transition-colors",
              selectedId === p.id
                ? "bg-rose-600 text-white border-rose-600"
                : "hover:bg-accent",
            )}
          >
            <span className="font-semibold">#{p.number ?? "?"}</span>
            <span className="text-[10px] opacity-80">{p.position ?? "—"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
