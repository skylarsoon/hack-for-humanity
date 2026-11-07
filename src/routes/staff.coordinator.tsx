import { createFileRoute } from "@tanstack/react-router";
import { Workbench } from "@/components/nido/Workbench";
import { StaffGate } from "@/components/nido/StaffGate";

export const Route = createFileRoute("/staff/coordinator")({
  head: () => ({ meta: [
    { title: "Coordinator · Nido Abierto" },
    { name: "description", content: "Nido Abierto coordinator document review and minga updates." },
    { property: "og:title", content: "Coordinator · Nido Abierto" },
    { property: "og:description", content: "Document review and community updates for Pijao coordinators." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: () => <StaffGate><Workbench /></StaffGate>,
});