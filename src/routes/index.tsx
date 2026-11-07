import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/nido/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nido Abierto · Pijao Recovery & Open-Books Tracker" },
      { name: "description", content: "Open-books tracker for rebuilding Pijao, Quindío after the earthquake and wildfires — every peso, every household, visible." },
      { property: "og:title", content: "Nido Abierto · Pijao Recovery Tracker" },
      { property: "og:description", content: "Casa por casa, minga por minga, con las cuentas a la vista." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});
