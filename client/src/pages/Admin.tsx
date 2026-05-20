import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldAlert,
  Users,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_LABELS } from "@shared/planFeatures";
import { PLANS } from "@shared/types";
import type { Plan } from "@shared/types";

type TeamRow = {
  id: string;
  name: string;
  club: string;
  category: string;
  plan: Plan;
  ownerUid: string;
  subscribedAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  easyPaySubscriptionId: string | null;
};

function teamStatus(t: TeamRow): "subscribed" | "trial" | "expired" {
  if (t.subscribedAt) return "subscribed";
  if (t.trialEndsAt && new Date(t.trialEndsAt) > new Date()) return "trial";
  return "expired";
}

function trialDaysLeft(t: TeamRow): number {
  if (!t.trialEndsAt) return 0;
  const ms = new Date(t.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function Admin() {
  const qc = useQueryClient();

  const accessQuery = useQuery({
    queryKey: ["admin-me"],
    queryFn: () => api.get<{ admin: boolean }>("/api/admin/me"),
    retry: false,
  });

  const teamsQuery = useQuery({
    queryKey: ["admin-teams"],
    queryFn: () => api.get<TeamRow[]>("/api/admin/teams"),
    enabled: accessQuery.data?.admin === true,
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<TeamRow>(`/api/admin/teams/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-teams"] });
      toast.success("Equipa actualizada.");
    },
    onError: () => toast.error("Erro ao actualizar equipa."),
  });

  if (accessQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        A verificar acesso…
      </div>
    );
  }

  if (!accessQuery.data?.admin) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-8">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <p className="text-lg font-semibold">Acesso negado</p>
        <p className="text-sm text-muted-foreground">
          O teu UID não está na lista de administradores (variável ADMIN_UIDS).
        </p>
      </div>
    );
  }

  const teams = teamsQuery.data ?? [];
  const subscribed = teams.filter((t) => teamStatus(t) === "subscribed");
  const onTrial = teams.filter((t) => teamStatus(t) === "trial");
  const expired = teams.filter((t) => teamStatus(t) === "expired");
  const expiringSoon = onTrial.filter((t) => trialDaysLeft(t) <= 2);

  function act(id: string, body: Record<string, unknown>) {
    patch.mutate({ id, body });
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-screen-xl mx-auto">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestão interna de equipas e subscrições
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Total equipas"
          value={teams.length}
        />
        <StatCard
          icon={<CreditCard className="h-4 w-4 text-green-500" />}
          label="Subscritas"
          value={subscribed.length}
          accent="green"
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          label="Em trial"
          value={onTrial.length}
          accent="amber"
        />
        <StatCard
          icon={<XCircle className="h-4 w-4 text-destructive" />}
          label="Expiradas"
          value={expired.length}
          accent="red"
        />
      </div>

      {expiringSoon.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            <strong>{expiringSoon.length}</strong>{" "}
            {expiringSoon.length === 1 ? "equipa expira" : "equipas expiram"} em
            ≤ 2 dias:{" "}
            {expiringSoon.map((t) => t.name).join(", ")}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              {["Equipa", "Plano", "Estado", "Trial / Sub", "Criada", "Acções"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teamsQuery.isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              : teams.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma equipa registada.
                  </td>
                </tr>
              )
              : teams.map((team) => {
                  const status = teamStatus(team);
                  const daysLeft = trialDaysLeft(team);
                  const busy = patch.isPending;

                  return (
                    <tr
                      key={team.id}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="font-medium leading-tight">{team.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {team.club} · {team.category}
                        </div>
                      </td>

                      {/* Plan select */}
                      <td className="px-4 py-3">
                        <select
                          disabled={busy}
                          value={team.plan}
                          onChange={(e) => act(team.id, { plan: e.target.value })}
                          className="text-xs font-semibold uppercase bg-secondary text-secondary-foreground rounded px-2 py-1 border-0 cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {PLANS.map((p) => (
                            <option key={p} value={p}>
                              {PLAN_LABELS[p]} ({p})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {status === "subscribed" && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Activa
                          </span>
                        )}
                        {status === "trial" && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <Clock className="h-3.5 w-3.5" />
                            Trial ·{" "}
                            {daysLeft === 0 ? "expira hoje" : `${daysLeft}d`}
                          </span>
                        )}
                        {status === "expired" && (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive">
                            <XCircle className="h-3.5 w-3.5" /> Expirada
                          </span>
                        )}
                      </td>

                      {/* Date info */}
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {team.subscribedAt
                          ? new Date(team.subscribedAt).toLocaleDateString("pt-PT")
                          : team.trialEndsAt
                          ? `até ${new Date(team.trialEndsAt).toLocaleDateString("pt-PT")}`
                          : "—"}
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(team.createdAt).toLocaleDateString("pt-PT")}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {status !== "subscribed" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              className="h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
                              onClick={() => act(team.id, { subscribed: true })}
                            >
                              <CheckCircle2 className="h-3 w-3" /> Activar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => act(team.id, { subscribed: false })}
                            >
                              <XCircle className="h-3 w-3" /> Cancelar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            className="h-7 text-xs gap-1"
                            onClick={() => act(team.id, { extendTrial: 7 })}
                          >
                            <Clock className="h-3 w-3" /> +7d
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            className="h-7 text-xs gap-1"
                            onClick={() => act(team.id, { extendTrial: 30 })}
                          >
                            +30d
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "green" | "amber" | "red";
}) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <span
          className={
            accent === "green"
              ? "text-2xl font-bold text-green-600 dark:text-green-400"
              : accent === "amber"
              ? "text-2xl font-bold text-amber-600 dark:text-amber-400"
              : accent === "red"
              ? "text-2xl font-bold text-destructive"
              : "text-2xl font-bold"
          }
        >
          {value}
        </span>
      </CardContent>
    </Card>
  );
}
