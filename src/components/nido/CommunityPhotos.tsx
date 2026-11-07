import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import homePhoto from "@/assets/pijao-home-frame.png";
import gatheringPhoto from "@/assets/community-gathering.png";
import groupPhoto from "@/assets/community-group.webp";
import type { Lang } from "@/lib/nido-data";
import { cn } from "@/lib/utils";

const moments = [
  {
    image: homePhoto,
    alt: {
      es: "Estructura de una casa de bambú en una ladera verde",
      en: "Bamboo house frame on a green hillside",
    },
  },
  {
    image: gatheringPhoto,
    alt: {
      es: "Una persona con micrófono junto a niños y adultos reunidos al aire libre",
      en: "A speaker with a microphone among children and adults gathered outdoors",
    },
  },
  {
    image: groupPhoto,
    alt: {
      es: "Un grupo de personas reunidas bajo los árboles con plantas y un perro",
      en: "A group gathered under the trees with plants and a dog",
    },
  },
];

export function CommunityPhotos({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const [index, setIndex] = useState(0);
  const count = moments.length;
  const go = (next: number) => setIndex((next + count) % count);

  return (
    <section
      aria-labelledby="community-photos-heading"
      aria-roledescription={es ? "carrusel" : "carousel"}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
      className="flex h-full flex-col justify-center overflow-hidden bg-primary py-10 text-primary-foreground sm:py-12"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[oklch(0.82_0.08_50)] sm:text-sm">
              {es ? "Desde el territorio" : "From the ground"}
            </p>
            <h2
              id="community-photos-heading"
              className="font-display text-3xl font-medium sm:text-4xl"
            >
              {es ? "Más que cifras. Una comunidad." : "More than numbers. A community."}
            </h2>
            <p className="mt-2 text-sm text-primary-foreground/80 sm:text-base">
              {es
                ? "Hogares, encuentros y nuevas generaciones: por ellos seguimos adelante."
                : "Homes, shared moments, and the next generation: the reasons we keep going."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label={es ? "Foto anterior" : "Previous photo"}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-primary-foreground/50 transition hover:bg-primary-foreground/10"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label={es ? "Foto siguiente" : "Next photo"}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground text-primary transition hover:brightness-95"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          className="flex gap-6 transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] [--card:85%] motion-reduce:transition-none md:[--card:64%]"
          style={{ transform: `translateX(calc(${index} * (-1 * var(--card) - 1.5rem)))` }}
        >
          {moments.map((moment, i) => {
            const active = i === index;
            return (
              <figure
                key={moment.image}
                aria-hidden={!active}
                className={cn(
                  "m-0 min-w-0 shrink-0 basis-[var(--card)] transition-opacity duration-300 motion-reduce:transition-none",
                  active ? "opacity-100" : "opacity-45",
                )}
              >
                <div className="flex h-[260px] items-center justify-center overflow-hidden rounded-xl bg-[oklch(0.28_0.05_145)] sm:h-[min(400px,38svh)]">
                  <img
                    src={moment.image}
                    alt={moment.alt[lang]}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                </div>
                <figcaption className="flex items-baseline gap-4 pt-4">
                  <span className="font-display text-xl text-[oklch(0.82_0.08_50)]">0{i + 1}</span>
                  <span className="text-sm leading-relaxed sm:text-base">{moment.alt[lang]}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>

        <p className="sr-only" aria-live="polite">
          {es ? `Foto ${index + 1} de ${count}` : `Photo ${index + 1} of ${count}`}
        </p>
        <div className="mt-4 flex items-center gap-1">
          {moments.map((moment, i) => (
            <button
              key={moment.image}
              type="button"
              onClick={() => go(i)}
              aria-label={es ? `Mostrar foto ${i + 1}` : `Show photo ${i + 1}`}
              aria-current={i === index}
              className="flex h-11 w-11 items-center justify-center"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all motion-reduce:transition-none",
                  i === index ? "w-7 bg-[oklch(0.82_0.08_50)]" : "w-2 bg-primary-foreground/45",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
