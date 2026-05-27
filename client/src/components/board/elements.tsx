import { useEffect, useRef } from "react";
import {
  CANVAS_W,
  CANVAS_H,
  type PlayerBoardElement,
  type TextBoardElement,
  type ShapeBoardElement,
  type ArrowBoardElement,
  type RotationChartBoardElement,
  type PlayerStatsBoardElement,
  type ZoneHeatmapBoardElement,
  type StatCardBoardElement,
} from "@shared/boardTypes";
import type { Player } from "@shared/schema";

// ─── Volleyball court SVG background ─────────────────────────────────────────

export function CourtBg({ half, color }: { half?: boolean; color: string }) {
  const courtW = half ? CANVAS_W : CANVAS_W;
  const courtH = CANVAS_H;
  const lineColor = "rgba(255,255,255,0.7)";
  return (
    <svg
      viewBox={`0 0 ${courtW} ${courtH}`}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    >
      {/* Floor */}
      <rect width={courtW} height={courtH} fill="#c8a96a" />
      {/* Court boundary */}
      {!half ? (
        <>
          <rect x="60" y="80" width={courtW - 120} height={courtH - 160} fill="none" stroke={lineColor} strokeWidth="3" />
          {/* Net */}
          <line x1={courtW / 2} y1="60" x2={courtW / 2} y2={courtH - 60} stroke="white" strokeWidth="5" />
          {/* Attack lines */}
          <line x1={courtW / 2 - 220} y1="80" x2={courtW / 2 - 220} y2={courtH - 80} stroke={lineColor} strokeWidth="2" strokeDasharray="8 4" />
          <line x1={courtW / 2 + 220} y1="80" x2={courtW / 2 + 220} y2={courtH - 80} stroke={lineColor} strokeWidth="2" strokeDasharray="8 4" />
          {/* Zone numbers */}
          {([
            [160, 200, "6"], [160, 430, "5"], [160, 620, "4"],
            [480, 200, "1"], [480, 430, "2"], [480, 620, "3"],
          ] as [number, number, string][]).map(([x, y, n]) => (
            <text key={n} x={x} y={y} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="36" fontFamily="sans-serif">{n}</text>
          ))}
        </>
      ) : (
        <>
          <rect x="60" y="80" width={(courtW - 120) / 2} height={courtH - 160} fill="none" stroke={lineColor} strokeWidth="3" />
          <line x1="60" y1="80" x2={courtW / 2} y2="80" stroke={lineColor} strokeWidth="5" />
          <line x1={courtW / 2 - 220} y1="80" x2={courtW / 2 - 220} y2={courtH - 80} stroke={lineColor} strokeWidth="2" strokeDasharray="8 4" />
          {([
            [160, 200, "6"], [160, 430, "5"], [160, 620, "4"],
            [480, 200, "1"], [480, 430, "2"], [480, 620, "3"],
          ] as [number, number, string][]).map(([x, y, n]) => (
            <text key={n} x={x} y={y} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="36" fontFamily="sans-serif">{n}</text>
          ))}
        </>
      )}
    </svg>
  );
}

// ─── Element rendering ────────────────────────────────────────────────────────

export function PlayerCard({
  element,
  player,
  selected,
  scale,
  onPointerDown,
  onDoubleClick,
}: {
  element: PlayerBoardElement;
  player: Player | undefined;
  selected: boolean;
  scale: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
}) {
  const initials = player
    ? `${player.firstName[0]}${player.lastName[0]}`
    : "?";
  const displayName = element.showName
    ? player
      ? `${player.firstName} ${player.lastName}`
      : "Jogador"
    : "";

  return (
    <div
      className={`absolute cursor-move select-none rounded-xl overflow-hidden flex flex-col items-center justify-center gap-1 shadow-lg transition-shadow ${
        selected ? "ring-2 ring-white ring-offset-1 ring-offset-transparent shadow-xl" : ""
      }`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        background: element.cardColor ?? "#1e40af",
        zIndex: element.zIndex,
      }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {/* Photo / Avatar */}
      {element.showPhoto && (
        <div
          className="rounded-full overflow-hidden flex items-center justify-center bg-white/20 text-white font-bold"
          style={{ width: element.height * 0.42, height: element.height * 0.42, fontSize: element.height * 0.18 }}
        >
          {player?.photoUrl ? (
            <img src={player.photoUrl} alt={initials} className="w-full h-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
      )}
      {/* Number badge */}
      {element.showNumber && player?.number !== undefined && (
        <span
          className="font-black text-white/90 leading-none"
          style={{ fontSize: element.height * 0.2 }}
        >
          #{player.number}
        </span>
      )}
      {/* Name */}
      {element.showName && displayName && (
        <span
          className="text-white font-medium leading-tight text-center px-1 truncate w-full"
          style={{ fontSize: element.height * 0.13 }}
        >
          {displayName}
        </span>
      )}
      {/* Position */}
      {element.showPosition && player?.position && (
        <span
          className="bg-white/20 text-white/80 rounded px-1"
          style={{ fontSize: element.height * 0.11 }}
        >
          {player.position}
        </span>
      )}
      {selected && (
        <div className="absolute inset-0 border-2 border-white/40 rounded-xl pointer-events-none" />
      )}
    </div>
  );
}

export function TextBox({
  element,
  selected,
  editing,
  onPointerDown,
  onDoubleClick,
  onContentChange,
}: {
  element: TextBoardElement;
  selected: boolean;
  editing: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
  onContentChange: (val: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }, [editing]);

  return (
    <div
      className={`absolute cursor-move select-none ${selected ? "outline outline-2 outline-white" : ""}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        background: element.background ?? "transparent",
        borderRadius: 4,
      }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <div
        ref={ref}
        contentEditable={editing}
        suppressContentEditableWarning
        onInput={(e) => onContentChange((e.target as HTMLElement).innerText)}
        onPointerDown={editing ? (e) => e.stopPropagation() : undefined}
        className={`w-full h-full overflow-hidden break-words ${editing ? "cursor-text outline-none" : ""}`}
        style={{
          fontSize: element.fontSize,
          color: element.color,
          fontWeight: element.bold ? "bold" : "normal",
          fontStyle: element.italic ? "italic" : "normal",
          textAlign: element.align,
          padding: 8,
          lineHeight: 1.4,
        }}
      >
        {element.content}
      </div>
    </div>
  );
}

export function ShapeEl({
  element,
  selected,
  onPointerDown,
}: {
  element: ShapeBoardElement;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const isCircle = element.shape === "circle";
  return (
    <div
      className={`absolute cursor-move ${selected ? "outline outline-2 outline-white" : ""}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        background: element.fill,
        border: `${element.strokeWidth}px solid ${element.stroke}`,
        borderRadius: isCircle ? "50%" : 4,
        opacity: element.opacity,
      }}
      onPointerDown={onPointerDown}
    />
  );
}

export function ArrowEl({
  element,
  selected,
  onPointerDown,
}: {
  element: ArrowBoardElement;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const dx = element.x2 - element.x;
  const dy = element.y2 - element.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const bboxW = Math.abs(dx) + 40;
  const bboxH = Math.abs(dy) + 40;
  const ox = element.x < element.x2 ? 0 : Math.abs(dx);
  const oy = element.y < element.y2 ? 0 : Math.abs(dy);
  const id = `arrow-${element.id}`;
  return (
    <div
      className={`absolute cursor-move ${selected ? "outline outline-1 outline-white" : ""}`}
      style={{
        left: Math.min(element.x, element.x2) - 20,
        top: Math.min(element.y, element.y2) - 20,
        width: bboxW,
        height: bboxH,
        zIndex: element.zIndex,
        pointerEvents: "all",
      }}
      onPointerDown={onPointerDown}
    >
      <svg width={bboxW} height={bboxH} style={{ overflow: "visible" }}>
        <defs>
          <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={element.color} />
          </marker>
        </defs>
        <line
          x1={ox + 20}
          y1={oy + 20}
          x2={ox + 20 + dx}
          y2={oy + 20 + dy}
          stroke={element.color}
          strokeWidth={element.strokeWidth}
          strokeDasharray={element.dashed ? "12 6" : undefined}
          markerEnd={`url(#${id})`}
        />
      </svg>
    </div>
  );
}

// ─── Rotation chart ──────────────────────────────────────────────────────────

export function RotationChartEl({
  element, selected, onPointerDown,
}: {
  element: RotationChartBoardElement;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const { rotations, bgColor, textColor, title } = element;
  const maxVal = Math.max(...rotations.map((r) => r.value), 1);
  const svgH = element.height - 28;
  const svgW = element.width - 16;
  const barW = svgW / rotations.length - 4;

  return (
    <div
      className={`absolute cursor-move select-none rounded-xl shadow-lg overflow-hidden ${selected ? "ring-2 ring-white ring-offset-1" : ""}`}
      style={{ left: element.x, top: element.y, width: element.width, height: element.height, background: bgColor, zIndex: element.zIndex }}
      onPointerDown={onPointerDown}
    >
      <div className="text-xs font-semibold px-2 pt-1.5 truncate" style={{ color: textColor }}>{title}</div>
      <svg width={svgW} height={svgH} className="mx-2">
        {rotations.map((r, i) => {
          const barH = Math.max(4, (svgH - 24) * (r.value / 100));
          const x = i * (svgW / rotations.length) + 2;
          const y = svgH - 16 - barH;
          const color = r.rallies === 0 ? "#6b7280" : r.value >= 60 ? "#22c55e" : r.value < 40 ? "#ef4444" : "#f59e0b";
          return (
            <g key={r.rotation}>
              <rect x={x} y={y} width={barW} height={barH} fill={color} opacity={0.85} rx={2} />
              <text x={x + barW / 2} y={svgH - 4} textAnchor="middle" fill={textColor} fontSize={9} opacity={0.7}>
                R{r.rotation}
              </text>
              {r.rallies > 0 && (
                <text x={x + barW / 2} y={Math.max(10, y - 2)} textAnchor="middle" fill={textColor} fontSize={8} opacity={0.9}>
                  {r.value}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Player stats ─────────────────────────────────────────────────────────────

export function PlayerStatsEl({
  element, selected, onPointerDown,
}: {
  element: PlayerStatsBoardElement;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const { bgColor, textColor, playerName, playerNumber, playerPosition, metrics } = element;
  return (
    <div
      className={`absolute cursor-move select-none rounded-xl shadow-lg overflow-hidden ${selected ? "ring-2 ring-white ring-offset-1" : ""}`}
      style={{ left: element.x, top: element.y, width: element.width, height: element.height, background: bgColor, zIndex: element.zIndex }}
      onPointerDown={onPointerDown}
    >
      <div className="px-3 pt-2 pb-1 flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center shrink-0" style={{ fontSize: 11, fontWeight: 700, color: textColor }}>
          {playerNumber}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold leading-tight truncate" style={{ color: textColor }}>{playerName}</div>
          <div className="text-xs opacity-60" style={{ color: textColor }}>{playerPosition}</div>
        </div>
      </div>
      <div className="px-2 pb-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 3)}, 1fr)` }}>
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg px-1 py-1 text-center" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="font-black tabular-nums" style={{ color: textColor, fontSize: Math.min(18, element.width / metrics.length / 2) }}>
              {m.value}
            </div>
            <div className="text-[9px] opacity-60 truncate" style={{ color: textColor }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Zone heatmap ─────────────────────────────────────────────────────────────

export const ZONE_GRID_MAP: Record<number, { col: number; row: number }> = {
  4: { col: 0, row: 0 }, 3: { col: 1, row: 0 }, 2: { col: 2, row: 0 },
  7: { col: 0, row: 1 }, 8: { col: 1, row: 1 }, 9: { col: 2, row: 1 },
  5: { col: 0, row: 2 }, 6: { col: 1, row: 2 }, 1: { col: 2, row: 2 },
};

export function ZoneHeatmapEl({
  element, selected, onPointerDown,
}: {
  element: ZoneHeatmapBoardElement;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const { bgColor, title, zones, maxCount } = element;
  const zoneMap = new Map(zones.map((z) => [z.zone, z]));
  const svgW = element.width - 8;
  const svgH = element.height - 26;
  const cellW = svgW / 3;
  const cellH = svgH / 3;

  return (
    <div
      className={`absolute cursor-move select-none rounded-xl shadow-lg overflow-hidden ${selected ? "ring-2 ring-white ring-offset-1" : ""}`}
      style={{ left: element.x, top: element.y, width: element.width, height: element.height, background: bgColor, zIndex: element.zIndex }}
      onPointerDown={onPointerDown}
    >
      <div className="text-xs font-semibold px-2 pt-1.5 truncate text-white/80">{title}</div>
      <svg width={svgW} height={svgH} className="mx-1">
        {([1, 2, 3, 4, 5, 6, 7, 8, 9] as number[]).map((zone) => {
          const g = ZONE_GRID_MAP[zone];
          const zd = zoneMap.get(zone);
          const opacity = zd && maxCount > 0 ? 0.1 + (zd.count / maxCount) * 0.75 : 0.06;
          return (
            <g key={zone}>
              <rect x={g.col * cellW + 1} y={g.row * cellH + 1} width={cellW - 2} height={cellH - 2} fill="#22c55e" opacity={opacity} rx={3} />
              <text x={g.col * cellW + cellW / 2} y={g.row * cellH + cellH / 2 + (zd ? -3 : 4)} textAnchor="middle" fill="white" fontSize={10} opacity={0.6}>
                {zone}
              </text>
              {zd && (
                <text x={g.col * cellW + cellW / 2} y={g.row * cellH + cellH / 2 + 9} textAnchor="middle" fill="white" fontSize={9} opacity={0.9} fontWeight="bold">
                  {zd.pct}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

export function StatCardEl({
  element,
  selected,
  onPointerDown,
}: {
  element: StatCardBoardElement;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className={`absolute cursor-move select-none rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg ${
        selected ? "ring-2 ring-white ring-offset-1 shadow-xl" : ""
      }`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        background: element.bgColor,
        zIndex: element.zIndex,
      }}
      onPointerDown={onPointerDown}
    >
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70 px-2 text-center" style={{ color: element.textColor }}>
        {element.label}
      </div>
      <div className="font-black tabular-nums leading-none px-2 text-center" style={{ color: element.textColor, fontSize: Math.round(element.height * 0.32) }}>
        {element.value}
      </div>
      {element.sublabel && (
        <div className="text-xs opacity-50 px-2 text-center truncate w-full" style={{ color: element.textColor }}>
          {element.sublabel}
        </div>
      )}
    </div>
  );
}
