import { ZONES, ZONE_GRID } from "@shared/types";
import { cn } from "@/lib/utils";

/**
 * Court read-only com pontos precisos. Coordenadas vêm em % do SVG do
 * Court principal (0..100), onde x ∈ [0, 50] é o lado adversário e
 * x ∈ [50, 100] é o nosso. Mostramos apenas um meio-campo, com remapping.
 *
 * Os pontos são coloridos consoante o resultado: verde (positivo), vermelho
 * (erro), âmbar (neutro). Útil para ver tendências de ataque/saque
 * espacialmente — onde a bola acaba realmente, sem o agrupamento por zona.
 */
export interface ScatterPoint {
  x: number; // % do court inteiro
  y: number;
  result: string;
  matchId?: string;
}

interface Props {
  points: ScatterPoint[];
  /** Lado a desenhar — só pontos com x consistente são mostrados. */
  side: "opponent" | "ours";
  className?: string;
  ariaLabel?: string;
}

const POSITIVE = new Set(["kill", "ace", "stuff", "perfect"]);
const NEGATIVE = new Set(["error", "blocked"]);

function colorFor(result: string): string {
  if (POSITIVE.has(result)) return "rgb(16 185 129)"; // emerald-500
  if (NEGATIVE.has(result)) return "rgb(239 68 68)"; // red-500
  return "rgb(245 158 11)"; // amber-500
}

export function ScatterCourt({ points, side, className, ariaLabel }: Props) {
  const W = 300;
  const H = 200;
  const M = 8;
  const courtW = W - M * 2;
  const courtH = H - M * 2;
  const cellW = courtW / 3;
  const cellH = courtH / 3;
  const baseFill = side === "opponent" ? "fill-sky-500/5" : "fill-primary/5";

  // Filtra pontos para o lado pedido. x do court inteiro: 0..50 = opponent,
  // 50..100 = ours. Remapeia para 0..100% do meio-campo desenhado.
  const filtered = points
    .filter((p) =>
      side === "opponent" ? p.x <= 50 + 0.001 : p.x >= 50 - 0.001,
    )
    .map((p) => ({
      ...p,
      // Remap x: para opponent (0..50) → 0..1; para ours (50..100) → 0..1.
      localX: side === "opponent" ? p.x / 50 : (p.x - 50) / 50,
      // y: a altura é a mesma do court inteiro (0..100). Os marcadores
      // do Court principal ocupam 0..100% — o mapping é directo.
      localY: p.y / 100,
    }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("w-full h-auto", className)}
      aria-label={ariaLabel}
    >
      <rect
        x={M}
        y={M}
        width={courtW}
        height={courtH}
        className={cn(baseFill, "stroke-[hsl(var(--court-line))]")}
        strokeWidth={2}
        rx={4}
      />

      {/* Linhas de zona (subtis) + números */}
      {ZONES.map((z) => {
        const { col, row } = ZONE_GRID[z];
        const cx = M + cellW * col;
        const cy = M + cellH * row;
        return (
          <g key={z} pointerEvents="none">
            <rect
              x={cx}
              y={cy}
              width={cellW}
              height={cellH}
              fill="transparent"
              stroke="hsl(var(--court-line))"
              strokeOpacity={0.2}
              strokeWidth={1}
            />
            <text
              x={cx + cellW / 2}
              y={cy + cellH / 2 + 4}
              textAnchor="middle"
              className="text-[10px] font-semibold fill-foreground/15"
            >
              {z}
            </text>
          </g>
        );
      })}

      {/* Linha de meio (rede) */}
      {side === "opponent" ? (
        <line
          x1={M + courtW}
          x2={M + courtW}
          y1={M - 2}
          y2={M + courtH + 2}
          stroke="hsl(var(--court-line))"
          strokeWidth={2}
        />
      ) : (
        <line
          x1={M}
          x2={M}
          y1={M - 2}
          y2={M + courtH + 2}
          stroke="hsl(var(--court-line))"
          strokeWidth={2}
        />
      )}

      {/* Pontos */}
      {filtered.map((p, i) => {
        const cx = M + p.localX * courtW;
        const cy = M + p.localY * courtH;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={4}
            fill={colorFor(p.result)}
            fillOpacity={0.7}
            stroke="white"
            strokeWidth={1}
          />
        );
      })}

      {filtered.length === 0 && (
        <text
          x={W / 2}
          y={H / 2 + 4}
          textAnchor="middle"
          className="text-[11px] fill-muted-foreground italic"
        >
          Sem pontos precisos registados.
        </text>
      )}
    </svg>
  );
}
