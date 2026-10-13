"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowRight, Brush, Check, ChevronRight, Crown, Droplet, Eye, Info, Palette, RotateCcw, Scissors, Sparkle, Sparkles, Wand2 } from "lucide-react";
import { useGlowStore } from "@/store/glowfit";
import { CHANGE_KINDS, CHANGE_OPTIONS, currentOption, exampleImage, getBaseLook, labProducts, totalPrice, type ChangeKind, type Recipe } from "@/lib/looks";
import { impactOf, labelOccasion, OCCASIONS, type Occasion } from "@/lib/scoring";
import { CATEGORIES, FACE_SHAPES, inCategory, matchHair, type FaceShape, type HairCategory } from "@/lib/hairMatch";
import { money } from "@/lib/catalog";
import { useMakeupRender } from "@/lib/useMakeupRender";
import { stylesFor, useHairRender, useHairstyles, type HairStyle } from "@/lib/useHairRender";
import { CompareSlider, LabHeader, LookImage, RenderCounter, useResolvedImage } from "./shared";

const KIND_ICON: Record<ChangeKind, typeof Droplet> = {
  foundation: Droplet,
  lip: Brush,
  blush: Palette,
  eyes: Eye,
  brows: Sparkles,
  finish: Sparkle,
};
const ORIGINAL_HAIR: HairStyle = { id: "original", title: "Your Own Hair", thumb: null, gender: "any" };

/** The recipe without a hairstyle: what Makeup VTO renders before hair is added. */
function stripHair(r: Recipe): Recipe {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hair, ...rest } = r;
  return rest;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function why(kind: ChangeKind, label: string, d: { harmony: number; occasion: number; contrast: number }) {
  const parts: string[] = [];
  if (d.contrast > 3) parts.push("adds contrast and a stronger look");
  else if (d.contrast < -3) parts.push("softens the look");
  if (d.occasion > 0) parts.push("fits your moment better");
  else if (d.occasion < 0) parts.push("moves a little away from your moment");
  if (d.harmony > 0) parts.push("works better with your skin");
  else if (d.harmony < 0) parts.push("works slightly less with your skin profile");
  const what = `${CHANGE_OPTIONS[kind].label} → ${label}`;
  return parts.length ? `${what} ${parts.join(", ")}.` : `${what} keeps the overall balance of your look.`;
}

// Step 4: change ONE thing. Impact is calculated instantly for free; a render (1 unit) runs only on "Preview".
export function StepFineTune() {
  const lab = useGlowStore((s) => s.lab);
  const skin = useGlowStore((s) => s.skin);
  const updateLab = useGlowStore((s) => s.updateLab);
  const render = useMakeupRender();
  const hairRender = useHairRender();
  const hair = useHairstyles();
  const [kind, setKind] = useState<ChangeKind>("lip");
  const [hairMode, setHairMode] = useState(false);
  const [hairPick, setHairPick] = useState<HairStyle | null>(null);
  const [hairDemo, setHairDemo] = useState(false);
  const [optionId, setOptionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ recipe: Recipe; key: string; label: string } | null>(null);
  // The last change the user applied, so the slider can keep comparing it after Apply.
  const [applied, setApplied] = useState<{ before: string | null; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Glow Assistant can send the user here with a change already picked.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("glowfit-tune");
      if (!raw) return;
      sessionStorage.removeItem("glowfit-tune");
      const t = JSON.parse(raw) as { kind?: string; optionId?: string | null };
      if (t.kind === "hair") return setHairMode(true);
      if (t.kind && t.kind in CHANGE_OPTIONS) {
        setHairMode(false);
        setKind(t.kind as ChangeKind);
        setOptionId(t.optionId ?? null);
      }
    } catch {
      /* no preset */
    }
  }, []);

  const beforeSrc = useResolvedImage(lab.currentImage);
  const afterSrc = useResolvedImage(preview?.key);
  const appliedBeforeSrc = useResolvedImage(applied?.before);

  const look = lab.chosenLook ? getBaseLook(lab.chosenLook) : null;
  const current = lab.currentRecipe;
  const option = CHANGE_OPTIONS[kind].options.find((o) => o.id === optionId) ?? null;
  const nowOption = current ? currentOption(kind, current) : null;
  const candidate = useMemo(() => {
    if (!current) return null;
    if (hairMode) {
      if (!hairPick) return null;
      return hairPick.id === ORIGINAL_HAIR.id ? stripHair(current) : { ...stripHair(current), hair: { id: hairPick.id, title: hairPick.title } };
    }
    return option ? option.apply(current) : null;
  }, [current, option, hairMode, hairPick]);
  if (!look || !current) return null;

  const price = (r: Recipe) => totalPrice(labProducts(look, r, lab.priceMode, lab.picks));
  const impact = candidate && !hairMode ? impactOf(look.id, current, candidate, lab.moment, skin) : null;
  const costDelta = candidate ? price(candidate) - price(current) : 0;
  const previewMatches = !!preview && !!candidate && JSON.stringify(preview.recipe) === JSON.stringify(candidate);
  const pickLabel = hairMode ? hairPick?.title : option?.label;
  const styleFor = (h: { id: string; title: string }): HairStyle =>
    hair.styles.find((s) => s.id === h.id) ?? { ...h, thumb: null, gender: "any" };
  const sub = `${labelOccasion(lab.moment.occasion)} · ${cap(lab.moment.time)}`;

  const runPreview = async () => {
    if (!candidate || (!option && !hairMode)) return;
    setBusy(true);
    setError(null);
    setHairDemo(false);
    try {
      const demoKey = !hairMode && (kind === "lip" || kind === "blush") ? "change" : lab.chosenLook!;
      // Makeup is always rendered on the selfie first (cached, so repeats are free), then the hairstyle on top.
      // With no hairstyle yet, the current image already is the makeup-only render, so reuse it.
      const makeupKey =
        hairMode && !current.hair && lab.currentImage ? lab.currentImage : (await render(stripHair(candidate), demoKey)).key;
      let key = makeupKey;
      if (candidate.hair) {
        const done = await hairRender(makeupKey, styleFor(candidate.hair));
        key = done.key;
        setHairDemo(done.demo);
      }
      setPreview({ recipe: candidate, key, label: pickLabel ?? "new" });
      setApplied(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!preview) return;
    updateLab({
      history: [...lab.history, { recipe: current, image: lab.currentImage }],
      currentRecipe: preview.recipe,
      currentImage: preview.key,
    });
    setApplied({ before: lab.currentImage, label: preview.label });
    setPreview(null);
    setOptionId(null);
    setHairPick(null);
  };

  const undo = () => {
    setApplied(null);
    if (preview) {
      setPreview(null);
      setOptionId(null);
      setHairPick(null);
      return;
    }
    const last = lab.history[lab.history.length - 1];
    if (last) updateLab({ currentRecipe: last.recipe, currentImage: last.image, history: lab.history.slice(0, -1) });
  };

  return (
    <>
      <LabHeader
        eyebrow="Decision Lab · Experiment"
        apis={["makeup", "hair"]}
        title="Change One Thing."
        subtitle="See how one small change affects your final look."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px_minmax(0,1fr)]">
        <article className="card h-fit overflow-hidden p-0">
          <LookImage imageKey={lab.currentImage} alt="Current look" className="m-1.5 h-72 rounded-[22px] sm:h-96">
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-1.5 text-xs tracking-[0.18em] text-wine-700">CURRENT LOOK</span>
          </LookImage>
          <div className="flex items-end justify-between px-5 pb-5 pt-2">
            <div>
              <p className="font-serif text-3xl text-wine-700">{look.name}</p>
              <p className="text-charcoal/60">{sub}</p>
            </div>
            <p className="font-serif text-3xl text-wine-700">{money(price(current))}</p>
          </div>
        </article>

        <div className="card flex flex-col p-5">
          <h3 className="mb-3 font-serif text-2xl">What would you like to change?</h3>
          <div className="flex flex-wrap gap-2">
            {CHANGE_KINDS.map((k) => {
              const Icon = KIND_ICON[k];
              return (
                <button
                  key={k}
                  onClick={() => {
                    setKind(k);
                    setOptionId(null);
                    setHairMode(false);
                  }}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition",
                    k === kind && !hairMode ? "border-rose-400 bg-blush-100 text-wine-700" : "border-blush-200 bg-white/70 hover:bg-blush-50",
                  )}
                >
                  <Icon className="h-4 w-4 text-rose-500" strokeWidth={1.6} /> {CHANGE_OPTIONS[k].label}
                </button>
              );
            })}
            <button
              onClick={() => {
                setHairMode(true);
                setOptionId(null);
              }}
              className={clsx(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition",
                hairMode ? "border-rose-400 bg-blush-100 text-wine-700" : "border-blush-200 bg-white/70 hover:bg-blush-50",
              )}
            >
              <Scissors className="h-4 w-4 text-rose-500" strokeWidth={1.6} /> Hairstyle
              <span className="rounded-full bg-rose-500 px-1.5 text-[9px] uppercase tracking-wide text-white">New</span>
            </button>
          </div>

          {hairMode ? (
            <HairPicker
              styles={hair.styles}
              loading={hair.loading}
              reason={hair.reason}
              error={hair.error}
              onRetry={hair.retry}
              current={current.hair?.id ?? null}
              picked={hairPick?.id ?? null}
              onPick={setHairPick}
            />
          ) : (
          <>

          <p className="mb-2 mt-5 font-serif text-wine-700">Choose a new {CHANGE_OPTIONS[kind].label.toLowerCase()}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-3">
            {CHANGE_OPTIONS[kind].options.map((o) => {
              const same = JSON.stringify(o.apply(current)) === JSON.stringify(current);
              const active = o.id === optionId;
              return (
                <button
                  key={o.id}
                  disabled={same}
                  onClick={() => setOptionId(o.id)}
                  className={clsx(
                    "relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border p-1 pb-2 text-xs transition",
                    active ? "border-rose-400 bg-blush-100 ring-2 ring-rose-400/30" : "border-blush-200 bg-white/70 hover:bg-blush-50",
                    same && "cursor-default",
                  )}
                  title={same ? "This is your current choice" : `See ${o.label}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={exampleImage(kind, o.id)} alt={`${o.label} example`} className={clsx("aspect-[4/3] w-full rounded-xl object-cover", kind === "brows" && "object-top")} loading="lazy" />
                  {same && (
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-1.5 text-[9px] uppercase tracking-wide text-charcoal/60">Current</span>
                  )}
                  {o.label}
                  {active && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-wine-700 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          </>
          )}

          {!hairMode && (
          <div className="mt-5 rounded-2xl bg-blush-50 p-3">
            <p className="mb-2 flex items-center gap-1.5 font-serif text-wine-700">
              <Sparkle className="h-4 w-4" /> AI Impact
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {(
                [
                  ["Face Harmony", impact ? signed(impact.harmony) : "–"],
                  ["Occasion Fit", impact ? signed(impact.occasion) : "–"],
                  ["Contrast", impact ? signed(impact.contrast) : "–"],
                  ["Est. Cost", candidate ? `${costDelta >= 0 ? "+" : "-"}${money(Math.abs(costDelta))}` : "–"],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="rounded-xl bg-white/80 px-1 py-2">
                  <p className="text-[10px] text-charcoal/60">{label}</p>
                  <p
                    className={clsx(
                      "font-serif text-xl",
                      v === "–" ? "text-charcoal/40" : label === "Est. Cost" ? (v.startsWith("+") ? "text-rose-600" : "text-sage") : v.startsWith("-") ? "text-rose-600" : "text-sage",
                    )}
                  >
                    {v}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-charcoal/70">
              <span className="text-wine-700">Why? </span>
              {impact && option ? why(kind, option.label, impact) : "Pick a swatch to see the impact before you spend a render."}
            </p>
          </div>
          )}

          {error && <p className="mt-3 rounded-xl bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
          <button
            className="btn-primary mt-4 w-full text-base"
            onClick={runPreview}
            disabled={!candidate || busy || previewMatches || (hairMode && hair.styles.length === 0)}
          >
            <Wand2 className="h-5 w-5" /> {busy ? "Rendering…" : previewMatches ? "Preview ready" : hairMode ? "Try This Hairstyle" : "Preview on My Face"}
          </button>
          <p className="mt-2 text-center text-[11px] text-charcoal/50">
            {hairMode || current.hair
              ? "Hairstyle try-on uses 2 render units (free if you tried it before)"
              : "Uses 1 try-on render (free if you previewed it before)"}
          </p>
        </div>

        <article className="card h-fit overflow-hidden p-0">
          <LookImage imageKey={preview?.key ?? lab.currentImage} alt="Updated look" loading={busy} className="m-1.5 h-72 rounded-[22px] sm:h-96">
            <span className="absolute left-4 top-4 rounded-full bg-blush-100/95 px-4 py-1.5 text-xs tracking-[0.18em] text-wine-700">UPDATED LOOK</span>
            <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs text-wine-700">
              <Crown className="h-3.5 w-3.5" /> AI PREVIEW
            </span>
            {!preview && !busy && (
              <span className="absolute inset-x-6 bottom-6 rounded-2xl bg-white/85 p-3 text-center text-sm text-charcoal/70 backdrop-blur">
                {hairMode ? (
                  <>
                    Pick a hairstyle, then click <b>Try This Hairstyle</b>.
                  </>
                ) : (
                  <>
                    Pick a change, then click <b>Preview on My Face</b>.
                  </>
                )}
              </span>
            )}
            {preview && hairDemo && !busy && (
              <span className="absolute inset-x-6 bottom-6 rounded-2xl bg-white/90 p-3 text-center text-xs text-charcoal/70 backdrop-blur">
                Sample mode: hairstyles are drawn on your face only with a YouCam API key.
              </span>
            )}
          </LookImage>
          <div className="flex items-end justify-between px-5 pb-5 pt-2">
            <div>
              <p className="font-serif text-3xl text-wine-700">{look.name}</p>
              <p className="text-charcoal/60">{sub}</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-3xl text-wine-700">{money(price(preview?.recipe ?? candidate ?? current))}</p>
              {candidate && costDelta !== 0 && (
                <p className="text-sm text-charcoal/55">
                  ({costDelta > 0 ? "+" : "-"}
                  {money(Math.abs(costDelta))})
                </p>
              )}
            </div>
          </div>
        </article>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-4">
          <p className="mb-2 font-serif text-lg">
            Before vs After {hairMode ? (hairPick ? "· Hairstyle Change" : "") : option ? `· ${CHANGE_OPTIONS[kind].label} Change` : ""}
          </p>
          {beforeSrc && afterSrc && preview ? (
            <CompareSlider before={beforeSrc} after={afterSrc} labels={["Before", `After (${preview.label})`]} natural focus="object-center" />
          ) : applied && appliedBeforeSrc && beforeSrc && !hairPick && !option ? (
            <>
              <CompareSlider before={appliedBeforeSrc} after={beforeSrc} labels={["Before", `After (${applied.label})`]} natural focus="object-center" />
              <p className="mt-2 text-xs text-charcoal/55">Applied. Drag the slider to compare, or pick another change.</p>
            </>
          ) : hairMode && hairPick && beforeSrc ? (
            <>
              {hairPick.thumb ? (
                <CompareSlider
                  before={beforeSrc}
                  after={hairPick.thumb}
                  labels={[`Now (${current.hair?.title ?? "your hair"})`, `Style (${hairPick.title})`]}
                  natural
                  focus="object-top"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={beforeSrc} alt="Your current look" className="mx-auto rounded-2xl object-contain" style={{ width: "min(100%, calc(72vh * 0.75))" }} />
              )}
              <p className="mt-2 text-xs text-charcoal/55">Drag to compare your look with the style. Click Try This Hairstyle to see it on your own photo.</p>
            </>
          ) : option && !hairMode ? (
            <>
              {nowOption ? (
                <CompareSlider
                  before={exampleImage(kind, nowOption.id)}
                  after={exampleImage(kind, option.id)}
                  labels={[`Before (${nowOption.label})`, `After (${option.label})`]}
                  natural
                  focus={kind === "brows" ? "object-top" : "object-center"}
                />
              ) : (
                <figure className="relative overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={exampleImage(kind, option.id)} alt={`${option.label} example`} className={clsx("h-56 w-full object-cover sm:h-64", kind === "brows" && "object-top")} />
                  <figcaption className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs text-wine-700">After ({option.label})</figcaption>
                </figure>
              )}
              <p className="mt-2 text-xs text-charcoal/55">Example look. Drag to compare, then click Preview on My Face to see it on your photo.</p>
            </>
          ) : (
            <div className="flex aspect-[16/7] items-center justify-center rounded-2xl bg-blush-100/70 text-sm text-charcoal/55">
              Pick an option to compare it with your current one.
            </div>
          )}
        </section>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-primary text-base" onClick={apply} disabled={!preview}>
              Apply Change <ArrowRight className="h-5 w-5" />
            </button>
            <button className="btn-outline text-base" onClick={undo} disabled={!preview && lab.history.length === 0}>
              <RotateCcw className="h-4 w-4" /> Undo
            </button>
          </div>
          <button
            onClick={() => updateLab({ step: 5 })}
            className="card flex items-center gap-4 p-4 text-left transition hover:bg-white"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush-100">
              <Check className="h-5 w-5 text-wine-700" />
            </span>
            <span className="flex-1">
              <span className="block font-serif text-lg text-wine-700">Happy with your look?</span>
              <span className="block text-sm text-charcoal/60">
                {lab.history.length ? `${lab.history.length} change${lab.history.length > 1 ? "s" : ""} applied. ` : ""}See your final decision.
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-wine-700" />
          </button>
          <div className="text-right">
            <RenderCounter />
          </div>
        </div>
      </div>
    </>
  );
}

const PAGE = 12; // styles shown before "Show more"

function HairPicker({
  styles,
  loading,
  reason,
  error,
  onRetry,
  current,
  picked,
  onPick,
}: {
  styles: HairStyle[];
  loading: boolean;
  reason: "demo" | "error" | null;
  error?: string;
  onRetry: () => void;
  current: string | null;
  picked: string | null;
  onPick: (s: HairStyle) => void;
}) {
  const gender = useGlowStore((s) => s.profile.hairGender ?? "women");
  const face = useGlowStore((s) => s.profile.faceShape ?? null);
  const moment = useGlowStore((s) => s.lab.moment);
  const setProfile = useGlowStore((s) => s.setProfile);
  const [occasion, setOccasion] = useState<Occasion>(moment.occasion);
  const [category, setCategory] = useState<HairCategory>("all");
  const [sort, setSort] = useState<"match" | "trending">("match");
  const [limit, setLimit] = useState(PAGE);

  const ranked = useMemo(() => {
    const ctx = { face, occasion, style: moment.style, occasionLabel: labelOccasion(occasion) };
    // stylesFor already orders by trend, so a stable sort keeps trending first among equal scores.
    const list = stylesFor(styles, gender).map((s) => ({ ...s, match: matchHair(s, ctx) }));
    return sort === "match" ? [...list].sort((a, b) => b.match.score - a.match.score) : list;
  }, [styles, gender, face, occasion, moment.style, sort]);
  const counts = { women: stylesFor(styles, "women").length, men: stylesFor(styles, "men").length };
  const cats = CATEGORIES[gender]
    .map((c) => ({ ...c, count: ranked.filter((s) => inCategory(s, c.id)).length }))
    .filter((c) => c.id === "all" || c.count > 0);
  const activeCategory = cats.some((c) => c.id === category) ? category : "all";
  const shown = ranked.filter((s) => inCategory(s, activeCategory));
  const topId = sort === "match" ? shown[0]?.id : undefined;
  const pickedStyle = ranked.find((s) => s.id === picked);

  const all: (HairStyle & { match?: { score: number; reasons: string[] } })[] = current ? [ORIGINAL_HAIR, ...shown] : shown;
  // Keep the chosen style visible even when it sits past the first page.
  const pickedAt = all.findIndex((s) => s.id === picked);
  const visible = all.slice(0, Math.max(limit, pickedAt + 1));
  const hidden = all.length - visible.length;
  const resetPage = () => setLimit(PAGE);

  return (
    <>
      <div className="mb-2 mt-5 flex items-center justify-between gap-2">
        <p className="font-serif text-wine-700">Choose a hairstyle</p>
        <div className="flex rounded-full bg-blush-100 p-0.5 text-xs" role="tablist" aria-label="Hairstyles for">
          {(["women", "men"] as const).map((g) => (
            <button
              key={g}
              role="tab"
              aria-selected={gender === g}
              onClick={() => {
                setProfile({ hairGender: g });
                setCategory("all");
                resetPage();
              }}
              className={clsx("rounded-full px-3 py-1 transition", gender === g ? "bg-wine-700 text-white" : "text-charcoal/60 hover:text-wine-700")}
            >
              {g === "women" ? "Women" : "Men"}
              {styles.length > 0 && <span className="ml-1 opacity-70">{counts[g]}</span>}
            </button>
          ))}
        </div>
      </div>

      {styles.length > 0 && (
        <div className="mb-3 space-y-2.5 overflow-hidden rounded-2xl bg-white/60 p-3 ring-1 ring-blush-200">
          <FilterRow label="Face shape">
            <Chip on={face === null} onClick={() => (setProfile({ faceShape: null }), resetPage())} title="We'll rank by occasion and style only">
              Not sure
            </Chip>
            {FACE_SHAPES.map((f) => (
              <Chip key={f.id} on={face === f.id} onClick={() => (setProfile({ faceShape: f.id as FaceShape }), resetPage())} title={f.hint}>
                {f.label}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Occasion">
            {OCCASIONS.map((o) => (
              <Chip key={o.id} on={occasion === o.id} onClick={() => (setOccasion(o.id), resetPage())}>
                {o.label}
                {o.id === moment.occasion && <span className="ml-1 opacity-60">(yours)</span>}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Category">
            {cats.map((c) => (
              <Chip key={c.id} on={activeCategory === c.id} onClick={() => (setCategory(c.id), resetPage())}>
                {c.label}
                <span className="ml-1 opacity-60">{c.count}</span>
              </Chip>
            ))}
          </FilterRow>
          <div className="flex items-center justify-between gap-2 border-t border-blush-100 pt-2 text-xs">
            <span className="text-charcoal/60">
              Ranked for {face ? `a ${face} face, ` : ""}
              {labelOccasion(occasion).toLowerCase()} &amp; your {moment.style} style
            </span>
            <span className="flex shrink-0 rounded-full bg-blush-100 p-0.5" role="group" aria-label="Sort hairstyles">
              {(["match", "trending"] as const).map((k) => (
                <button
                  key={k}
                  aria-pressed={sort === k}
                  onClick={() => (setSort(k), resetPage())}
                  className={clsx("rounded-full px-2.5 py-0.5 transition", sort === k ? "bg-white text-wine-700 shadow-soft" : "text-charcoal/60")}
                >
                  {k === "match" ? "Best for you" : "Trending"}
                </button>
              ))}
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-blush-100" />
          ))}
        </div>
      ) : styles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rose-400/60 bg-white/60 p-4 text-sm text-charcoal/70">
          <p className="flex items-center gap-2 font-serif text-lg text-wine-700">
            <Scissors className="h-4 w-4" /> Real hairstyles come from YouCam
          </p>
          {reason === "demo" ? (
            <p className="mt-1">Add your YouCam API key in .env.local and restart the app to load YouCam&apos;s hairstyle collection.</p>
          ) : (
            <>
              <p className="mt-1">We couldn&apos;t load the hairstyle list{error ? ` (${error})` : ""}. Check your API key and credits, then try again.</p>
              <button onClick={onRetry} className="btn-outline mt-3 !px-4 !py-2 !text-sm">
                <RotateCcw className="h-4 w-4" /> Try again
              </button>
            </>
          )}
        </div>
      ) : ranked.length === 0 ? (
        <p className="rounded-2xl bg-blush-50 p-4 text-sm text-charcoal/70">
          YouCam has no {gender === "men" ? "men's" : "women's"} styles in this collection yet. Switch to {gender === "men" ? "Women" : "Men"} to see the rest.
        </p>
      ) : (
        <>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-3">
          {visible.map((s) => {
            const isCurrent = current !== null && s.id === current;
            const active = s.id === picked;
            return (
              <button
                key={s.id}
                disabled={isCurrent}
                onClick={() => onPick(s)}
                title={isCurrent ? "This is your current hairstyle" : `Try ${s.title}`}
                className={clsx(
                  "relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border p-1 pb-2 text-xs transition",
                  active ? "border-rose-400 bg-blush-100 ring-2 ring-rose-400/30" : "border-blush-200 bg-white/70 hover:bg-blush-50",
                  isCurrent && "cursor-default",
                )}
              >
                {/* Fixed-ratio frame so the photo can never collapse, whatever size YouCam's thumbnail is. */}
                <span className="relative block w-full overflow-hidden rounded-xl bg-blush-100" style={{ paddingTop: "125%" }}>
                  {s.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.thumb} alt={`${s.title} hairstyle`} className="absolute inset-0 h-full w-full object-cover object-top" loading="lazy" />
                  ) : (
                    <Scissors className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-rose-400" strokeWidth={1.4} />
                  )}
                  {s.match && (
                    <span
                      className={clsx(
                        "absolute bottom-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium shadow-soft",
                        s.match.score >= 85 ? "bg-wine-700 text-white" : "bg-white/90 text-wine-700",
                      )}
                    >
                      {s.match.score}% match
                    </span>
                  )}
                </span>
                <span className="line-clamp-2 min-h-[2rem] px-1 text-center leading-tight">{s.title}</span>
                {s.id === topId && !isCurrent ? (
                  <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-1.5 text-[9px] uppercase tracking-wide text-white">Best match</span>
                ) : (
                  s.hot &&
                  !isCurrent && (
                    <span className="absolute left-2 top-2 rounded-full bg-wine-700/90 px-1.5 text-[9px] uppercase tracking-wide text-white">Trending</span>
                  )
                )}
                {isCurrent && (
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-1.5 text-[9px] uppercase tracking-wide text-charcoal/60">Current</span>
                )}
                {active && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-wine-700 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {shown.length === 0 && (
          <p className="mt-2 rounded-2xl bg-blush-50 p-3 text-sm text-charcoal/70">No styles in this category. Pick another category above.</p>
        )}
        {(hidden > 0 || visible.length > PAGE) && (
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-charcoal/60">
            <span>
              Showing {visible.length} of {all.length}
            </span>
            <span className="flex gap-2">
              {visible.length > PAGE && (
                <button onClick={() => setLimit(PAGE)} className="rounded-full px-3 py-1.5 text-charcoal/60 hover:text-wine-700">
                  Show less
                </button>
              )}
              {hidden > 0 && (
                <button onClick={() => setLimit((n) => n + PAGE)} className="btn-outline !px-4 !py-1.5 !text-sm">
                  Show {Math.min(PAGE, hidden)} more
                </button>
              )}
            </span>
          </div>
        )}
        </>
      )}
      {pickedStyle && pickedStyle.match.reasons.length > 0 && (
        <div className="mt-3 rounded-2xl border border-rose-400/40 bg-blush-50 p-3 text-sm">
          <p className="flex items-center justify-between gap-2 font-serif text-wine-700">
            <span className="truncate">Why {pickedStyle.title} suits you</span>
            <span className="shrink-0 text-base">{pickedStyle.match.score}%</span>
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            {pickedStyle.match.reasons.map((r) => (
              <li
                key={r}
                className={clsx(
                  "flex items-center gap-1 rounded-full px-2 py-0.5",
                  r.startsWith("Less") ? "bg-white text-charcoal/60" : "bg-white text-wine-700",
                )}
              >
                {!r.startsWith("Less") && <Check className="h-3 w-3" />} {r}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 space-y-1.5 rounded-2xl bg-blush-50 p-3 text-xs text-charcoal/70">
        <p className="flex items-start gap-1.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
          Match % blends stylist rules for your face shape with your occasion and style. Your makeup, products and price stay the same; only your hair changes.
        </p>
        <p className="pl-5">Best results: a front-facing photo that shows your hair and shoulders.</p>
      </div>
    </>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-charcoal/50">{label}</p>
      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, title, children }: { on: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={on}
      className={clsx(
        "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition",
        on ? "bg-wine-700 text-white" : "bg-white text-charcoal/70 ring-1 ring-blush-200 hover:text-wine-700",
      )}
    >
      {children}
    </button>
  );
}
