import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Big number with a label; `live` announces changes to screen readers (calculator results). */
export function StatCard({
  label,
  value,
  hint,
  icon,
  live,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  live?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("bg-card ring-foreground/10 flex flex-col gap-1 rounded-xl p-4 ring-1", className)}>
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold tracking-tight" aria-live={live ? "polite" : undefined}>
        {value}
      </div>
      {hint && <div className="text-muted-foreground text-xs">{hint}</div>}
    </div>
  );
}
