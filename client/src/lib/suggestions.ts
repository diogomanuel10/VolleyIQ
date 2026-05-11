import type { LoggedAction, Side } from "@/hooks/useScoutState";
import type { Player } from "@shared/schema";

export interface PlayerAggregate {
  playerId: string;
  matchesPlayed: number;
  attacks:    { total: number; kills: number; errors: number };
  serves:     { total: number; aces: number; errors: number };
  receptions: { total: number; perfect: number; good: number; poor: number; error: number };
}

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
  | "scorer"        // jogador em alta forma
  | "cold"          // jogador em má forma / risco de substituição
  | "reception"     // adversário a focar recepção num jogador nosso
  | "setter"        // distribuição enviesada do nosso passador
  | "rotation"      // rotação forte/fraca historicamente
  | "tendency"      // tendência geral de zona/ataque
  | "substitution"; // substituição recomendada (serviço/recepção/ataque)

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
  onCourt: Player[];
  bench: Player[];
  playerAggregates: PlayerAggregate[];
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

// ── Substituições recomendadas ────────────────────────────────────────────

/** Posições que jogam em recepção (pode receber uma DS ou OH). */
const RECEPTION_POSITIONS = new Set(["OH", "DS", "L"]);
/** Posições de ataque compatíveis entre si. */
const ATTACK_GROUPS: Record<string, string[]> = {
  OH: ["OH", "DS"],
  OPP: ["OPP", "OH"],
  MB: ["MB"],
  S: ["S"],
  DS: ["DS", "OH"],
  L: ["L"],
};

function recPct(r: PlayerAggregate["receptions"]): number {
  if (!r.total) return 0;
  // Rating 0–3 normalizado: perfect=3, good=2, poor=1, error=0
  return ((r.perfect * 3 + r.good * 2 + r.poor) / (r.total * 3)) * 100;
}

function aceRate(s: PlayerAggregate["serves"]): number {
  return s.total ? (s.aces / s.total) * 100 : 0;
}

function serveErrRate(s: PlayerAggregate["serves"]): number {
  return s.total ? (s.errors / s.total) * 100 : 0;
}

function killPct(a: PlayerAggregate["attacks"]): number {
  return a.total ? (a.kills / a.total) * 100 : 0;
}

/**
 * Para cada jogadora em campo com recepção fraca neste set (< 50%),
 * procura no banco a melhor receptora compatível (OH/DS/mesma posição)
 * com histórico ≥ 65%. Emite no máximo 1 sugestão.
 */
function subForReception(
  log: LoggedAction[],
  setNumber: number,
  onCourt: Player[],
  bench: Player[],
  aggs: Map<string, PlayerAggregate>,
  byId: Map<string, Player>,
): Suggestion | null {
  const setLog = log.filter((a) => a.setNumber === setNumber);

  for (const player of onCourt) {
    if (player.position === "L") continue;
    const recs = setLog.filter((a) => a.type === "reception" && a.playerId === player.id);
    if (recs.length < 5) continue;
    const pts = recs.reduce((acc, a) => {
      if (a.result === "perfect") return acc + 3;
      if (a.result === "good") return acc + 2;
      if (a.result === "poor") return acc + 1;
      return acc;
    }, 0);
    const pct = (pts / (recs.length * 3)) * 100;
    if (pct >= 50) continue;

    const candidates = bench
      .filter((b) => {
        const pos = b.position ?? "";
        const onPos = player.position ?? "";
        return RECEPTION_POSITIONS.has(pos) || pos === onPos;
      })
      .map((b) => ({ player: b, agg: aggs.get(b.id) }))
      .filter((c) => c.agg && c.agg.matchesPlayed >= 2 && c.agg.receptions.total >= 5)
      .map((c) => ({ player: c.player, pct: recPct(c.agg!.receptions) }))
      .sort((a, b) => b.pct - a.pct);

    const best = candidates[0];
    if (!best || best.pct < 65) continue;

    const p = byId.get(player.id);
    return {
      id: `sub-rec-${player.id}`,
      category: "substitution",
      priority: "high",
      title: `Substituição — recepção de ${playerLabel(p)}`,
      detail: `${Math.round(pct)}% neste set (${recs.length} recepções). ${playerLabel(best.player)} (${best.player.position}) tem ${Math.round(best.pct)}% histórico.`,
      evidence: `Set ${setNumber} · ${recs.length} recepções`,
      source: "live",
    };
  }
  return null;
}

/**
 * Para cada jogadora em campo com serviço fraco neste set (0 aces OU
 * > 35% erros com ≥ 5 serviços), procura no banco a melhor servidora
 * independentemente de posição. Emite no máximo 1 sugestão.
 */
function subForServe(
  log: LoggedAction[],
  setNumber: number,
  onCourt: Player[],
  bench: Player[],
  aggs: Map<string, PlayerAggregate>,
  byId: Map<string, Player>,
): Suggestion | null {
  const setLog = log.filter((a) => a.setNumber === setNumber);

  for (const player of onCourt) {
    if (player.position === "L") continue;
    const serves = setLog.filter((a) => a.type === "serve" && a.playerId === player.id);
    if (serves.length < 5) continue;
    const aces = serves.filter((a) => a.result === "ace").length;
    const errs = serves.filter((a) => a.result === "error").length;
    const errRate = (errs / serves.length) * 100;
    const isWeak = aces === 0 || errRate > 35;
    if (!isWeak) continue;

    const candidates = bench
      .map((b) => ({ player: b, agg: aggs.get(b.id) }))
      .filter((c) => c.agg && c.agg.matchesPlayed >= 2 && c.agg.serves.total >= 5)
      .map((c) => ({ player: c.player, ace: aceRate(c.agg!.serves), err: serveErrRate(c.agg!.serves) }))
      .filter((c) => c.ace > 5 || c.err < errRate - 10)
      .sort((a, b) => b.ace - a.ace);

    const best = candidates[0];
    if (!best) continue;

    const p = byId.get(player.id);
    const detail = aces === 0
      ? `Sem aces em ${serves.length} serviços. ${playerLabel(best.player)} (${best.player.position}) tem ${Math.round(best.ace)}% aces histórico.`
      : `${Math.round(errRate)}% erros em ${serves.length} serviços. ${playerLabel(best.player)} (${best.player.position}) é mais segura.`;
    return {
      id: `sub-serve-${player.id}`,
      category: "substitution",
      priority: "medium",
      title: `Substituição de serviço — ${playerLabel(p)}`,
      detail,
      evidence: `Set ${setNumber} · ${serves.length} serviços`,
      source: "live",
    };
  }
  return null;
}

/**
 * Para cada atacante em campo com kill% < 20% neste set (≥ 5 ataques),
 * procura no banco a melhor atacante compatível com histórico ≥ 25%.
 * Emite no máximo 1 sugestão.
 */
function subForAttack(
  log: LoggedAction[],
  setNumber: number,
  onCourt: Player[],
  bench: Player[],
  aggs: Map<string, PlayerAggregate>,
  byId: Map<string, Player>,
): Suggestion | null {
  const setLog = log.filter((a) => a.setNumber === setNumber);

  for (const player of onCourt) {
    if (player.position === "L" || player.position === "S" || player.position === "DS") continue;
    const attacks = setLog.filter((a) => a.type === "attack" && a.playerId === player.id);
    if (attacks.length < 5) continue;
    const kills = attacks.filter((a) => a.result === "kill").length;
    const kp = (kills / attacks.length) * 100;
    if (kp >= 20) continue;

    const compatPositions = ATTACK_GROUPS[player.position ?? "OH"] ?? ["OH"];
    const candidates = bench
      .filter((b) => compatPositions.includes(b.position ?? ""))
      .map((b) => ({ player: b, agg: aggs.get(b.id) }))
      .filter((c) => c.agg && c.agg.matchesPlayed >= 2 && c.agg.attacks.total >= 5)
      .map((c) => ({ player: c.player, kp: killPct(c.agg!.attacks) }))
      .filter((c) => c.kp >= 25)
      .sort((a, b) => b.kp - a.kp);

    const best = candidates[0];
    if (!best) continue;

    const p = byId.get(player.id);
    return {
      id: `sub-attack-${player.id}`,
      category: "substitution",
      priority: "medium",
      title: `Substituição — ataque de ${playerLabel(p)}`,
      detail: `${Math.round(kp)}% kill neste set (${attacks.length} ataques). ${playerLabel(best.player)} (${best.player.position}) tem ${Math.round(best.kp)}% histórico.`,
      evidence: `Set ${setNumber} · ${attacks.length} ataques`,
      source: "live",
    };
  }
  return null;
}

/**
 * Constrói a lista de sugestões para o estado actual. Ordena por prioridade
 * (high → medium → low), com no máximo 5 entradas para acomodar substituições.
 */
export function buildSuggestions(args: BuildArgs): Suggestion[] {
  const byId = new Map(args.players.map((p) => [p.id, p]));
  const aggById = new Map(args.playerAggregates.map((a) => [a.playerId, a]));
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

  // Sugestões de substituição — só emite se houver banco e histórico suficiente
  if (args.bench.length > 0 && args.playerAggregates.length > 0) {
    const subs = [
      subForReception(args.log, args.setNumber, args.onCourt, args.bench, aggById, byId),
      subForServe(args.log, args.setNumber, args.onCourt, args.bench, aggById, byId),
      subForAttack(args.log, args.setNumber, args.onCourt, args.bench, aggById, byId),
    ].filter((x): x is Suggestion => x !== null);
    out.push(...subs);
  }

  const order: Record<SuggestionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  out.sort((a, b) => order[a.priority] - order[b.priority]);
  return out.slice(0, 5);
}
