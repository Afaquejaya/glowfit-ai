import type { SkinResult } from "./skin";
import { getBaseLook, productsFor, totalPrice, type LookId, type Recipe } from "./looks";

// "Prove It" scoring: every percentage is computed from the user's real skin metrics,
// their moment and the look recipe, so the app can explain each number.

export type Occasion = "wedding" | "date-night" | "work" | "party" | "vacation" | "photoshoot" | "everyday";
export type TimeOfDay = "morning" | "afternoon" | "evening";
export type StylePref = "natural" | "elegant" | "glam" | "bold";

export type Moment = { occasion: Occasion; time: TimeOfDay; style: StylePref; budget: number };

export type LookScore = {
  occasionFit: number;
  skinFit: number;
  styleMatch: number;
  definition: number;
  contrast: number;
  total: number;
  cost: number;
  reasons: string[];
};

const OCCASION_TARGET: Record<Occasion, number> = {
  wedding: 60,
  "date-night": 55,
  work: 30,
  party: 80,
  vacation: 25,
  photoshoot: 75,
  everyday: 20,
};
const TIME_SHIFT: Record<TimeOfDay, number> = { morning: -10, afternoon: 0, evening: 12 };
const STYLE_TARGET: Record<StylePref, number> = { natural: 25, elegant: 55, glam: 75, bold: 90 };

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function luminance(hex: string) {
  const v = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** How much definition a recipe adds to the face, 0-100. */
export function definitionOf(r: Recipe) {
  const lipDepth = (1 - luminance(r.lip.hex)) * (r.lip.intensity / 100);
  const eyeDepth = (1 - luminance(r.eyes.hex)) * (r.eyes.intensity / 100);
  const raw = 0.42 * lipDepth * 1.6 + 0.28 * eyeDepth * 1.8 + 0.15 * (r.liner.intensity / 100) + 0.15 * (r.foundation.coverage / 100);
  const brow = r.brows.shape === "HighArch1" ? 4 : r.brows.shape === "Original2" ? -3 : 0;
  return Math.round(clamp(raw * 115 + brow));
}

/** Contrast between lip color and skin, 0-100. */
export function contrastOf(r: Recipe) {
  return Math.round(clamp((0.72 - luminance(r.lip.hex)) * 180 * (r.lip.intensity / 100) + 20));
}

function fit(value: number, target: number) {
  return Math.round(clamp(100 - Math.abs(value - target) * 0.9, 50, 98));
}

const metric = (skin: SkinResult | null, key: string, fallback = 75) =>
  skin?.metrics.find((m) => m.key === key)?.score ?? fallback;

export function scoreLook(lookId: LookId, recipe: Recipe, moment: Moment, skin: SkinResult | null): LookScore {
  const definition = definitionOf(recipe);
  const contrast = contrastOf(recipe);
  const reasons: string[] = [];

  // Occasion
  const occTarget = OCCASION_TARGET[moment.occasion] + TIME_SHIFT[moment.time];
  const occasionFit = fit(definition, occTarget);
  if (occasionFit >= 88) reasons.push(`Its definition suits a ${labelOccasion(moment.occasion).toLowerCase()} in the ${moment.time}.`);
  else if (definition < occTarget) reasons.push(`A little light for ${moment.time === "afternoon" ? "an afternoon" : moment.time === "evening" ? "an evening" : "a morning"} ${labelOccasion(moment.occasion).toLowerCase()}.`);
  else reasons.push(`More dramatic than a ${labelOccasion(moment.occasion).toLowerCase()} usually needs.`);

  // Skin (YouCam ui_score: higher is healthier)
  const oil = metric(skin, "oiliness");
  const pores = metric(skin, "pore");
  const hydration = metric(skin, "moisture");
  const redness = metric(skin, "redness");
  let skinFit = 82;
  const finish = recipe.foundation.finish;
  if (oil < 72) {
    skinFit += finish === "matte" ? 8 : finish === "natural" ? 4 : -9;
    reasons.push(finish === "dewy" ? "A dewy finish can look shiny on your T-zone." : "Its finish keeps your oilier T-zone balanced.");
  }
  if (hydration < 70 && finish === "matte") {
    skinFit -= 6;
    reasons.push("Matte may feel dry with your current hydration.");
  }
  if (pores < 72) skinFit += recipe.foundation.coverage >= 50 ? 5 : -3;
  if (redness < 68) {
    skinFit += recipe.foundation.coverage >= 50 ? 5 : -2;
    if (recipe.foundation.coverage >= 50) reasons.push("Medium coverage evens out visible redness.");
  }
  skinFit = Math.round(clamp(skinFit, 55, 98));

  // Style
  const styleMatch = fit(definition, STYLE_TARGET[moment.style]);
  if (styleMatch >= 88) reasons.push(`Matches your ${moment.style} style preference.`);

  // Cost
  const look = getBaseLook(lookId);
  const cost = totalPrice(productsFor(look, recipe, "original"));
  const overBudget = cost - moment.budget;

  let total = 0.4 * occasionFit + 0.35 * skinFit + 0.25 * styleMatch;
  if (overBudget > 0) total -= Math.min(4, overBudget / 400);

  return { occasionFit, skinFit, styleMatch, definition, contrast, total: Math.round(total), cost, reasons };
}

export function labelOccasion(o: Occasion) {
  return OCCASIONS.find((x) => x.id === o)?.label ?? o;
}

export const OCCASIONS: { id: Occasion; label: string; line: string }[] = [
  { id: "wedding", label: "Wedding", line: "Polished, radiant and camera-ready" },
  { id: "date-night", label: "Date Night", line: "Soft, confident and effortless" },
  { id: "work", label: "Work", line: "Fresh, refined and professional" },
  { id: "party", label: "Party", line: "Bold, stylish and unforgettable" },
  { id: "vacation", label: "Vacation", line: "Relaxed, glowing and effortless" },
  { id: "photoshoot", label: "Photoshoot", line: "Flawless, high-impact and editorial" },
  { id: "everyday", label: "Everyday", line: "Natural, fresh and comfortably you" },
];

/** Change in scores between two recipes, for the "AI Impact" tiles. */
export function impactOf(lookId: LookId, before: Recipe, after: Recipe, moment: Moment, skin: SkinResult | null) {
  const a = scoreLook(lookId, before, moment, skin);
  const b = scoreLook(lookId, after, moment, skin);
  const harmony = (x: LookScore) => Math.round(0.6 * x.skinFit + 0.4 * x.styleMatch);
  return {
    harmony: harmony(b) - harmony(a),
    occasion: b.occasionFit - a.occasionFit,
    contrast: b.contrast - a.contrast,
    cost: b.cost - a.cost,
    before: a,
    after: b,
  };
}
