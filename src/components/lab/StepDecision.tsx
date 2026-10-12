"use client";

import Link from "next/link";
import clsx from "clsx";
import { useState } from "react";
import { ArrowRight, Bookmark, Check, CheckCircle2, ChevronsLeftRight, Crown, Loader2, MoreHorizontal, PencilLine, Share2 } from "lucide-react";
import { useGlowStore, type SavedPerson } from "@/store/glowfit";
import { BASE_LOOKS, BROW_LABELS, describeRecipe, getBaseLook, labProducts, totalPrice } from "@/lib/looks";
import { labelOccasion, scoreLook } from "@/lib/scoring";
import { money } from "@/lib/catalog";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { hash } from "@/lib/renderCache";
import { thumbnail } from "@/lib/thumbnail";
import { shareLookCard } from "@/lib/lookCard";
import { CompareSlider, LabHeader, LookImage, ProductTile, useResolvedImage } from "./shared";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Step 5: the decision. Summarizes everything, no API calls.
export function StepDecision() {
  const lab = useGlowStore((s) => s.lab);
  const skin = useGlowStore((s) => s.skin);
  const updateLab = useGlowStore((s) => s.updateLab);
  const savedLooks = useGlowStore((s) => s.savedLooks);
  const saveLook = useGlowStore((s) => s.saveLook);
  const selfie = useGlowStore((s) => s.selfie);
  const profileName = useGlowStore((s) => s.profile.name);
  const finalSrc = useResolvedImage(lab.currentImage);
  const [compare, setCompare] = useState(false);
  const [card, setCard] = useState<"idle" | "busy" | "shared" | "downloaded" | "error">("idle");
  if (!lab.chosenLook || !lab.currentRecipe) return null;

  const look = getBaseLook(lab.chosenLook);
  const recipe = lab.currentRecipe;
  const score = scoreLook(look.id, recipe, lab.moment, skin);
  const products = labProducts(look, recipe, lab.priceMode, lab.picks);
  const total = totalPrice(products);
  const names = describeRecipe(recipe);
  const level = score.total >= 85 ? "HIGH" : score.total >= 72 ? "GOOD" : "FAIR";
  const checks = [
    [score.skinFit >= 85 ? "Strong skin compatibility" : "Good skin compatibility", score.skinFit >= 75],
    [score.occasionFit >= 85 ? "Strong occasion match" : "Good occasion match", score.occasionFit >= 75],
    [score.styleMatch >= 85 ? "Strong style match" : "Good style match", score.styleMatch >= 75],
    ["Virtual try-on verified", !!lab.currentImage],
  ] as const;
  const tiles = products.filter((p) => ["foundation", "lip", "blush", "eyes"].includes(p.category));
  const tileSub: Record<string, string> = {
    foundation: `${cap(recipe.foundation.finish)} finish`,
    lip: names.lip,
    blush: names.blush,
    eyes: names.eyes,
  };
  // Same look, shade choices and product picks always get the same id, so saving twice never duplicates.
  const savedId = `look-${hash(JSON.stringify([look.id, recipe, lab.priceMode, lab.picks[lab.priceMode], lab.currentImage]))}`;
  const isSaved = savedLooks.some((l) => l.id === savedId);
  const save = async () => {
    // Keep a small copy of the selfie and the scan, so this person's skin profile survives a new selfie.
    let person: SavedPerson | undefined;
    if (selfie && skin) {
      const id = `p-${hash(selfie.dataUrl)}`;
      const known = savedLooks.find((l) => l.person?.id === id)?.person;
      const photo = known?.photo ?? (await thumbnail(selfie.dataUrl).catch(() => null));
      if (photo) person = { id, name: known?.name ?? profileName.trim(), photo, skin };
    }
    saveLook({
      id: savedId,
      lookId: look.id,
      recipe,
      imageKey: lab.currentImage,
      moment: lab.moment,
      priceMode: lab.priceMode,
      picks: lab.picks[lab.priceMode],
      productIds: products.map((p) => p.id),
      total,
      score: score.total,
      savedAt: new Date().toISOString(),
      person,
    });
    updateLab({ savedAt: new Date().toISOString() });
  };
  const others = BASE_LOOKS.filter((l) => lab.lookImages[l.id]);

  return (
    <>
      <LabHeader
        eyebrow="Your Decision"
        title="This Is Your Look."
        subtitle={`Everything you need for your ${labelOccasion(lab.moment.occasion).toLowerCase()} moment, in one place.`}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_120px_1.05fr]">
        <div className="relative">
          {compare && finalSrc && selfie ? (
            <CompareSlider
              before={selfie.dataUrl}
              after={finalSrc}
              labels={["Before", "After"]}
              className="card h-[420px] rounded-3xl p-0 sm:h-[560px]"
              focus="object-[50%_35%]"
            />
          ) : (
            <LookImage imageKey={lab.currentImage} alt="Final look" className="card h-[420px] p-0 sm:h-[560px]">
              <span className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-blush-100/95 px-4 py-2 text-wine-700">
                <Check className="h-4 w-4" /> Final Selection
              </span>
            </LookImage>
          )}
          {finalSrc && selfie && (
            <button
              onClick={() => setCompare((c) => !c)}
              aria-pressed={compare}
              className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-sm text-wine-700 shadow-soft hover:bg-white"
            >
              <ChevronsLeftRight className="h-4 w-4" /> {compare ? "Show final look" : "Before / After"}
            </button>
          )}
        </div>

        <div className="flex gap-3 overflow-x-auto xl:flex-col">
          {[{ id: "final", key: lab.currentImage, label: "Final" }, ...others.map((l) => ({ id: l.id, key: lab.lookImages[l.id]!, label: l.name }))].map(
            (t, i) => (
              <LookImage
                key={t.id}
                imageKey={t.key}
                alt={t.label}
                className={clsx("h-28 w-24 shrink-0 rounded-2xl xl:h-32 xl:w-full", i === 0 && "ring-2 ring-rose-400")}
              />
            ),
          )}
        </div>

        <section className="card p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-serif text-5xl text-wine-700">{look.name}</h2>
              <p className="font-serif text-xl text-charcoal/60">
                {labelOccasion(lab.moment.occasion)} · {cap(lab.moment.time)}
              </p>
              {recipe.hair && <p className="mt-1 text-sm text-charcoal/60">Hairstyle: {recipe.hair.title}</p>}
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-blush-200">
              <MoreHorizontal className="h-5 w-5 text-charcoal/50" />
            </span>
          </div>

          <div className="mt-5 grid gap-4 rounded-2xl border border-blush-200 bg-white/60 p-4 sm:grid-cols-[auto_1fr]">
            <div className="flex items-center gap-3">
              <ScoreRing value={score.total} size={92} stroke={9}>
                <span className="font-serif text-2xl">{score.total}</span>
              </ScoreRing>
              <span className="text-center text-sage">
                <Crown className="mx-auto h-6 w-6" />
                <span className="text-xs font-semibold tracking-wide">{level} CONFIDENCE</span>
              </span>
            </div>
            <ul className="space-y-1.5 border-blush-200 text-sm sm:border-l sm:pl-4">
              {checks.map(([t, ok]) => (
                <li key={t} className={clsx("flex items-center gap-2", !ok && "text-charcoal/45")}>
                  <CheckCircle2 className={clsx("h-4 w-4", ok ? "text-sage" : "text-charcoal/30")} /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-3 mt-5 flex items-center justify-between">
            <h3 className="font-serif text-2xl text-wine-700">Your Final Look</h3>
            <button onClick={() => updateLab({ step: 4 })} className="flex items-center gap-1 text-sm text-rose-600">
              Edit Look <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {tiles.map((p) => (
              <ProductTile key={p.id} product={p} label={p.category === "lip" ? "Lip" : cap(p.category)} sub={tileSub[p.category]} />
            ))}
            <div className="flex min-w-0 flex-col">
              <div className="flex aspect-square items-center justify-center rounded-2xl border border-white/80 bg-blush-100 font-serif text-3xl text-wine-700 shadow-soft">
                ⌒
              </div>
              <p className="mt-1.5 truncate text-xs font-medium">Brows</p>
              <p className="truncate text-[11px] text-charcoal/55">{BROW_LABELS[recipe.brows.shape]}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-blush-100/70 p-4">
            <div>
              <p className="text-sm text-charcoal/70">Estimated Total {lab.priceMode === "optimized" && "· budget-optimized"}</p>
              <p className="font-serif text-4xl text-wine-700">{money(total)}</p>
            </div>
            <Link href="/products" className="btn-primary text-base">
              View Products <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {isSaved ? (
              <Link href="/looks" className="btn-outline whitespace-nowrap px-4 text-base">
                <Bookmark className="h-4 w-4 fill-wine-700" /> Saved · View Looks
              </Link>
            ) : (
              <button className="btn-outline whitespace-nowrap px-4 text-base" onClick={save}>
                <Bookmark className="h-4 w-4" /> Save This Look
              </button>
            )}
            <button className="btn-outline whitespace-nowrap px-4 text-base" onClick={() => updateLab({ step: 4 })}>
              <PencilLine className="h-4 w-4" /> Change Something
            </button>
            <button
              className="btn-outline col-span-2 whitespace-nowrap px-4 text-base"
              disabled={!finalSrc || card === "busy"}
              onClick={async () => {
                if (!finalSrc) return;
                setCard("busy");
                try {
                  const done = await shareLookCard({
                    image: finalSrc,
                    lookName: look.name,
                    occasion: `${labelOccasion(lab.moment.occasion)} · ${cap(lab.moment.time)}`,
                    score: score.total,
                    level,
                    products: tiles,
                    total,
                    skinScore: skin?.overall ?? null,
                  });
                  setCard(done);
                } catch {
                  setCard("error");
                }
              }}
            >
              {card === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              {card === "downloaded" ? "Look Card saved" : card === "shared" ? "Look Card shared" : card === "error" ? "Couldn't make the card, try again" : "Share My Look Card"}
            </button>
          </div>
        </section>
      </div>

      <section className="card mt-5 flex flex-col items-center gap-4 p-4 sm:flex-row">
        <div className="flex -space-x-3">
          {others.map((l) => (
            <LookImage key={l.id} imageKey={lab.lookImages[l.id]} alt={l.name} className="h-16 w-14 rounded-xl border-2 border-white" />
          ))}
        </div>
        <div className="flex-1">
          <p className="font-serif text-xl text-wine-700">Want to explore another direction?</p>
          <p className="text-sm text-charcoal/60">Compare different looks and see how small changes create a whole new vibe.</p>
        </div>
        <button onClick={() => updateLab({ step: 2 })} className="btn-outline whitespace-nowrap text-base">
          Compare Again <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </>
  );
}
