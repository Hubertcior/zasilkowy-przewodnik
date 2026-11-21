"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ParentData, Scenario } from "@/engine/types";
import { useCaseStore } from "@/store/useCaseStore";

export function DemoLoader({ id }: { id: string }) {
  const router = useRouter();
  const setFromPersona = useCaseStore((s) => s.setFromPersona);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const login = await fetch("/api/mock/mobywatel/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ personaId: id }) });
      if (!login.ok) throw new Error();
      const res = await fetch("/api/mock/zus/profile");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { persona: { id: string; name: string }; parents: ParentData[]; scenario: Scenario };
      setFromPersona({ personaId: data.persona.id, displayName: data.persona.name, parents: data.parents, scenario: data.scenario });
      // Optional target: /demo/anna?do=kalkulator (whitelisted pages only).
      const qs = new URLSearchParams(window.location.search);
      const target = qs.get("do");
      const allowed = ["moja-sytuacja", "kalkulator", "co-i-gdzie", "wnioski", "konto"];
      // Optional tab for /konto: /demo/anna?do=konto&tab=ezla
      const tab = qs.get("tab");
      const suffix = tab && /^[a-z-]{1,20}$/.test(tab) ? `?tab=${tab}` : "";
      router.replace(`/${target && allowed.includes(target) ? target : "moja-sytuacja"}${suffix}`);
    })().catch(() => setError(true));
  }, [id, router, setFromPersona]);

  return <p className="text-muted-foreground">{error ? "Nie znaleziono takiej osoby demonstracyjnej." : "Wczytuję dane demonstracyjne (symulacja)…"}</p>;
}
