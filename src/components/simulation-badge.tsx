import { cn } from "@/lib/utils";

/** Visible "SYMULACJA" mark required on every simulated screen or document (CLAUDE.md). */
export function SimulationBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-xs font-semibold tracking-wider text-amber-800 uppercase dark:bg-amber-950 dark:text-amber-200",
        className,
      )}
      aria-label="Symulacja – dane fikcyjne"
    >
      Symulacja
    </span>
  );
}
