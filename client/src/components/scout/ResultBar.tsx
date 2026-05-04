import {
  RESULTS_BY_ACTION,
  RESULT_COLOR,
  RESULT_LABEL,
  getDvCode,
  type ActionResult,
  type ActionType,
} from "@shared/types";
import { cn } from "@/lib/utils";

export function ResultBar({
  actionType,
  onResult,
}: {
  actionType: ActionType;
  onResult: (r: ActionResult) => void;
}) {
  const options = RESULTS_BY_ACTION[actionType];
  return (
    <div
      className={cn(
        "grid gap-2",
        options.length <= 3
          ? "grid-cols-3"
          : options.length === 4
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-5",
      )}
    >
      {options.map((r) => {
        const dv = getDvCode(actionType, r);
        return (
          <button
            key={r}
            onClick={() => onResult(r)}
            className={cn(
              "relative h-16 rounded-lg font-semibold text-sm transition-all no-touch-callout active:scale-95",
              RESULT_COLOR[r],
            )}
          >
            {dv && (
              <kbd className="absolute top-1 left-1 hidden sm:inline-flex h-4 min-w-[1rem] items-center justify-center px-1 rounded bg-white/20 text-white text-[10px] font-mono leading-none">
                {dv}
              </kbd>
            )}
            {RESULT_LABEL[r]}
          </button>
        );
      })}
    </div>
  );
}
