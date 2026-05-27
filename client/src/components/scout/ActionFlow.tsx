import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ActionBar } from "@/components/scout/ActionBar";
import { ResultBar } from "@/components/scout/ResultBar";
import { ZoneKeypad } from "@/components/scout/ZoneKeypad";
import { LastActionPill } from "@/components/scout/LastActionPill";
import { ACTION_LABEL, type ActionType, type Zone } from "@shared/types";
import type { Step, LoggedAction, ScoutDispatch } from "@/hooks/useScoutState";
import type { ScoutMode } from "@/lib/scoutMode";
import type { Player } from "@shared/schema";

export type ActionFlowProps = {
  step: Step;
  mode: ScoutMode;
  actionType: ActionType | null;
  zoneFrom: Zone | null;
  zoneTo: Zone | null;
  suggested: ActionType | null;
  lastLogged: LoggedAction | null;
  lastPlayer: Player | null;
  dispatch: ScoutDispatch;
};

export function ActionFlow({
  step,
  mode,
  actionType,
  zoneFrom,
  zoneTo,
  suggested,
  lastLogged,
  lastPlayer,
  dispatch,
}: ActionFlowProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {step === "idle" && (
        <>
          <LastActionPill last={lastLogged} player={lastPlayer} />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              onClick={() => dispatch({ kind: "quickPoint", winner: "home" })}
              title={t("livescout.quickPointHomeTitle")}
            >
              <span className="text-base leading-none mr-1">✓</span>
              {t("livescout.quickPointHome")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-red-400/40 text-red-700 hover:bg-red-50 hover:border-red-400 dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={() => dispatch({ kind: "quickPoint", winner: "away" })}
              title={t("livescout.quickPointAwayTitle")}
            >
              <span className="text-base leading-none mr-1">✗</span>
              {t("livescout.quickPointAway")}
            </Button>
          </div>
        </>
      )}
      {(step === "action" ||
        step === "zone" ||
        step === "zoneFrom" ||
        step === "zoneTo" ||
        step === "result") && (
        <ActionBar
          value={actionType}
          onChange={(type) => dispatch({ kind: "selectAction", actionType: type })}
          disabled={step === "result"}
          suggested={step === "action" && mode === "complete" ? suggested : null}
        />
      )}
      {(step === "zone" || step === "zoneFrom" || step === "zoneTo") && (
        <ZoneKeypad
          step={step}
          selectedZone={step === "zoneFrom" ? zoneFrom : zoneTo}
          color={step === "zoneFrom" ? "amber" : "blue"}
          onSelect={(zone) => {
            if (step === "zoneFrom") dispatch({ kind: "selectZoneFrom", zone });
            else if (step === "zoneTo") dispatch({ kind: "selectZoneTo", zone });
            else dispatch({ kind: "selectZone", zone });
          }}
          onSkip={step === "zone" ? () => dispatch({ kind: "skipZone" }) : undefined}
        />
      )}
      {step === "result" && actionType && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            {t("livescout.resultLabel", { action: ACTION_LABEL[actionType].toLowerCase() })}
            {zoneFrom != null
              ? ` (Z${zoneFrom} → Z${zoneTo})`
              : zoneTo != null
                ? ` Z${zoneTo}`
                : ""}
          </div>
          <ResultBar
            actionType={actionType}
            onResult={(r) => dispatch({ kind: "selectResult", result: r })}
          />
        </div>
      )}
    </div>
  );
}
