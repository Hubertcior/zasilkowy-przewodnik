"use client";

import { Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    setBusy(false);
    // Full navigation: the client router may hold a prefetched /admin (made before login) that redirects back here.
    if (res.ok) window.location.replace(new URL("/admin", window.location.origin));
    else setError("Nieprawidłowe hasło");
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4" aria-hidden /> Panel administracyjny
        </CardTitle>
        <CardDescription>Zmiana stawek i wymiarów zasiłków przy zmianach przepisów.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="pw">Hasło</Label>
            <Input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Loguję…" : "Zaloguj"}
          </Button>
          <p className="text-muted-foreground text-xs">Wersja demo: hasło podane w README i opisie projektu.</p>
        </form>
      </CardContent>
    </Card>
  );
}
