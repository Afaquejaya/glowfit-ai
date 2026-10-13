"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Check, Scissors } from "lucide-react";

const STEPS = ["Mapping your face shape", "Tracing your hairline", "Styling", "Blending with your makeup"];

// Hair strands drawn over the top of the photo, each animated as a line being "painted" in.
const STRANDS = [
  "M50 18 C 30 18, 16 34, 14 60 S 12 92, 18 100",
  "M50 18 C 70 18, 84 34, 86 60 S 88 92, 82 100",
  "M50 16 C 36 20, 26 32, 24 52 S 22 80, 26 96",
  "M50 16 C 64 20, 74 32, 76 52 S 78 80, 74 96",
  "M48 15 C 40 24, 34 34, 32 46",
  "M52 15 C 60 24, 66 34, 68 46",
  "M50 14 C 46 26, 44 36, 46 44",
];

// Points of a light face mesh that twinkle while the face is being mapped.
const MESH = [
  [36, 46], [50, 42], [64, 46], [30, 56], [70, 56], [40, 58], [60, 58], [50, 62],
  [44, 72], [56, 72], [50, 80], [34, 70], [66, 70], [40, 86], [60, 86], [50, 92],
];

/** Overlay shown on the photo while a YouCam hairstyle is rendered on it. */
export function HairRenderLoader({ styleName, className }: { styleName: string; className?: string }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setT((Date.now() - t0) / 1000), 150);
    return () => clearInterval(id);
  }, []);

  // Eases toward 96% so the bar always moves but never claims to be finished early.
  const pct = Math.min(96, Math.round(96 * (1 - Math.exp(-t / 7))));
  const step = Math.min(STEPS.length - 1, Math.floor(t / 2.2));

  return (
    <div role="status" aria-live="polite" className={clsx("absolute inset-0 z-10 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-b from-cocoa-900/55 via-cocoa-900/25 to-cocoa-900/65 backdrop-blur-[1.5px]" />

      <svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid meet" className="absolute inset-x-0 top-[2%] mx-auto h-[78%] w-full">
        <defs>
          <linearGradient id="hairGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE6DC" />
            <stop offset="100%" stopColor="#E8A39A" />
          </linearGradient>
          <filter id="hairBlur">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>
        <ellipse cx="50" cy="64" rx="22" ry="29" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="0.4" strokeDasharray="1.5 2" className="gf-face" />
        {MESH.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="0.9" fill="white" className="gf-twinkle" style={{ animationDelay: `${(i % 6) * 0.25}s` }} />
        ))}
        <g filter="url(#hairBlur)">
          {STRANDS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="url(#hairGlow)"
              strokeWidth={i < 2 ? 1.6 : 1.1}
              strokeLinecap="round"
              pathLength={100}
              className="gf-strand"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </g>
      </svg>

      <span className="pointer-events-none absolute inset-x-0 h-0.5 animate-scan bg-gradient-to-r from-transparent via-blush-200 to-transparent shadow-[0_0_14px_3px_rgba(255,214,204,0.75)]" />

      <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/95 p-3 text-charcoal shadow-card backdrop-blur sm:inset-x-5 sm:bottom-5 sm:p-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush-100">
            <span className="absolute inset-0 animate-pulseRing rounded-full border-2 border-rose-400/70" />
            <Scissors className="h-5 w-5 text-wine-700 gf-snip" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-lg leading-tight text-wine-700">Rendering {styleName}</p>
            <p key={step} className="animate-fadeUp truncate text-xs text-charcoal/60">
              {step === 2 ? `Styling ${styleName} on your face` : STEPS[step]}…
            </p>
          </div>
          <span className="font-serif text-xl tabular-nums text-wine-700">{pct}%</span>
        </div>
        <span className="relative mt-3 block h-1.5 overflow-hidden rounded-full bg-blush-100">
          <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-400 to-wine-700 transition-[width] duration-300" style={{ width: `${pct}%` }} />
          <span className="absolute inset-y-0 left-0 w-1/3 animate-shimmer rounded-full bg-white/50" />
        </span>
        <div className="mt-2 hidden gap-3 text-[11px] text-charcoal/55 sm:flex">
          {STEPS.map((s, i) => (
            <span key={s} className={clsx("flex items-center gap-1", i < step && "text-sage", i === step && "text-wine-700")}>
              {i < step ? <Check className="h-3 w-3" /> : <span className={clsx("h-1.5 w-1.5 rounded-full", i === step ? "bg-wine-700" : "bg-charcoal/25")} />}
              {s.split(" ")[0]}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .gf-strand { stroke-dasharray: 100; stroke-dashoffset: 100; animation: gfDraw 2.4s ease-in-out infinite; }
        .gf-twinkle { opacity: 0.2; animation: gfTwinkle 1.5s ease-in-out infinite; }
        .gf-face { animation: gfSpin 8s linear infinite; transform-origin: 50px 64px; }
        .gf-snip { animation: gfSnip 0.9s ease-in-out infinite; }
        @keyframes gfDraw { 0% { stroke-dashoffset: 100; opacity: 0; } 15% { opacity: 1; } 60% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 0; } }
        @keyframes gfTwinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.95; } }
        @keyframes gfSpin { to { stroke-dashoffset: -40; } }
        @keyframes gfSnip { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-18deg); } }
        @media (prefers-reduced-motion: reduce) { .gf-strand, .gf-twinkle, .gf-face, .gf-snip { animation: none; stroke-dashoffset: 0; opacity: 0.8; } }
      `}</style>
    </div>
  );
}
