import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getLastKnownToken } from "@/lib/firebase";
import {
  CANVAS_W,
  CANVAS_H,
  type BoardSlideData,
  type BoardElement,
  type PlayerBoardElement,
  type TextBoardElement,
  type ShapeBoardElement,
  type ArrowBoardElement,
  type RotationChartBoardElement,
  type PlayerStatsBoardElement,
  type ZoneHeatmapBoardElement,
  type StatCardBoardElement,
} from "@shared/boardTypes";
import type { Board } from "@shared/schema";
import type { StatOption } from "@/components/board/AddStatsDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BoardWithSlides = Board & {
  slides: Array<{
    id: string;
    boardId: string;
    title: string;
    position: number;
    background: string;
    elementsJson: string;
    createdAt: string;
  }>;
};

// ─── Background presets ───────────────────────────────────────────────────────

export const BG_PRESETS = [
  { label: "Escuro", value: "#1e293b" },
  { label: "Preto", value: "#000000" },
  { label: "Branco", value: "#ffffff" },
  { label: "Campo", value: "court" },
  { label: "Meio-campo", value: "half-court" },
];

// ─── Default slide factory ────────────────────────────────────────────────────

function makeDefaultSlide(): BoardSlideData {
  return {
    id: nanoid(8),
    title: "",
    background: "#1e293b",
    elements: [],
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBoardEditor({
  boardId,
  teamId,
  teamPrimaryColor,
  boardData,
}: {
  boardId: string;
  teamId: string | undefined;
  teamPrimaryColor: string | undefined;
  boardData: BoardWithSlides | undefined;
}) {
  const qc = useQueryClient();

  // ── Local slide state ──────────────────────────────────────────────────────
  const [slides, setSlides] = useState<BoardSlideData[]>([makeDefaultSlide()]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addStatsOpen, setAddStatsOpen] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [undoStack, setUndoStack] = useState<BoardSlideData[][]>([]);

  // Refs to always have latest values available in event handlers / cleanup
  const slidesRef = useRef<BoardSlideData[]>([]);
  const boardNameRef = useRef("");
  const isDirtyRef = useRef(false);

  // Container for scale calculation
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function update() {
      if (!containerRef.current) return;
      const available = containerRef.current.clientWidth - 8;
      setScale(Math.min(1, available / CANVAS_W));
    }
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Initialize from DB ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!boardData) return;
    setBoardName(boardData.name);
    if (boardData.slides.length > 0) {
      setSlides(
        boardData.slides.map((s) => ({
          id: s.id,
          title: s.title,
          background: s.background,
          elements: (() => {
            try {
              return JSON.parse(s.elementsJson) as BoardElement[];
            } catch {
              return [];
            }
          })(),
        })),
      );
    } else {
      setSlides([makeDefaultSlide()]);
    }
    setIsDirty(false);
  }, [boardData]);

  // ── Keep refs in sync for use in event handlers / cleanup ──────────────────
  useEffect(() => { slidesRef.current = slides; }, [slides]);
  useEffect(() => { boardNameRef.current = boardName; }, [boardName]);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (currentSlides: BoardSlideData[], currentName?: string) => {
      setIsSaving(true);
      try {
        const nameToSave = currentName ?? boardNameRef.current;
        await Promise.all([
          api.patch(`/api/boards/${boardId}`, { name: nameToSave }),
          api.put<{ ok: boolean }>(`/api/boards/${boardId}/slides`,
            currentSlides.map((s, i) => ({
              id: s.id,
              title: s.title,
              position: i,
              background: s.background,
              elementsJson: JSON.stringify(s.elements),
            })),
          ),
        ]);
        setIsDirty(false);
        isDirtyRef.current = false;
        qc.invalidateQueries({ queryKey: ["boards", teamId] });
      } catch (err) {
        console.error("[board] save error", err);
        toast.error("Erro ao guardar");
      } finally {
        setIsSaving(false);
      }
    },
    [boardId, teamId, qc],
  );

  // Flush pending save on unmount (e.g. navigating away)
  useEffect(() => {
    return () => {
      if (!isDirtyRef.current) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      void save(slidesRef.current);
    };
  }, [save]);

  // Guardar com keepalive no refresh/fecho do tab
  useEffect(() => {
    function onBeforeUnload() {
      if (!isDirtyRef.current) return;
      const token = getLastKnownToken();
      if (!token) return;
      const payload = slidesRef.current.map((s, i) => ({
        id: s.id,
        title: s.title,
        position: i,
        background: s.background,
        elementsJson: JSON.stringify(s.elements),
      }));
      // keepalive garante que o pedido é enviado mesmo que a página descarregue
      void fetch(`/api/boards/${boardId}/slides`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      void fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: boardNameRef.current }),
        keepalive: true,
      });
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [boardId]);

  function markDirty(newSlides: BoardSlideData[]) {
    setIsDirty(true);
    isDirtyRef.current = true;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => save(newSlides), 500);
  }

  // ── Slide operations ───────────────────────────────────────────────────────
  const activeSlide = slides[activeIndex] ?? slides[0];

  function pushUndo() {
    setUndoStack((prev) => {
      const next = [...prev, slides].slice(-20);
      return next;
    });
  }

  function updateSlides(newSlides: BoardSlideData[]) {
    setSlides(newSlides);
    markDirty(newSlides);
  }

  function updateActiveSlide(patch: Partial<BoardSlideData>) {
    pushUndo();
    const newSlides = slides.map((s, i) =>
      i === activeIndex ? { ...s, ...patch } : s,
    );
    updateSlides(newSlides);
  }

  function addSlide() {
    const newSlide = makeDefaultSlide();
    const newSlides = [...slides, newSlide];
    updateSlides(newSlides);
    setActiveIndex(newSlides.length - 1);
    setSelectedId(null);
  }

  function deleteSlide(i: number) {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, idx) => idx !== i);
    updateSlides(newSlides);
    setActiveIndex(Math.min(i, newSlides.length - 1));
    setSelectedId(null);
  }

  function undo() {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    updateSlides(prev);
  }

  // ── Element operations ─────────────────────────────────────────────────────
  function addElement(el: BoardElement) {
    pushUndo();
    updateActiveSlide({ elements: [...activeSlide.elements, el] });
    setSelectedId(el.id);
  }

  function updateElement(id: string, patch: Partial<BoardElement>) {
    const newElements = activeSlide.elements.map((el) =>
      el.id === id ? ({ ...el, ...patch } as BoardElement) : el,
    );
    const newSlides = slides.map((s, i) =>
      i === activeIndex ? { ...s, elements: newElements } : s,
    );
    setSlides(newSlides);
    markDirty(newSlides);
  }

  function moveElement(id: string, x: number, y: number) {
    const newElements = activeSlide.elements.map((el) => {
      if (el.id !== id) return el;
      if (el.type === "arrow") {
        const dx = x - el.x;
        const dy = y - el.y;
        return { ...el, x, y, x2: el.x2 + dx, y2: el.y2 + dy } as BoardElement;
      }
      return { ...el, x, y } as BoardElement;
    });
    const newSlides = slides.map((s, i) =>
      i === activeIndex ? { ...s, elements: newElements } : s,
    );
    setSlides(newSlides);
    markDirty(newSlides);
  }

  function deleteSelected() {
    if (!selectedId) return;
    pushUndo();
    updateActiveSlide({
      elements: activeSlide.elements.filter((el) => el.id !== selectedId),
    });
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selectedId) return;
    pushUndo();
    const el = activeSlide.elements.find((e) => e.id === selectedId);
    if (!el) return;
    const newEl: BoardElement = {
      ...el,
      id: nanoid(8),
      x: el.x + 20,
      y: el.y + 20,
      zIndex: el.zIndex + 1,
    } as BoardElement;
    updateActiveSlide({ elements: [...activeSlide.elements, newEl] });
    setSelectedId(newEl.id);
  }

  function maxZIndex() {
    return Math.max(0, ...activeSlide.elements.map((e) => e.zIndex));
  }

  function addPlayerElement(playerId: string) {
    addElement({
      id: nanoid(8),
      type: "player",
      playerId,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: 140,
      height: 180,
      zIndex: maxZIndex() + 1,
      showPhoto: true,
      showNumber: true,
      showName: true,
      showPosition: true,
      cardColor: teamPrimaryColor ?? "#1e40af",
    } as PlayerBoardElement);
  }

  function addTextElement() {
    const el: TextBoardElement = {
      id: nanoid(8),
      type: "text",
      content: "Texto",
      x: CANVAS_W / 2 - 100,
      y: CANVAS_H / 2 - 30,
      width: 200,
      height: 60,
      zIndex: maxZIndex() + 1,
      fontSize: 32,
      color: "#ffffff",
      bold: false,
      italic: false,
      align: "center",
    };
    addElement(el);
    setTimeout(() => setEditingTextId(el.id), 50);
  }

  function addShapeElement(shape: "rect" | "circle") {
    addElement({
      id: nanoid(8),
      type: "shape",
      shape,
      x: CANVAS_W / 2 - 80,
      y: CANVAS_H / 2 - 80,
      width: 160,
      height: 160,
      zIndex: maxZIndex() + 1,
      fill: teamPrimaryColor ?? "#2563eb",
      stroke: "transparent",
      strokeWidth: 2,
      opacity: 0.85,
    } as ShapeBoardElement);
  }

  function addArrowElement() {
    addElement({
      id: nanoid(8),
      type: "arrow",
      x: 200,
      y: 200,
      x2: 500,
      y2: 350,
      width: 320,
      height: 160,
      zIndex: maxZIndex() + 1,
      color: "#facc15",
      strokeWidth: 4,
      dashed: false,
    } as ArrowBoardElement);
  }

  function addStatCardElement(opt: StatOption) {
    addElement({
      id: nanoid(8),
      type: "stat-card",
      label: opt.label,
      value: opt.value,
      sublabel: opt.sublabel,
      x: CANVAS_W / 2 - 100,
      y: CANVAS_H / 2 - 60,
      width: 200,
      height: 120,
      zIndex: maxZIndex() + 1,
      bgColor: teamPrimaryColor ?? "#1e40af",
      textColor: "#ffffff",
    } as StatCardBoardElement);
  }

  function addRotationChartElement(title: string, metric: "sideOut" | "breakPoint", rotations: RotationChartBoardElement["rotations"]) {
    addElement({
      id: nanoid(8),
      type: "rotation-chart",
      title,
      metric,
      rotations,
      x: CANVAS_W / 2 - 160,
      y: CANVAS_H / 2 - 100,
      width: 320,
      height: 200,
      zIndex: maxZIndex() + 1,
      bgColor: "#1e293b",
      textColor: "#ffffff",
    } as RotationChartBoardElement);
  }

  function addPlayerStatsElement(playerName: string, playerNumber: number, playerPosition: string, metrics: Array<{ label: string; value: string }>) {
    addElement({
      id: nanoid(8),
      type: "player-stats",
      playerName,
      playerNumber,
      playerPosition,
      metrics,
      x: CANVAS_W / 2 - 140,
      y: CANVAS_H / 2 - 70,
      width: 280,
      height: 140,
      zIndex: maxZIndex() + 1,
      bgColor: teamPrimaryColor ?? "#1e40af",
      textColor: "#ffffff",
    } as PlayerStatsBoardElement);
  }

  function addZoneHeatmapElement(title: string, actionType: "attack" | "serve" | "reception", zones: Array<{ zone: number; count: number; pct: number }>, maxCount: number) {
    addElement({
      id: nanoid(8),
      type: "zone-heatmap",
      title,
      actionType,
      zones,
      maxCount,
      x: CANVAS_W / 2 - 110,
      y: CANVAS_H / 2 - 110,
      width: 220,
      height: 220,
      zIndex: maxZIndex() + 1,
      bgColor: "#0f172a",
    } as ZoneHeatmapBoardElement);
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (editingTextId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          deleteSelected();
        }
      }
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
      }
      if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        duplicateSelected();
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setEditingTextId(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, editingTextId, deleteSelected, duplicateSelected, undo]);

  return {
    // state
    slides, activeIndex, setActiveIndex,
    selectedId, setSelectedId,
    editingTextId, setEditingTextId,
    boardName, setBoardName,
    isDirty, setIsDirty, isSaving,
    addPlayerOpen, setAddPlayerOpen,
    addStatsOpen, setAddStatsOpen,
    showBgPicker, setShowBgPicker,
    scale, containerRef,
    undoStack,
    // derived
    activeSlide,
    // operations
    save, undo,
    addSlide, deleteSlide,
    addElement, updateElement, moveElement,
    deleteSelected, duplicateSelected,
    addPlayerElement, addTextElement, addShapeElement, addArrowElement,
    addStatCardElement, addRotationChartElement, addPlayerStatsElement, addZoneHeatmapElement,
    updateActiveSlide,
    BG_PRESETS,
  };
}
