/** Dimensões lógicas do canvas de apresentação (16:9). */
export const CANVAS_W = 1280;
export const CANVAS_H = 720;

interface BoardElementBase {
  id: string;
  x: number;      // px no espaço lógico do canvas
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface PlayerBoardElement extends BoardElementBase {
  type: "player";
  playerId: string;
  showPhoto: boolean;
  showNumber: boolean;
  showName: boolean;
  showPosition: boolean;
  cardColor?: string;
}

export interface TextBoardElement extends BoardElementBase {
  type: "text";
  content: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
  background?: string;
}

export interface ShapeBoardElement extends BoardElementBase {
  type: "shape";
  shape: "rect" | "circle";
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export interface ArrowBoardElement extends BoardElementBase {
  type: "arrow";
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
  dashed: boolean;
}

export interface RotationChartBoardElement extends BoardElementBase {
  type: "rotation-chart";
  title: string;
  metric: "sideOut" | "breakPoint";
  rotations: Array<{ rotation: number; value: number; rallies: number }>;
  bgColor: string;
  textColor: string;
}

export interface PlayerStatsBoardElement extends BoardElementBase {
  type: "player-stats";
  playerName: string;
  playerNumber: number;
  playerPosition: string;
  metrics: Array<{ label: string; value: string }>;
  bgColor: string;
  textColor: string;
}

export interface ZoneHeatmapBoardElement extends BoardElementBase {
  type: "zone-heatmap";
  title: string;
  actionType: "attack" | "serve" | "reception";
  zones: Array<{ zone: number; count: number; pct: number }>;
  maxCount: number;
  bgColor: string;
}

export interface StatCardBoardElement extends BoardElementBase {
  type: "stat-card";
  label: string;      // e.g. "Kill %"
  value: string;      // valor estático no momento da inserção, e.g. "46.2%"
  sublabel?: string;  // e.g. "Equipa · 6 jogos"
  bgColor: string;
  textColor: string;
}

export type BoardElement =
  | PlayerBoardElement
  | TextBoardElement
  | ShapeBoardElement
  | ArrowBoardElement
  | RotationChartBoardElement
  | PlayerStatsBoardElement
  | ZoneHeatmapBoardElement
  | StatCardBoardElement;

/** Cor hex, ou "court" para campo de voleibol, ou "half-court" para meio-campo. */
export type BoardBackground = string;

export interface BoardSlideData {
  id: string;
  title: string;
  background: BoardBackground;
  elements: BoardElement[];
}
