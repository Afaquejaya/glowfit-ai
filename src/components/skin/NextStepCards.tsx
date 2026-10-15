"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, FlaskConical } from "lucide-react";
import clsx from "clsx";
import { useGlowStore } from "@/store/glowfit";
import { initialLab } from "@/store/glowfit";
import { OCCASIONS, type Occasion } from "@/lib/scoring";

/** Compact call to action after a scan, with the Decision Lab flow shown in pictures: pick an occasion and jump straight into the Decision Lab. */
export function DecisionLabCta({ photo }: { photo?: string | null }) {
  const router = useRouter();
  const lab = useGlowStore((s) => s.lab);
  const updateLab = useGlowStore((s) => s.updateLab);

  const go = (occasion?: Occasion) => {
    if (occasion) {
      // A new occasion starts a fresh lab run so the looks match it.
      updateLab({ ...initialLab, moment: { ...lab.moment, occasion } });
    }
    router.push("/decision-lab");
  };

  const steps: { title: string; line: string; imgs: string[] }[] = [
    { title: "Your moment", line: "Occasion, time, style, budget", imgs: [`/demo/moments/${lab.moment.occasion}.jpg`] },
    { title: "Get 3 looks", line: "Ranked for your skin", imgs: ["/demo/looks/natural-glow.jpg", "/demo/looks/soft-glam.jpg", "/demo/looks/modern-bold.jpg"] },
    { title: "Try on", line: "Rendered on your face", imgs: [photo ?? "/profile/sample-face.jpg"] },
    { title: "Fine-tune", line: "Lips, eyes, blush, hair", imgs: ["/demo/looks/change.jpg"] },
    { title: "Decide & shop", line: "Final look and products", imgs: ["/demo/looks/final.jpg"] },
  ];

  return (
    <section className="relative mt-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-wine-700 via-rose-600 to-cocoa-800 p-5 text-white shadow-card sm:p-6">
      <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-blush-200">
            <FlaskConical className="h-3.5 w-3.5" /> Next step · Decision Lab
          </p>
          <h2 className="mt-1 font-serif text-2xl leading-tight">Turn this skin profile into your perfect look</h2>
        </div>
        <button
          onClick={() => go()}
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-serif text-base text-wine-700 shadow-soft transition hover:translate-x-0.5"
        >
          {lab.looksGenerated ? "Continue in Decision Lab" : "Enter Decision Lab"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* How the Decision Lab works, in pictures */}
      <ol className="relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {steps.map((st, i) => (
          <li key={st.title} className="relative flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-2.5 text-center ring-1 ring-white/15 lg:flex-row lg:gap-3 lg:text-left">
            <span className="relative flex h-14 w-14 shrink-0">
              {st.imgs.length > 1 ? (
                st.imgs.map((src, k) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="absolute top-1 h-12 w-8 rounded-lg object-cover ring-2 ring-white/80"
                    style={{ left: k * 11, transform: `rotate(${(k - 1) * 8}deg)`, zIndex: k === 1 ? 2 : 1 }}
                  />
                ))
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={st.imgs[0]} alt="" className="h-14 w-14 rounded-xl object-cover ring-2 ring-white/80" />
              )}
              <span className="absolute -left-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-wine-700">
                {i + 1}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block font-serif text-base leading-tight">{st.title}</span>
              <span className="block text-[11px] leading-snug text-white/70">{st.line}</span>
            </span>
            {i < steps.length - 1 && (
              <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-blush-200 lg:block" />
            )}
          </li>
        ))}
      </ol>

      <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-white/70">Start with an occasion:</span>
        {OCCASIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => go(o.id)}
            className={clsx(
              "rounded-full px-3 py-1 text-xs ring-1 transition hover:bg-white hover:text-wine-700",
              lab.moment.occasion === o.id ? "bg-white/25 ring-white" : "bg-white/10 ring-white/30",
            )}
            title={o.line}
          >
            {o.label}
          </button>
        ))}
      </div>
    </section>
  );
}
