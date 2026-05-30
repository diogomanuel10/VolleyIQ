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

export function enqueueOfflineAction(matchId: string, action: LoggedAction): void {
  try {
    const current = getOfflineQueue(matchId);
    if (current.some((a) => a.id === action.id)) return;
    localStorage.setItem(queueKey(matchId), JSON.stringify([...current, action]));
  } catch {
    // localStorage quota exceeded or unavailable — best effort
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
