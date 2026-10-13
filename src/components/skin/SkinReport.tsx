"use client";

import { FaceStructure } from "./FaceStructure";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Activity,
  ArrowRight,
  Blend,
  Check,
  CircleX,
  Droplet,
  Droplets,
  Grip,
  Lightbulb,
  Shapes,
  Sparkle,
  Sparkles,
  Sun,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { STATUS_LABEL, headline, skinPlan, skinTypeInfo, statusOf, type MetricStatus } from "@/lib/skinCare";
import type { SkinMetricKey, SkinResult } from "@/lib/skin";

const ICONS: Record<SkinMetricKey, LucideIcon> = {
  moisture: Droplet,
  texture: Grip,
  oiliness: Droplets,
  pore: Shapes,
  redness: Waves,
  wrinkle: Activity,
  acne: Sparkle,
  radiance: Sun,
};

// Where each metric sits on a centred, front-facing selfie (percent of the photo box).
const ZONE: Record<SkinMetricKey, [number, number]> = {
  moisture: [37, 55],
  texture: [50, 30],
  oiliness: [50, 50],
  pore: [58, 49],
  redness: [63, 58],
  wrinkle: [41, 42],
  acne: [60, 64],
  radiance: [50, 36],
};

// The five labels drawn on the GlowMap: side, height (percent) and the metric they point to.
const MAP_CHIPS: { key: SkinMetricKey; side: "left" | "right"; top: number }[] = [
  { key: "moisture", side: "left", top: 18 },
  { key: "texture", side: "left", top: 40 },
  { key: "oiliness", side: "left", top: 62 },
  { key: "pore", side: "right", top: 24 },
  { key: "redness", side: "right", top: 54 },
];

const CHIP_W = 116; // px
const CHIP_INSET = 12; // px from the map edge

const BAR: Record<MetricStatus, string> = { good: "bg-sage", care: "bg-rose-400", priority: "bg-rose-600" };
const BADGE: Record<MetricStatus, string> = {
  good: "bg-sage/15 text-sage",
  care: "bg-champagne text-amber-700",
  priority: "bg-rose-100 text-rose-700",
};

/** The full skin profile from one scan: score, metrics, GlowMap, priorities and a care plan. */
export function SkinReport({ skin, photo, sample }: { skin: SkinResult; photo: string; sample?: boolean }) {
  const plan = skinPlan(skin);
  const type = skinTypeInfo(skin.skinType);
  const [showZones, setShowZones] = useState(false);
  // YouCam returns a mask image per metric; when it has, the detailed map shows the real AI masks.
  const masked = skin.metrics.filter((m) => m.maskUrl);
  const [maskKey, setMaskKey] = useState<SkinMetricKey | null>(null);
  const [brokenMasks, setBrokenMasks] = useState<string[]>([]);
  const liveMasks = masked.filter((m) => !brokenMasks.includes(m.key));
  const useMasks = showZones && liveMasks.length > 0;
  const activeMask = useMasks ? liveMasks.find((m) => m.key === maskKey) ?? [...liveMasks].sort((a, b) => a.score - b.score)[0] : null;
  // Labels have a fixed pixel width, so lines start at their inner edge whatever the map's size.
  const mapRef = useRef<HTMLElement>(null);
  const [mapW, setMapW] = useState(480);
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setMapW(e.contentRect.width || 480));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const edge = ((CHIP_INSET + CHIP_W) / mapW) * 100;
  const metric = (k: SkinMetricKey) => skin.metrics.find((m) => m.key === k);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Profile: score, type, every metric */}
        <section className="card p-5">
          <h3 className="font-serif text-3xl text-wine-700">Your Skin Profile</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/70 p-3 text-center ring-1 ring-blush-200">
              <ScoreRing value={skin.overall} size={84} stroke={8} className="shrink-0">
                <span className="absolute inset-0 flex flex-col items-center justify-center font-serif text-3xl leading-none">
                  {skin.overall}
                  <span className="mt-0.5 text-xs text-charcoal/50">/100</span>
                </span>
              </ScoreRing>
              <span className="min-w-0">
                <span className="block font-serif text-lg leading-tight">Skin Score</span>
                <span className="block text-[11px] leading-snug text-charcoal/55">{headline(skin.overall)}</span>
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/70 p-3 text-center ring-1 ring-blush-200">
              <span className="self-start text-xs text-charcoal/60">Skin Type</span>
              <span className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-blush-100 text-rose-600">
                <Blend className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <span className="mt-1 font-serif text-lg">{skin.skinType ?? "Normal"}</span>
              <span className="text-[11px] leading-snug text-charcoal/55">{type.line}</span>
            </div>
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {skin.metrics.map((m) => {
              const Icon = ICONS[m.key];
              const st = statusOf(m.score);
              return (
                <li key={m.key} className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-2.5 ring-1 ring-blush-200">
                  <Icon className="h-5 w-5 shrink-0 text-rose-500" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="leading-tight">{m.label}</span>
                      <span className="font-serif text-lg">{m.score}</span>
                    </span>
                    <span className="mt-1 block h-1.5 rounded-full bg-blush-100">
                      <span className={clsx("block h-1.5 rounded-full", BAR[st])} style={{ width: `${m.score}%` }} />
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* GlowMap */}
        <section ref={mapRef} className="card relative min-h-[480px] overflow-hidden p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Analyzed selfie" className="absolute inset-0 h-full w-full object-cover" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cocoa-900/70 to-transparent" />
          {activeMask && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={activeMask.key}
              src={activeMask.maskUrl}
              alt={`${activeMask.label} map from YouCam Skin AI`}
              onError={() => setBrokenMasks((b) => [...b, activeMask.key])}
              className="absolute inset-0 h-full w-full animate-fadeUp object-cover"
            />
          )}
          {useMasks && (
            <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-cocoa-900/60 to-transparent p-3 pb-8">
              <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-white/80">YouCam Skin AI map · tap a metric</p>
              <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                {liveMasks.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMaskKey(m.key)}
                    aria-pressed={activeMask?.key === m.key}
                    className={clsx(
                      "shrink-0 rounded-full px-3 py-1 text-xs transition",
                      activeMask?.key === m.key ? "bg-white text-wine-700" : "bg-white/25 text-white hover:bg-white/40",
                    )}
                  >
                    {m.label} {m.score}
                  </button>
                ))}
              </div>
            </div>
          )}
          {showZones &&
            !useMasks &&
            skin.metrics.map((m) => {
              const [x, y] = ZONE[m.key];
              const good = statusOf(m.score) === "good";
              return (
                <span
                  key={m.key}
                  className="pointer-events-none absolute h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    background: `radial-gradient(circle, ${good ? "rgba(132,169,140,0.55)" : "rgba(233,120,140,0.55)"} 0%, transparent 70%)`,
                  }}
                />
              );
            })}
          <svg
            className={clsx("pointer-events-none absolute inset-0 h-full w-full", useMasks && "hidden")}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            {MAP_CHIPS.map(({ key, side, top }) => {
              if (!metric(key)) return null;
              const [x, y] = ZONE[key];
              return (
                <g key={key}>
                  <line
                    x1={side === "left" ? edge : 100 - edge}
                    y1={top + 5}
                    x2={x}
                    y2={y}
                    stroke="white"
                    strokeWidth="1.2"
                    strokeDasharray="2 3"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.9"
                  />
                  <circle cx={x} cy={y} r="0.9" fill="white" />
                </g>
              );
            })}
          </svg>
          {!useMasks && MAP_CHIPS.map(({ key, side, top }) => {
            const m = metric(key);
            if (!m) return null;
            const Icon = ICONS[key];
            return (
              <span
                key={key}
                className={clsx(
                  "absolute flex items-center gap-1.5 rounded-xl bg-white/85 px-2 py-1 shadow-soft backdrop-blur",
                )}
                style={{ top: `${top}%`, width: CHIP_W, [side]: CHIP_INSET }}
              >
                <Icon className="h-4 w-4 shrink-0 text-rose-500" strokeWidth={1.5} />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[10px] text-charcoal/60">{m.label}</span>
                  <span className="block font-serif text-[15px] leading-tight">{m.score}</span>
                </span>
              </span>
            );
          })}
          {sample && (
            <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/85 px-2.5 py-1 text-[10px] uppercase tracking-wide text-charcoal/60">
              Sample photo
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 text-white">
            <span>
              <span className="block font-serif text-3xl">GlowMap</span>
              <span className="text-xs text-white/80">
                {useMasks && activeMask ? `${activeMask.label}: ${STATUS_LABEL[statusOf(activeMask.score)]} (${activeMask.score})` : "Your personalized skin visualization"}
              </span>
            </span>
            <button
              onClick={() => setShowZones((v) => !v)}
              aria-pressed={showZones}
              className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm text-charcoal shadow-soft hover:text-wine-700"
            >
              {showZones ? (useMasks ? "Hide Map" : "Hide Zones") : "View Detailed Map"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Face shape and proportions, next to the skin profile */}
        <FaceStructure face={skin.face} photo={photo} />

        {/* Priorities */}
        <section className="card p-5 sm:p-6 lg:col-span-2">
          <h3 className="font-serif text-3xl text-wine-700">Your Skin Priorities</h3>
          <p className="mt-1 text-sm text-charcoal/60">The three areas with the lowest scores, and what to do about each one.</p>
          <ol className="mt-4 grid gap-4 lg:grid-cols-3">
            {plan.priorities.map((p, i) => {
              const [x, y] = ZONE[p.key];
              return (
                <li key={p.key} className="flex flex-col overflow-hidden rounded-2xl bg-white/70 ring-1 ring-blush-200">
                  <span className="relative block h-32 w-full shrink-0 overflow-hidden bg-blush-100">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      // No stock close-up for this metric, so zoom into the person's own photo instead.
                      <span
                        className="block h-full w-full"
                        style={{ backgroundImage: `url(${photo})`, backgroundSize: "260%", backgroundPosition: `${x}% ${y}%` }}
                      />
                    )}
                    <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 font-serif text-base text-wine-700 shadow-soft">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={clsx("absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs shadow-soft", BADGE[p.status])}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </span>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-serif text-2xl">{p.label}</span>
                      <span className="whitespace-nowrap text-sm text-charcoal/60">
                        Current <span className="font-serif text-xl text-charcoal">{p.score}</span>
                      </span>
                    </div>
                    <span className="mt-2 block h-1.5 rounded-full bg-blush-100">
                      <span className={clsx("block h-1.5 rounded-full", BAR[p.status])} style={{ width: `${p.score}%` }} />
                    </span>
                    <p className="mt-3 text-sm leading-relaxed text-charcoal/65">{p.text}</p>
                    <div className="mt-auto pt-3">
                      <p className="flex items-start gap-2 rounded-xl bg-blush-50 px-3 py-2.5 text-sm text-charcoal/75">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" strokeWidth={1.6} />
                        {p.tip}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {/* Care plan */}
      <section className="card mt-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="font-serif text-3xl text-wine-700">Your Skin Care Plan</h3>
            <p className="mt-1 text-sm text-charcoal/60">Personalized from this skin analysis: what to focus on, what to skip, and what to use.</p>
          </div>
          <Link href="/products" className="btn-primary !px-5 !py-2.5 !text-base">
            Build My Routine <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <PlanCard title="What Your Skin Needs" icon={Droplets} img="/skin/needs.jpg" items={plan.needs} tone="do" />
          <PlanCard title="What To Avoid" icon={CircleX} img="/skin/avoid.jpg" items={plan.avoid} tone="avoid" />
          <PlanCard title="What Works For You" icon={Sparkles} img="/skin/works.jpg" items={plan.works} tone="do" />
        </div>
      </section>
    </>
  );
}

function PlanCard({ title, icon: Icon, img, items, tone }: { title: string; icon: LucideIcon; img: string; items: string[]; tone: "do" | "avoid" }) {
  return (
    <div className="relative flex min-h-[190px] overflow-hidden rounded-2xl bg-white/70 ring-1 ring-blush-200">
      <div className="relative z-10 w-[72%] p-4 sm:p-5">
        <p className="flex items-center gap-2 font-serif text-xl">
          <Icon className="h-5 w-5 shrink-0 text-rose-500" strokeWidth={1.5} /> {title}
        </p>
        <ul className="mt-3 space-y-2 text-sm text-charcoal/75">
          {items.map((t) => (
            <li key={t} className="flex items-start gap-2">
              {tone === "do" ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
              ) : (
                <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" strokeWidth={1.6} />
              )}
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute inset-y-0 right-0 w-[36%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" className="h-full w-full object-cover" />
        <span className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-[#FBF5F2] to-transparent" />
      </div>
    </div>
  );
}
