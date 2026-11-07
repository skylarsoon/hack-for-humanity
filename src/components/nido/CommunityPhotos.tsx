import homePhoto from "@/assets/pijao-home-frame.png.asset.json";
import gatheringPhoto from "@/assets/community-gathering.png.asset.json";
import groupPhoto from "@/assets/community-group.png.asset.json";
import type { Lang } from "@/lib/nido-data";

// Lovable serves /__l5e/assets-v1/* only on its own hosts. When running elsewhere, set VITE_ASSET_BASE to a Lovable URL that serves them.
const ASSET_BASE = (import.meta.env["VITE_ASSET_BASE"] as string | undefined)?.replace(/\/+$/, "") ?? "";

const moments = [
  {
    image: homePhoto,
    alt: { es: "Estructura de una casa de bambú en una ladera verde", en: "Bamboo house frame on a green hillside" },
  },
  {
    image: gatheringPhoto,
    alt: { es: "Una persona con micrófono junto a niños y adultos reunidos al aire libre", en: "A speaker with a microphone among children and adults gathered outdoors" },
  },
  {
    image: groupPhoto,
    alt: { es: "Un grupo de personas reunidas bajo los árboles con plantas y un perro", en: "A group gathered under the trees with plants and a dog" },
  },
];

export function CommunityPhotos({ lang }: { lang: Lang }) {
  return (
    <section aria-labelledby="community-photos-heading">
      <div className="mb-5 max-w-2xl">
        <h2 id="community-photos-heading" className="font-display text-2xl font-semibold text-primary">
          {lang === "es" ? "Más que cifras. Una comunidad." : "More than numbers. A community."}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "es" ? "Hogares, encuentros y nuevas generaciones: por ellos seguimos adelante." : "Homes, shared moments, and the next generation: the reasons we keep going."}
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {moments.map((moment) => (
          <figure key={moment.image.asset_id} className="min-w-0">
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-muted">
              <img src={`${ASSET_BASE}${moment.image.url}`} alt={moment.alt[lang]} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-full w-full object-contain" />
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}