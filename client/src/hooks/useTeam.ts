import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Team } from "@/lib/types";

const STORAGE_KEY = "volleyiq:selected-team";

export function useTeam() {
  const qc = useQueryClient();
  const { user, isLoading: authLoading, isAuthed } = useAuth();

  const teamsQuery = useQuery({
    queryKey: ["teams", user?.uid],
    enabled: !authLoading && isAuthed,
    queryFn: async () => {
      let list = await api.get<Team[]>("/api/teams");

      if (list.length === 0) {
        await api.post<Team>("/api/teams/bootstrap", {});
        list = await api.get<Team[]>("/api/teams");
      }

      return list;
    },
  });

  const stored =
    typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEY)
      : null;

  const teams = teamsQuery.data ?? [];
  const current =
    teams.find((t) => t.id === stored) ?? teams[0] ?? null;

  useEffect(() => {
    if (current && current.id !== stored) {
      window.localStorage.setItem(STORAGE_KEY, current.id);
    }
  }, [current, stored]);

  function setTeam(id: string) {
    window.localStorage.setItem(STORAGE_KEY, id);
    qc.invalidateQueries({ queryKey: ["teams"] });
  }

  return {
    teams,
    team: current,
    isLoading: authLoading || teamsQuery.isLoading,
    setTeam,
  };
}