"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Check, Info, X } from "lucide-react";
import { CATEGORY_LABELS, TIER_LABELS, money, variantsFor, type Product } from "@/lib/catalog";

const SHADED = new Set(["lip", "blush", "eyes"]);

/**
 * Lets the user swap one product of a look for another brand, tier or type in the same shade.
 * The shade stays fixed so the rendered preview stays true; shade changes belong to Step 4.
 */
export function ProductPicker({
  current,
  side,
  onApply,
  onClose,
}: {
  current: Product;
  side: string;
  onApply: (product: Product) => void;
  onClose: () => void;
}) {
  const options = variantsFor(current.category, current.hex);
  const [selected, setSelected] = useState(current.id);
  const chosen = options.find((p) => p.id === selected) ?? current;
  const delta = chosen.price - current.price;
  const shade = current.name.split("·")[1]?.trim();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Choose ${CATEGORY_LABELS[current.category]}`}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-ivory shadow-2xl sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-blush-200 px-6 py-5">
          <div>
            <p className="eyebrow !text-[10px]">{side} · Change product</p>
            <h2 className="mt-1 font-serif text-3xl text-wine-700">{CATEGORY_LABELS[current.category]}</h2>
            {SHADED.has(current.category) && shade && (
              <p className="mt-1 flex items-center gap-2 text-sm text-charcoal/60">
                <span className="h-3.5 w-3.5 rounded-full border border-white shadow-soft" style={{ background: current.hex }} />
                Shade: {shade}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-charcoal/60 hover:bg-blush-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <ul className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-2">
          {options.map((p) => {
            const active = p.id === selected;
            const diff = p.price - current.price;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-2xl border bg-white/80 p-3 text-left transition",
                    active ? "border-wine-700 ring-2 ring-wine-700/20" : "border-blush-200 hover:border-rose-400",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-blush-50 object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
                          p.tier === "premium" ? "bg-wine-700 text-white" : p.tier === "mid" ? "bg-champagne text-cocoa-900" : "bg-sage text-white",
                        )}
                      >
                        {TIER_LABELS[p.tier]}
                      </span>
                      {p.id === current.id && <span className="text-[10px] uppercase tracking-wide text-charcoal/50">Current</span>}
                    </span>
                    <span className="mt-1 block truncate text-sm font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-charcoal/55">
                      {p.brand} · {p.type}
                    </span>
                    <span className="mt-1 flex items-baseline gap-2">
                      <span className="font-serif text-lg text-wine-700">{money(p.price)}</span>
                      {diff !== 0 && (
                        <span className={clsx("text-xs", diff < 0 ? "text-sage" : "text-rose-600")}>
                          {diff < 0 ? "-" : "+"}
                          {money(Math.abs(diff))}
                        </span>
                      )}
                    </span>
                  </span>
                  {active && <Check className="h-5 w-5 shrink-0 text-wine-700" />}
                </button>
              </li>
            );
          })}
        </ul>

        <footer className="border-t border-blush-200 px-6 py-4">
          <p className="mb-3 flex items-start gap-2 text-xs text-charcoal/60">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Options keep the same shade so your try-on stays accurate. To try a new shade, use Step 4 (Change One Thing).
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-charcoal/70">
              {delta === 0 ? "No price change" : delta < 0 ? `You save ${money(-delta)}` : `Adds ${money(delta)}`}
            </p>
            <div className="flex gap-3">
              <button className="btn-outline !px-5 !py-2.5" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary !px-6 !py-2.5" onClick={() => onApply(chosen)} disabled={chosen.id === current.id}>
                Apply
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
