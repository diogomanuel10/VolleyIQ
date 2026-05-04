import { useEffect, useRef } from "react";
import {
  ACTION_TYPES,
  getResultByDv,
  type ActionType,
  type DvCode,
  type Zone,
  ZONES,
} from "@shared/types";
import type { Player } from "@shared/schema";
import type { ScoutState, ScoutDispatch } from "@/hooks/useScoutState";

const DV_KEYS: Record<string, DvCode> = {
  "#": "#",
  "+": "+",
  "-": "-",
  "/": "/",
  "!": "!",
  "=": "=",
};

/** Atalho 1–6 → tipo de acção (apenas no step "action"). */
const ACTION_BY_DIGIT: Record<string, ActionType> = {
  "1": ACTION_TYPES[0], // serve
  "2": ACTION_TYPES[1], // reception
  "3": ACTION_TYPES[2], // set
  "4": ACTION_TYPES[3], // attack
  "5": ACTION_TYPES[4], // block
  "6": ACTION_TYPES[5], // dig
};

const PLAYER_BUFFER_MS = 700;

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    t.isContentEditable
  );
}

interface Options {
  onUndo?: () => void;
  onToggleHelp?: () => void;
  /** Roster activo, para mapear nº camisola → playerId. */
  roster?: Player[];
}

export function useScoutKeyboard(
  state: ScoutState,
  dispatch: ScoutDispatch,
  opts: Options = {},
) {
  const { onUndo, onToggleHelp, roster = [] } = opts;

  // Buffer numérico para seleccionar jogadora por nº de camisola
  // (ex.: "1" + "2" em <700ms = jogadora #12).
  const numBuffer = useRef("");
  const numTimer = useRef<number | null>(null);

  // Mantemos refs frescas para evitar reattach do listener a cada render.
  const stateRef = useRef(state);
  const rosterRef = useRef(roster);
  const onUndoRef = useRef(onUndo);
  const onToggleHelpRef = useRef(onToggleHelp);
  stateRef.current = state;
  rosterRef.current = roster;
  onUndoRef.current = onUndo;
  onToggleHelpRef.current = onToggleHelp;

  useEffect(() => {
    function commitPlayerBuffer() {
      const val = numBuffer.current;
      numBuffer.current = "";
      if (numTimer.current !== null) {
        window.clearTimeout(numTimer.current);
        numTimer.current = null;
      }
      if (!val) return;
      const number = Number(val);
      const player = rosterRef.current.find(
        (p) => p.active && p.number === number,
      );
      if (player) {
        dispatch({ kind: "selectPlayer", playerId: player.id });
      }
    }

    function pushDigitForPlayer(digit: string) {
      // Se já temos 2 dígitos, novo dígito começa novo buffer.
      if (numBuffer.current.length >= 2) {
        numBuffer.current = "";
      }
      numBuffer.current += digit;
      if (numTimer.current !== null) {
        window.clearTimeout(numTimer.current);
      }
      // Se já temos 2 dígitos OU se o nº de camisola corresponder a um
      // jogador único e nenhum jogador com esse prefixo de 2 dígitos
      // existe, faz commit imediato. Caso contrário, espera o timeout.
      const current = Number(numBuffer.current);
      const candidates = rosterRef.current.filter(
        (p) => p.active && String(p.number).startsWith(numBuffer.current),
      );
      const exact = candidates.find((p) => p.number === current);
      const hasLonger = candidates.some(
        (p) => String(p.number).length > numBuffer.current.length,
      );
      if (exact && !hasLonger) {
        commitPlayerBuffer();
        return;
      }
      if (numBuffer.current.length >= 2) {
        commitPlayerBuffer();
        return;
      }
      numTimer.current = window.setTimeout(
        commitPlayerBuffer,
        PLAYER_BUFFER_MS,
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      // Ignora combinações com Alt/Meta (deixa atalhos do browser passar).
      if (e.altKey || e.metaKey) return;

      const s = stateRef.current;
      const key = e.key;

      // ── Atalhos globais ────────────────────────────────────────────
      // Undo: Ctrl+Z ou Backspace
      if (
        (e.ctrlKey && (key === "z" || key === "Z")) ||
        (!e.ctrlKey && !e.shiftKey && key === "Backspace")
      ) {
        if (s.log.length === 0) return;
        e.preventDefault();
        if (onUndoRef.current) onUndoRef.current();
        else dispatch({ kind: "undo" });
        return;
      }

      // Help overlay
      if (key === "?" || (e.shiftKey && key === "/")) {
        e.preventDefault();
        onToggleHelpRef.current?.();
        return;
      }

      // Esc: cancela selecção em curso
      if (key === "Escape") {
        if (s.step !== "idle") {
          e.preventDefault();
          dispatch({ kind: "reset" });
        }
        return;
      }

      // Resto requer sem Ctrl
      if (e.ctrlKey) return;

      // ── Step-specific ─────────────────────────────────────────────
      switch (s.step) {
        case "idle":
        case "player": {
          if (/^[0-9]$/.test(key)) {
            e.preventDefault();
            pushDigitForPlayer(key);
          }
          return;
        }

        case "action": {
          const action = ACTION_BY_DIGIT[key];
          if (action) {
            e.preventDefault();
            dispatch({ kind: "selectAction", actionType: action });
          }
          return;
        }

        case "zoneFrom":
        case "zoneTo":
        case "zone": {
          if (/^[1-9]$/.test(key)) {
            const z = Number(key) as Zone;
            if (!ZONES.includes(z)) return;
            e.preventDefault();
            if (s.step === "zoneFrom") {
              dispatch({ kind: "selectZoneFrom", zone: z });
            } else if (s.step === "zoneTo") {
              dispatch({ kind: "selectZoneTo", zone: z });
            } else {
              dispatch({ kind: "selectZone", zone: z });
            }
            return;
          }
          if (s.step === "zone" && (key === " " || key === "Spacebar")) {
            e.preventDefault();
            dispatch({ kind: "skipZone" });
          }
          return;
        }

        case "result": {
          if (!s.actionType) return;
          const dv = DV_KEYS[key];
          if (!dv) return;
          const result = getResultByDv(s.actionType, dv);
          if (!result) return;
          e.preventDefault();
          dispatch({ kind: "selectResult", result });
          return;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (numTimer.current !== null) {
        window.clearTimeout(numTimer.current);
      }
    };
  }, [dispatch]);
}
