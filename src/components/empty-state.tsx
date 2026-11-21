import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center", className)}>
      {icon && <div className="text-muted-foreground [&_svg]:size-10">{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="text-muted-foreground max-w-md text-sm">{children}</div>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
