"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Check, CheckCircle2, Circle, Droplet, Droplets, Grip, Shapes, Target, type LucideIcon } from "lucide-react";
import { useGlowStore } from "@/store/glowfit";
import { demoSkinResult } from "@/lib/demo";
import { OCCASIONS } from "@/lib/scoring";
import type { SkinMetricKey } from "@/lib/skin";
import { HomeSections } from "@/components/home/HomeSections";

// Chip boxes match the panels drawn into /home/hero.jpg (percent of 776x470),
// so live values sit exactly over the artwork at every screen size.
const HERO_CHIPS: { key: SkinMetricKey | "type"; label: string; icon: LucideIcon; box: [number, number, number, number] }[] = [
  { key: "moisture", label: "Hydration", icon: Droplet, box: [1.4, 24, 18.4, 11.6] },
  { key: "texture", label: "Texture", icon: Grip, box: [3.3, 44.2, 14.4, 11.6] },
  { key: "oiliness", label: "Oiliness", icon: Droplets, box: [3.6, 63.8, 16.3, 11.8] },
  { key: "pore", label: "Pores", icon: Shapes, box: [59.1, 33.2, 14.4, 11.6] },
  { key: "type", label: "Skin Type", icon: Target, box: [62.3, 58.3, 20.9, 11.8] },
];

const STEPS = [
  { n: "01", title: "Analyze", href: "/scan", img: "/home/step-analyze.jpg", line: "YouCam Skin AI reads your skin" },
  { n: "02", title: "Generate", href: "/decision-lab", img: "/home/step-generate.jpg", line: "Three looks for your moment" },
  { n: "03", title: "Visualize", href: "/decision-lab", img: "/home/step-visualize.jpg", line: "Try every shade on your face" },
  { n: "04", title: "Compare", href: "/decision-lab", img: "/home/step-compare.jpg", line: "Side by side, with scores" },
  { n: "05", title: "Decide", href: "/products", img: null, line: "Shop the exact products" },
];

const DECIDE_PRODUCTS = ["/products/foundation-premium.jpg", "/products/lip-premium-rose-nude.jpg", "/products/setting-premium.jpg"];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const storedSkin = useGlowStore((s) => s.skin);
  const occasion = useGlowStore((s) => s.lab.moment.occasion);

  // Before a scan the hero shows the sample result the artwork was drawn with.
  const skin = (mounted && storedSkin) || demoSkinResult();
  const valueOf = (key: SkinMetricKey | "type") =>
    key === "type" ? skin.skinType ?? "Balanced" : String(skin.metrics.find((m) => m.key === key)?.score ?? "--");

  return (
    <div className="mx-auto max-w-7xl animate-fadeUp">
      {/* Hero */}
      <section className="grid items-center gap-8 lg:grid-cols-[1fr_1.15fr]">
        <div className="pt-4 lg:pt-10">
          <p className="eyebrow mb-5">AI Beauty Decision Engine</p>
          <h1 className="font-serif text-6xl tracking-tight sm:text-7xl xl:text-8xl">GlowFit AI</h1>
          <p className="mt-4 font-serif text-2xl text-wine-700 sm:text-3xl">Your skin. Your moment. Your choice.</p>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-charcoal/70">
            AI that understands your skin, creates personalized looks, visualizes them, and helps you decide with confidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/scan" className="btn-primary">
              Start My Glow Scan <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/decision-lab" className="btn-outline">
              Explore Decision Lab
            </Link>
          </div>
          {mounted && storedSkin && (
            <p className="mt-5 text-sm text-charcoal/60">
              Showing your latest scan: <span className="text-wine-700">{storedSkin.overall}/100</span> overall.{" "}
              <Link href="/skin-intelligence" className="underline hover:text-wine-700">
                See details
              </Link>
            </p>
          )}
        </div>

        <div className="relative -mx-4 sm:mx-0" style={{ containerType: "inline-size" }}>
          <div className="relative aspect-[776/470] overflow-hidden sm:rounded-[32px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/home/hero.jpg" alt="GlowFit AI skin analysis preview" className="h-full w-full object-cover" />
            <span className="pointer-events-none absolute inset-y-0 left-0 w-[3%] bg-gradient-to-r from-ivory/60 to-transparent" />
            {HERO_CHIPS.map(({ key, label, icon: Icon, box: [l, t, w, h] }) => (
              <div
                key={key}
                className="absolute flex items-center gap-[1.2cqw] rounded-[1.6cqw] bg-[#F7F1EE] px-[1.6cqw] shadow-soft ring-1 ring-white"
                style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }}
              >
                <Icon className="h-[2.8cqw] w-[2.8cqw] shrink-0 text-rose-500" strokeWidth={1.5} />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[1.65cqw] text-charcoal/70">{label}</span>
                  <span className="block truncate font-serif text-[2.15cqw] text-charcoal">{valueOf(key)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="card mt-8 p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-serif text-2xl text-wine-700 sm:text-3xl">One selfie. Multiple possibilities. One confident choice.</h2>
          <p className="eyebrow !text-[10px]">The GlowFit AI Journey</p>
        </div>
        <ol className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative">
              <Link href={s.href} className="group flex h-full flex-col gap-2 rounded-2xl p-2 transition hover:bg-blush-50">
                <span className="flex items-baseline gap-2">
                  <span className="font-serif text-2xl text-wine-700">{s.n}</span>
                  <span className="font-serif text-lg">{s.title}</span>
                </span>
                <div className="relative h-28 overflow-hidden rounded-xl bg-gradient-to-br from-blush-50 to-champagne">
                  {s.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.img} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <>
                      <div className="flex h-full items-end justify-center gap-1 px-2">
                        {DECIDE_PRODUCTS.map((src) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={src} src={src} alt="" className="h-full w-1/3 object-contain mix-blend-multiply" />
                        ))}
                      </div>
                      <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-cocoa-900 text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    </>
                  )}
                </div>
                <span className="text-xs text-charcoal/55">{s.line}</span>
              </Link>
              {i < STEPS.length - 1 && (
                <ArrowRight className="absolute -right-3.5 top-20 hidden h-4 w-4 text-rose-400 lg:block" aria-hidden />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Feature cards */}
      <section className="mt-6 grid gap-5 md:grid-cols-3">
        <FeatureCard
          href="/scan"
          img="/home/feature-ai.jpg"
          title={
            <>
              Powered by
              <br />
              <span className="text-wine-700">Real AI Technology</span>
            </>
          }
          body={
            <>
              YouCam Skin AI +
              <br />
              YouCam Virtual Try-On
            </>
          }
        />
        <FeatureCard
          href="/decision-lab"
          img="/home/feature-moment.jpg"
          title={
            <>
              Personalized
              <br />
              for Your Moment
            </>
          }
          body="From everyday to once in a lifetime."
        >
          <ul className="absolute right-3 top-3 space-y-1 rounded-xl bg-white/85 p-2 text-[11px] shadow-soft backdrop-blur">
            {OCCASIONS.filter((o) => ["everyday", "date-night", "wedding", "party", "work"].includes(o.id)).map((o) => (
              <li key={o.id} className={clsx("flex items-center gap-1.5", o.id === occasion ? "text-wine-700" : "text-charcoal/60")}>
                {o.id === occasion ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                {o.label}
              </li>
            ))}
          </ul>
        </FeatureCard>
        <FeatureCard
          href="/decision-lab"
          img="/home/feature-trust.jpg"
          title={
            <>
              Looks You Can
              <br />
              See, Compare &amp; Trust
            </>
          }
          body="Not just recommendations. Proof before you choose."
        />
      </section>

      <HomeSections />
    </div>
  );
}

function FeatureCard({
  href,
  img,
  title,
  body,
  children,
}: {
  href: string;
  img: string;
  title: React.ReactNode;
  body: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[240px] overflow-hidden rounded-3xl bg-gradient-to-br from-blush-50 to-champagne/70 shadow-card ring-1 ring-white/70"
    >
      <div className="relative z-10 flex w-[62%] flex-col p-6">
        <h3 className="font-serif text-xl leading-snug xl:text-2xl">{title}</h3>
        <p className="mt-3 text-sm text-charcoal/60">{body}</p>
        <span className="mt-auto flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-soft transition group-hover:translate-x-1">
          <ArrowRight className="h-5 w-5 text-wine-700" />
        </span>
      </div>
      <div className="absolute inset-y-0 right-0 w-1/2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-blush-50 via-blush-50/60 to-transparent" />
        {children}
      </div>
    </Link>
  );
}
