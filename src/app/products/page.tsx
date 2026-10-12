"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, CalendarHeart, Check, Gem, Info, Moon, PencilLine, ShoppingBag, Sparkle, Sun, Trash2, Wallet } from "lucide-react";
import { useGlowStore, type PriceMode } from "@/store/glowfit";
import { CATEGORY_LABELS, CATEGORY_ORDER, PRODUCTS, TIER_LABELS, money, type Product, type ProductCategory } from "@/lib/catalog";
import { BASE_LOOKS, describeRecipe, getBaseLook, labProducts, totalPrice, type Recipe } from "@/lib/looks";
import { labelOccasion, type Moment } from "@/lib/scoring";
import type { SkinResult } from "@/lib/skin";
import { LookImage } from "@/components/lab/shared";
import { ProductPicker } from "@/components/lab/ProductPicker";
import { GlowLoader } from "@/components/ui/GlowLoader";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One-line reason a product is in the look, from the recipe, the moment and the skin scan. */
function whyThis(p: Product, recipe: Recipe, moment: Moment, skin: SkinResult | null): string {
  const names = describeRecipe(recipe);
  const metric = (k: string) => skin?.metrics.find((m) => m.key === k)?.score ?? 70;
  const occasion = labelOccasion(moment.occasion).toLowerCase();
  switch (p.category) {
    case "foundation":
      return metric("oiliness") < 60
        ? `${names.finish} finish with ${recipe.foundation.coverage >= 60 ? "full" : "light"} coverage keeps shine in check on your skin.`
        : `${names.finish} finish evens your tone while letting your skin show through.`;
    case "lip":
      return `${names.lip} is the shade your look was built around, chosen for a ${occasion} ${moment.time}.`;
    case "blush":
      return `${names.blush} adds warmth that ${metric("redness") < 60 ? "balances redness" : "lifts your cheekbones"} in photos.`;
    case "eyes":
      return `${names.eyes} shadow gives your eyes ${recipe.eyes.intensity >= 60 ? "depth and drama" : "soft definition"}.`;
    case "setting":
      return `Locks the look in place for a long ${moment.time}.`;
    case "fragrance":
      return `A soft rose musk that matches the mood of a ${occasion}.`;
  }
}

function ProductCard({
  product,
  why,
  inBag,
  onAdd,
  onChange,
}: {
  product: Product;
  why?: string;
  inBag: boolean;
  onAdd: () => void;
  onChange?: () => void;
}) {
  const shade = product.name.split("·")[1]?.trim();
  return (
    <article className="card flex animate-fadeUp flex-col overflow-hidden p-0">
      <div className="relative aspect-square bg-blush-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        <span
          className={clsx(
            "absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
            product.tier === "premium" ? "bg-wine-700 text-white" : product.tier === "mid" ? "bg-champagne text-cocoa-900" : "bg-sage text-white",
          )}
        >
          {TIER_LABELS[product.tier]}
        </span>
        {onChange && (
          <button
            onClick={onChange}
            className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-wine-700 shadow-soft hover:bg-white"
          >
            <PencilLine className="h-3 w-3" /> Change
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal/50">{CATEGORY_LABELS[product.category]}</p>
        <p className="mt-0.5 text-sm text-charcoal/60">{product.brand}</p>
        <h3 className="font-serif text-lg leading-snug">{product.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-charcoal/55">
          {shade && <span className="h-3 w-3 rounded-full border border-white shadow-soft" style={{ background: product.hex }} />}
          {product.type}
        </p>
        {why && (
          <p className="mt-3 rounded-xl bg-blush-50 p-2.5 text-xs leading-relaxed text-charcoal/70">
            <span className="text-wine-700">Why this? </span>
            {why}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
          <p className="font-serif text-2xl text-wine-700">{money(product.price)}</p>
          <button
            onClick={onAdd}
            disabled={inBag}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition",
              inBag ? "bg-sage/15 text-sage" : "bg-wine-700 text-white hover:bg-wine-800",
            )}
          >
            {inBag ? (
              <>
                <Check className="h-4 w-4" /> In Bag
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" /> Add to Bag
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ProductsPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(id);
  }, []);
  const lab = useGlowStore((s) => s.lab);
  const skin = useGlowStore((s) => s.skin);
  const selfie = useGlowStore((s) => s.selfie);
  const bag = useGlowStore((s) => s.bag);
  const addToBag = useGlowStore((s) => s.addToBag);
  const removeFromBag = useGlowStore((s) => s.removeFromBag);
  const updateLab = useGlowStore((s) => s.updateLab);
  const [tab, setTab] = useState<ProductCategory | "all">("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const hasLook = !!lab.chosenLook && !!lab.currentRecipe;
  const look = hasLook ? getBaseLook(lab.chosenLook!) : null;
  const mode: PriceMode = lab.priceMode;
  const lookProducts = useMemo(
    () => (look && lab.currentRecipe ? labProducts(look, lab.currentRecipe, mode, lab.picks) : []),
    [look, lab.currentRecipe, mode, lab.picks],
  );
  const names = hasLook ? describeRecipe(lab.currentRecipe!) : null;
  const source = hasLook ? lookProducts : PRODUCTS;
  const tabs = CATEGORY_ORDER.filter((c) => source.some((p) => p.category === c));
  const shown = source.filter((p) => tab === "all" || p.category === tab);
  const bagItems = bag.map((id) => PRODUCTS.find((p) => p.id === id)).filter((p): p is Product => !!p);
  const lookInBag = lookProducts.length > 0 && lookProducts.every((p) => bag.includes(p.id));

  if (!ready) return <GlowLoader title="Gathering your products" messages={["Matching products to your look", "Checking shades and prices"]} />;

  const swap = (next: Product) => {
    const prev = editing;
    updateLab({ picks: { ...lab.picks, [mode]: { ...lab.picks[mode], [next.category]: next.id } } });
    if (prev && bag.includes(prev.id)) {
      removeFromBag(prev.id);
      addToBag([next.id]);
    }
    setEditing(null);
  };

  const bagCard = (
    <div className="rounded-2xl bg-white/70 p-4">
      <p className="flex items-center gap-2 font-serif text-xl text-wine-700">
        <ShoppingBag className="h-5 w-5" /> Your Bag
        <span className="ml-auto font-sans text-sm text-charcoal/55">
          {bagItems.length} item{bagItems.length === 1 ? "" : "s"}
        </span>
      </p>
      {bagItems.length === 0 ? (
        <p className="mt-2 text-sm text-charcoal/60">Your bag is empty. Tap Add to Bag on any product.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {bagItems.map((p) => (
            <li key={p.id} className="flex animate-fadeUp items-center gap-2.5 rounded-xl bg-blush-50/80 p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
              <span className="min-w-0 flex-1 text-xs">
                <span className="block truncate">{p.name}</span>
                <span className="block text-wine-700">{money(p.price)}</span>
              </span>
              <button onClick={() => removeFromBag(p.id)} className="rounded-full p-1.5 text-charcoal/40 hover:bg-blush-100 hover:text-rose-600" aria-label={`Remove ${p.name}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-blush-200 pt-3">
        <span className="text-sm text-charcoal/60">Subtotal</span>
        <span className="font-serif text-2xl text-wine-700">{money(totalPrice(bagItems))}</span>
      </div>
      <button
        className="btn-primary mt-3 w-full !py-2.5"
        disabled={bagItems.length === 0}
        onClick={() => setNotice("This is a demo store, so checkout is not connected. Your bag is saved on this device.")}
      >
        Checkout <ArrowRight className="h-5 w-5" />
      </button>
      {notice && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-blush-50 p-2.5 text-xs text-charcoal/70">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {notice}
        </p>
      )}
    </div>
  );

  const previews = [
    { key: lab.currentImage, label: "Final" },
    ...BASE_LOOKS.filter((l) => l.id !== lab.chosenLook && lab.lookImages[l.id]).map((l) => ({ key: lab.lookImages[l.id]!, label: l.name })),
  ];
  const momentRows = [
    [CalendarHeart, labelOccasion(lab.moment.occasion)],
    [lab.moment.time === "evening" ? Moon : Sun, cap(lab.moment.time)],
    [Gem, cap(lab.moment.style)],
    [Wallet, `${money(lab.moment.budget)} budget`],
  ] as const;

  return (
    <div className="mx-auto max-w-[1400px] pb-28">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: scrollable products */}
        <div className="min-w-0">
          <p className="eyebrow mb-2">{hasLook ? "Your Look · Products" : "GlowFit catalog"}</p>
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Everything Behind Your Look.</h1>
          <p className="mt-2 max-w-2xl text-lg text-charcoal/65">
            {hasLook
              ? "Shop the exact products GlowFit used to create your final look."
              : "Create your look in the Decision Lab and GlowFit will show the exact products behind it here."}
          </p>

          {!hasLook && (
            <div className="card mt-5 flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-charcoal/70">
                <Sparkle className="h-5 w-5 shrink-0 text-rose-500" /> You haven&apos;t decided on a look yet. Browse everything below, or let GlowFit pick for you.
              </p>
              <Link href="/decision-lab" className="btn-primary whitespace-nowrap">
                Open Decision Lab <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          )}

          <div className="my-5 flex flex-wrap gap-2">
            {(["all", ...tabs] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  "rounded-full border px-4 py-1.5 text-sm transition",
                  t === tab ? "border-wine-700 bg-wine-700 text-white" : "border-blush-200 bg-white/70 hover:bg-blush-50",
                )}
              >
                {t === "all" ? "All" : CATEGORY_LABELS[t]}
                {hasLook && t === "all" && ` (${lookProducts.length})`}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            {shown.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                why={hasLook ? whyThis(p, lab.currentRecipe!, lab.moment, skin) : undefined}
                inBag={bag.includes(p.id)}
                onAdd={() => addToBag([p.id])}
                onChange={hasLook ? () => setEditing(p) : undefined}
              />
            ))}
          </div>
          <div id="bag" className="card mt-6 p-2">
            {bagCard}
          </div>
        </div>

        {/* Right: your look, pinned while the products scroll */}
        <aside className="card order-first space-y-3 p-3 lg:sticky lg:top-24 lg:order-none lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto">
          {hasLook && look ? (
            <>
              <LookImage imageKey={previewKey ?? lab.currentImage} alt="Your final look" className="h-72 rounded-[22px] lg:h-60 xl:h-64">
                <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-blush-100/95 px-3 py-1 text-xs text-wine-700">
                  <Check className="h-3.5 w-3.5" /> {previewKey && previewKey !== lab.currentImage ? "Other look" : "Your Final Look"}
                </span>
                {selfie && (
                  <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white/90 py-1 pl-1 pr-3 text-xs text-charcoal/70 shadow-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selfie.dataUrl} alt="Your selfie before makeup" className="h-8 w-8 rounded-full object-cover" />
                    Before
                  </span>
                )}
              </LookImage>
              <div className="px-2">
                <p className="font-serif text-xl">Your Look</p>
                <p className="font-serif text-4xl text-wine-700">{look.name}</p>
                <p className="mt-1 text-charcoal/65">
                  {lookProducts.length} products <span className="mx-1.5 text-blush-300">|</span>
                  <span className="font-medium text-charcoal">{money(totalPrice(lookProducts))}</span> total
                </p>
                <ul className="mt-4 space-y-2.5 border-t border-blush-200 pt-4 text-sm">
                  {momentRows.map(([Icon, text]) => (
                    <li key={text} className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-rose-500" strokeWidth={1.6} /> {text}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-charcoal/55">
                  Lip {names!.lip} · Eyes {names!.eyes} · Blush {names!.blush} · Brows {names!.brows} · {names!.finish} finish
                </p>
              </div>
              {previews.length > 1 && (
                <div className="px-2">
                  <p className="eyebrow mb-2 !text-[10px]">Look preview</p>
                  <div className="grid grid-cols-3 gap-2">
                    {previews.map((v) => {
                      const active = (previewKey ?? lab.currentImage) === v.key;
                      return (
                        <button
                          key={v.label}
                          onClick={() => setPreviewKey(v.key)}
                          title={v.label}
                          className={clsx("overflow-hidden rounded-xl border-2 transition", active ? "border-rose-400" : "border-transparent opacity-80 hover:opacity-100")}
                        >
                          <LookImage imageKey={v.key} alt={v.label} className="h-20 w-full" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <Link
                href="/decision-lab"
                onClick={() => updateLab({ step: 4 })}
                className="flex items-center gap-3 rounded-2xl bg-blush-100/80 p-3 transition hover:bg-blush-100"
              >
                <span className="flex-1">
                  <span className="block font-serif text-lg text-wine-700">Want to change something?</span>
                  <span className="block text-xs text-charcoal/60">Edit your look in the Decision Lab.</span>
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-wine-700 text-white">
                  <PencilLine className="h-4 w-4" />
                </span>
              </Link>
            </>
          ) : (
            bagCard
          )}
        </aside>
      </div>

      {hasLook && look && (
        <div className="fixed inset-x-3 bottom-24 z-30 lg:bottom-4 lg:left-[calc(16rem+1rem)] lg:right-4">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 rounded-3xl border border-white/80 bg-white/90 p-3 sm:gap-4 shadow-card backdrop-blur-md">
            <div className="hidden shrink-0 -space-x-3 sm:flex">
              {lookProducts.slice(0, 5).map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.image} alt="" className="h-12 w-12 rounded-xl border-2 border-white object-cover shadow-soft" />
              ))}
            </div>
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="text-sm text-charcoal/60">{lookProducts.length} items · {look.name}</p>
              <p className="truncate font-serif text-2xl text-wine-700">{money(totalPrice(lookProducts))}</p>
            </div>
            <p className="flex-1 font-serif text-2xl text-wine-700 sm:hidden">{money(totalPrice(lookProducts))}</p>
            <button className="btn-primary !px-5 !py-2.5" onClick={() => addToBag(lookProducts.map((p) => p.id))} disabled={lookInBag}>
              {lookInBag ? (
                <>
                  <Check className="h-5 w-5" /> All in Bag
                </>
              ) : (
                <>
                  Add All to Bag <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {editing && (
        <ProductPicker
          current={editing}
          side={mode === "original" ? "Original Look" : "Optimized Look"}
          onApply={swap}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
