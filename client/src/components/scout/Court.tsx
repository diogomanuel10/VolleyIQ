import { motion, AnimatePresence } from "framer-motion";
import { ZONES, ZONE_GRID, type Zone } from "@shared/types";
import { cn } from "@/lib/utils";
import type { Player } from "@shared/schema";

/**
 * Campo de voleibol dinâmico. A metade de cima (opponent) mostra as 9 zonas
 * numeradas. A metade de baixo (nossa) mostra tanto as zonas (em modo
 * `complete`, para escolher origem/destino da trajectória) como as 6
 * jogadoras em campo nas suas posições de rotação.
 *
 * Layout (SVG viewBox 300×600):
 *
 *   ┌─────────────┐  ← opponent court, zonas clicáveis
 *   │  4   3   2  │
 *   │  7   8   9  │
 *   │  5   6   1  │
 *   ├━━━━━━━━━━━━━┤  ← rede
 *   │  P4 P3 P2   │  ← nossas jogadoras front row (clicáveis em step=player)
 *   │  4   3   2  │  ← zonas da nossa metade (sobrepostas, clicáveis em
 *   │  7   8   9  │     step=zoneFrom/zoneTo em modo complete)
 *   │  P5 P6 P1   │
 *   │  5   6   1  │
 *   └─────────────┘
 */

type Half = "opponent" | "ours";

export interface CourtProps {
  /** Destino (zona onde caiu / foi atingida). */
  selectedZone?: Zone | null;
  /** Origem em modo completo (início da trajectória). */
  selectedZoneFrom?: Zone | null;
  /** Lado onde `selectedZone` (destino) foi marcada. */
  selectedZoneSide?: Half | null;
  /** Lado onde `selectedZoneFrom` foi marcada. */
  selectedZoneFromSide?: Half | null;

  onZoneSelect?: (z: Zone, side: Half) => void;
  onZoneFromSelect?: (z: Zone, side: Half) => void;

  /** `"from" | "to" | null` — que zona estamos a pedir neste momento. */
  pickTarget?: "from" | "to" | null;

  /** Jogadoras em campo, indexadas 0..5 correspondendo às posições 1..6. */
  lineup?: (Player | null)[];
  selectedPlayerId?: string | null;
  onPlayerSelect?: (id: string) => void;
  rotation?: number;

  /**
   * Quando true, desliga os toques nos jogadores (ex: estamos no passo de
   * zona). Útil para separar as duas interacções na mesma metade.
   */
  playersDisabled?: boolean;
  /** Desliga cliques nas zonas. */
  zonesDisabled?: boolean;

  className?: string;
}

// Geometria do SVG
const W = 300;
const H = 600;
const MARGIN = 12;
const COURT_W = W - MARGIN * 2;
const COURT_H = H - MARGIN * 2;
const HALF_H = COURT_H / 2;

const CELL_W = COURT_W / 3;
// Altura de cada linha de zonas (3 linhas por metade).
const ZONE_CELL_H = HALF_H / 3;

// Slots das 6 jogadoras na nossa metade (em posições de rotação base).
//   [P4][P3][P2]   ← front row (junto à rede)
//   [P5][P6][P1]   ← back row
const SLOT_POSITIONS: Array<{ row: 0 | 1; col: 0 | 1 | 2; pos: number }> = [
  { row: 0, col: 0, pos: 4 },
  { row: 0, col: 1, pos: 3 },
  { row: 0, col: 2, pos: 2 },
  { row: 1, col: 0, pos: 5 },
  { row: 1, col: 1, pos: 6 },
  { row: 1, col: 2, pos: 1 },
];

function zoneCenter(z: Zone, side: Half) {
  const { col, row } = ZONE_GRID[z];
  const cx = MARGIN + CELL_W * col + CELL_W / 2;
  const yBase =
    side === "opponent" ? MARGIN : MARGIN + HALF_H;
  const cy = yBase + ZONE_CELL_H * row + ZONE_CELL_H / 2;
  return { cx, cy };
}

export function Court({
  selectedZone,
  selectedZoneFrom,
  selectedZoneSide,
  selectedZoneFromSide,
  onZoneSelect,
  onZoneFromSelect,
  pickTarget,
  lineup,
  selectedPlayerId,
  onPlayerSelect,
  rotation = 1,
  playersDisabled,
  zonesDisabled,
  className,
}: CourtProps) {
  const rotatedLineup = lineup
    ? lineup.map((_, i) => {
        const sourceIdx = (i + (rotation - 1)) % 6;
        return lineup[sourceIdx];
      })
    : null;

  function handleZoneClick(z: Zone, side: Half) {
    if (zonesDisabled) return;
    if (pickTarget === "from") onZoneFromSelect?.(z, side);
    else onZoneSelect?.(z, side);
  }

  const trajectory =
    selectedZoneFrom != null &&
    selectedZoneFromSide &&
    selectedZone != null &&
    selectedZoneSide
      ? {
          from: zoneCenter(selectedZoneFrom, selectedZoneFromSide),
          to: zoneCenter(selectedZone, selectedZoneSide),
        }
      : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("w-full h-auto select-none no-touch-callout", className)}
      aria-label="Campo de voleibol"
    >
      <defs>
        <marker
          id="arrowhead"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
        </marker>
      </defs>

      {/* Chão neutro */}
      <rect x={0} y={0} width={W} height={H} className="fill-muted/30" />

      {/* Opponent court — zonas numeradas */}
      <ZoneGrid
        side="opponent"
        selectedZone={selectedZone}
        selectedZoneSide={selectedZoneSide}
        selectedZoneFrom={selectedZoneFrom}
        selectedZoneFromSide={selectedZoneFromSide}
        disabled={!!zonesDisabled}
        onZoneClick={handleZoneClick}
      />

      {/* Rede */}
      <line
        x1={MARGIN - 4}
        x2={W - MARGIN + 4}
        y1={MARGIN + HALF_H}
        y2={MARGIN + HALF_H}
        stroke="hsl(var(--court-line))"
        strokeWidth={3}
      />
      <text
        x={W / 2}
        y={MARGIN + HALF_H - 6}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px]"
      >
        REDE
      </text>

      {/* Our half — zonas (por baixo) + jogadoras (por cima) */}
      <ZoneGrid
        side="ours"
        selectedZone={selectedZone}
        selectedZoneSide={selectedZoneSide}
        selectedZoneFrom={selectedZoneFrom}
        selectedZoneFromSide={selectedZoneFromSide}
        disabled={!!zonesDisabled}
        onZoneClick={handleZoneClick}
      />
      <OurPlayers
        lineup={rotatedLineup}
        selectedPlayerId={selectedPlayerId ?? null}
        onPlayerSelect={onPlayerSelect}
        disabled={!!playersDisabled}
      />

      {/* Seta de trajectória (por cima de tudo) */}
      {trajectory && (
        <TrajectoryArrow from={trajectory.from} to={trajectory.to} />
      )}
    </svg>
  );
}

// ── Zone grid (uma metade do campo) ─────────────────────────────────────
function ZoneGrid({
  side,
  selectedZone,
  selectedZoneSide,
  selectedZoneFrom,
  selectedZoneFromSide,
  disabled,
  onZoneClick,
}: {
  side: Half;
  selectedZone?: Zone | null;
  selectedZoneSide?: Half | null;
  selectedZoneFrom?: Zone | null;
  selectedZoneFromSide?: Half | null;
  disabled: boolean;
  onZoneClick: (z: Zone, side: Half) => void;
}) {
  const x0 = MARGIN;
  const y0 = side === "opponent" ? MARGIN : MARGIN + HALF_H;

  return (
    <g>
      {/* Outline da metade */}
      <rect
        x={x0}
        y={y0}
        width={COURT_W}
        height={HALF_H}
        className={cn(
          side === "opponent"
            ? "fill-sky-500/5"
            : "fill-primary/5",
          "stroke-[hsl(var(--court-line))]",
        )}
        strokeWidth={2}
      />
      {/* Linha de ataque (a 3m da rede) */}
      <line
        x1={x0}
        x2={x0 + COURT_W}
        y1={
          side === "opponent"
            ? y0 + HALF_H - ZONE_CELL_H
            : y0 + ZONE_CELL_H
        }
        y2={
          side === "opponent"
            ? y0 + HALF_H - ZONE_CELL_H
            : y0 + ZONE_CELL_H
        }
        stroke="hsl(var(--court-line))"
        strokeDasharray="4 3"
        strokeOpacity={0.5}
      />
      {/* Label */}
      <text
        x={x0 + 6}
        y={side === "opponent" ? y0 + 14 : y0 + HALF_H - 6}
        className="fill-muted-foreground text-[10px]"
      >
        {side === "opponent" ? "ADVERSÁRIO" : "NÓS"}
      </text>

      {ZONES.map((z) => {
        const { col, row } = ZONE_GRID[z];
        const cx = x0 + CELL_W * col;
        const cy = y0 + ZONE_CELL_H * row;
        const isTo = selectedZone === z && selectedZoneSide === side;
        const isFrom =
          selectedZoneFrom === z && selectedZoneFromSide === side;
        return (
          <g key={`${side}-${z}`}>
            <motion.rect
              x={cx}
              y={cy}
              width={CELL_W}
              height={ZONE_CELL_H}
              rx={6}
              className={cn(
                "transition-colors",
                isTo
                  ? "fill-primary/25"
                  : isFrom
                    ? "fill-amber-500/30"
                    : disabled
                      ? side === "opponent"
                        ? "fill-sky-500/5"
                        : "fill-primary/5"
                      : side === "opponent"
                        ? "fill-sky-500/10 hover:fill-sky-500/20 cursor-pointer"
                        : "fill-primary/10 hover:fill-primary/20 cursor-pointer",
              )}
              stroke="hsl(var(--court-line))"
              strokeOpacity={0.35}
              strokeWidth={1}
              onClick={() => !disabled && onZoneClick(z, side)}
              whileTap={!disabled ? { scale: 0.96 } : undefined}
              style={{
                transformOrigin: `${cx + CELL_W / 2}px ${cy + ZONE_CELL_H / 2}px`,
              }}
            />
            <text
              x={cx + CELL_W / 2}
              y={cy + ZONE_CELL_H / 2 + 6}
              textAnchor="middle"
              className={cn(
                "text-[16px] font-bold pointer-events-none",
                isTo
                  ? "fill-primary"
                  : isFrom
                    ? "fill-amber-600"
                    : "fill-foreground/50",
              )}
            >
              {z}
            </text>
            <AnimatePresence>
              {(isTo || isFrom) && (
                <motion.circle
                  cx={cx + CELL_W / 2}
                  cy={cy + ZONE_CELL_H / 2}
                  initial={{ r: 0, opacity: 0.6 }}
                  animate={{
                    r: Math.min(CELL_W, ZONE_CELL_H) / 2,
                    opacity: 0,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  fill={isTo ? "hsl(var(--primary))" : "rgb(245 158 11)"}
                  pointerEvents="none"
                />
              )}
            </AnimatePresence>
          </g>
        );
      })}
    </g>
  );
}

// ── Seta de trajectória ─────────────────────────────────────────────────
function TrajectoryArrow({
  from,
  to,
}: {
  from: { cx: number; cy: number };
  to: { cx: number; cy: number };
}) {
  // Curva quadrática com control point a meio e deslocado perpendicularmente
  // à linha (dá aparência de bola em arco).
  const mx = (from.cx + to.cx) / 2;
  const my = (from.cy + to.cy) / 2;
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bend = Math.min(len * 0.25, 40);
  const cx = mx + nx * bend;
  const cy = my + ny * bend;

  return (
    <motion.path
      d={`M ${from.cx} ${from.cy} Q ${cx} ${cy}, ${to.cx} ${to.cy}`}
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth={3}
      strokeLinecap="round"
      markerEnd="url(#arrowhead)"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    />
  );
}

// ── Our players (por cima da zona grid) ─────────────────────────────────
function OurPlayers({
  lineup,
  selectedPlayerId,
  onPlayerSelect,
  disabled,
}: {
  lineup: (Player | null)[] | null;
  selectedPlayerId: string | null;
  onPlayerSelect?: (id: string) => void;
  disabled: boolean;
}) {
  const x0 = MARGIN;
  const y0 = MARGIN + HALF_H;
  const cellW = COURT_W / 3;
  // Os jogadores ficam em 2 linhas (front/back), não 3 como as zonas.
  const cellH = HALF_H / 2;

  return (
    <g>
      {SLOT_POSITIONS.map((slot, idx) => {
        const player = lineup?.[idx] ?? null;
        const cx = x0 + cellW * slot.col + cellW / 2;
        const cy = y0 + cellH * slot.row + cellH / 2;
        const isSelected = player && selectedPlayerId === player.id;
        const clickable = !disabled && !!player;
        return (
          <g
            key={idx}
            onClick={() => clickable && onPlayerSelect?.(player!.id)}
            className={cn(
              clickable ? "cursor-pointer" : "",
              !player && "opacity-40",
              disabled && "pointer-events-none",
            )}
            style={disabled ? { opacity: 0.65 } : undefined}
          >
            <motion.circle
              cx={cx}
              cy={cy}
              r={26}
              className={cn(
                "stroke-[hsl(var(--court-line))]",
                isSelected ? "fill-primary" : "fill-background",
              )}
              strokeWidth={2}
              whileTap={clickable ? { scale: 0.92 } : undefined}
              animate={isSelected ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ duration: 0.25 }}
            />
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              className={cn(
                "text-[16px] font-bold pointer-events-none",
                isSelected ? "fill-primary-foreground" : "fill-foreground",
              )}
            >
              {player ? `#${player.number}` : "—"}
            </text>
            <text
              x={cx}
              y={cy + 9}
              textAnchor="middle"
              className={cn(
                "text-[9px] pointer-events-none",
                isSelected
                  ? "fill-primary-foreground/90"
                  : "fill-muted-foreground",
              )}
            >
              {player ? player.position : `P${slot.pos}`}
            </text>
          </g>
        );
      })}
    </g>
  );
}
