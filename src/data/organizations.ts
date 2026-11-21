import data from "./organizations.json";

export type SituationId = "strata" | "wczesniak" | "ciezko-chore" | "matka" | "praca";

export interface Organization {
  id: string;
  name: string;
  legalForm: string;
  krs: string;
  opp: boolean | null;
  url: string;
  krsSource: string;
  area: string;
  description: string;
  situations: SituationId[];
  verifiedAt: string;
}

export const ORGANIZATIONS = data.organizations as Organization[];
export const ORGANIZATIONS_VERIFIED_AT = data.verifiedAt;

export function organizationsFor(situation: SituationId): Organization[] {
  return ORGANIZATIONS.filter((o) => o.situations.includes(situation));
}
