import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Marks a feature that uses AI (required by CLAUDE.md and the ZUS task). */
export function AiBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-200",
        className,
      )}
      aria-label="Funkcja oparta na sztucznej inteligencji"
    >
      <Sparkles className="size-3" aria-hidden />
      AI
    </span>
  );
}
