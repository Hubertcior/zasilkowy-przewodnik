"use client";

import {
  Calculator,
  FileText,
  FolderOpen,
  HeartHandshake,
  Home,
  Landmark,
  Menu,
  Send,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  short?: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Start", icon: Home },
  { href: "/moja-sytuacja", label: "Moja sytuacja", short: "Sytuacja", icon: UserRound },
  { href: "/kalkulator", label: "Kalkulator", icon: Calculator },
  { href: "/dokumenty", label: "Co i gdzie złożyć", short: "Dokumenty", icon: FileText },
  { href: "/wnioski", label: "Wnioski", icon: Send },
  { href: "/konto", label: "Moje konto (PUE – symulacja)", short: "Konto", icon: Landmark },
  { href: "/trudne-sytuacje", label: "Trudne sytuacje", icon: HeartHandshake },
  { href: "/sprawy", label: "Przykładowe sprawy", short: "Sprawy", icon: FolderOpen },
];

/** Items shown in the mobile bottom bar; the rest live in the "Więcej" sheet. */
const MOBILE_MAIN = ["/", "/moja-sytuacja", "/kalkulator", "/dokumenty"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm" aria-hidden>
        ZP
      </span>
      <span className="leading-tight">
        Zasiłkowy Przewodnik
        <span className="text-muted-foreground block text-xs font-normal">Przyszłego Rodzica</span>
      </span>
    </Link>
  );
}

function Footer() {
  const [params, setParams] = useState<{ version: string; effectiveFrom: string } | null>(null);
  useEffect(() => {
    fetch("/api/params")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p && setParams({ version: p.version, effectiveFrom: p.effectiveFrom }))
      .catch(() => {});
  }, []);
  return (
    <footer className="text-muted-foreground border-t px-4 py-6 text-xs">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Aplikacja informacyjna, nie zastępuje decyzji ZUS.
          {params && (
            <>
              {" "}
              Parametry: wersja {params.version} z dnia {params.effectiveFrom}.
            </>
          )}{" "}
          <a href="https://www.zus.pl" target="_blank" rel="noopener noreferrer" className="hover:text-foreground underline underline-offset-2">
            Źródła: zus.pl
          </a>
        </p>
        <Link href="/admin" className="hover:text-foreground inline-flex items-center gap-1 underline-offset-2 hover:underline">
          <Settings className="size-3" aria-hidden /> Panel administracyjny
        </Link>
      </div>
    </footer>
  );
}

/** Responsive application frame: desktop top bar + sidebar, mobile header + bottom nav + "more" sheet. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Przejdź do treści
      </a>

      <header className="bg-background/90 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 border-b backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-4 px-4 lg:h-16 lg:px-6">
          <Logo />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="hover:bg-accent inline-flex size-10 items-center justify-center rounded-lg lg:hidden"
                aria-label="Otwórz menu"
              >
                <Menu className="size-5" aria-hidden />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-sidebar w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav aria-label="Menu główne" className="px-2">
                <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
                <Link href="/admin" onClick={() => setOpen(false)} className="text-muted-foreground mt-4 flex items-center gap-3 px-3 py-2 text-sm">
                  <Settings className="size-4" aria-hidden /> Panel administracyjny
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="bg-sidebar sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 overflow-y-auto border-r p-3 lg:block">
          <nav aria-label="Menu główne">
            <NavLinks pathname={pathname} />
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div id="main" className="flex flex-1 flex-col">
            {children}
          </div>
          <Footer />
        </div>
      </div>

      <nav
        aria-label="Nawigacja dolna"
        className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV.filter((n) => MOBILE_MAIN.includes(n.href)).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px]", active ? "text-primary font-medium" : "text-muted-foreground")}
                >
                  <item.icon className="size-5" aria-hidden />
                  {item.short ?? item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-muted-foreground flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px]"
            >
              <Menu className="size-5" aria-hidden />
              Więcej
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
