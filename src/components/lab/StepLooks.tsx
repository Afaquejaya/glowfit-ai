"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowRight, BarChart3, Crown, Heart, RefreshCw, Sparkle, Wand2 } from "lucide-react";
import { useGlowStore } from "@/store/glowfit";
import { BASE_LOOKS, type LookId } from "@/lib/looks";
import { labelOccasion, scoreLook, type LookScore } from "@/lib/scoring";
import { money } from "@/lib/catalog";
import { useMakeupRender } from "@/lib/useMakeupRender";
import { deleteRenders } from "@/lib/renderCache";
import { LabHeader, LookImage, MetricBar, RenderCounter } from "./shared";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Step 2: the 3 looks. The only place (with Fine-tune) that calls the YouCam API: one render per look.
export function StepLooks() {
  const { moment, looksGenerated, lookImages } = useGlowStore((s) => s.lab);
  const skin = useGlowStore((s) => s.skin);
  const updateLab = useGlowStore((s) => s.updateLab);
  const render = useMakeupRender();
  const [busy, setBusy] = useState<Partial<Record<LookId, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [open, setOpen] = useState<LookId | null>(null);

  const scores = useMemo(() => {
    const out = {} as Record<LookId, LookScore>;
    BASE_LOOKS.forEach((l) => (out[l.id] = scoreLook(l.id, l.recipe, moment, skin)));
    return out;
  }, [moment, skin]);
  const recommended = BASE_LOOKS.reduce((a, b) => (scores[b.id].total > scores[a.id].total ? b : a)).id;
  const anyBusy = Object.values(busy).some(Boolean);
  const [genTotal, setGenTotal] = useState(0);
  const genDone = genTotal - Object.values(busy).filter(Boolean).length;

  const generate = async () => {
    setError(null);
    const todo = BASE_LOOKS.filter((l) => !lookImages[l.id]);
    setBusy(Object.fromEntries(todo.map((l) => [l.id, true])));
    setGenTotal(todo.length);
    const results = await Promise.allSettled(
      todo.map(async (l) => {
        const { key } = await render(l.recipe, l.id);
        const current = useGlowStore.getState().lab.lookImages;
        updateLab({ lookImages: { ...current, [l.id]: key } });
        setBusy((b) => ({ ...b, [l.id]: false }));
      }),
    );
    setBusy({});
    const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    if (failed) setError(`${(failed.reason as Error).message} Looks that worked are kept; click Generate again to retry only the missing ones.`);
    else updateLab({ looksGenerated: true });
  };

  const regenerate = async () => {
    if (!window.confirm("Regenerate all 3 looks? This uses 3 new try-on renders.")) return;
    await deleteRenders(Object.values(lookImages).filter((k): k is string => !!k && !k.startsWith("demo:")));
    updateLab({ lookImages: {}, looksGenerated: false });
  };

  const choose = (id: LookId) => {
    const look = BASE_LOOKS.find((l) => l.id === id)!;
    updateLab({
      chosenLook: id,
      currentRecipe: look.recipe,
      currentImage: lookImages[id] ?? null,
      history: [],
      priceMode: "original",
      step: 3,
    });
  };

  const missing = BASE_LOOKS.filter((l) => !lookImages[l.id]).length;

  return (
    <>
      <LabHeader
        eyebrow="AI Beauty Decision Engine"
        apis={["makeup"]}
        title="Three Looks. One Confident Choice."
        subtitle="GlowFit doesn't just recommend a look. It lets you see, compare and understand the trade-offs."
        right={
          <button
            onClick={() => updateLab({ step: 1 })}
            className="flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm shadow-soft"
          >
            {labelOccasion(moment.occasion)} · {cap(moment.time)} · {cap(moment.style)} · {money(moment.budget)}
            <ArrowRight className="h-4 w-4 text-rose-500" />
          </button>
        }
      />

      {missing > 0 && (
        <div className="card mb-5 flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-serif text-2xl text-wine-700">See all 3 looks on your own face</p>
            <p className="text-sm text-charcoal/65">
              YouCam Virtual Try-On renders each look on your selfie. This uses {missing} try-on render{missing > 1 ? "s" : ""}, once.
              Results are saved, so coming back is free.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button className="btn-primary whitespace-nowrap" onClick={generate} disabled={anyBusy}>
              <Wand2 className="h-5 w-5" /> {anyBusy ? "Rendering…" : `Generate My ${missing === 3 ? "3 " : ""}Looks`}
            </button>
            <RenderCounter />
          </div>
        </div>
      )}
      {anyBusy && (
        <div className="card mb-5 p-4" role="status" aria-live="polite">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-serif text-lg text-wine-700">Rendering your looks on your face</span>
            <span className="text-charcoal/60">
              {genDone} of {genTotal} ready
            </span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-blush-200">
            <div className="h-full rounded-full bg-rose-500 transition-all duration-500" style={{ width: `${Math.max(8, (genDone / Math.max(1, genTotal)) * 100)}%` }} />
            <span className="absolute inset-y-0 left-0 w-1/4 animate-shimmer rounded-full bg-white/60" />
          </div>
        </div>
      )}
      {error && <p className="mb-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        {BASE_LOOKS.map((l) => {
          const s = scores[l.id];
          const isRec = l.id === recommended;
          const rendered = !!lookImages[l.id];
          return (
            <article
              key={l.id}
              className={clsx("card flex flex-col overflow-hidden p-0", isRec && "ring-2 ring-rose-400 lg:-translate-y-1")}
            >
              <LookImage imageKey={lookImages[l.id]} alt={l.name} loading={busy[l.id]} className="m-1.5 h-72 rounded-[22px]">
                <span className="absolute left-4 top-4 text-sm tracking-[0.2em] text-white drop-shadow">LOOK {l.index}</span>
                {isRec && (
                  <span className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-wine-700">
                    <Crown className="h-3.5 w-3.5 text-amber-500" /> AI RECOMMENDED
                  </span>
                )}
                <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
                  <Heart className="h-4 w-4 fill-wine-700 text-wine-700" />
                </span>
                <span className="absolute bottom-3 right-4 max-w-[45%] text-right font-script text-2xl leading-6 text-white drop-shadow">
                  {l.script}
                </span>
                {!rendered && !busy[l.id] && (
                  <span className="absolute bottom-3 left-3 rounded-full bg-black/35 px-3 py-1 text-xs text-white backdrop-blur">
                    Not rendered yet
                  </span>
                )}
              </LookImage>

              <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
                <h3 className="font-serif text-3xl">{l.name}</h3>
                <p className="text-charcoal/65">{l.tagline}</p>
                <div className="mt-4 space-y-2.5">
                  <MetricBar label="Occasion Fit" value={s.occasionFit} />
                  <MetricBar label="Skin Compatibility" value={s.skinFit} />
                  <MetricBar label="Style Match" value={s.styleMatch} />
                  <div className="flex items-center justify-between pt-1 text-sm">
                    <span className="text-charcoal/80">Estimated Cost</span>
                    <span className="font-serif text-lg">{money(s.cost)}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-3 border-t border-blush-200 pt-3">
                  <Sparkle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                  <div className="text-sm">
                    <p className="text-wine-700">Why this look?</p>
                    <ul className="mt-0.5 space-y-0.5 text-charcoal/70">
                      {(open === l.id ? s.reasons : s.reasons.slice(0, 2)).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                    {s.reasons.length > 2 && (
                      <button onClick={() => setOpen(open === l.id ? null : l.id)} className="mt-1 text-xs text-rose-600 underline">
                        {open === l.id ? "Show less" : `+${s.reasons.length - 2} more reasons`}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
                  <button
                    className={clsx(isRec ? "btn-primary" : "btn-outline", "px-3 py-2.5 text-base")}
                    onClick={() => choose(l.id)}
                    disabled={!rendered}
                    title={rendered ? undefined : "Generate the looks first"}
                  >
                    Choose Look
                  </button>
                  <button className="btn-outline px-3 py-2.5 text-base" onClick={() => setCompare(true)}>
                    <BarChart3 className="h-4 w-4" /> Compare
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {compare && (
        <section className="card mt-5 overflow-x-auto p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-2xl text-wine-700">See the Difference</h3>
            <button onClick={() => setCompare(false)} className="text-sm text-charcoal/60 underline">
              Close
            </button>
          </div>
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-charcoal/60">
                <th className="py-2 font-normal" />
                {BASE_LOOKS.map((l) => (
                  <th key={l.id} className={clsx("py-2 font-serif text-lg font-normal", l.id === recommended && "text-wine-700")}>
                    {l.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Skin fit", "skinFit", "%"],
                  ["Occasion fit", "occasionFit", "%"],
                  ["Style match", "styleMatch", "%"],
                  ["Definition", "definition", ""],
                  ["Overall", "total", "%"],
                ] as const
              ).map(([label, k, unit]) => {
                const best = Math.max(...BASE_LOOKS.map((l) => scores[l.id][k]));
                return (
                  <tr key={k} className="border-t border-blush-200">
                    <td className="py-2 text-charcoal/70">{label}</td>
                    {BASE_LOOKS.map((l) => (
                      <td key={l.id} className={clsx("py-2", k !== "definition" && scores[l.id][k] === best && "font-semibold text-wine-700")}>
                        {scores[l.id][k]}
                        {unit}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr className="border-t border-blush-200">
                <td className="py-2 text-charcoal/70">Cost</td>
                {BASE_LOOKS.map((l) => (
                  <td key={l.id} className="py-2">
                    {money(scores[l.id].cost)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      )}

      <section className="card mt-5 p-5">
        <div className="grid items-center gap-4 lg:grid-cols-[200px_1fr]">
          <div>
            <p className="font-serif text-xl">Your GlowFit Journey</p>
            <p className="text-xs text-charcoal/55">From analysis to your final look</p>
          </div>
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            {["Analyze · your skin", "Generate · 3 looks", "Visualize · virtual try-on", "Compare · trade-offs", "Decide · choose & shop"].map(
              (t, i) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="font-serif text-wine-700">0{i + 1}</span>
                  <span className="text-charcoal/70">{t}</span>
                  {i < 4 && <ArrowRight className="h-3.5 w-3.5 text-rose-400" />}
                </li>
              ),
            )}
          </ol>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button className="btn-primary text-base" onClick={() => setCompare(true)}>
            Compare These Looks <ArrowRight className="h-5 w-5" />
          </button>
          <button className="btn-outline text-base" onClick={regenerate} disabled={anyBusy || missing === 3}>
            <RefreshCw className="h-4 w-4" /> Regenerate Looks
          </button>
        </div>
        <p className="mt-3 text-right text-xs text-charcoal/45">Powered by YouCam Skin AI + Virtual Try-On</p>
      </section>
    </>
  );
}
