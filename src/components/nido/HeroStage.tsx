import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/nido-data";
import { cn } from "@/lib/utils";
import { CommunityPhotos } from "./CommunityPhotos";
import { DonorHero } from "./DonorHero";

// The scroll crossfade only runs on wider screens for people who haven't asked for reduced motion;
// everyone else gets the hero and the carousel stacked normally.
const STAGE_QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";
// Share of the pinned scroll distance spent crossfading; the rest holds the carousel before the page moves on.
const FADE_SHARE = 0.6;

export function HeroStage({ lang, onSeeBooks }: { lang: Lang; onSeeBooks: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [staged, setStaged] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(STAGE_QUERY);
    const sync = () => setStaged(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!staged) {
      stage.style.setProperty("--p", "0");
      setShowCarousel(false);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = stage.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const progress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / (travel * FADE_SHARE))) : 0;
      // Written straight to the element so scrolling doesn't re-render the dashboard below.
      stage.style.setProperty("--p", progress.toFixed(3));
      setShowCarousel(progress >= 0.5);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [staged]);

  return (
    <div
      ref={stageRef}
      data-hero-stage
      className={cn("relative -mt-6 ml-[calc(50%_-_50vw)] w-screen", staged && "h-[220svh]")}
    >
      <div className={cn(staged && "sticky top-0 h-svh overflow-hidden bg-primary")}>
        <div
          inert={staged && showCarousel}
          className={cn(staged && "absolute inset-0 will-change-[opacity,transform]")}
          style={
            staged
              ? {
                  opacity: "clamp(0, calc(1 - var(--p, 0) * 1.6), 1)",
                  transform: "scale(calc(1 + var(--p, 0) * 0.05))",
                }
              : undefined
          }
        >
          <DonorHero onSeeBooks={onSeeBooks} />
        </div>
        <div
          inert={staged && !showCarousel}
          className={cn(staged && "absolute inset-0 will-change-[opacity,transform]")}
          style={
            staged
              ? {
                  // Keep the carousel clear of the floating header.
                  paddingTop: "var(--header-h, 4rem)",
                  opacity: "clamp(0, calc(var(--p, 0) * 1.6 - 0.6), 1)",
                  transform: "translateY(calc((1 - var(--p, 0)) * 3rem))",
                }
              : undefined
          }
        >
          <CommunityPhotos lang={lang} />
        </div>
      </div>
    </div>
  );
}
