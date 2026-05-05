import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mostra o progresso do fluxo de scouting com pontos numerados ligados por
 * uma barra. O passo actual fica em destaque, os anteriores marcados como
 * concluídos. Mais legível que `1 / 4 · jogadora`.
 */
export function StepProgress({
  steps,
  current,
}: {
  /** Labels curtos por passo, em ordem. Ex: ["jogadora","acção","zona","resultado"]. */
  steps: string[];
  /** Índice 0-based do passo actual. Tudo antes é "feito". */
  current: number;
}) {
  return (
    <ol className="flex items-center gap-1.5 w-full">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-1.5 flex-1 min-w-0">
            <motion.div
              animate={
                active
                  ? { scale: [1, 1.1, 1] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.3 }}
              className={cn(
                "flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </motion.div>
            <span
              className={cn(
                "text-[11px] font-medium truncate",
                active
                  ? "text-foreground"
                  : done
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60",
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 min-w-[6px] transition-colors",
                  done ? "bg-emerald-500/60" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
