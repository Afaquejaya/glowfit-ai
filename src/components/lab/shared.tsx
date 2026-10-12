"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, PencilLine, ChevronsLeftRight, Sparkle } from "lucide-react";
import { resolveImage } from "@/lib/useMakeupRender";
import { GlowLoader } from "@/components/ui/GlowLoader";
import { useGlowStore, type LabStep } from "@/store/glowfit";
import { PoweredBy, type YouCamApi } from "@/components/ui/PoweredBy";
import { money, type Product } from "@/lib/catalog";

export function ScriptAccent({ lines = ["Real Skin", "Real Possibilities"] }: { lines?: string[] }) {
  return (
    <p className="hidden shrink-0 -rotate-6 whitespace-nowrap text-right font-script text-4xl leading-[0.95] text-wine-700/80 xl:block">
      {lines.map((l) => (
        <span key={l} className="block">
          {l}
        </span>
      ))}
    </p>
  );
}

export function LabHeader({
  eyebrow,
  title,
  subtitle,
  right,
  apis,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  apis?: YouCamApi[];
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 xl:flex-nowrap">
      <div className="min-w-0 xl:flex-1">
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-6xl">{title}</h1>
        <p className="mt-2 font-serif text-lg text-charcoal/70 sm:text-2xl">{subtitle}</p>
        {apis && <PoweredBy apis={apis} className="mt-3" />}
      </div>
      {right ?? <ScriptAccent />}
    </div>
  );
}

const STEPS: { n: LabStep; label: string }[] = [
  { n: 1, label: "Moment" },
  { n: 2, label: "Looks" },
  { n: 3, label: "Budget" },
  { n: 4, label: "Fine-tune" },
  { n: 5, label: "Decision" },
];

/** 5-step progress bar. Steps the user has unlocked are clickable. */
export function Stepper() {
  const { step, momentConfirmed, looksGenerated, chosenLook } = useGlowStore((s) => s.lab);
  const updateLab = useGlowStore((s) => s.updateLab);
  const unlocked = (n: LabStep) =>
    n === 1 || (n === 2 && momentConfirmed) || (n >= 3 && looksGenerated && !!chosenLook);

  return (
    <ol className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2">
      {STEPS.map((s, i) => {
        const active = s.n === step;
        const done = s.n < step;
        const can = unlocked(s.n);
        return (
          <li key={s.n} className="flex items-center gap-1.5 sm:gap-2">
            <button
              disabled={!can}
              onClick={() => updateLab({ step: s.n })}
              className={clsx(
                "flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition",
                active && "bg-cocoa-800 text-white shadow-soft",
                !active && can && "bg-white/70 text-wine-700 hover:bg-blush-100",
                !can && "text-charcoal/35",
              )}
            >
              <span
                className={clsx(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  active ? "bg-white/20" : done ? "bg-rose-500 text-white" : "bg-blush-100",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : s.n}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-blush-300 sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}

/** Loads a rendered image from the cache (or a demo file) by its key. */
export function useResolvedImage(key: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    resolveImage(key).then((s) => alive && setSrc(s));
    return () => {
      alive = false;
    };
  }, [key]);
  return src;
}

export function LookImage({
  imageKey,
  alt,
  className,
  loading,
  children,
}: {
  imageKey: string | null | undefined;
  alt: string;
  className?: string;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  const src = useResolvedImage(imageKey);
  const selfie = useGlowStore((s) => s.selfie);
  const shown = src ?? selfie?.dataUrl ?? null;
  return (
    <div className={clsx("relative overflow-hidden bg-gradient-to-br from-blush-100 to-champagne", className)}>
      {shown && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt={alt} className={clsx("h-full w-full object-cover", !src && "opacity-60 saturate-50")} />
      )}
      {loading && (
        <>
          <GlowLoader
            variant="overlay"
            title="Applying your look"
            messages={["Mapping your facial features", "Matching your skin tone", "Layering lip, eye and cheek color", "Blending for a natural finish"]}
          />
          <span className="pointer-events-none absolute inset-x-0 z-10 h-0.5 animate-scan bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_2px_rgba(255,255,255,0.7)]" />
        </>
      )}
      {children}
    </div>
  );
}

export function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[1fr_1.2fr_auto] items-center gap-3 text-sm">
      <span className="text-charcoal/80">{label}</span>
      <span className="h-1.5 rounded-full bg-blush-100">
        <span
          className="block h-1.5 rounded-full bg-gradient-to-r from-rose-400 to-wine-600 transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </span>
      <span className="w-9 text-right tabular-nums text-charcoal/70">{value}%</span>
    </div>
  );
}

export function ProductTile({
  product,
  label,
  sub,
  onSelect,
}: {
  product: Product;
  label?: string;
  sub?: string;
  onSelect?: () => void;
}) {
  const body = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/80 bg-blush-50 shadow-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        {product.tier !== "premium" && (
          <span className="absolute left-1 top-1 rounded-full bg-sage/90 px-1.5 text-[9px] uppercase tracking-wide text-white">
            {product.tier === "mid" ? "mid" : "smart"}
          </span>
        )}
        {onSelect && (
          <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-full bg-white/90 py-0.5 text-[10px] text-wine-700 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            <PencilLine className="h-3 w-3" /> Change
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate text-[11px] font-medium leading-tight">{label ?? product.name}</p>
      {sub && <p className="truncate text-[11px] text-charcoal/55">{sub}</p>}
      <p className="text-xs text-wine-700">{money(product.price)}</p>
    </>
  );
  if (!onSelect) return <div className="flex min-w-0 flex-col">{body}</div>;
  return (
    <button
      type="button"
      onClick={onSelect}
      title={`Change ${product.name}`}
      className="group flex min-w-0 flex-col rounded-2xl text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-rose-400"
    >
      {body}
    </button>
  );
}

/** Drag-to-compare slider for before/after images. */
export function CompareSlider({
  before,
  after,
  labels,
  className = "aspect-[16/7] rounded-2xl",
  focus = "object-[50%_62%]",
}: {
  before: string;
  after: string;
  labels: [string, string];
  className?: string;
  focus?: string;
}) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div
      ref={ref}
      className={clsx("relative w-full cursor-ew-resize touch-none select-none overflow-hidden", className)}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => e.buttons && move(e.clientX)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={labels[1]} className={clsx("absolute inset-0 h-full w-full object-cover", focus)} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={labels[0]} className={clsx("h-full w-full object-cover", focus)} />
      </div>
      <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-card">
          <ChevronsLeftRight className="h-5 w-5 text-wine-700" />
        </span>
      </div>
      <span className="absolute bottom-3 left-3 rounded-full bg-cocoa-900/70 px-3 py-1 text-xs text-white">{labels[0]}</span>
      <span className="absolute bottom-3 right-3 rounded-full bg-white/85 px-3 py-1 text-xs text-wine-700">{labels[1]}</span>
    </div>
  );
}

/** Shows how many real YouCam try-on renders this browser has used. */
export function RenderCounter() {
  const used = useGlowStore((s) => s.rendersUsed);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs text-charcoal/60">
      <Sparkle className="h-3 w-3 text-rose-500" /> Try-on renders used: {used}
    </span>
  );
}
