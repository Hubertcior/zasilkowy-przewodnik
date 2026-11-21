// Shared (client + server) types for the simulated "Zapytaj ZUS" messages (KAN-29).

export const PUE_CATEGORIES = ["macierzynski", "chorobowy", "dokumenty"] as const;
export type PueCategory = (typeof PUE_CATEGORIES)[number];

export const PUE_CATEGORY_LABEL: Record<PueCategory, string> = {
  macierzynski: "Zasiłek macierzyński",
  chorobowy: "Zasiłek chorobowy",
  dokumenty: "Dokumenty i wnioski",
};

export interface PueThread {
  id: string;
  category: PueCategory;
  subject: string;
  question: string;
  createdAt: string;
  /** Present only once the simulated answer is "ready". */
  answer?: string;
  answeredAt?: string;
  status: "oczekuje" | "odpowiedziano";
}
