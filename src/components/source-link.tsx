import { ExternalLink, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

/** Legal source reference; renders a link when the source contains a URL. */
export function SourceLink({ source, className }: { source?: string; className?: string }) {
  if (!source) return null;
  const url = source.match(/https?:\/\/\S+/)?.[0];
  const cls = cn("text-muted-foreground inline-flex items-start gap-1 text-xs", className);
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={cn(cls, "hover:text-foreground underline underline-offset-2")}>
        <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden />
        <span>{source}</span>
      </a>
    );
  }
  return (
    <span className={cls}>
      <Scale className="mt-0.5 size-3 shrink-0" aria-hidden />
      <span>
        <span className="sr-only">Podstawa prawna: </span>
        {source}
      </span>
    </span>
  );
}
