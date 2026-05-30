import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Crown,
  Gauge,
  Keyboard,
  Maximize2,
  Minimize2,
  Monitor,
  MoreHorizontal,
  Radio,
  Repeat,
  Tablet,
  Users,
  Video,
  WifiOff,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ScoutMode } from "@/lib/scoutMode";
import type { Step } from "@/hooks/useScoutState";
import type { Match, Player, Lineup } from "@shared/schema";
import type { ScoutScope } from "@shared/types";
import type { ScoutHelpTab } from "@/components/scout/KeyboardHelp";

// ── Mode switch (Lite vs Complete) ───────────────────────────────────────
function ModeSwitch({
  mode,
  canUseComplete,
  onChange,
}: {
  mode: ScoutMode;
  canUseComplete: boolean;
  onChange: (m: ScoutMode) => void;
}) {
  const { t } = useTranslation();
  const Btn = ({
    target,
    icon: Icon,
    label,
  }: {
    target: ScoutMode;
    icon: typeof Zap;
    label: string;
  }) => {
    const active = mode === target;
    const locked = target === "complete" && !canUseComplete;
    return (
      <button
        onClick={() => onChange(target)}
        title={
          locked
            ? t("livescout.modeLockedComplete")
            : t("livescout.modeLabel", { label })
        }
        className={cn(
          "inline-flex items-center gap-1 px-2.5 h-8 text-xs font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : locked
              ? "text-muted-foreground"
              : "hover:bg-accent",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
        {locked && <Crown className="h-3 w-3 opacity-70" />}
      </button>
    );
  };

  return (
    <div className="hidden sm:inline-flex items-stretch rounded-md border overflow-hidden">
      <Btn target="lite" icon={Zap} label={t("keyboardHelp.modes.liteTitle")} />
      <div className="w-px bg-border" aria-hidden />
      <Btn target="complete" icon={Gauge} label={t("keyboardHelp.modes.completeTitle")} />
    </div>
  );
}

// ── Scope selector ───────────────────────────────────────────────────────
function ScopeSelector({
  scope,
  onChange,
}: {
  scope: ScoutScope;
  onChange: (s: ScoutScope) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="hidden sm:inline-flex items-stretch rounded-md border overflow-hidden" title={t("livescout.scopeLabel")}>
      {(["home", "both"] as const).map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            "px-2.5 h-8 text-xs font-medium transition-colors",
            scope === s
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent text-muted-foreground",
          )}
        >
          {s === "home" ? t("livescout.scopeHome") : t("livescout.scopeBoth")}
        </button>
      ))}
    </div>
  );
}

export type ScoutHeaderProps = {
  match: Match;
  matchId: string;
  mode: ScoutMode;
  canUseComplete: boolean;
  onModeChange: (m: ScoutMode) => void;
  scoutScope: ScoutScope;
  opponentTeamId: string | null | undefined;
  onScopeChange: (s: ScoutScope) => void;
  savedLineup: Lineup | null;
  onOpenLineup: () => void;
  onCourt: Player[];
  bench: Player[];
  onOpenSubs: () => void;
  tabletMode: boolean;
  onToggleTablet: () => void;
  videoFocusMode: boolean;
  onToggleVideoFocus: () => void;
  onOpenHelp: (tab?: ScoutHelpTab) => void;
  step: Step;
  updateMatch: { mutate: (patch: Partial<Match>) => void; isPending: boolean };
  onBack: () => void;
  isOnline?: boolean;
};

export function ScoutHeader({
  match,
  matchId,
  mode,
  canUseComplete,
  onModeChange,
  scoutScope,
  opponentTeamId,
  onScopeChange,
  savedLineup,
  onOpenLineup,
  onCourt,
  bench,
  onOpenSubs,
  tabletMode,
  onToggleTablet,
  videoFocusMode,
  onToggleVideoFocus,
  onOpenHelp,
  step,
  updateMatch,
  onBack,
  isOnline = true,
}: ScoutHeaderProps) {
  const { t } = useTranslation();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    function handler(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [overflowOpen]);

  return (
    <header className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label={t("livescout.backButton")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold tracking-tight truncate flex items-center gap-2">
            vs. {match.opponent}
            {!isOnline && (
              <span
                title={t("livescout.offline")}
                className="inline-flex items-center gap-1 text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded"
              >
                <WifiOff className="h-3 w-3" />
                Offline
              </span>
            )}
          </h1>
          <div className="text-xs text-muted-foreground">
            {match.competition ?? "Live Scout"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <ModeSwitch
                mode={mode}
                canUseComplete={canUseComplete}
                onChange={onModeChange}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div>
                <strong>Lite:</strong> {t("livescout.modeTooltipLite")}
              </div>
              <div>
                <strong>{t("keyboardHelp.modes.completeTitle")}:</strong> {t("livescout.modeTooltipComplete")}
              </div>
              <div className="text-muted-foreground">
                {t("livescout.modeTooltipHelp")}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
        {/* Scope selector — só visível quando há adversário catalogado */}
        {opponentTeamId && (
          <ScopeSelector
            scope={scoutScope}
            onChange={onScopeChange}
          />
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenLineup}
          title={t("livescout.setLineup")}
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">
            {savedLineup ? t("livescout.lineupButton") : t("livescout.setLineup")}
          </span>
        </Button>
        {/* Secondary actions — visible on desktop, collapsed on mobile */}
        <div className="hidden sm:flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenSubs}
            disabled={onCourt.length === 0 || bench.length === 0}
            title={t("livescout.subs")}
          >
            <Repeat className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">{t("livescout.subs")}</span>
          </Button>
          <Button
            size="sm"
            variant={tabletMode ? "secondary" : "ghost"}
            onClick={onToggleTablet}
            title="Modo tablet"
          >
            <Tablet className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Tablet</span>
          </Button>
          {match.videoUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={videoFocusMode ? "secondary" : "ghost"}
                  onClick={onToggleVideoFocus}
                  title="Modo vídeo"
                >
                  {videoFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  <span className="hidden sm:inline ml-1">Vídeo</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {videoFocusMode ? "Voltar ao layout normal" : "Expandir vídeo para acompanhar o jogo"}
              </TooltipContent>
            </Tooltip>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenHelp("shortcuts")}
            title={t("livescout.helpButton")}
            aria-label={t("livescout.helpAriaLabel")}
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <Button asChild size="sm" variant="ghost" title={t("livescout.secondScreen")}>
            <Link href={`/second-screen/${matchId}`}>
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">{t("livescout.secondScreen")}</span>
            </Link>
          </Button>
        </div>

        {/* Mobile overflow menu */}
        <div className="sm:hidden relative" ref={overflowRef}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOverflowOpen((v) => !v)}
            aria-label="Mais opções"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {overflowOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border bg-popover shadow-lg py-1 text-sm">
              <button
                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-accent disabled:opacity-40"
                onClick={() => { onOpenSubs(); setOverflowOpen(false); }}
                disabled={onCourt.length === 0 || bench.length === 0}
              >
                <Repeat className="h-4 w-4" /> {t("livescout.subs")}
              </button>
              <button
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 hover:bg-accent",
                  tabletMode && "text-primary font-medium",
                )}
                onClick={() => {
                  onToggleTablet();
                  setOverflowOpen(false);
                }}
              >
                <Tablet className="h-4 w-4" />
                {tabletMode ? "Desactivar modo telemóvel" : "Activar modo telemóvel"}
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-accent"
                onClick={() => { onOpenHelp("shortcuts"); setOverflowOpen(false); }}
              >
                <Keyboard className="h-4 w-4" /> {t("livescout.helpButton")}
              </button>
              <Link
                href={`/second-screen/${matchId}`}
                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-accent"
                onClick={() => setOverflowOpen(false)}
              >
                <Monitor className="h-4 w-4" /> {t("livescout.secondScreen")}
              </Link>
            </div>
          )}
        </div>
        {match.status !== "live" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateMatch.mutate({ status: "live" })}
            disabled={updateMatch.isPending}
          >
            <Radio className="h-4 w-4" /> {t("livescout.startMatch")}
          </Button>
        )}
        {match.status === "live" && (
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            onClick={() => {
              if (confirm(t("livescout.confirmFinishMatch")))
                updateMatch.mutate({ status: "finished" });
            }}
            disabled={updateMatch.isPending}
          >
            {t("livescout.finishMatch")}
          </Button>
        )}
      </div>
    </header>
  );
}
