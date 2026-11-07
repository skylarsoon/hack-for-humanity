import { ArrowRight, ChevronDown } from "lucide-react";
import groupPhoto from "@/assets/community-group.webp";
import { useNido } from "@/lib/nido-store";
import { AFFECTED, BASE_ASSISTED, TOTAL_RAISED_USD, formatMoney } from "@/lib/nido-data";

const GOFUNDME =
  "https://www.gofundme.com/f/support-pijao-families-after-earthquake-and-fires?cp_src=d";

export function DonorHero({ onSeeBooks }: { onSeeBooks: () => void }) {
  const { lang, currency, expenses, extraAssisted } = useNido();
  const es = lang === "es";

  const stats = [
    { label: es ? "Recaudado" : "Raised", value: formatMoney(TOTAL_RAISED_USD, currency) },
    {
      label: es ? "Familias atendidas" : "Households assisted",
      value: `${BASE_ASSISTED + extraAssisted} / ${AFFECTED}`,
    },
    { label: es ? "Recibos publicados" : "Receipts published", value: String(expenses.length) },
  ];

  return (
    <section
      aria-labelledby="donor-hero-heading"
      className="relative isolate flex h-full min-h-[max(600px,100svh)] overflow-hidden bg-primary text-primary-foreground"
    >
      <img
        src={groupPhoto}
        alt={
          es
            ? "Un grupo de personas reunidas bajo los árboles con plantas y un perro"
            : "A group gathered under the trees with plants and a dog"
        }
        className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_30%]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[oklch(0.2_0.03_145/0.7)] to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-[oklch(0.2_0.03_145/0.92)] via-[oklch(0.2_0.03_145/0.7)] to-[oklch(0.2_0.03_145/0.15)] md:bg-gradient-to-r md:from-[oklch(0.2_0.03_145/0.9)] md:via-[oklch(0.2_0.03_145/0.6)] md:to-transparent"
      />

      <div className="mx-auto flex w-full max-w-7xl items-end px-4 pt-28 pb-20 sm:px-8 sm:pb-24">
        <div className="flex max-w-xl flex-col gap-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[oklch(0.82_0.08_50)] sm:text-sm">
            Pijao, Quindío · {es ? "Recuperación con cuentas abiertas" : "Open-books recovery"}
          </p>
          <h2
            id="donor-hero-heading"
            className="font-display text-4xl font-medium leading-[1.04] sm:text-6xl lg:text-7xl"
          >
            {es ? "Cada peso, cada hogar, a la vista." : "Every peso, every household, visible."}
          </h2>
          <p className="max-w-lg text-base leading-relaxed text-primary-foreground/90 sm:text-lg">
            {es
              ? "Después del terremoto y los incendios, Pijao se reconstruye casa por casa. Siga cada donación desde el recibo hasta el techo."
              : "After the earthquake and wildfires, Pijao is rebuilding one home at a time. Follow each donation from receipt to roof."}
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            <a
              href={GOFUNDME}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center rounded-full bg-[oklch(0.5_0.14_40)] px-7 font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
            >
              {es ? "Donar para reconstruir" : "Donate to rebuild"}
            </a>
            <button
              type="button"
              onClick={onSeeBooks}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-primary-foreground/55 px-6 font-medium transition hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
            >
              {es ? "Ver las cuentas" : "See the open books"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-4 border-t border-primary-foreground/25 pt-5">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-xs text-primary-foreground/75 sm:text-sm">{s.label}</dt>
                <dd className="mt-1 font-display text-2xl tabular-nums sm:text-3xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <p
        aria-hidden="true"
        className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-1 text-xs font-medium tracking-wide text-primary-foreground/80"
      >
        {es ? "Desliza" : "Scroll"}
        <ChevronDown className="h-5 w-5 motion-safe:animate-bounce" />
      </p>
    </section>
  );
}
