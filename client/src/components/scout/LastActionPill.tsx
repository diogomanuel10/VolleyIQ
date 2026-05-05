import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import {
  ACTION_LABEL,
  RESULT_COLOR,
  RESULT_LABEL,
  getDvCode,
} from "@shared/types";
import type { LoggedAction } from "@/hooks/useScoutState";
import type { Player } from "@shared/schema";
import { cn } from "@/lib/utils";

/**
 * "Acabei de registar X" — feedback discreto que aparece acima da ActionBar
 * sempre que uma nova acção é commitada. Anima ao entrar para reforçar que o
 * sistema captou o input.
 */
export function LastActionPill({
  last,
  player,
}: {
  last: LoggedAction | null;
  player: Player | null;
}) {
  const dv = last ? getDvCode(last.type, last.result) : null;
  return (
    <div className="h-7">
      <AnimatePresence mode="popLayout">
        {last && (
          <motion.div
            key={last.id}
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full border bg-background pl-1 pr-3 py-0.5 text-xs shadow-sm"
          >
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 text-white">
              <Check className="h-3 w-3" />
            </span>
            <span className="font-medium">
              {player ? `#${player.number}` : "?"}
            </span>
            <span className="text-muted-foreground">
              {ACTION_LABEL[last.type]}
              {last.zoneTo != null
                ? last.zoneFrom != null
                  ? ` · Z${last.zoneFrom}→Z${last.zoneTo}`
                  : ` · Z${last.zoneTo}`
                : ""}
            </span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                RESULT_COLOR[last.result],
              )}
            >
              {dv ? `${dv} ${RESULT_LABEL[last.result]}` : RESULT_LABEL[last.result]}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
