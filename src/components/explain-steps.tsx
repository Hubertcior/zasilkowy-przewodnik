import { cn } from "@/lib/utils";
import { SourceLink } from "./source-link";

/** Numbered explanation of a calculation (engine `steps`) with legal sources. */
export function ExplainSteps({ steps, sources, className }: { steps: string[]; sources?: string[]; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed">
            <span className="bg-secondary text-secondary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {i + 1}
            </span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
      {sources && sources.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-2">
          {sources.map((s) => (
            <SourceLink key={s} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}
