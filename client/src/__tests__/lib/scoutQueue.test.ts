import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueOfflineAction,
  getOfflineQueue,
  getOfflineQueueSize,
  removeFromQueue,
} from "@/lib/scoutQueue";
import type { LoggedAction } from "@/hooks/useScoutState";

const MATCH = "match-1";

function action(id: string): LoggedAction {
  return {
    id,
    playerId: "p1",
    side: "home",
    type: "attack",
    zoneFrom: null,
    zoneTo: null,
    result: "kill",
    rallyId: "r1",
    rotation: 1,
    setNumber: 1,
    timestamp: 1,
  };
}

describe("scoutQueue", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("guarda e devolve acções por jogo", () => {
    expect(enqueueOfflineAction(MATCH, action("a"))).toBe(true);
    expect(enqueueOfflineAction(MATCH, action("b"))).toBe(true);
    expect(getOfflineQueue(MATCH).map((a) => a.id)).toEqual(["a", "b"]);
    expect(getOfflineQueueSize(MATCH)).toBe(2);
  });

  it("não duplica a mesma acção", () => {
    enqueueOfflineAction(MATCH, action("a"));
    enqueueOfflineAction(MATCH, action("a"));
    expect(getOfflineQueueSize(MATCH)).toBe(1);
  });

  it("mantém filas separadas por jogo", () => {
    enqueueOfflineAction(MATCH, action("a"));
    enqueueOfflineAction("match-2", action("b"));
    expect(getOfflineQueue(MATCH).map((a) => a.id)).toEqual(["a"]);
    expect(getOfflineQueue("match-2").map((a) => a.id)).toEqual(["b"]);
  });

  it("remove acções já enviadas e limpa a chave quando esvazia", () => {
    enqueueOfflineAction(MATCH, action("a"));
    enqueueOfflineAction(MATCH, action("b"));
    removeFromQueue(MATCH, ["a"]);
    expect(getOfflineQueue(MATCH).map((a) => a.id)).toEqual(["b"]);
    removeFromQueue(MATCH, ["b"]);
    expect(localStorage.getItem(`volleyiq:offline:queue:${MATCH}`)).toBeNull();
  });

  // O caso que interessa: se a escrita falhar, quem chama tem de saber,
  // senão a acção desaparece sem ninguém dar por isso.
  it("devolve false quando o localStorage recusa a escrita", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(enqueueOfflineAction(MATCH, action("a"))).toBe(false);
  });

  it("devolve fila vazia quando o conteúdo está corrompido", () => {
    localStorage.setItem(`volleyiq:offline:queue:${MATCH}`, "{nao-e-json");
    expect(getOfflineQueue(MATCH)).toEqual([]);
  });
});
