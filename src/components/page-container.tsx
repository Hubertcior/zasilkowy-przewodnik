import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Standard page wrapper: 16px gutter on mobile, centered max width. */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10 lg:px-8", className)}>{children}</main>;
}
