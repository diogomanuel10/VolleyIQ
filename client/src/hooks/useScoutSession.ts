import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  enqueueOfflineAction,
  getOfflineQueue,
  removeFromQueue,
} from "@/lib/scoutQueue";

/** Intervalo entre tentativas de reenvio enquanto houver acções pendentes. */
const RETRY_INTERVAL_MS = 20_000;

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
  const isOnline = useOnlineStatus();

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

  const sessionKey = `volleyiq:scout:${matchId}`;

  // IDs already sent to the server (or in-flight).
  const syncedIds = useRef(new Set<string>());
  // IDs currently in the offline queue.
  const offlineQueueIds = useRef(new Set<string>());

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
        setNumber: a.setNumber,
        videoTimeSec: videoRef.current?.getCurrentTime() ?? null,
      }),
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

  // Counts for the UI.
  const [pendingSync, setPendingSync] = useState(0);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  /** Acções que não foi possível enviar nem guardar localmente. */
  const [unsavedActions, setUnsavedActions] = useState<LoggedAction[]>([]);

  // Hydrate log + volatile state from API + localStorage.
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
      setNumber: a.setNumber ?? 1,
      timestamp: new Date(a.timestamp).getTime(),
      side: (a.side as "home" | "away") ?? "home",
      opponentPlayerId: a.opponentPlayerId ?? null,
    }));

    // Mark DB actions as synced.
    for (const a of mapped) {
      syncedIds.current.add(a.id);
    }

    // Recover any actions that were queued offline but not yet sent.
    const mappedIds = new Set(mapped.map((a) => a.id));
    const queued = getOfflineQueue(matchId);
    const pendingQueued = queued.filter((a) => !mappedIds.has(a.id));

    // Remove from queue any actions that already reached the server.
    const alreadySynced = queued.filter((a) => mappedIds.has(a.id));
    if (alreadySynced.length > 0) {
      removeFromQueue(matchId, alreadySynced.map((a) => a.id));
    }

    if (pendingQueued.length > 0) {
      for (const a of pendingQueued) {
        offlineQueueIds.current.add(a.id);
      }
      setOfflineQueueSize(pendingQueued.length);
    }

    // Merge DB + pending queue, sorted by timestamp.
    const allActions = [...mapped, ...pendingQueued].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    const setN = allActions.reduce((max, a) => Math.max(max, a.setNumber), 1);
    const inSet = allActions.filter((a) => a.setNumber === setN);
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
      // localStorage unavailable
    }

    dispatch({
      kind: "hydrateSession",
      actions: allActions,
      homeScore,
      awayScore,
      setNumber: setN,
      rotation,
      servingTeam,
    });
    hydratedRef.current = true;
  }, [actionsQuery.data, dispatch, matchId, sessionKey]);

  // Persist rotation + servingTeam after each change.
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
      // private mode or quota
    }
  }, [state.rotation, state.servingTeam, sessionKey]);

  /**
   * Guarda a acção na fila local. Se o localStorage recusar a escrita, a
   * acção fica em memória em `unsavedActions` para o utilizador poder
   * tentar de novo — nunca é descartada em silêncio.
   */
  const queueOffline = useCallback(
    (a: LoggedAction) => {
      if (enqueueOfflineAction(matchId, a)) {
        offlineQueueIds.current.add(a.id);
        setOfflineQueueSize((n) => n + 1);
        return;
      }
      syncedIds.current.delete(a.id);
      setUnsavedActions((prev) =>
        prev.some((p) => p.id === a.id) ? prev : [...prev, a],
      );
    },
    [matchId],
  );

  // ── Sync new actions to server ─────────────────────────────────────────
  useEffect(() => {
    for (const a of state.log) {
      if (syncedIds.current.has(a.id)) continue;
      if (offlineQueueIds.current.has(a.id)) continue;

      syncedIds.current.add(a.id);

      if (!navigator.onLine) {
        // Store locally — will be sent when we come back online.
        queueOffline(a);
        continue;
      }

      setPendingSync((n) => n + 1);
      try { navigator.vibrate?.(30); } catch { /* unsupported */ }

      createAction.mutate(a, {
        onSuccess: () => setPendingSync((n) => Math.max(0, n - 1)),
        onError: (err: any) => {
          syncedIds.current.delete(a.id);
          setPendingSync((n) => Math.max(0, n - 1));

          if (!navigator.onLine) {
            // Network dropped after the mutation was fired.
            queueOffline(a);
          } else {
            toast.error(t("livescout.actionSaveError"), {
              description: err?.message,
              action: { label: "OK", onClick: () => {} },
            });
          }
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.log.length]);

  // ── Envio da fila offline ─────────────────────────────────────────────
  /**
   * Tenta enviar tudo o que está pendente: a fila em localStorage e as
   * acções que nem sequer foi possível guardar localmente.
   */
  const flushQueue = useCallback(
    (opts: { announce?: boolean } = {}) => {
      if (!navigator.onLine) return;

      // Acções sem sítio onde ficar: tenta primeiro guardá-las de novo.
      if (unsavedActions.length > 0) {
        const stillUnsaved: LoggedAction[] = [];
        for (const a of unsavedActions) {
          if (!enqueueOfflineAction(matchId, a)) {
            stillUnsaved.push(a);
            continue;
          }
          offlineQueueIds.current.add(a.id);
          setOfflineQueueSize((n) => n + 1);
        }
        setUnsavedActions(stillUnsaved);
      }

      const queued = getOfflineQueue(matchId);
      if (!queued.length) return;

      if (opts.announce) {
        toast.info(t("livescout.syncingQueue", { count: queued.length }));
      }
      setPendingSync((n) => n + queued.length);

      for (const a of queued) {
        createAction.mutate(a, {
          onSuccess: () => {
            removeFromQueue(matchId, [a.id]);
            offlineQueueIds.current.delete(a.id);
            setOfflineQueueSize((n) => Math.max(0, n - 1));
            setPendingSync((n) => Math.max(0, n - 1));
          },
          onError: () => {
            // Fica na fila — a próxima tentativa apanha-a.
            setPendingSync((n) => Math.max(0, n - 1));
          },
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matchId, t, unsavedActions],
  );

  // Envia assim que a ligação volta.
  const prevOnline = useRef(isOnline);
  useEffect(() => {
    const wasOffline = !prevOnline.current;
    prevOnline.current = isOnline;
    if (!isOnline || !wasOffline) return;
    flushQueue({ announce: true });
  }, [isOnline, flushQueue]);

  /**
   * Recuperação periódica. O envio só acontecia na transição offline→online,
   * por isso uma falha do servidor com a ligação de pé deixava as acções na
   * fila até a rede voltar a cair — o que podia nunca acontecer.
   */
  useEffect(() => {
    if (!isOnline) return;
    if (offlineQueueSize === 0 && unsavedActions.length === 0) return;
    const timer = setInterval(() => flushQueue(), RETRY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isOnline, offlineQueueSize, unsavedActions.length, flushQueue]);

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

    if (offlineQueueIds.current.has(last.id)) {
      // Action never reached the server — remove from queue.
      offlineQueueIds.current.delete(last.id);
      removeFromQueue(matchId, [last.id]);
      setOfflineQueueSize((n) => Math.max(0, n - 1));
    } else if (unsavedActions.some((a) => a.id === last.id)) {
      // Nunca chegou a lado nenhum — basta esquecê-la.
      setUnsavedActions((prev) => prev.filter((a) => a.id !== last.id));
    } else {
      deleteAction.mutate(last.id);
    }

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

  const opponentTeamId = matchQuery.data?.opponentTeamId;
  const opponentPlayersQuery = useQuery({
    queryKey: ["opponentPlayers", opponentTeamId],
    queryFn: () =>
      api.get<OpponentPlayer[]>(`/api/opponents/${opponentTeamId}/players`),
    enabled: Boolean(opponentTeamId) && state.scoutScope !== "home",
    staleTime: 10 * 60 * 1000,
  });
  const opponentPlayers = opponentPlayersQuery.data ?? [];

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
    isOnline,
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
    offlineQueueSize,
    unsavedCount: unsavedActions.length,
    retrySync: () => flushQueue({ announce: true }),
    videoRef,
    updateMatch,
    lineupsRefetch: () => { lineupsQuery.refetch(); },
    subsRefetch: () => { subsQuery.refetch(); },
    handleKeyboardUndo,
  };
}
