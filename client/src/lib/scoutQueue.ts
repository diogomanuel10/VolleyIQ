import type { LoggedAction } from "@/hooks/useScoutState";

const queueKey = (matchId: string) => `volleyiq:offline:queue:${matchId}`;

export function getOfflineQueue(matchId: string): LoggedAction[] {
  try {
    const raw = localStorage.getItem(queueKey(matchId));
    return raw ? (JSON.parse(raw) as LoggedAction[]) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda uma acção na fila local. Devolve `false` se a escrita falhou
 * (quota esgotada, modo privado, localStorage indisponível) — nesse caso a
 * acção NÃO está guardada em lado nenhum e quem chama tem de avisar o
 * utilizador. Um treinador a marcar acções que desaparecem em silêncio a
 * meio de um jogo é a pior falha possível nesta app.
 */
export function enqueueOfflineAction(
  matchId: string,
  action: LoggedAction,
): boolean {
  try {
    const current = getOfflineQueue(matchId);
    if (current.some((a) => a.id === action.id)) return true;
    localStorage.setItem(queueKey(matchId), JSON.stringify([...current, action]));
    return true;
  } catch {
    return false;
  }
}

export function removeFromQueue(matchId: string, ids: string[]): void {
  try {
    const idSet = new Set(ids);
    const filtered = getOfflineQueue(matchId).filter((a) => !idSet.has(a.id));
    if (filtered.length === 0) {
      localStorage.removeItem(queueKey(matchId));
    } else {
      localStorage.setItem(queueKey(matchId), JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }
}

export function getOfflineQueueSize(matchId: string): number {
  return getOfflineQueue(matchId).length;
}
