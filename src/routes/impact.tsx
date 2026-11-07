import { createFileRoute } from "@tanstack/react-router";
import { DonorImpact } from "@/components/nido/DonorImpact";

export const Route = createFileRoute("/impact")({
  head: () => ({ meta: [
    { title: "Your Donation at Work · Nido Abierto" },
    { name: "description", content: "See how donations support supplies and community recovery across Pijao." },
    { property: "og:title", content: "Your Donation at Work · Nido Abierto" },
    { property: "og:description", content: "Explore donation impact and recovery by region in Pijao." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DonorImpact,
});