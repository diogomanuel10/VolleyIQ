import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { KeyRound, User as UserIcon, Sparkles, Clock, CheckCircle2, ShieldCheck, Download, Trash2, XCircle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { usePlanGuard } from "@/hooks/usePlanGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { changePassword, isEmailUser, logout } from "@/lib/firebase";
import { api } from "@/lib/api";
import type { Payment } from "@shared/schema";
import { PLAN_LABELS } from "@shared/planFeatures";

export default function Profile() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const {
    team,
    isSubscribed,
    subscriptionCancelled,
    subscriptionEndsAt,
    trialDaysLeft,
    isTrialExpired,
  } = useTeam();
  const { plan: effectivePlan } = usePlanGuard();
  const emailProvider = isEmailUser();
  const qc = useQueryClient();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const paymentsQuery = useQuery({
    queryKey: ["payments", team?.id],
    queryFn: () => api.get<Payment[]>(`/api/teams/${team!.id}/payments`),
    enabled: Boolean(team?.id),
  });

  async function handleCancel() {
    if (!team) return;
    setCancelling(true);
    try {
      await api.post(`/api/payments/cancel`, { teamId: team.id });
      toast.success("Subscrição cancelada. Mantém acesso até ao fim do período.");
      qc.invalidateQueries({ queryKey: ["teams"] });
    } catch {
      toast.error("Não foi possível cancelar a subscrição.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleReceipt(paymentId: string) {
    try {
      await api.download(
        `/api/teams/${team!.id}/payments/${paymentId}/receipt`,
        `recibo-${paymentId}.html`,
      );
    } catch {
      toast.error("Não foi possível obter o recibo.");
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await api.download(
        "/api/user/export",
        `volleyiq-dados-${new Date().toISOString().slice(0, 10)}.json`,
      );
    } catch {
      toast.error("Não foi possível exportar os dados.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await api.delete("/api/user/account", { confirm: "ELIMINAR" });
      toast.success("Conta eliminada.");
      await logout();
      window.location.reload();
    } catch {
      toast.error("Não foi possível eliminar a conta.");
      setDeleting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast.error(t("profile.errors.mismatch"));
      return;
    }
    if (next.length < 6) {
      toast.error(t("profile.errors.tooShort"));
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, next);
      toast.success(t("profile.success"));
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error(t("profile.errors.wrongCurrent"));
      } else if (code === "auth/too-many-requests") {
        toast.error(t("profile.errors.tooMany"));
      } else {
        toast.error(t("profile.errors.generic"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {t("profile.title")}
        </h1>
      </header>

      {/* Plan info */}
      {team && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Plano actual
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="uppercase text-xs">
                {PLAN_LABELS[effectivePlan]}
              </Badge>
              {isSubscribed ? (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Activo
                </span>
              ) : isTrialExpired ? (
                <span className="text-xs text-destructive">Trial expirado</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5" />
                  Trial · {trialDaysLeft === 0 ? "expira hoje" : trialDaysLeft === 1 ? "1 dia restante" : `${trialDaysLeft} dias restantes`}
                </span>
              )}
            </div>
            {!isSubscribed && (
              <Link href="/pricing">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Fazer upgrade
                </Button>
              </Link>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Equipa: <span className="font-medium">{team.name}</span>
          </p>

          {isSubscribed && (
            <div className="border-t pt-3 space-y-2">
              {subscriptionCancelled ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Subscrição cancelada — acesso até{" "}
                  {subscriptionEndsAt?.toLocaleDateString("pt-PT") ?? "—"}.
                </p>
              ) : (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {subscriptionEndsAt
                      ? `Renova a ${subscriptionEndsAt.toLocaleDateString("pt-PT")}`
                      : "Subscrição activa"}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 text-muted-foreground hover:text-destructive"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {cancelling ? "A cancelar…" : "Cancelar subscrição"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recibos / pagamentos */}
      {team && (paymentsQuery.data?.length ?? 0) > 0 && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Pagamentos
          </div>
          <ul className="divide-y">
            {paymentsQuery.data!.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{p.amount.toFixed(2)} €</span>{" "}
                  <span className="text-muted-foreground">
                    · {p.plan} ({p.period === "annual" ? "anual" : "mensal"}) ·{" "}
                    {new Date(p.paidAt).toLocaleDateString("pt-PT")}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5"
                  onClick={() => handleReceipt(p.id)}
                >
                  <Download className="h-3.5 w-3.5" /> Recibo
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Account info */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          {t("profile.account")}
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          {user?.displayName && <p>{user.displayName}</p>}
          <p>{user?.email}</p>
        </div>
      </div>

      {/* Password change */}
      {emailProvider ? (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            {t("profile.changePassword")}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="current">{t("profile.currentPassword")}</Label>
              <Input
                id="current"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="next">{t("profile.newPassword")}</Label>
              <Input
                id="next"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm">{t("profile.confirmPassword")}</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t("common.saving") : t("profile.savePassword")}
            </Button>
          </form>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
          {t("profile.googleAccount")}
        </div>
      )}

      {/* Privacidade e dados (RGPD) */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Privacidade e dados
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground max-w-xs">
            Descarrega uma cópia de todos os teus dados em formato JSON.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "A exportar…" : "Exportar dados"}
          </Button>
        </div>

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm text-muted-foreground max-w-md">
            Eliminar a conta apaga permanentemente os teus dados e as equipas de
            que és proprietário (jogadoras, jogos e estatísticas incluídas). Esta
            ação é irreversível.
          </p>
          {!showDelete ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar conta
            </Button>
          ) : (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 space-y-3">
              <Label htmlFor="del-confirm" className="text-sm">
                Escreve <span className="font-mono font-semibold">ELIMINAR</span> para confirmar
              </Label>
              <Input
                id="del-confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="ELIMINAR"
                autoComplete="off"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteConfirm !== "ELIMINAR" || deleting}
                  onClick={handleDeleteAccount}
                >
                  {deleting ? "A eliminar…" : "Eliminar definitivamente"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDelete(false);
                    setDeleteConfirm("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
