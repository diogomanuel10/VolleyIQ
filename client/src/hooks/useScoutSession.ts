import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import {
  type LoggedAction,
  type ScoutState,
  type ScoutDispatch,
} from "@/hooks/useScoutState";
import type { ScoutMode } from "@/lib/scoutMode";
import { ACTION_LABEL, type ActionType, type Zone } from "@shared/types";
import { getEffectiveLineup } from "@/lib/libero";
import {
  buildSuggestions,
  type ScoutingHistory,
  type PlayerAggregate,
} from "@/lib/suggestions";
import { VideoPanel, type VideoPanelHandle } from "@/components/scout/VideoPanel";
import type {
  Match,
  Player,
  Action as DbAction,
  Lineup,
  Substitution,
  OpponentPlayer,
} from "@shared/schema";

export function useScoutSession({
  matchId,
  teamId,
  mode,
  state,
  dispatch,
}: {
  matchId: string;
  teamId: string;
  mode: ScoutMode;
  state: ScoutState;
  dispatch: ScoutDispatch;
}) {
  const { t } = useTranslation();

  const matchQuery = useQuery({
    queryKey: ["matches", teamId],
    queryFn: () => api.get<Match[]>(`/api/matches?teamId=${teamId}`),
    select: (all) => all.find((m) => m.id === matchId) ?? null,
  });

  const playersQuery = useQuery({
    queryKey: ["players", teamId],
    queryFn: () => api.get<Player[]>(`/api/players?teamId=${teamId}`),
  });

  const actionsQuery = useQuery({
    queryKey: ["actions", matchId],
    queryFn: () =>
      api.get<DbAction[]>(`/api/matches/${matchId}/actions`),
  });

  // Chave de persistência para este jogo.
  const sessionKey = `volleyiq:scout:${matchId}`;

  // IDs que já foram enviados ao servidor (ou estão em voo).
  const syncedIds = useRef(new Set<string>());

  const videoRef = useRef<VideoPanelHandle>(null);

  const createAction = useMutation({
    mutationFn: (a: LoggedAction) =>
      api.post<DbAction>("/api/actions", {
        matchId,
        playerId: a.playerId || null,
        opponentPlayerId: a.opponentPlayerId ?? null,
        side: a.side ?? "home",
        type: a.type,
        result: a.result,
        zoneFrom: a.zoneFrom,
        zoneTo: a.zoneTo,
        zoneFromX: a.zoneFromX ?? null,
        zoneFromY: a.zoneFromY ?? null,
        zoneToX: a.zoneToX ?? null,
        zoneToY: a.zoneToY ?? null,
        rallyId: a.rallyId,
        rotation: a.rotation,
        videoTimeSec: videoRef.current?.getCurrentTime() ?? null,
      }),
    onError: (err: any) =>
      toast.error(err.message ?? t("common.error")),
  });

  const deleteAction = useMutation({
    mutationFn: (id: string) => api.delete(`/api/actions/${id}`),
    onError: (err: any) =>
      toast.error(err.message ?? t("common.error")),
  });

  const updateMatch = useMutation({
    mutationFn: (patch: Partial<Match>) =>
      api.patch<Match>(`/api/matches/${matchId}?teamId=${teamId}`, patch),
    onError: (err: any) =>
      toast.error(err.message ?? t("common.error")),
  });

  // Hidrata o log + estado volátil a partir da API + localStorage.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!actionsQuery.data) return;

    const mapped: LoggedAction[] = actionsQuery.data.map((a) => ({
      id: a.id,
      playerId: a.playerId ?? "",
      type: a.type as ActionType,
      zoneFrom: (a.zoneFrom as Zone | null) ?? null,
      zoneTo: (a.zoneTo as Zone | null) ?? null,
      zoneFromX: a.zoneFromX ?? null,
      zoneFromY: a.zoneFromY ?? null,
      zoneToX: a.zoneToX ?? null,
      zoneToY: a.zoneToY ?? null,
      result: a.result,
      rallyId: a.rallyId ?? "",
      rotation: a.rotation ?? 1,
      setNumber: a.rotation != null ? 1 : 1,
      timestamp: new Date(a.timestamp).getTime(),
      side: (a.side as "home" | "away") ?? "home",
      opponentPlayerId: a.opponentPlayerId ?? null,
    }));

    // Reconstrói score a partir do log — mais fiável do que localStorage.
    const setN = mapped.reduce((max, a) => Math.max(max, a.setNumber), 1);
    const inSet = mapped.filter((a) => a.setNumber === setN);
    const homeScore = inSet.filter(
      (a) =>
        (a.type === "attack" && a.result === "kill") ||
        (a.type === "serve" && a.result === "ace") ||
        (a.type === "block" && a.result === "stuff"),
    ).length;
    const awayScore = inSet.filter(
      (a) =>
        a.result === "error" ||
        (a.type === "attack" && a.result === "blocked"),
    ).length;

    let rotation = inSet[inSet.length - 1]?.rotation ?? 1;
    let servingTeam: "home" | "away" = "home";
    try {
      const snap = JSON.parse(
        window.localStorage.getItem(sessionKey) ?? "null",
      ) as { rotation?: number; servingTeam?: "home" | "away" } | null;
      if (snap) {
        if (snap.rotation != null) rotation = snap.rotation;
        if (snap.servingTeam) servingTeam = snap.servingTeam;
      }
    } catch {
      // localStorage indisponível — usa defaults
    }

    // Marca todas as acções já no DB como sincronizadas ANTES de popular o
    // log — assim o sync effect não as re-POSTa após o hydrateSession.
    for (const a of mapped) {
      syncedIds.current.add(a.id);
    }

    dispatch({
      kind: "hydrateSession",
      actions: mapped,
      homeScore,
      awayScore,
      setNumber: setN,
      rotation,
      servingTeam,
    });
    hydratedRef.current = true;
  }, [actionsQuery.data, dispatch, sessionKey]);

  // Persiste rotation e servingTeam após cada alteração (só depois da hidratação).
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(
        sessionKey,
        JSON.stringify({
          rotation: state.rotation,
          servingTeam: state.servingTeam,
        }),
      );
    } catch {
      // ignora — modo privado ou quota excedida
    }
  }, [state.rotation, state.servingTeam, sessionKey]);

  // IDs pendentes (em voo ou aguardam retry) — expostos na UI.
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    for (const a of state.log) {
      if (!syncedIds.current.has(a.id)) {
        syncedIds.current.add(a.id);
        setPendingSync((n) => n + 1);
        try { navigator.vibrate?.(30); } catch { /* unsupported */ }
        createAction.mutate(a, {
          onSuccess: () => setPendingSync((n) => Math.max(0, n - 1)),
          onError: (err: any) => {
            // Allow retry on next mutation.
            syncedIds.current.delete(a.id);
            setPendingSync((n) => Math.max(0, n - 1));
            toast.error(t("livescout.actionSaveError"), {
              description: err?.message,
              action: { label: "OK", onClick: () => {} },
            });
          },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.log.length]);

  const activePlayers = useMemo(
    () => (playersQuery.data ?? []).filter((p) => p.active),
    [playersQuery.data],
  );

  function handleKeyboardUndo() {
    const last = state.log[state.log.length - 1];
    if (!last) return;
    const player = activePlayers.find((p) => p.id === last.playerId);
    dispatch({ kind: "undo" });
    syncedIds.current.delete(last.id);
    deleteAction.mutate(last.id);
    toast(t("livescout.actionUndone"), {
      description: player
        ? `#${player.number} · ${ACTION_LABEL[last.type]}`
        : ACTION_LABEL[last.type],
      duration: 2000,
    });
  }

  const lineupsQuery = useQuery({
    queryKey: ["lineups", matchId],
    queryFn: () => api.get<Lineup[]>(`/api/matches/${matchId}/lineups`),
  });
  const subsQuery = useQuery({
    queryKey: ["substitutions", matchId],
    queryFn: () =>
      api.get<Substitution[]>(`/api/matches/${matchId}/substitutions`),
  });

  // Jogadores do adversário — carregados quando scoutScope !== "home".
  const opponentTeamId = matchQuery.data?.opponentTeamId;
  const opponentPlayersQuery = useQuery({
    queryKey: ["opponentPlayers", opponentTeamId],
    queryFn: () =>
      api.get<OpponentPlayer[]>(`/api/opponents/${opponentTeamId}/players`),
    enabled: Boolean(opponentTeamId) && state.scoutScope !== "home",
    staleTime: 10 * 60 * 1000,
  });
  const opponentPlayers = opponentPlayersQuery.data ?? [];

  // Histórico vs este adversário — alimenta as sugestões do painel lateral.
  const opponent = matchQuery.data?.opponent;
  const historyQuery = useQuery<ScoutingHistory | null>({
    queryKey: ["scouting", teamId, opponent],
    queryFn: async () => {
      try {
        return await api.get<ScoutingHistory>(
          `/api/scouting/${encodeURIComponent(opponent!)}?teamId=${teamId}`,
        );
      } catch {
        return null;
      }
    },
    enabled: Boolean(opponent),
    staleTime: 5 * 60 * 1000,
  });

  const savedLineup = useMemo(
    () =>
      (lineupsQuery.data ?? []).find((l) => l.setNumber === state.setNumber) ??
      null,
    [lineupsQuery.data, state.setNumber],
  );

  /**
   * Lineup base = lineup guardado + substituições aplicadas (sem libero).
   * Fallback: primeiras 6 activas por número.
   */
  const baseLineup = useMemo<(Player | null)[]>(() => {
    const byId = new Map(activePlayers.map((p) => [p.id, p]));
    if (savedLineup) {
      const slots: (Player | null)[] = [
        savedLineup.p1 ? byId.get(savedLineup.p1) ?? null : null,
        savedLineup.p2 ? byId.get(savedLineup.p2) ?? null : null,
        savedLineup.p3 ? byId.get(savedLineup.p3) ?? null : null,
        savedLineup.p4 ? byId.get(savedLineup.p4) ?? null : null,
        savedLineup.p5 ? byId.get(savedLineup.p5) ?? null : null,
        savedLineup.p6 ? byId.get(savedLineup.p6) ?? null : null,
      ];
      // Aplica substituições por ordem cronológica.
      const subsForSet = (subsQuery.data ?? [])
        .filter((s) => s.setNumber === state.setNumber)
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() -
            new Date(b.timestamp).getTime(),
        );
      for (const sub of subsForSet) {
        const idx = slots.findIndex((p) => p?.id === sub.playerOutId);
        if (idx === -1) continue;
        slots[idx] = byId.get(sub.playerInId) ?? null;
      }
      return slots;
    }
    const sorted = [...activePlayers].sort((a, b) => a.number - b.number);
    const slots: (Player | null)[] = [null, null, null, null, null, null];
    for (let i = 0; i < 6 && i < sorted.length; i++) slots[i] = sorted[i];
    return slots;
  }, [activePlayers, savedLineup, subsQuery.data, state.setNumber]);

  /**
   * Lineup efectivo = baseLineup com o líbero correto no lugar do central de
   * trás. Muda automaticamente com a rotação e com quem está a servir.
   */
  const lineup = useMemo<(Player | null)[]>(() => {
    const byId = new Map(activePlayers.map((p) => [p.id, p]));
    return getEffectiveLineup(
      baseLineup,
      state.rotation,
      state.servingTeam,
      byId,
      savedLineup?.liberoReceptionId,
      savedLineup?.liberoDefenseId,
    );
  }, [baseLineup, state.rotation, state.servingTeam, activePlayers, savedLineup]);

  // Quem está em campo agora (jogadoras únicas no `lineup` 6-slot) e quem
  // está no banco (toda a roster activa que não está em campo).
  const onCourt = useMemo<Player[]>(() => {
    const seen = new Set<string>();
    const out: Player[] = [];
    for (const p of lineup) {
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
    return out;
  }, [lineup]);

  const bench = useMemo<Player[]>(() => {
    const onIds = new Set(onCourt.map((p) => p.id));
    return activePlayers.filter((p) => !onIds.has(p.id));
  }, [activePlayers, onCourt]);

  // Agregados de época por jogadora — comparação para sugestões de substituição.
  const playerAggregatesQuery = useQuery<PlayerAggregate[]>({
    queryKey: ["playerAggregates", teamId],
    queryFn: () =>
      api.get<PlayerAggregate[]>(`/api/stats/team/${teamId}/player-aggregates`),
    enabled: Boolean(teamId),
    staleTime: 10 * 60 * 1000,
  });

  const rotationStatsQuery = useQuery({
    queryKey: ["rotationStats", teamId],
    queryFn: () =>
      api
        .get<{ rotationStats?: Array<{ rotation: number; sideOutPct: number }> }>(
          `/api/stats/team/${teamId}/dashboard?teamId=${teamId}`,
        )
        .then((d) => d.rotationStats ?? []),
    enabled: Boolean(teamId),
    staleTime: 5 * 60_000,
  });

  const suggestions = useMemo(
    () =>
      buildSuggestions({
        log: state.log,
        rotation: state.rotation,
        servingTeam: state.servingTeam,
        setNumber: state.setNumber,
        players: activePlayers,
        history: historyQuery.data ?? null,
        onCourt,
        bench,
        playerAggregates: playerAggregatesQuery.data ?? [],
      }),
    [
      state.log,
      state.rotation,
      state.servingTeam,
      state.setNumber,
      activePlayers,
      historyQuery.data,
      onCourt,
      bench,
      playerAggregatesQuery.data,
    ],
  );

  const isLoading = matchQuery.isLoading || playersQuery.isLoading;
  const match = matchQuery.data ?? null;
  const historyData = historyQuery.data ?? null;

  return {
    isLoading,
    match,
    opponentTeamId,
    activePlayers,
    opponentPlayers,
    savedLineup,
    lineup,
    onCourt,
    bench,
    suggestions,
    historyData,
    rotationStats: rotationStatsQuery.data ?? [],
    pendingSync,
    videoRef,
    updateMatch,
    lineupsRefetch: () => { lineupsQuery.refetch(); },
    subsRefetch: () => { subsQuery.refetch(); },
    handleKeyboardUndo,
  };
}
