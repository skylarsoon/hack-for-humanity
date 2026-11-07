import { createFileRoute } from "@tanstack/react-router";
import { StaffDashboard } from "@/components/nido/StaffDashboard";
import { StaffGate } from "@/components/nido/StaffGate";

export const Route = createFileRoute("/staff/dashboard")({
  head: () => ({ meta: [
    { title: "Coordinator dashboard · Nido Abierto" },
    { name: "description", content: "Nido Abierto coordinator view of purchases, families, needs and documents." },
    { name: "robots", content: "noindex" },
  ] }),
  component: () => <StaffGate><StaffDashboard /></StaffGate>,
});
