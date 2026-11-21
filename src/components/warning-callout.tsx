import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import type { Warning } from "@/engine/types";
import { cn } from "@/lib/utils";
import { SourceLink } from "./source-link";

const STYLES: Record<Warning["severity"], { box: string; icon: typeof Info; label: string; iconCls: string }> = {
  critical: { box: "bg-critical-soft border-destructive/40", icon: OctagonAlert, label: "Pilne", iconCls: "text-destructive" },
  warning: { box: "bg-warning-soft border-warning/50", icon: AlertTriangle, label: "Uwaga", iconCls: "text-warning" },
  info: { box: "bg-info-soft border-info/30", icon: Info, label: "Informacja", iconCls: "text-info" },
};

/** Risk / information callout for an engine `Warning`, coloured by severity. */
export function WarningCallout({ warning, className }: { warning: Pick<Warning, "severity" | "title" | "text" | "source">; className?: string }) {
  const s = STYLES[warning.severity];
  const Icon = s.icon;
  return (
    <div role={warning.severity === "critical" ? "alert" : "note"} className={cn("flex gap-3 rounded-xl border p-4", s.box, className)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", s.iconCls)} aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">
          <span className="sr-only">{s.label}: </span>
          {warning.title}
        </p>
        <p className="text-sm leading-relaxed">{warning.text}</p>
        <SourceLink source={warning.source} />
      </div>
    </div>
  );
}
