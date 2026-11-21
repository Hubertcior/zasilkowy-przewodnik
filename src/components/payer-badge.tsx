import { Building2, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Who pays the benefit: the payer (employer > 20 insured) or ZUS. */
export function PayerBadge({ payer }: { payer: "platnik" | "ZUS" | "pracodawca" }) {
  if (payer === "ZUS") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Landmark className="size-3" aria-hidden /> wypłaca ZUS
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Building2 className="size-3" aria-hidden /> {payer === "pracodawca" ? "wypłaca pracodawca" : "wypłaca płatnik"}
    </Badge>
  );
}
