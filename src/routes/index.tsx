import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/nido/Dashboard";
import { DonorImpact } from "@/components/nido/DonorImpact";
import { HeroStage } from "@/components/nido/HeroStage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNido } from "@/lib/nido-store";
import { T } from "@/lib/nido-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nido Abierto · Pijao Recovery & Open-Books Tracker" },
      {
        name: "description",
        content:
          "Open-books tracker for rebuilding Pijao, Quindío after the earthquake and wildfires — every peso, every household, visible.",
      },
      { property: "og:title", content: "Nido Abierto · Pijao Recovery Tracker" },
      {
        property: "og:description",
        content: "Casa por casa, minga por minga, con las cuentas a la vista.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DonorPage,
});

function DonorPage() {
  const { lang } = useNido();
  const [tab, setTab] = useState("dash");
  const tabsRef = useRef<HTMLDivElement>(null);
  const seeBooks = () => {
    setTab("build");
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="space-y-8">
      <HeroStage lang={lang} onSeeBooks={seeBooks} />
      <Tabs ref={tabsRef} value={tab} onValueChange={setTab} className="scroll-mt-28">
        <TabsList className="mb-4">
          <TabsTrigger value="dash">{T[lang].dash}</TabsTrigger>
          <TabsTrigger value="build">{T[lang].build}</TabsTrigger>
        </TabsList>
        <TabsContent value="dash">
          <Dashboard />
        </TabsContent>
        <TabsContent value="build">
          <DonorImpact />
        </TabsContent>
      </Tabs>
    </div>
  );
}
