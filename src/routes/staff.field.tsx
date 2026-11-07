import { createFileRoute } from "@tanstack/react-router";
import { FieldCrew } from "@/components/nido/FieldCrew";

export const Route = createFileRoute("/staff/field")({
  head: () => ({ meta: [
    { title: "Field Crew · Nido Abierto" },
    { name: "description", content: "Nido Abierto field crew household updates and delivery queue." },
    { property: "og:title", content: "Field Crew · Nido Abierto" },
    { property: "og:description", content: "Household delivery updates for Pijao field crews." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: FieldCrew,
});