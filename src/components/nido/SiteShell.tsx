import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Code2, Ellipsis, Heart, Users } from "lucide-react";
import { toast } from "sonner";
import { useNido } from "@/lib/nido-store";
import { T, type Currency, type Lang } from "@/lib/nido-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const EMBED = `<iframe src="https://nido-abierto.lovable.app/?embed=1" width="100%" height="900" style="border:0;border-radius:12px" title="Nido Abierto · Pijao" loading="lazy"></iframe>`;
const GOFUNDME =
  "https://www.gofundme.com/f/support-pijao-families-after-earthquake-and-fires?cp_src=d";

function LangToggle({
  value,
  onChange,
  onDark,
}: {
  value: Lang;
  onChange: (v: Lang) => void;
  onDark: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={value === "es" ? "Idioma" : "Language"}
      className={cn(
        "flex rounded-full border p-0.5 text-xs font-semibold transition-colors",
        onDark ? "border-primary-foreground/40" : "bg-card",
      )}
    >
      {(["es", "en"] as const).map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "min-h-8 rounded-full px-3 transition-colors",
            value === o
              ? onDark
                ? "bg-primary-foreground text-primary"
                : "bg-primary text-primary-foreground"
              : onDark
                ? "text-primary-foreground/85 hover:text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const { lang, setLang, currency, setCurrency } = useNido();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isStaff = pathname.startsWith("/staff/");
  const isHome = pathname === "/";
  const es = lang === "es";
  const t = T[lang];
  const headerRef = useRef<HTMLElement>(null);
  const [embedOpen, setEmbedOpen] = useState(false);
  // On the home page the header floats over the hero until the hero stage scrolls past it.
  const [onHero, setOnHero] = useState(isHome);

  // Publish the header's height so full-screen sections can make room for it.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const update = () =>
      document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isHome) {
      setOnHero(false);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const stage = document.querySelector("[data-hero-stage]");
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      setOnHero(!!stage && stage.getBoundingClientRect().bottom > headerHeight);
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
  }, [isHome]);

  return (
    <div className="min-h-screen overflow-x-clip">
      <header
        ref={headerRef}
        className={cn(
          "z-[1000] transition-colors duration-300",
          isHome ? "fixed inset-x-0 top-0" : "sticky top-0",
          onHero
            ? "border-b border-transparent bg-transparent text-primary-foreground"
            : "border-b bg-background/90 text-foreground backdrop-blur",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3">
          <h1 className="mr-auto min-w-0">
            <Link
              to="/"
              className={cn(
                "flex items-baseline gap-1.5 font-display text-xl font-semibold whitespace-nowrap sm:text-2xl",
                !onHero && "text-primary",
              )}
            >
              Nido Abierto
              <span className="hidden font-sans text-sm font-medium opacity-75 sm:inline">
                · Pijao
              </span>
            </Link>
          </h1>

          <LangToggle value={lang} onChange={setLang} onDark={onHero} />

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              aria-label={es ? "Más opciones" : "More options"}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                onHero ? "hover:bg-primary-foreground/15" : "hover:bg-muted",
              )}
            >
              <Ellipsis className="h-5 w-5" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[1100] w-56">
              <DropdownMenuLabel>{es ? "Moneda" : "Currency"}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={currency}
                onValueChange={(v) => setCurrency(v as Currency)}
              >
                <DropdownMenuRadioItem value="COP">COP · Peso colombiano</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="USD">USD · US dollar</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setEmbedOpen(true)}>
                <Code2 aria-hidden="true" /> {t.embed}
              </DropdownMenuItem>
              {!isStaff && (
                <DropdownMenuItem asChild>
                  <Link to="/staff/field">
                    <Users aria-hidden="true" /> {es ? "Acceso del equipo" : "Staff access"}
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <a
            href={GOFUNDME}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-[oklch(0.5_0.14_40)] px-4 text-sm font-semibold text-white transition hover:brightness-110 sm:px-5"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            {es ? "Donar" : "Donate"}
          </a>
        </div>
        {isStaff && (
          <nav
            aria-label="Staff pages"
            className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pb-3"
          >
            <Button asChild variant="ghost">
              <Link to="/">{es ? "Tablero público" : "Donor dashboard"}</Link>
            </Button>
            <Button asChild variant={pathname === "/staff/field" ? "secondary" : "ghost"}>
              <Link to="/staff/field">{t.field}</Link>
            </Button>
            <Button asChild variant={pathname === "/staff/coordinator" ? "secondary" : "ghost"}>
              <Link to="/staff/coordinator">{t.ai}</Link>
            </Button>
          </nav>
        )}
      </header>

      <Dialog open={embedOpen} onOpenChange={setEmbedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed on espejodeagua.org/emergencia.html</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">
            {EMBED}
          </pre>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(EMBED);
              toast.success("Snippet copied");
            }}
          >
            Copy snippet
          </Button>
        </DialogContent>
      </Dialog>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <footer className="py-8 text-center text-xs text-muted-foreground">
        Espejo de Agua × Esto es Quindío · Alianza Nido · 1 USD = 3.230 COP
      </footer>
    </div>
  );
}
