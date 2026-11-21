import { redirect } from "next/navigation";

// Old path kept for links; the manual-entry wizard lives at /kreator.
export default function StartRedirect() {
  redirect("/kreator");
}
