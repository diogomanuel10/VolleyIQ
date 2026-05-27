import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BoardSlideData } from "@shared/boardTypes";

// ─── Slides panel ─────────────────────────────────────────────────────────────

export function SlidesPanel({
  slides,
  activeIndex,
  onSelect,
  onAdd,
  onDelete,
  teamColor,
}: {
  slides: BoardSlideData[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onDelete: (i: number) => void;
  teamColor?: string;
}) {
  return (
    <div className="w-36 shrink-0 border-r flex flex-col overflow-hidden hidden md:flex">
      <div className="p-2 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Slides
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => onSelect(i)}
            className={`relative w-full rounded aspect-video border-2 text-left group transition-colors ${
              i === activeIndex
                ? "border-primary"
                : "border-transparent hover:border-muted-foreground/30"
            }`}
            style={{
              background:
                slide.background === "court" || slide.background === "half-court"
                  ? "#c8a96a"
                  : slide.background,
            }}
          >
            <span className="absolute bottom-1 left-1 text-[10px] text-white/80 font-medium drop-shadow">
              {i + 1}
            </span>
            {slide.title && (
              <span className="absolute inset-x-1 bottom-4 text-[9px] text-white/70 truncate drop-shadow">
                {slide.title}
              </span>
            )}
            {slides.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(i);
                }}
                className="absolute top-0.5 right-0.5 h-4 w-4 rounded text-white/60 hover:text-white hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
            )}
          </button>
        ))}
      </div>
      <div className="p-2 border-t">
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" /> Slide
        </Button>
      </div>
    </div>
  );
}
