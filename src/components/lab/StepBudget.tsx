"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, CheckCircle2, RotateCcw, Sparkle } from "lucide-react";
import { useGlowStore, type PriceMode } from "@/store/glowfit";
import { getBaseLook, labProducts, productsFor, totalPrice } from "@/lib/looks";
import { CATEGORY_LABELS, TIER_LABELS, money, type Product } from "@/lib/catalog";
import { labelOccasion } from "@/lib/scoring";
import { LabHeader, LookImage, ProductTile } from "./shared";
import { ProductPicker } from "./ProductPicker";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function LookCard({ title, image, name, sub, price, products, edited, onSelect, onReset }: {
  title: string; image: string | null; name: string; sub: string; price: number; products: Product[];
  edited: boolean; onSelect: (p: Product) => void; onReset: () => void;
}) {
  return (
    <article className="card h-fit overflow-hidden p-0">
      <LookImage imageKey={image} alt={title} className="m-1.5 h-64 rounded-[22px] sm:h-80">
        <span className="absolute left-4 top-4 rounded-full bg-blush-100/95 px-4 py-1.5 font-serif text-wine-700">{title}</span>
      </LookImage>
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between gap-3 py-2">
          <div>
            <p className="font-serif text-3xl text-wine-700">{name}</p>
            <p className="text-charcoal/60">{sub}</p>
          </div>
          <p className="font-serif text-3xl text-wine-700">{money(price)}</p>
        </div>
        <div className="mb-3 mt-2 flex items-center justify-between gap-2 border-t border-blush-200 pt-4">
          <p className="eyebrow truncate !text-[10px]">
            Products in {title.toLowerCase()} ({products.length})
          </p>
          {edited ? (
            <button onClick={onReset} className="flex items-center gap-1 text-[11px] text-wine-700 hover:underline">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          ) : (
            <span className="shrink-0 whitespace-nowrap text-[11px] text-charcoal/45">Tap to change</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {products.map((p) => (
            <ProductTile
              key={p.category}
              product={p}
              label={CATEGORY_LABELS[p.category]}
              sub={TIER_LABELS[p.tier]}
              onSelect={() => onSelect(p)}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

// Step 3: Budget mode. Same shades, smarter products. No API call: the rendered image is reused.
export function StepBudget() {
  const lab = useGlowStore((s) => s.lab);
  const updateLab = useGlowStore((s) => s.updateLab);
  const [editing, setEditing] = useState<{ side: PriceMode; product: Product } | null>(null);
  if (!lab.chosenLook || !lab.currentRecipe) return null;

  const look = getBaseLook(lab.chosenLook);
  const original = labProducts(look, lab.currentRecipe, "original", lab.picks);
  const optimized = labProducts(look, lab.currentRecipe, "optimized", lab.picks);
  const isEdited = (side: PriceMode) => {
    const auto = productsFor(look, lab.currentRecipe!, side);
    return (side === "original" ? original : optimized).some((p, i) => p.id !== auto[i].id);
  };
  const applyPick = (side: PriceMode, product: Product) => {
    updateLab({ picks: { ...lab.picks, [side]: { ...lab.picks[side], [product.category]: product.id } } });
    setEditing(null);
  };
  const resetPicks = (side: PriceMode) => updateLab({ picks: { ...lab.picks, [side]: {} } });
  const cardProps = (side: PriceMode) => ({
    edited: isEdited(side),
    onSelect: (product: Product) => setEditing({ side, product }),
    onReset: () => resetPicks(side),
  });
  const save = totalPrice(original) - totalPrice(optimized);
  const sub = `${labelOccasion(lab.moment.occasion)} · ${cap(lab.moment.time)}`;
  const changes = original.map((p, i) => ({ before: p, after: optimized[i] }));
  const underBudget = totalPrice(optimized) <= lab.moment.budget;

  const pick = (priceMode: "original" | "optimized") => updateLab({ priceMode, step: 4 });

  return (
    <>
      <LabHeader
        eyebrow="Decision Lab · Budget Mode"
        title="Keep the Look. Reduce the Cost."
        subtitle="GlowFit optimizes your beauty routine without losing the character of your chosen look."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_300px_1fr]">
        <LookCard title="Original Look" image={lab.currentImage} name={look.name} sub={sub} price={totalPrice(original)} products={original} {...cardProps("original")} />

        <div className="flex flex-col gap-4">
          <div className="card bg-gradient-to-b from-blush-200/70 to-white/70 p-5 text-center">
            <p className="eyebrow">{save >= 0 ? "Save" : "Costs more"}</p>
            <p className="my-1 font-serif text-6xl text-wine-700">{money(Math.abs(save))}</p>
            <ArrowDown className="mx-auto h-5 w-5 text-wine-700" />
          </div>
          <div className="card p-4">
            <p className="eyebrow mb-3 !text-[10px]">What changed?</p>
            <ul className="space-y-2">
              {changes.map(({ before, after }) => (
                <li key={before.category} className="flex items-center gap-3 rounded-xl bg-white/70 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={after.image} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-blush-50 object-cover" />
                  <span className="min-w-0 text-sm">
                    <span className="block">{CATEGORY_LABELS[before.category]}</span>
                    <span className="block truncate text-charcoal/55">
                      {before.id === after.id
                        ? "Same"
                        : before.tier === after.tier
                          ? `${before.brand} → ${after.brand}`
                          : `${TIER_LABELS[before.tier]} → ${TIER_LABELS[after.tier]}`}
                    </span>
                  </span>
                  {before.price !== after.price && (
                    <span className={`ml-auto shrink-0 text-xs ${after.price < before.price ? "text-sage" : "text-rose-600"}`}>
                      {after.price < before.price ? "-" : "+"}
                      {money(Math.abs(before.price - after.price))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="eyebrow mb-2 mt-4 !text-[10px]">What stayed?</p>
            <ul className="space-y-1.5 text-sm">
              {["Exact same shades", "Overall finish", `${labelOccasion(lab.moment.occasion)} suitability`, "Style identity"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sage" /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl bg-blush-100/80 p-3">
              <p className="flex items-center gap-1.5 text-wine-700">
                <Sparkle className="h-4 w-4" /> AI Decision
              </p>
              <p className="mt-1 text-xs leading-relaxed text-charcoal/70">
                GlowFit kept your lip and eye products, where the difference is most visible, and swapped the rest for smart picks
                with the same shade.{" "}
                {underBudget ? `This brings you within your ${money(lab.moment.budget)} budget.` : "It moves you closer to your budget."}
              </p>
            </div>
          </div>
        </div>

        <LookCard title="Optimized Look" image={lab.currentImage} name={look.name} sub={sub} price={totalPrice(optimized)} products={optimized} {...cardProps("optimized")} />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-4">
        <button className="btn-primary min-w-[260px]" onClick={() => pick("optimized")}>
          Use Optimized Look <ArrowRight className="h-5 w-5" />
        </button>
        <button className="btn-outline min-w-[260px]" onClick={() => pick("original")}>
          Keep Original
        </button>
      </div>

      {editing && (
        <ProductPicker
          current={editing.product}
          side={editing.side === "original" ? "Original Look" : "Optimized Look"}
          onApply={(p) => applyPick(editing.side, p)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
