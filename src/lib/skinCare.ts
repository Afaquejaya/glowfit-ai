import type { SkinMetric, SkinMetricKey, SkinResult } from "./skin";

// Plain-language care guidance for each YouCam metric. Scores are 0-100, higher is healthier.

export type MetricStatus = "good" | "care" | "priority";

export function statusOf(score: number): MetricStatus {
  if (score >= 80) return "good";
  if (score >= 60) return "care";
  return "priority";
}

export const STATUS_LABEL: Record<MetricStatus, string> = { good: "Good", care: "Needs Care", priority: "Priority" };

type CareInfo = {
  good: string; // what a strong score means
  care: string; // what a lower score means
  tip: string;
  need: string;
  avoid: string;
  works: string;
  image?: string; // close-up shown in Skin Priorities
};

export const CARE: Record<SkinMetricKey, CareInfo> = {
  moisture: {
    good: "Hydration is strong. Keep it steady so makeup stays smooth all day.",
    care: "Your skin is losing some moisture, which can make makeup look patchy on the cheeks.",
    tip: "Use a hydrating serum and a moisturiser with hyaluronic acid, morning and night.",
    need: "Long-lasting hydration",
    avoid: "Harsh foaming cleansers",
    works: "Lightweight, hydrating formulas",
    image: "/skin/concern-moisture.jpg",
  },
  texture: {
    good: "Texture is smooth and even, so base products sit well.",
    care: "Mild uneven texture, especially in the T-zone, can catch foundation.",
    tip: "Use gentle exfoliation (AHA/BHA) 2-3 times a week and a smoothing primer.",
    need: "Smoother skin texture",
    avoid: "Harsh physical scrubs",
    works: "Smoothing, blurring primer",
    image: "/skin/concern-texture.jpg",
  },
  pore: {
    good: "Pores look refined and are barely visible.",
    care: "Slightly enlarged pores in the T-zone and around the nose.",
    tip: "Use niacinamide and pore-refining skincare; cleanse with BHA a few times a week.",
    need: "Gentle pore care",
    avoid: "Comedogenic heavy oils",
    works: "Non-comedogenic products",
    image: "/skin/concern-pore.jpg",
  },
  oiliness: {
    good: "Oil levels are balanced, with little shine through the day.",
    care: "Extra shine in the T-zone can break makeup down by the evening.",
    tip: "Use a light gel moisturiser and blot the T-zone instead of adding more powder.",
    need: "Balanced oil production",
    avoid: "Heavy creams and rich oils",
    works: "Natural or soft matte finish",
  },
  redness: {
    good: "Skin looks calm, with very little redness.",
    care: "Some redness around the cheeks and nose shows through light makeup.",
    tip: "Choose fragrance-free products with centella or niacinamide to calm the skin.",
    need: "Calm, soothing care",
    avoid: "Products with high alcohol or fragrance",
    works: "Colour-correcting base",
  },
  wrinkle: {
    good: "Very few fine lines; skin looks firm and smooth.",
    care: "Fine lines around the eyes and smile can hold onto powder.",
    tip: "Wear SPF every day and use a peptide or retinol serum at night.",
    need: "A stronger skin barrier",
    avoid: "Heavy powder that settles into lines",
    works: "Satin or dewy finish",
  },
  acne: {
    good: "Skin is clear, with few or no blemishes.",
    care: "A few blemishes need covering without heavy layers.",
    tip: "Spot-treat with salicylic acid and use non-comedogenic base products.",
    need: "Clear, calm skin",
    avoid: "Pore-clogging heavy foundation",
    works: "Spot concealing over full coverage",
  },
  radiance: {
    good: "Skin has a healthy, natural glow.",
    care: "Skin looks a little dull and could use more glow.",
    tip: "Use vitamin C in the morning and finish with a dewy or satin base.",
    need: "Brightness and glow",
    avoid: "Flat, heavy matte bases",
    works: "Luminous primer or highlighter",
  },
};

const TYPE_INFO: Record<string, { line: string; need: string; avoid: string; works: string }> = {
  combination: { line: "Oily in the T-zone with balanced cheeks.", need: "Balance oil production", avoid: "Over-matte makeup", works: "Skincare + makeup combination" },
  oily: { line: "Shine shows across the face through the day.", need: "Balance oil production", avoid: "Heavy creams and rich oils", works: "Oil-free, soft matte formulas" },
  dry: { line: "Feels tight and can flake, especially on the cheeks.", need: "Long-lasting hydration", avoid: "Over-matte makeup", works: "Cream and dewy formulas" },
  normal: { line: "Well balanced, neither too oily nor too dry.", need: "Daily protection with SPF", avoid: "Overloading with too many actives", works: "Natural, skin-like finishes" },
  sensitive: { line: "Reacts easily to new products and fragrance.", need: "Calm, soothing care", avoid: "Products with high alcohol or fragrance", works: "Fragrance-free, gentle formulas" },
};

export function skinTypeInfo(type?: string) {
  const key = (type ?? "").toLowerCase();
  return TYPE_INFO[Object.keys(TYPE_INFO).find((k) => key.includes(k)) ?? "normal"];
}

export function headline(score: number) {
  if (score >= 80) return "Your skin is healthy and well balanced.";
  if (score >= 65) return "Your skin is healthy, with some areas that can be improved.";
  return "Your skin needs some extra care right now.";
}

export type SkinPlan = {
  priorities: (SkinMetric & { status: MetricStatus; text: string; tip: string; image?: string })[];
  needs: string[];
  avoid: string[];
  works: string[];
};

const uniq = (xs: string[]) => [...new Set(xs)];

/** Turns a scan into the three lowest-scoring priorities and a do / avoid / use plan. */
export function skinPlan(skin: SkinResult): SkinPlan {
  const sorted = [...skin.metrics].sort((a, b) => a.score - b.score);
  const priorities = sorted.slice(0, 3).map((m) => {
    const status = statusOf(m.score);
    const info = CARE[m.key];
    return { ...m, status, text: status === "good" ? info.good : info.care, tip: info.tip, image: info.image };
  });
  const type = skinTypeInfo(skin.skinType);
  const focus = sorted.filter((m) => m.score < 80).slice(0, 4);
  const pad = sorted.slice(0, 4); // when everything is strong, still advise on the lowest areas
  const from = (pick: (c: CareInfo) => string) => uniq([...(focus.length ? focus : pad).map((m) => pick(CARE[m.key]))]);
  return {
    priorities,
    needs: uniq([...from((c) => c.need), type.need, "Strengthen skin barrier"]).slice(0, 4),
    avoid: uniq([...from((c) => c.avoid), type.avoid, "Products with high alcohol"]).slice(0, 4),
    works: uniq([...from((c) => c.works), type.works]).slice(0, 4),
  };
}
