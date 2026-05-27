import { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTeam } from "@/hooks/useTeam";
import { api } from "@/lib/api";
import { useBoardEditor, type BoardWithSlides } from "@/hooks/useBoardEditor";
import { BoardCanvas } from "@/components/board/Canvas";
import { PropertiesPanel } from "@/components/board/PropertiesPanel";
import { SlidesPanel } from "@/components/board/SlidesPanel";
import { AddPlayerDialog } from "@/components/board/AddPlayerDialog";
import { AddStatsDialog } from "@/components/board/AddStatsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Player } from "@shared/schema";
import { CANVAS_W, CANVAS_H } from "@shared/boardTypes";
import {
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  Minus,
  Plus,
  Printer,
  Square,
  Trash2,
  Type,
  Undo2,
  Users,
} from "lucide-react";

export default function BoardEditor() {
  const params = useParams<{ id: string }>();
  const boardId = params.id!;
  const [, navigate] = useLocation();
  const { team } = useTeam();

  const { data: boardData, isLoading } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => api.get<BoardWithSlides>(`/api/boards/${boardId}`),
  });

  const { data: rawPlayers = [] } = useQuery({
    queryKey: ["players", team?.id],
    queryFn: () => api.get<Player[]>(`/api/players?teamId=${team!.id}`),
    enabled: !!team,
  });

  const players = useMemo(
    () => rawPlayers.filter((p) => p.active),
    [rawPlayers],
  );

  const {
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
    activeSlide,
    save, undo,
    addSlide, deleteSlide,
    updateElement, moveElement,
    deleteSelected, duplicateSelected,
    addPlayerElement, addTextElement, addShapeElement, addArrowElement,
    addStatCardElement, addRotationChartElement, addPlayerStatsElement, addZoneHeatmapElement,
    updateActiveSlide,
    BG_PRESETS,
  } = useBoardEditor({
    boardId,
    teamId: team?.id,
    teamPrimaryColor: team?.primaryColor ?? undefined,
    boardData,
  });

  const selectedElement =
    activeSlide?.elements.find((e) => e.id === selectedId) ?? null;

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        A carregar…
      </div>
    );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate("/boards")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={boardName}
          onChange={(e) => {
            setBoardName(e.target.value);
            setIsDirty(true);
          }}
          onBlur={() => isDirty && save(slides, boardName)}
          className="h-8 max-w-[240px] font-semibold"
          placeholder="Nome da apresentação"
        />
        <div className="ml-auto flex items-center gap-2">
          {/* Slide navigation (mobile) */}
          <div className="flex items-center gap-1 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((i) => i - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {activeIndex + 1}/{slides.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={activeIndex === slides.length - 1}
              onClick={() => setActiveIndex((i) => i + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            title="Imprimir / Exportar PDF"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          <Button
            size="sm"
            onClick={() => save(slides, boardName)}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? "A guardar…" : isDirty ? "Guardar" : "Guardado"}
          </Button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-muted/30 shrink-0 print:hidden overflow-x-auto">
        <Button size="sm" variant="outline" onClick={() => setAddPlayerOpen(true)} className="text-xs shrink-0">
          <Users className="h-3.5 w-3.5 mr-1" /> Jogador
        </Button>
        <Button size="sm" variant="outline" onClick={addTextElement} className="text-xs shrink-0">
          <Type className="h-3.5 w-3.5 mr-1" /> Texto
        </Button>
        <Button size="sm" variant="outline" onClick={() => addShapeElement("rect")} className="text-xs shrink-0">
          <Square className="h-3.5 w-3.5 mr-1" /> Rect
        </Button>
        <Button size="sm" variant="outline" onClick={() => addShapeElement("circle")} className="text-xs shrink-0">
          <Circle className="h-3.5 w-3.5 mr-1" /> Círculo
        </Button>
        <Button size="sm" variant="outline" onClick={addArrowElement} className="text-xs shrink-0">
          <Minus className="h-3.5 w-3.5 mr-1" /> Seta
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAddStatsOpen(true)} className="text-xs shrink-0">
          <BarChart3 className="h-3.5 w-3.5 mr-1" /> Stats
        </Button>

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        {/* Background picker */}
        <div className="relative shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setShowBgPicker((v) => !v)}
          >
            <div
              className="h-3.5 w-3.5 rounded-sm border mr-1"
              style={{
                background:
                  activeSlide?.background === "court" ||
                  activeSlide?.background === "half-court"
                    ? "#c8a96a"
                    : activeSlide?.background,
              }}
            />
            Fundo
          </Button>
          {showBgPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg p-2 shadow-lg flex gap-1.5">
              {BG_PRESETS.map((p) => (
                <button
                  key={p.value}
                  title={p.label}
                  className={`flex flex-col items-center gap-0.5 p-1 rounded hover:bg-accent ${activeSlide?.background === p.value ? "ring-2 ring-primary" : ""}`}
                  onClick={() => {
                    updateActiveSlide({ background: p.value });
                    setShowBgPicker(false);
                  }}
                >
                  <div
                    className="h-8 w-12 rounded border"
                    style={{ background: p.value === "court" || p.value === "half-court" ? "#c8a96a" : p.value }}
                  />
                  <span className="text-[10px] text-muted-foreground">{p.label}</span>
                </button>
              ))}
              <button
                title="Cor personalizada"
                className="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-accent"
              >
                <input
                  type="color"
                  value={activeSlide?.background?.startsWith("#") ? activeSlide.background : "#1e293b"}
                  onChange={(e) => {
                    updateActiveSlide({ background: e.target.value });
                    setShowBgPicker(false);
                  }}
                  className="h-8 w-12 rounded border cursor-pointer"
                />
                <span className="text-[10px] text-muted-foreground">Custom</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        <Button
          size="sm"
          variant="ghost"
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Desfazer (Ctrl+Z)"
          className="shrink-0"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>

        {selectedId && (
          <>
            <Button size="sm" variant="ghost" onClick={duplicateSelected} title="Duplicar (Ctrl+D)" className="shrink-0">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={deleteSelected} title="Eliminar (Delete)" className="shrink-0 text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Slides panel */}
        {activeSlide && (
          <SlidesPanel
            slides={slides}
            activeIndex={activeIndex}
            onSelect={(i) => {
              setActiveIndex(i);
              setSelectedId(null);
            }}
            onAdd={addSlide}
            onDelete={deleteSlide}
            teamColor={team?.primaryColor ?? undefined}
          />
        )}

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-2 flex items-start justify-center bg-muted/20"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedId(null);
              setEditingTextId(null);
              setShowBgPicker(false);
            }
          }}
        >
          {activeSlide && (
            <div style={{ height: CANVAS_H * scale, width: CANVAS_W * scale }}>
              <BoardCanvas
                slide={activeSlide}
                players={players}
                selectedId={selectedId}
                editingTextId={editingTextId}
                scale={scale}
                onSelect={setSelectedId}
                onDeselect={() => {
                  setSelectedId(null);
                  setEditingTextId(null);
                }}
                onMoveElement={moveElement}
                onTextChange={(id, val) => updateElement(id, { content: val } as any)}
                onStartEditText={(id) => {
                  setSelectedId(id);
                  setEditingTextId(id);
                }}
              />
            </div>
          )}
        </div>

        {/* Properties panel */}
        <PropertiesPanel
          element={selectedElement}
          players={players}
          onUpdate={(patch) => selectedId && updateElement(selectedId, patch)}
          onDelete={deleteSelected}
          onDuplicate={duplicateSelected}
          teamColor={team?.primaryColor ?? undefined}
        />
      </div>

      {/* Add player dialog */}
      <AddPlayerDialog
        open={addPlayerOpen}
        players={players}
        onClose={() => setAddPlayerOpen(false)}
        onAdd={addPlayerElement}
      />

      {team && (
        <AddStatsDialog
          open={addStatsOpen}
          teamId={team.id}
          teamName={team.name}
          onClose={() => setAddStatsOpen(false)}
          onAdd={addStatCardElement}
          onAddRotation={addRotationChartElement}
          onAddPlayerStats={addPlayerStatsElement}
          onAddZoneHeatmap={addZoneHeatmapElement}
        />
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .board-print-canvas {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            transform: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
