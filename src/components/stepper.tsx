import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Horizontal (desktop) / compact (mobile) progress through wizard steps. */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <nav aria-label="Postęp" className={className}>
      <p className="text-muted-foreground mb-2 text-sm sm:hidden">
        Krok {current + 1} z {steps.length}: <span className="text-foreground font-medium">{steps[current]}</span>
      </p>
      <ol className="flex items-center gap-2">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s} className="flex flex-1 items-center gap-2" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "bg-primary text-primary-foreground border-primary",
                  active && "border-primary text-primary ring-primary/20 ring-4",
                  !done && !active && "text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <span className={cn("hidden text-sm sm:inline", active ? "font-medium" : "text-muted-foreground")}>{s}</span>
              {i < steps.length - 1 && <span className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
