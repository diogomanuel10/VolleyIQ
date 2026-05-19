import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Webhook,
  Plus,
  Trash2,
  AlertTriangle,
  Play,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { useTeam } from "@/hooks/useTeam";
import { usePlanGuard } from "@/hooks/usePlanGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface WebhookRecord {
  id: string;
  teamId: string;
  name: string;
  url: string;
  secret: string | null;
  enabled: boolean;
  createdAt: string;
  lastFiredAt: string | null;
  lastStatus: number | null;
  lastError: string | null;
}

function StatusBadge({ status }: { status: number | null }) {
  if (status === null) {
    return <Badge variant="secondary">nunca</Badge>;
  }
  if (status >= 200 && status < 300) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200">
        {status}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200">
      {status}
    </Badge>
  );
}

const PAYLOAD_EXAMPLE = JSON.stringify(
  {
    event: "match.finished",
    teamId: "...",
    match: {
      opponent: "Benfica",
      setsWon: 3,
      setsLost: 1,
      result: "win",
      competition: "Liga A",
      date: "2024-03-15T18:00:00.000Z",
    },
    kpis: {
      killPct: 44.5,
      sideOutPct: 62.1,
      passRating: 2.18,
      serveAcePct: 8.3,
      attackEfficiency: 0.285,
      record: "12-4",
    },
    sentAt: "2024-03-15T20:30:00Z",
  },
  null,
  2,
);

export default function WebhooksPage() {
  const { team } = useTeam();
  const guard = usePlanGuard();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", secret: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isPro = guard.meetsMinimum("pro");

  const hooksQuery = useQuery({
    queryKey: ["webhooks", team?.id],
    queryFn: () => api.get<WebhookRecord[]>(`/api/teams/${team!.id}/webhooks`),
    enabled: !!team && isPro,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; url: string; secret?: string }) =>
      api.post<WebhookRecord>(`/api/teams/${team!.id}/webhooks`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks", team?.id] });
      setCreateOpen(false);
      setForm({ name: "", url: "", secret: "" });
      toast.success("Webhook criado com sucesso.");
    },
    onError: (err: any) => {
      if (err?.body?.error === "max_webhooks_reached") {
        toast.error("Limite de 10 webhooks atingido.");
      } else if (err?.body?.error === "plan_required") {
        toast.error("Plano Pro necessário.");
      } else {
        toast.error("Erro ao criar webhook.");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/teams/${team!.id}/webhooks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks", team?.id] });
      setDeleteId(null);
      toast.success("Webhook eliminado.");
    },
    onError: () => toast.error("Erro ao eliminar webhook."),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch<WebhookRecord>(
        `/api/teams/${team!.id}/webhooks/${id}/toggle`,
        { enabled },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks", team?.id] });
    },
    onError: () => toast.error("Erro ao alterar estado."),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<{ status: number | null; error: string | null }>(
        `/api/teams/${team!.id}/webhooks/${id}/test`,
        {},
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["webhooks", team?.id] });
      if (data.error) {
        toast.error(`Teste falhou: ${data.error}`);
      } else {
        toast.success(`Teste enviado com sucesso (HTTP ${data.status}).`);
      }
    },
    onError: () => toast.error("Erro ao enviar teste."),
  });

  if (!team) return null;

  function handleCreate() {
    if (!form.name.trim() || !form.url.trim()) return;
    createMutation.mutate({
      name: form.name.trim(),
      url: form.url.trim(),
      ...(form.secret.trim() ? { secret: form.secret.trim() } : {}),
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Webhook className="h-6 w-6 text-primary" />
          Webhooks
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Recebe os dados do jogo automaticamente no teu sistema
        </p>
      </header>

      {/* Plan gate */}
      {!isPro ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="font-semibold">Plano Pro ou superior necessário</p>
          <p className="text-sm text-muted-foreground">
            Os Webhooks estão disponíveis a partir do plano Pro.
          </p>
          <Button asChild>
            <Link href="/pricing">Ver planos</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Add button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Máximo de 10 webhooks activos.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-2"
              disabled={(hooksQuery.data?.length ?? 0) >= 10}
            >
              <Plus className="h-4 w-4" />
              Adicionar Webhook
            </Button>
          </div>

          {/* Table */}
          {hooksQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : hooksQuery.data?.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              Ainda não tens webhooks. Adiciona um acima.
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Nome</th>
                    <th className="text-left px-4 py-2 font-medium hidden md:table-cell">
                      URL
                    </th>
                    <th className="text-left px-4 py-2 font-medium">Estado</th>
                    <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">
                      Último envio
                    </th>
                    <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">
                      Último status
                    </th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {hooksQuery.data?.map((hook) => (
                    <tr key={hook.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{hook.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden md:table-cell max-w-[180px] truncate">
                        {hook.url}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            toggleMutation.mutate({
                              id: hook.id,
                              enabled: !hook.enabled,
                            })
                          }
                          className="flex items-center gap-1 text-xs"
                          title={hook.enabled ? "Desactivar" : "Activar"}
                        >
                          {hook.enabled ? (
                            <>
                              <ToggleRight className="h-5 w-5 text-green-500" />
                              <span className="text-green-600 hidden sm:inline">
                                Activo
                              </span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                              <span className="text-muted-foreground hidden sm:inline">
                                Inactivo
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                        {hook.lastFiredAt
                          ? new Date(hook.lastFiredAt).toLocaleString("pt-PT")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <StatusBadge status={hook.lastStatus} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            title="Enviar payload de teste"
                            onClick={() => testMutation.mutate(hook.id)}
                            disabled={testMutation.isPending}
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Testar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive gap-1"
                            onClick={() => setDeleteId(hook.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payload example */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Exemplo de payload</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enviado via HTTP POST quando um jogo fica com status "finished"
              </p>
            </div>
            <div className="rounded-lg bg-muted p-4 font-mono text-xs text-muted-foreground overflow-x-auto">
              <pre>{PAYLOAD_EXAMPLE}</pre>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-300">
              <strong>Verificação HMAC:</strong> Verifica a assinatura com o
              cabeçalho{" "}
              <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900/40 px-1 rounded">
                X-VolleyIQ-Signature: sha256=&lt;hmac&gt;
              </code>
              . Calcula{" "}
              <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900/40 px-1 rounded">
                HMAC-SHA256(body, secret)
              </code>{" "}
              e compara.
            </div>
          </div>
        </>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wh-name">Nome</Label>
              <Input
                id="wh-name"
                placeholder="ex: Slack #resultados"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-url">URL</Label>
              <Input
                id="wh-url"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-secret">
                Segredo (opcional)
                <span className="text-muted-foreground font-normal ml-1 text-xs">
                  — para verificação HMAC
                </span>
              </Label>
              <Input
                id="wh-secret"
                placeholder="s3gr3d0..."
                value={form.secret}
                onChange={(e) =>
                  setForm((f) => ({ ...f, secret: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setForm({ name: "", url: "", secret: "" });
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !form.name.trim() ||
                !form.url.trim() ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? "A criar…" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar webhook?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Esta acção é irreversível. O endpoint deixará de receber notificações.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "A eliminar…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
