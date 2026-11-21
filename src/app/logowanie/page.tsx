import type { Metadata } from "next";
import { LoginFlow } from "./login-flow";

export const metadata: Metadata = {
  title: "Logowanie (symulacja mObywatel) – Zasiłkowy Przewodnik",
};

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
      <LoginFlow />
    </main>
  );
}
