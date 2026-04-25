import { useSyncExternalStore } from "react";
import type { Plan } from "@shared/types";

/**
 * Modo de scouting:
 *   - `lite`     — fluxo mínimo (jogador → acção → zona → resultado). Rápido,
 *                  permite zona opcional. Disponível em todos os planos.
 *   - `complete` — fluxo completo: origem + destino obrigatórios (trajectória),
 *                  sugestão da próxima acção segundo o fluxo do jogo. Requer
 *                  plano pro ou club.
 */
export type ScoutMode = "lite" | "complete";

const STORAGE_PREFIX = "volleyiq:scout-mode:";

function key(teamId: string) {
  return `${STORAGE_PREFIX}${teamId}`;
}

function getStored(teamId: string): ScoutMode | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(key(teamId));
  return v === "lite" || v === "complete" ? v : null;
}

/**
 * Planos que permitem o modo completo. Alterar aqui se as regras mudarem.
 */
const COMPLETE_PLANS: ReadonlySet<Plan> = new Set<Plan>(["pro", "club"]);

export function isCompleteAllowed(plan: Plan | undefined | null): boolean {
  return !!plan && COMPLETE_PLANS.has(plan);
}

/**
 * Modo efectivo tendo em conta o plano + preferência guardada. Se o plano
 * não permite `complete`, devolve sempre `lite`. Se não há preferência
 * guardada, `complete` é o default em planos que o permitem.
 */
export function resolveMode(
  teamId: string,
  plan: Plan | undefined | null,
): ScoutMode {
  if (!isCompleteAllowed(plan)) return "lite";
  const stored = getStored(teamId);
  return stored ?? "complete";
}

const listeners = new Set<() => void>();

export function setScoutMode(teamId: string, mode: ScoutMode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key(teamId), mode);
  }
  for (const l of listeners) l();
}

/**
 * Hook reactivo. O componente re-renderiza quando `setScoutMode` é chamado
 * (em qualquer parte da app), garantindo sync entre abas.
 */
export function useScoutMode(
  teamId: string,
  plan: Plan | undefined | null,
): {
  mode: ScoutMode;
  canUseComplete: boolean;
  set: (m: ScoutMode) => void;
} {
  // `useSyncExternalStore` revalida `getSnapshot` quando listeners disparam.
  const mode = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => resolveMode(teamId, plan),
    () => "lite" as ScoutMode,
  );
  return {
    mode,
    canUseComplete: isCompleteAllowed(plan),
    set: (m) => setScoutMode(teamId, m),
  };
}
