import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Player } from "@shared/schema";

// ─── Add Player dialog ────────────────────────────────────────────────────────

export function AddPlayerDialog({
  open,
  players,
  onClose,
  onAdd,
}: {
  open: boolean;
  players: Player[];
  onClose: () => void;
  onAdd: (playerId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = players.filter((p) =>
    `${p.firstName} ${p.lastName} ${p.number}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar jogador</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Pesquisar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="max-h-64 overflow-y-auto space-y-1 mt-2">
          {filtered.map((p) => (
            <button
              key={p.id}
              className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent text-left"
              onClick={() => {
                onAdd(p.id);
                onClose();
              }}
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  `${p.firstName[0]}${p.lastName[0]}`
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {p.firstName} {p.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  #{p.number} · {p.position}
                </p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Sem resultados</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
