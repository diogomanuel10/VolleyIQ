import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WelcomeBanner({
  onOpenHelp,
  onDismiss,
}: {
  onOpenHelp: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 md:p-4 flex items-start gap-3">
      <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-semibold text-sm">
          Primeira vez aqui? Vê o início rápido.
        </div>
        <p className="text-xs text-muted-foreground">
          30 segundos para perceber o fluxo: jogadora → acção → zona →
          resultado. Tudo navegável por teclado.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={onOpenHelp}>
            Ver início rápido
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Já sei usar
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        aria-label="Dispensar"
        className="shrink-0 h-7 w-7"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
