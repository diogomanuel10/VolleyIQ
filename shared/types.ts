/**
 * Enums partilhados entre client e server. Mantidos como `as const` arrays
 * para poderem ser usados em Zod (`z.enum`) e em componentes de UI (iteração).
 */

export const ACTION_TYPES = [
  "serve",
  "reception",
  "set",
  "attack",
  "block",
  "dig",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const ACTION_RESULTS = [
  "kill",       // ponto ganho em ataque
  "error",      // erro próprio
  "ace",        // serviço direto
  "tooled",     // ataque que toca no bloco e sai
  "in_play",    // bola continua
  "perfect",    // passe/defesa perfeito (para reception/dig)
  "good",       // passe/defesa bom
  "poor",       // passe/defesa fraco
  "blocked",    // ataque bloqueado pelo adversário
  "stuff",      // bloco que pontua
  "touch",      // bloco de toque / defesa com desvio
] as const;
export type ActionResult = (typeof ACTION_RESULTS)[number];

export const POSITIONS = [
  "OH",   // outside hitter
  "OPP",  // opposite
  "MB",   // middle blocker
  "S",    // setter
  "L",    // libero
  "DS",   // defensive specialist
] as const;
export type Position = (typeof POSITIONS)[number];

/** Zonas 1–9 do campo (padrão internacional de scouting). */
export const ZONES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type Zone = (typeof ZONES)[number];

export const PLANS = ["basic", "pro", "club"] as const;
export type Plan = (typeof PLANS)[number];

export const CHECKLIST_CATEGORIES = [
  "lineup",
  "scouting",
  "tactical",
  "logistics",
] as const;
export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number];

export const TRAINING_PRIORITIES = ["high", "medium", "low"] as const;
export type TrainingPriority = (typeof TRAINING_PRIORITIES)[number];

/** Payload que o backend envia ao Claude para Pattern Detection. */
export interface PatternDetectionInput {
  teamId: string;
  opponent: string;
  sampleSize: number; // nº de acções usadas
  serveTargets: Record<string, number>;        // zona → count
  attackByRotation: Record<string, Record<string, number>>; // rotation → zone → count
  rotationSideOut: Record<string, number>;     // rotation → side-out %
  setterDistribution: Record<string, number>;  // posição → count
}

/** Output esperado do Claude (validado por Zod no server). */
export interface DetectedPattern {
  id: string;
  title: string;
  category: "serve" | "attack" | "rotation" | "setter" | "reception";
  confidence: number; // 0-100
  evidence: string;
  recommendation: string;
}
