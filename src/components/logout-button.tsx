"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCaseStore } from "@/store/caseStore";

/** Clears the simulated session cookie and the client-side case store. */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const reset = useCaseStore((s) => s.reset);
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={async () => {
        await fetch("/api/mock/mobywatel/logout", { method: "POST" }).catch(() => {});
        reset();
        router.push("/");
      }}
    >
      Wyloguj
    </Button>
  );
}
