import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  BoardElement,
  PlayerBoardElement,
} from "@shared/boardTypes";
import type { Player } from "@shared/schema";

// ─── Properties panel ─────────────────────────────────────────────────────────

export function PropertiesPanel({
  element,
  players,
  onUpdate,
  onDelete,
  onDuplicate,
  teamColor,
}: {
  element: BoardElement | null;
  players: Player[];
  onUpdate: (patch: Partial<BoardElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  teamColor?: string;
}) {
  if (!element)
    return (
      <div className="w-56 shrink-0 border-l p-4 hidden lg:block">
        <p className="text-xs text-muted-foreground">
          Seleciona um elemento para editar as propriedades.
        </p>
      </div>
    );

  return (
    <div className="w-56 shrink-0 border-l p-3 overflow-y-auto hidden lg:flex lg:flex-col gap-3">
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={onDuplicate}>
          <Copy className="h-3 w-3 mr-1" /> Duplicar
        </Button>
        <Button size="sm" variant="destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {element.type === "stat-card" && (
        <>
          <div>
            <Label className="text-xs">Fundo</Label>
            <input
              type="color"
              value={element.bgColor}
              onChange={(e) => onUpdate({ bgColor: e.target.value } as any)}
              className="mt-1 h-8 w-full rounded border cursor-pointer"
            />
          </div>
          <div>
            <Label className="text-xs">Texto</Label>
            <input
              type="color"
              value={element.textColor}
              onChange={(e) => onUpdate({ textColor: e.target.value } as any)}
              className="mt-1 h-8 w-full rounded border cursor-pointer"
            />
          </div>
        </>
      )}

      {element.type === "player" && (
        <>
          <div>
            <Label className="text-xs">Cor do card</Label>
            <input
              type="color"
              value={element.cardColor ?? teamColor ?? "#1e40af"}
              onChange={(e) => onUpdate({ cardColor: e.target.value } as any)}
              className="mt-1 h-8 w-full rounded border cursor-pointer"
            />
          </div>
          <div className="space-y-1.5">
            {(
              [
                ["showPhoto", "Mostrar foto"],
                ["showNumber", "Mostrar número"],
                ["showName", "Mostrar nome"],
                ["showPosition", "Mostrar posição"],
              ] as [keyof PlayerBoardElement, string][]
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!(element as any)[key]}
                  onChange={(e) => onUpdate({ [key]: e.target.checked } as any)}
                  className="rounded"
                />
                {label}
              </label>
            ))}
          </div>
        </>
      )}

      {element.type === "text" && (
        <>
          <div>
            <Label className="text-xs">Tamanho de letra</Label>
            <input
              type="range"
              min={12}
              max={120}
              value={element.fontSize}
              onChange={(e) => onUpdate({ fontSize: Number(e.target.value) } as any)}
              className="w-full mt-1"
            />
            <span className="text-xs text-muted-foreground">{element.fontSize}px</span>
          </div>
          <div>
            <Label className="text-xs">Cor do texto</Label>
            <input
              type="color"
              value={element.color}
              onChange={(e) => onUpdate({ color: e.target.value } as any)}
              className="mt-1 h-8 w-full rounded border cursor-pointer"
            />
          </div>
          <div>
            <Label className="text-xs">Fundo</Label>
            <input
              type="color"
              value={element.background ?? "#000000"}
              onChange={(e) => onUpdate({ background: e.target.value } as any)}
              className="mt-1 h-8 w-full rounded border cursor-pointer"
            />
            <button
              className="text-xs text-muted-foreground mt-1"
              onClick={() => onUpdate({ background: undefined } as any)}
            >
              Sem fundo
            </button>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={element.bold ? "default" : "outline"}
              className="flex-1 text-xs font-bold"
              onClick={() => onUpdate({ bold: !element.bold } as any)}
            >
              B
            </Button>
            <Button
              size="sm"
              variant={element.italic ? "default" : "outline"}
              className="flex-1 text-xs italic"
              onClick={() => onUpdate({ italic: !element.italic } as any)}
            >
              I
            </Button>
          </div>
          <div>
            <Label className="text-xs">Alinhamento</Label>
            <div className="flex gap-1 mt-1">
              {(["left", "center", "right"] as const).map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant={element.align === a ? "default" : "outline"}
                  className="flex-1 text-xs"
                  onClick={() => onUpdate({ align: a } as any)}
                >
                  {a === "left" ? "≡" : a === "center" ? "≡" : "≡"}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}

      {element.type === "shape" && (
        <>
          <div>
            <Label className="text-xs">Preenchimento</Label>
            <input
              type="color"
              value={element.fill}
              onChange={(e) => onUpdate({ fill: e.target.value } as any)}
              className="mt-1 h-8 w-full rounded border cursor-pointer"
            />
          </div>
          <div>
            <Label className="text-xs">Contorno</Label>
            <input
              type="color"
              value={element.stroke}
              onChange={(e) => onUpdate({ stroke: e.target.value } as any)}
              className="mt-1 h-8 w-full rounded border cursor-pointer"
            />
          </div>
          <div>
            <Label className="text-xs">Opacidade</Label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={element.opacity}
              onChange={(e) => onUpdate({ opacity: Number(e.target.value) } as any)}
              className="w-full mt-1"
            />
          </div>
        </>
      )}

      {element.type === "arrow" && (
        <>
          <div>
            <Label className="text-xs">Cor</Label>
            <input
              type="color"
              value={element.color}
              onChange={(e) => onUpdate({ color: e.target.value } as any)}
              className="mt-1 h-8 w-full rounded border cursor-pointer"
            />
          </div>
          <div>
            <Label className="text-xs">Espessura</Label>
            <input
              type="range"
              min={1}
              max={12}
              value={element.strokeWidth}
              onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) } as any)}
              className="w-full mt-1"
            />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={element.dashed}
              onChange={(e) => onUpdate({ dashed: e.target.checked } as any)}
            />
            Tracejado
          </label>
        </>
      )}

      {(element.type === "rotation-chart" || element.type === "player-stats") && (
        <>
          <div>
            <Label className="text-xs">Fundo</Label>
            <input type="color" value={(element as any).bgColor} onChange={(e) => onUpdate({ bgColor: e.target.value } as any)} className="mt-1 h-8 w-full rounded border cursor-pointer" />
          </div>
          <div>
            <Label className="text-xs">Texto</Label>
            <input type="color" value={(element as any).textColor} onChange={(e) => onUpdate({ textColor: e.target.value } as any)} className="mt-1 h-8 w-full rounded border cursor-pointer" />
          </div>
        </>
      )}

      {element.type === "zone-heatmap" && (
        <div>
          <Label className="text-xs">Fundo</Label>
          <input type="color" value={element.bgColor} onChange={(e) => onUpdate({ bgColor: e.target.value } as any)} className="mt-1 h-8 w-full rounded border cursor-pointer" />
        </div>
      )}

      {/* Size */}
      <div className="grid grid-cols-2 gap-2 border-t pt-2">
        <div>
          <Label className="text-xs">Largura</Label>
          <Input
            type="number"
            value={Math.round(element.width)}
            min={20}
            onChange={(e) => onUpdate({ width: Number(e.target.value) } as any)}
            className="h-7 text-xs mt-0.5"
          />
        </div>
        <div>
          <Label className="text-xs">Altura</Label>
          <Input
            type="number"
            value={Math.round(element.height)}
            min={20}
            onChange={(e) => onUpdate({ height: Number(e.target.value) } as any)}
            className="h-7 text-xs mt-0.5"
          />
        </div>
      </div>
    </div>
  );
}
