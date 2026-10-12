import Link from "next/link";
import { ArrowRight, BadgeCheck, Code2, Cpu, PackageCheck, PiggyBank, ScanFace, Sparkles, TrendingUp, Wand2, type LucideIcon } from "lucide-react";

const APIS: { icon: LucideIcon; name: string; where: string; does: string; saving: string }[] = [
  {
    icon: ScanFace,
    name: "YouCam Skin Analysis",
    where: "Skin Scan · Skin Intelligence · Skin Journey",
    does: "8 skin metrics, skin type and per-metric AI masks from one selfie. HD or SD is picked from the photo size.",
    saving: "One analysis feeds every score in the app",
  },
  {
    icon: Wand2,
    name: "YouCam Makeup VTO",
    where: "Decision Lab · 3 Looks · Change One Thing",
    does: "Renders each look and each single change on your own face, so you see it before you buy it.",
    saving: "Selfie uploaded once, every render cached",
  },
  {
    icon: Sparkles,
    name: "YouCam AI Hairstyle",
    where: "Decision Lab · Fine Tune",
    does: "Puts real hairstyles on top of your finished makeup look, ranked by a face-shape match %.",
    saving: "Impact is scored for free before you render",
  },
];

const BRAND_VALUE: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: PackageCheck, title: "Fewer returns", body: "Shoppers see the exact shade on their own face and skin before checkout, so fewer wrong-shade orders come back." },
  { icon: TrendingUp, title: "Higher conversion", body: "A match score and a visible try-on turn \"maybe\" into a confident add-to-bag, with the full look in one tap." },
  { icon: PiggyBank, title: "Smart basket building", body: "Budget Mode keeps the look while swapping to in-range products, so a shopper who would leave buys a lower-priced kit instead." },
  { icon: BadgeCheck, title: "Skin-first trust", body: "Recommendations explain themselves with the shopper's own skin data, not generic bestseller lists." },
];

/** Two Home sections: how each YouCam API is used, and what GlowFit means for beauty brands. */
export function HomeSections() {
  return (
    <>
      <section className="mt-8">
        <p className="eyebrow mb-2">Under the hood</p>
        <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">How YouCam powers GlowFit</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {APIS.map((a) => (
            <div key={a.name} className="card flex flex-col p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blush-100">
                <a.icon className="h-5 w-5 text-wine-700" />
              </span>
              <p className="mt-3 font-serif text-xl">{a.name}</p>
              <p className="mt-0.5 text-xs uppercase tracking-wider text-rose-600">{a.where}</p>
              <p className="mt-2 flex-1 text-sm text-charcoal/70">{a.does}</p>
              <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-blush-50 px-3 py-2 text-xs text-charcoal/70">
                <Cpu className="h-3.5 w-3.5 text-rose-500" /> {a.saving}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-[32px] bg-gradient-to-br from-cocoa-700 to-cocoa-900 p-6 text-white sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <p className="font-serif text-[11px] uppercase tracking-[0.32em] text-blush-200">For beauty brands &amp; retailers</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">Turn try-on into a decision, and the decision into a sale.</h2>
            <p className="mt-3 text-white/75">
              The Decision Lab can sit on any product page or in-store mirror. Plug in your catalog, and every shopper gets looks scored for their
              skin and their moment, rendered on their own face, with a basket that fits their budget.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
              <Code2 className="h-4 w-4" /> Embeddable widget · your catalog · YouCam APIs
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {BRAND_VALUE.map((b) => (
              <div key={b.title} className="rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/10">
                <b.icon className="h-5 w-5 text-blush-200" />
                <p className="mt-2 font-serif text-lg">{b.title}</p>
                <p className="mt-1 text-sm text-white/70">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
        <Link
          href="/decision-lab"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-serif text-lg text-wine-700 transition hover:bg-blush-50"
        >
          See the Decision Lab <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
    </>
  );
}
