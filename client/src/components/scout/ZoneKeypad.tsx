import { cn } from "@/lib/utils";
import { ZONE_GRID, type Zone } from "@shared/types";
import type { Step } from "@/hooks/useScoutState";

/**
 * Teclado numérico visual de zonas (3×3).
 * Aparece automaticamente quando o passo de scouting é zone/zoneFrom/zoneTo,
 * permitindo seleccionar a zona sem clicar no campo SVG.
 *
 * Layout (padrão DataVolley, net em cima):
 *   [4][3][2]  ← rede
 *   [7][8][9]
 *   [5][6][1]  ← fundo
 */

// Build ordered grid from ZONE_GRID constant.
const GRID_ZONES: Zone[][] = [
  [4, 3, 2],
  [7, 8, 9],
  [5, 6, 1],
];

interface Props {
  step: Step;
  selectedZone?: Zone | null;
  onSelect: (zone: Zone) => void;
  onSkip?: () => void;
  /** Cor do indicador: amber = origem, blue = destino */
  color?: "amber" | "blue";
}

export function ZoneKeypad({ step, selectedZone, onSelect, onSkip, color = "blue" }: Props) {
  const isZoneStep = step === "zone" || step === "zoneFrom" || step === "zoneTo";
  if (!isZoneStep) return null;

  const label = step === "zoneFrom" ? "Zona de origem" : "Zona de destino";

  return (
    <div className="rounded-xl border bg-card p-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground/60">tecla 1–9</p>
      </div>

      <div
        className="grid grid-cols-3 gap-1"
        role="group"
        aria-label={label}
      >
        {GRID_ZONES.map((row) =>
          row.map((zone) => {
            const isSelected = selectedZone === zone;
            return (
              <button
                key={zone}
                type="button"
                onClick={() => onSelect(zone)}
                className={cn(
                  "h-10 rounded-lg text-sm font-semibold border transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? color === "amber"
                      ? "bg-amber-500/20 border-amber-500/60 text-amber-700 dark:text-amber-400"
                      : "bg-primary/15 border-primary/50 text-primary"
                    : "bg-muted/40 border-border/60 text-foreground hover:bg-accent hover:border-accent-foreground/20",
                )}
                aria-label={`Zona ${zone}`}
                aria-pressed={isSelected}
              >
                {zone}
              </button>
            );
          }),
        )}
      </div>

      {step === "zone" && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-[11px] text-muted-foreground hover:text-foreground py-1 rounded transition-colors"
        >
          Ignorar zona (Espaço)
        </button>
      )}

      <p className="text-[10px] text-muted-foreground/50 text-center">
        rede ↑
      </p>
    </div>
  );
}
