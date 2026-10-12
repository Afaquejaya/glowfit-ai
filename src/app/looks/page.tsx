"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Bookmark, CalendarHeart, FlaskConical, ScanFace, Scissors, ShoppingBag, Sparkles, Trash2 } from "lucide-react";
import { useGlowStore, type SavedLook, type SavedPerson } from "@/store/glowfit";
import { useRestoreLook } from "@/lib/useRestoreLook";
import { GlowLoader } from "@/components/ui/GlowLoader";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useResolvedImage } from "@/components/lab/shared";
import { PRODUCTS, money, type Product } from "@/lib/catalog";
import { BASE_LOOKS, describeRecipe, getBaseLook, type LookId } from "@/lib/looks";
import { labelOccasion } from "@/lib/scoring";
import { deleteRenders } from "@/lib/renderCache";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const DEMO_IMAGE: Record<LookId, string> = {
  "natural-glow": "/demo/looks/natural-glow.jpg",
  "soft-glam": "/demo/looks/soft-glam.jpg",
  "modern-bold": "/demo/looks/modern-bold.jpg",
};

function savedDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function LooksPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 450);
    return () => clearTimeout(t);
  }, []);

  const savedLooks = useGlowStore((s) => s.savedLooks);
  const removeSavedLook = useGlowStore((s) => s.removeSavedLook);
  const lab = useGlowStore((s) => s.lab);
  const restore = useRestoreLook();
  const [filter, setFilter] = useState<LookId | "all">("all");
  const [personFilter, setPersonFilter] = useState<string>("all");

  // Everyone who has a saved look, so looks can be filtered per person.
  const people = useMemo(() => {
    const map = new Map<string, SavedPerson & { count: number }>();
    for (const l of savedLooks) if (l.person) map.set(l.person.id, { ...l.person, count: (map.get(l.person.id)?.count ?? 0) + 1 });
    return [...map.values()];
  }, [savedLooks]);
  const shown = useMemo(
    () =>
      savedLooks.filter(
        (l) => (filter === "all" || l.lookId === filter) && (personFilter === "all" || l.person?.id === personFilter),
      ),
    [savedLooks, filter, personFilter],
  );
  const tried = BASE_LOOKS.filter((l) => lab.lookImages[l.id]);

  if (!ready) return <GlowLoader title="Opening your looks" messages={["Finding your saved looks", "Loading try-on images", "Adding up products"]} />;


  const remove = (s: SavedLook) => {
    if (!window.confirm(`Remove "${getBaseLook(s.lookId).name}" from your saved looks?`)) return;
    // Keep the image if the lab still uses it.
    const inUse = s.imageKey && (s.imageKey === lab.currentImage || Object.values(lab.lookImages).includes(s.imageKey));
    const shared = savedLooks.some((o) => o.id !== s.id && o.imageKey === s.imageKey);
    if (s.imageKey && !inUse && !shared && !s.imageKey.startsWith("demo:")) deleteRenders([s.imageKey]);
    removeSavedLook(s.id);
  };

  return (
    <div className="mx-auto max-w-6xl animate-fadeUp">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Your looks</p>
          <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">Your Saved Looks.</h1>
          <p className="mt-3 text-lg text-charcoal/65">Every look you saved, with its score, products and price. Open one to edit or shop it.</p>
        </div>
        <Link href="/decision-lab" className="btn-primary !text-base">
          <FlaskConical className="h-4 w-4" /> Create a New Look
        </Link>
      </div>

      {savedLooks.length > 0 ? (
        <>
          {people.length > 1 && (
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs uppercase tracking-[0.14em] text-charcoal/50">People</span>
              <button
                onClick={() => setPersonFilter("all")}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm transition",
                  personFilter === "all" ? "bg-wine-700 text-white" : "bg-white/70 text-charcoal/70 ring-1 ring-blush-200 hover:text-wine-700",
                )}
              >
                Everyone · {savedLooks.length}
              </button>
              {people.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersonFilter(p.id)}
                  className={clsx(
                    "flex items-center gap-2 rounded-full py-1 pl-1 pr-4 text-sm transition",
                    personFilter === p.id ? "bg-wine-700 text-white" : "bg-white/70 text-charcoal/70 ring-1 ring-blush-200 hover:text-wine-700",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                  {p.name || "Unnamed profile"} · {p.count}
                </button>
              ))}
            </div>
          )}
          <div className={clsx("flex flex-wrap gap-2", people.length > 1 ? "mt-3" : "mt-8")}>
            {(["all", ...BASE_LOOKS.map((l) => l.id)] as const).map((id) => {
              const count = id === "all" ? savedLooks.length : savedLooks.filter((l) => l.lookId === id).length;
              if (id !== "all" && count === 0) return null;
              return (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={clsx(
                    "rounded-full px-4 py-2 text-sm transition",
                    filter === id ? "bg-wine-700 text-white" : "bg-white/70 text-charcoal/70 ring-1 ring-blush-200 hover:text-wine-700",
                  )}
                >
                  {id === "all" ? "All" : getBaseLook(id).name} · {count}
                </button>
              );
            })}
          </div>

          <ul className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((s) => (
              <SavedCard key={s.id} look={s} onOpen={() => restore(s, "lab")} onShop={() => restore(s, "products")} onRemove={() => remove(s)} />
            ))}
          </ul>
        </>
      ) : (
        <section className="card mt-8 grid items-center gap-6 p-6 sm:p-8 md:grid-cols-[1fr_1.1fr]">
          <div>
            <Bookmark className="h-8 w-8 text-rose-500" strokeWidth={1.4} />
            <h2 className="mt-3 font-serif text-3xl">No saved looks yet</h2>
            <p className="mt-2 text-charcoal/65">
              Finish a look in the Decision Lab and tap <span className="text-wine-700">Save This Look</span> on the last step. It will appear here
              with your try-on photo, score and products.
            </p>
            <Link href="/decision-lab" className="btn-primary mt-6 !text-base">
              Open Decision Lab <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {BASE_LOOKS.map((l) => (
              <figure key={l.id} className="overflow-hidden rounded-2xl bg-blush-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={DEMO_IMAGE[l.id]} alt="" className="aspect-[3/4] w-full object-cover opacity-90" />
                <figcaption className="px-2 py-2 text-center font-serif text-sm">{l.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {tried.length > 0 && (
        <section className="card mt-8 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Tried in your current session</p>
              <p className="mt-1 text-sm text-charcoal/60">Looks generated from your latest selfie. Choose one in the Decision Lab to finish and save it.</p>
            </div>
            <Link href="/decision-lab" className="flex items-center gap-1 text-sm text-rose-600 hover:text-wine-700">
              Continue in Decision Lab <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:max-w-xl">
            {tried.map((l) => (
              <figure key={l.id}>
                <RenderedImage imageKey={lab.lookImages[l.id]} fallback={DEMO_IMAGE[l.id]} alt={l.name} className="aspect-[3/4] rounded-2xl" />
                <figcaption className="mt-1.5 text-center font-serif text-sm">{l.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SavedCard({ look, onOpen, onShop, onRemove }: { look: SavedLook; onOpen: () => void; onShop: () => void; onRemove: () => void }) {
  const base = getBaseLook(look.lookId);
  const names = describeRecipe(look.recipe);
  const products = look.productIds.map((id) => PRODUCTS.find((p) => p.id === id)).filter((p): p is Product => !!p);
  return (
    <li className="card flex flex-col overflow-hidden p-0">
      <div className="relative">
        <RenderedImage imageKey={look.imageKey} fallback={DEMO_IMAGE[look.lookId]} alt={base.name} className="aspect-[4/5]" />
        <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs text-wine-700 shadow-soft">
          <CalendarHeart className="h-3.5 w-3.5" /> {labelOccasion(look.moment.occasion)} · {cap(look.moment.time)}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-white/90 p-1 shadow-soft">
          <ScoreRing value={look.score} size={48} stroke={5}>
            <span className="font-serif text-sm">{look.score}</span>
          </ScoreRing>
        </span>
        {look.person && (
          <span className="absolute bottom-4 left-4 flex max-w-[70%] items-center gap-2 rounded-full bg-white/90 py-1 pl-1 pr-3 text-xs text-charcoal/75 shadow-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={look.person.photo} alt="" className="h-7 w-7 rounded-full object-cover" />
            <span className="truncate">{look.person.name || "Unnamed profile"}</span>
          </span>
        )}
        <button
          onClick={onRemove}
          aria-label="Remove saved look"
          className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-charcoal/60 shadow-soft hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl text-wine-700">{base.name}</h2>
          <span className="font-serif text-xl">{money(look.total)}</span>
        </div>
        <p className="mt-0.5 text-xs text-charcoal/50">
          Saved {savedDate(look.savedAt)} {look.priceMode === "optimized" && "· budget-optimized"}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {[
            [look.recipe.lip.hex, `${names.lip} lip`],
            [look.recipe.blush.hex, `${names.blush} blush`],
            [look.recipe.eyes.hex, `${names.eyes} eyes`],
          ].map(([hex, label]) => (
            <span key={label} className="flex items-center gap-1.5 rounded-full bg-blush-100 px-2.5 py-1 text-charcoal/70">
              <span className="h-3 w-3 rounded-full border border-white" style={{ background: hex }} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 rounded-full bg-blush-100 px-2.5 py-1 text-charcoal/70">
            <Sparkles className="h-3 w-3" /> {names.finish} finish
          </span>
          {look.recipe.hair && (
            <span className="flex items-center gap-1.5 rounded-full bg-blush-100 px-2.5 py-1 text-charcoal/70">
              <Scissors className="h-3 w-3" /> {look.recipe.hair.title}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex -space-x-2">
            {products.slice(0, 5).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.image} alt={p.name} title={p.name} className="h-10 w-10 rounded-full border-2 border-white bg-blush-50 object-cover" />
            ))}
          </div>
          <span className="text-xs text-charcoal/55">{products.length} products</span>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
          <Link href={`/profile?look=${encodeURIComponent(look.id)}#skin-profile`} className="btn-outline col-span-2 !px-3 !py-2.5 !text-sm">
            <ScanFace className="h-4 w-4" /> Your Skin Profile
          </Link>
          <button onClick={onOpen} className="btn-outline !px-3 !py-2.5 !text-sm">
            <FlaskConical className="h-4 w-4" /> Open Look
          </button>
          <button onClick={onShop} className="btn-primary !px-3 !py-2.5 !text-sm">
            <ShoppingBag className="h-4 w-4" /> Shop Products
          </button>
        </div>
      </div>
    </li>
  );
}

/** Shows a cached try-on image, or the look's sample photo if the cache was cleared. */
function RenderedImage({ imageKey, fallback, alt, className }: { imageKey: string | null | undefined; fallback: string; alt: string; className?: string }) {
  const src = useResolvedImage(imageKey);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    const t = setTimeout(() => setSettled(true), 600);
    return () => clearTimeout(t);
  }, [imageKey]);
  const shown = src ?? (settled ? fallback : null);
  return (
    <div className={clsx("relative overflow-hidden bg-gradient-to-br from-blush-100 to-champagne", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {shown && <img src={shown} alt={alt} className="h-full w-full object-cover" />}
    </div>
  );
}
