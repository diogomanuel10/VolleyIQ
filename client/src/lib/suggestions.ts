import type { LoggedAction, Side } from "@/hooks/useScoutState";
import type { Player } from "@shared/schema";

/**
 * Sugestões em tempo real para o painel lateral do LiveScout.
 *
 * Híbrido por design:
 *  - `live`     → derivadas do log da partida actual (`state.log`).
 *  - `history`  → derivadas de jogos anteriores vs este adversário
 *                 (`ScoutingAggregation` vinda de `/api/scouting/:opponent`).
 *
 * Regras voluntariamente conservadoras: só emitimos uma sugestão quando
 * há suporte estatístico mínimo (ex: ≥3 ataques, ≥4 recepções). Caso
 * contrário ficamos em silêncio — preferimos painel vazio a ruído.
 */

export type SuggestionCategory =
  | "scorer"      // jogador em alta forma
  | "cold"        // jogador em má forma / risco de substituição
  | "reception"   // adversário a focar recepção num jogador nosso
  | "setter"      // distribuição enviesada do nosso passador
  | "rotation"    // rotação forte/fraca historicamente
  | "tendency";   // tendência geral de zona/ataque

export type SuggestionPriority = "high" | "medium" | "low";
export type SuggestionSource = "live" | "history";

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  title: string;
  detail: string;
  evidence: string;
  source: SuggestionSource;
}

/** Forma da resposta de `/api/scouting/:opponent` (ver server/stats.ts). */
export interface ScoutingHistory {
  sampleMatches: number;
  rotationSideOut: Array<{ rotation: string; pct: number }>;
  attackZones: Array<{ zone: string; count: number }>;
}

interface BuildArgs {
  log: LoggedAction[];
  rotation: number;
  servingTeam: Side;
  setNumber: number;
  players: Player[];
  history: ScoutingHistory | null;
}

const PLAYER_NAME_FALLBACK = "—";

function playerLabel(p: Player | undefined): string {
  if (!p) return PLAYER_NAME_FALLBACK;
  return `#${p.number} ${p.firstName}`;
}

/**
 * Sugestões de "scorer em alta forma": jogador com ≥3 ataques e kill% ≥ 60%
 * na partida actual. Pega no melhor (mais kills) e devolve uma sugestão alta.
 */
function liveHotScorer(
  log: LoggedAction[],
  byId: Map<string, Player>,
): Suggestion | null {
  const byPlayer = new Map<string, { kills: number; total: number }>();
  for (const a of log) {
    if (a.type !== "attack" || !a.playerId) continue;
    const cur = byPlayer.get(a.playerId) ?? { kills: 0, total: 0 };
    cur.total += 1;
    if (a.result === "kill") cur.kills += 1;
    byPlayer.set(a.playerId, cur);
  }
  let best: { id: string; kills: number; total: number } | null = null;
  for (const [id, s] of byPlayer) {
    if (s.total < 3) continue;
    const pct = s.kills / s.total;
    if (pct < 0.6) continue;
    if (!best || s.kills > best.kills) best = { id, ...s };
  }
  if (!best) return null;
  const p = byId.get(best.id);
  return {
    id: `live-hot-${best.id}`,
    category: "scorer",
    priority: "high",
    title: `${playerLabel(p)} está em alta`,
    detail: `${best.kills}/${best.total} ataques convertidos. Continua a procurá-la.`,
    evidence: `Esta partida · ${best.kills}/${best.total}`,
    source: "live",
  };
}

/**
 * Sugestão de "cold streak": jogador com ≥2 ataques consecutivos com erro
 * (ou bloqueado) nas últimas N acções. Sinal precoce para considerar
 * substituição ou mudar a distribuição.
 */
function liveColdStreak(
  log: LoggedAction[],
  byId: Map<string, Player>,
): Suggestion | null {
  // Procura últimas 2 acções de ataque por jogador (ordem cronológica).
  const recentByPlayer = new Map<string, LoggedAction[]>();
  for (const a of log) {
    if (a.type !== "attack" || !a.playerId) continue;
    const arr = recentByPlayer.get(a.playerId) ?? [];
    arr.push(a);
    recentByPlayer.set(a.playerId, arr);
  }
  for (const [id, arr] of recentByPlayer) {
    if (arr.length < 2) continue;
    const last2 = arr.slice(-2);
    const allBad = last2.every(
      (a) => a.result === "error" || a.result === "blocked",
    );
    if (!allBad) continue;
    const p = byId.get(id);
    return {
      id: `live-cold-${id}`,
      category: "cold",
      priority: "medium",
      title: `${playerLabel(p)} em ataque difícil`,
      detail: "2 ataques seguidos sem ponto. Considera variar a distribuição.",
      evidence: "Esta partida · últimos 2 ataques",
      source: "live",
    };
  }
  return null;
}

/**
 * Sugestão de "alvo de recepção": adversário a servir repetidamente para
 * o mesmo jogador nosso (≥3 das últimas 4 recepções).
 */
function liveReceptionTarget(
  log: LoggedAction[],
  byId: Map<string, Player>,
): Suggestion | null {
  const receptions = log.filter((a) => a.type === "reception" && a.playerId);
  if (receptions.length < 4) return null;
  const last4 = receptions.slice(-4);
  const counts = new Map<string, number>();
  for (const a of last4) {
    counts.set(a.playerId, (counts.get(a.playerId) ?? 0) + 1);
  }
  for (const [id, c] of counts) {
    if (c < 3) continue;
    const p = byId.get(id);
    return {
      id: `live-recv-${id}`,
      category: "reception",
      priority: "high",
      title: `Adversário a focar ${playerLabel(p)}`,
      detail: `${c}/4 últimos serviços para ela. Prepara cobertura ou troca.`,
      evidence: `Esta partida · ${c}/4 receções`,
      source: "live",
    };
  }
  return null;
}

/**
 * Sugestão de distribuição enviesada do passador: se um único atacante
 * recebe ≥60% das nossas bolas (com ≥6 sets registados), sugere variar.
 */
function liveSetterBias(
  log: LoggedAction[],
  byId: Map<string, Player>,
): Suggestion | null {
  // Próxima acção depois de cada `set` é tipicamente o ataque para esse passe.
  // Aproximação: contar ataques por jogador como receptor de distribuição.
  const attacks = log.filter((a) => a.type === "attack" && a.playerId);
  if (attacks.length < 6) return null;
  const counts = new Map<string, number>();
  for (const a of attacks) {
    counts.set(a.playerId, (counts.get(a.playerId) ?? 0) + 1);
  }
  for (const [id, c] of counts) {
    const pct = c / attacks.length;
    if (pct < 0.6) continue;
    const p = byId.get(id);
    return {
      id: `live-setter-bias-${id}`,
      category: "setter",
      priority: "low",
      title: `Distribuição muito focada em ${playerLabel(p)}`,
      detail: `${Math.round(pct * 100)}% dos ataques para ela. Variar pode quebrar bloco adversário.`,
      evidence: `Esta partida · ${c}/${attacks.length} ataques`,
      source: "live",
    };
  }
  return null;
}

/**
 * Sugestão histórica: side-out da rotação actual vs este adversário.
 * Sinal positivo (`pct ≥ 60`) ou negativo (`pct < 40`) com amostra ≥1 jogo.
 */
function historyRotationSideOut(
  rotation: number,
  history: ScoutingHistory,
): Suggestion | null {
  if (history.sampleMatches < 1) return null;
  const row = history.rotationSideOut.find(
    (r) => r.rotation === `R${rotation}`,
  );
  if (!row || row.pct === 0) return null;
  if (row.pct >= 60) {
    return {
      id: `hist-rot-strong-${rotation}`,
      category: "rotation",
      priority: "medium",
      title: `R${rotation} é a nossa rotação forte vs eles`,
      detail: `${row.pct}% side-out histórico. Manter posicionamento agressivo.`,
      evidence: `${history.sampleMatches} jogo(s) anteriores`,
      source: "history",
    };
  }
  if (row.pct < 40) {
    return {
      id: `hist-rot-weak-${rotation}`,
      category: "rotation",
      priority: "high",
      title: `R${rotation} tem sido frágil vs este adversário`,
      detail: `${row.pct}% side-out histórico. Considera ajuste táctico ou substituição.`,
      evidence: `${history.sampleMatches} jogo(s) anteriores`,
      source: "history",
    };
  }
  return null;
}

/**
 * Sugestão histórica: zona de ataque mais usada por nós vs este adversário.
 * Útil para o coach decidir se quer manter ou variar.
 */
function historyAttackTendency(
  history: ScoutingHistory,
): Suggestion | null {
  if (history.sampleMatches < 1) return null;
  const total = history.attackZones.reduce((s, z) => s + z.count, 0);
  if (total < 20) return null;
  const top = [...history.attackZones].sort((a, b) => b.count - a.count)[0];
  if (!top) return null;
  const pct = Math.round((top.count / total) * 100);
  if (pct < 35) return null;
  return {
    id: `hist-attack-z${top.zone}`,
    category: "tendency",
    priority: "low",
    title: `Zona ${top.zone} é o nosso padrão vs este adversário`,
    detail: `${pct}% dos ataques aí historicamente. Variar pode surpreender.`,
    evidence: `${history.sampleMatches} jogo(s) · ${total} ataques`,
    source: "history",
  };
}

/**
 * Constrói a lista de sugestões para o estado actual. Ordena por prioridade
 * (high → medium → low), com no máximo 4 entradas para não saturar o painel.
 */
export function buildSuggestions(args: BuildArgs): Suggestion[] {
  const byId = new Map(args.players.map((p) => [p.id, p]));
  const out: Suggestion[] = [];

  const live = [
    liveHotScorer(args.log, byId),
    liveColdStreak(args.log, byId),
    liveReceptionTarget(args.log, byId),
    liveSetterBias(args.log, byId),
  ].filter((x): x is Suggestion => x !== null);
  out.push(...live);

  if (args.history) {
    const hist = [
      historyRotationSideOut(args.rotation, args.history),
      historyAttackTendency(args.history),
    ].filter((x): x is Suggestion => x !== null);
    out.push(...hist);
  }

  const order: Record<SuggestionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  out.sort((a, b) => order[a.priority] - order[b.priority]);
  return out.slice(0, 4);
}
