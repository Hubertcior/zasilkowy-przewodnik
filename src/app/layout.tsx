import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
// Self-hosted Inter (variable, all subsets via unicode-range: latin + latin-ext for Polish) – no network needed at build time.
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zasiłkowy Przewodnik Przyszłego Rodzica",
  description:
    "Sprawdź uprawnienia i wylicz zasiłek chorobowy w ciąży oraz zasiłek macierzyński. Przewodnik krok po kroku przez wnioski do ZUS.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfdfd" },
    { media: "(prefers-color-scheme: dark)", color: "#141b20" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className="h-full antialiased">
      <body className="min-h-full">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
