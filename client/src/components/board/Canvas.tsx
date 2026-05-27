import { useState, useRef, useMemo } from "react";
import {
  CANVAS_W,
  CANVAS_H,
  type BoardSlideData,
  type BoardElement,
  type ArrowBoardElement,
} from "@shared/boardTypes";
import type { Player } from "@shared/schema";
import {
  CourtBg,
  PlayerCard,
  TextBox,
  ShapeEl,
  ArrowEl,
  StatCardEl,
  RotationChartEl,
  PlayerStatsEl,
  ZoneHeatmapEl,
} from "./elements";

// ─── Canvas ───────────────────────────────────────────────────────────────────

interface DragState {
  elementId: string;
  startMouseX: number;
  startMouseY: number;
  startElemX: number;
  startElemY: number;
  // For arrows, track both endpoints
  startX2?: number;
  startY2?: number;
}

export function BoardCanvas({
  slide,
  players,
  selectedId,
  editingTextId,
  scale,
  onSelect,
  onDeselect,
  onMoveElement,
  onTextChange,
  onStartEditText,
}: {
  slide: BoardSlideData;
  players: Player[];
  selectedId: string | null;
  editingTextId: string | null;
  scale: number;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onMoveElement: (id: string, x: number, y: number) => void;
  onTextChange: (id: string, val: string) => void;
  onStartEditText: (id: string) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const isCourtBg = slide.background === "court" || slide.background === "half-court";
  const bgStyle = isCourtBg ? undefined : { background: slide.background };

  const sortedElements = useMemo(
    () => [...slide.elements].sort((a, b) => a.zIndex - b.zIndex),
    [slide.elements],
  );

  function handleElementPointerDown(e: React.PointerEvent, element: BoardElement) {
    if (editingTextId === element.id) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onSelect(element.id);
    setDrag({
      elementId: element.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startElemX: element.x,
      startElemY: element.y,
      startX2: (element as ArrowBoardElement).x2,
      startY2: (element as ArrowBoardElement).y2,
    });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const dx = (e.clientX - drag.startMouseX) / scale;
    const dy = (e.clientY - drag.startMouseY) / scale;
    onMoveElement(drag.elementId, drag.startElemX + dx, drag.startElemY + dy);
  }

  function handlePointerUp() {
    setDrag(null);
  }

  return (
    <div
      ref={canvasRef}
      className="relative overflow-hidden rounded-sm shadow-2xl board-print-canvas"
      style={{
        width: CANVAS_W,
        height: CANVAS_H,
        transformOrigin: "top left",
        transform: `scale(${scale})`,
        ...bgStyle,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerDown={(e) => {
        // só desselecciona quando o clique vai direto ao canvas (não a um elemento)
        if (e.target === e.currentTarget) onDeselect();
      }}
    >
      {/* Background */}
      {isCourtBg && (
        <CourtBg
          half={slide.background === "half-court"}
          color="#2563eb"
        />
      )}

      {/* Elements */}
      {sortedElements.map((el) => {
        const pDown = (e: React.PointerEvent) =>
          handleElementPointerDown(e, el);

        if (el.type === "player") {
          const player = players.find((p) => p.id === el.playerId);
          return (
            <PlayerCard
              key={el.id}
              element={el}
              player={player}
              selected={selectedId === el.id}
              scale={scale}
              onPointerDown={pDown}
              onDoubleClick={() => {}}
            />
          );
        }
        if (el.type === "text") {
          return (
            <TextBox
              key={el.id}
              element={el}
              selected={selectedId === el.id}
              editing={editingTextId === el.id}
              onPointerDown={pDown}
              onDoubleClick={() => onStartEditText(el.id)}
              onContentChange={(v) => onTextChange(el.id, v)}
            />
          );
        }
        if (el.type === "shape") {
          return (
            <ShapeEl
              key={el.id}
              element={el}
              selected={selectedId === el.id}
              onPointerDown={pDown}
            />
          );
        }
        if (el.type === "arrow") {
          return (
            <ArrowEl
              key={el.id}
              element={el}
              selected={selectedId === el.id}
              onPointerDown={pDown}
            />
          );
        }
        if (el.type === "stat-card") {
          return (
            <StatCardEl
              key={el.id}
              element={el}
              selected={selectedId === el.id}
              onPointerDown={pDown}
            />
          );
        }
        if (el.type === "rotation-chart") {
          return <RotationChartEl key={el.id} element={el} selected={selectedId === el.id} onPointerDown={pDown} />;
        }
        if (el.type === "player-stats") {
          return <PlayerStatsEl key={el.id} element={el} selected={selectedId === el.id} onPointerDown={pDown} />;
        }
        if (el.type === "zone-heatmap") {
          return <ZoneHeatmapEl key={el.id} element={el} selected={selectedId === el.id} onPointerDown={pDown} />;
        }
        return null;
      })}
    </div>
  );
}
