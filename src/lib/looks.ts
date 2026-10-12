import { findProduct, PRODUCTS, type Product, type ProductCategory, type Tier } from "./catalog";

// A look is a "recipe": every makeup choice that YouCam Makeup VTO renders on the selfie.

export type LipTexture = "matte" | "satin" | "gloss";
export type Finish = "dewy" | "natural" | "matte";
export type BrowShape = "Original2" | "SoftArch1" | "Straight1" | "HighArch1";

export type Recipe = {
  lip: { hex: string; texture: LipTexture; intensity: number };
  blush: { hex: string; intensity: number };
  eyes: { hex: string; intensity: number };
  liner: { intensity: number };
  brows: { shape: BrowShape };
  foundation: { coverage: number; finish: Finish };
  hair?: { id: string; title: string }; // YouCam hairstyle template; rendered after makeup, never affects products
};

export type LookId = "natural-glow" | "soft-glam" | "modern-bold";

export type BaseLook = {
  id: LookId;
  index: string;
  name: string;
  tagline: string;
  script: string;
  categories: ProductCategory[];
  recipe: Recipe;
};

export const BASE_LOOKS: BaseLook[] = [
  {
    id: "natural-glow",
    index: "01",
    name: "Natural Glow",
    tagline: "Soft, elegant, minimal makeup.",
    script: "Fresh, Effortless, You",
    categories: ["foundation", "lip", "blush", "eyes"],
    recipe: {
      lip: { hex: "#C27A72", texture: "satin", intensity: 45 },
      blush: { hex: "#E9A08A", intensity: 35 },
      eyes: { hex: "#D9B99B", intensity: 40 },
      liner: { intensity: 25 },
      brows: { shape: "Original2" },
      foundation: { coverage: 30, finish: "dewy" },
    },
  },
  {
    id: "soft-glam",
    index: "02",
    name: "Soft Glam",
    tagline: "Balanced, polished, occasion-ready.",
    script: "Polished, Radiant, Confident",
    categories: ["foundation", "lip", "blush", "eyes", "setting", "fragrance"],
    recipe: {
      lip: { hex: "#B5646A", texture: "satin", intensity: 65 },
      blush: { hex: "#D98880", intensity: 50 },
      eyes: { hex: "#C9927A", intensity: 55 },
      liner: { intensity: 60 },
      brows: { shape: "SoftArch1" },
      foundation: { coverage: 55, finish: "natural" },
    },
  },
  {
    id: "modern-bold",
    index: "03",
    name: "Modern Bold",
    tagline: "Higher contrast, statement look.",
    script: "Bold, Modern, Statement",
    categories: ["foundation", "lip", "blush", "eyes", "setting", "fragrance"],
    recipe: {
      lip: { hex: "#A3202E", texture: "matte", intensity: 85 },
      blush: { hex: "#B8707A", intensity: 40 },
      eyes: { hex: "#5E3A48", intensity: 70 },
      liner: { intensity: 85 },
      brows: { shape: "HighArch1" },
      foundation: { coverage: 70, finish: "matte" },
    },
  },
];

export function getBaseLook(id: LookId) {
  return BASE_LOOKS.find((l) => l.id === id)!;
}

// ---------- Fine-tune options (Change One Thing) ----------

export type ChangeKind = "foundation" | "lip" | "blush" | "eyes" | "brows" | "finish";

export type ChangeOption = { id: string; label: string; swatch: string; apply: (r: Recipe) => Recipe };

const EYE_PALETTES: Record<string, string[]> = {
  "#A97C64": ["#A97C64", "#D9B99B"],
  "#C9927A": ["#C9927A", "#E8C1A8"],
  "#5E3A48": ["#5E3A48", "#8E5A6A", "#C9A48A"],
  "#D9B99B": ["#D9B99B"],
};

export const CHANGE_OPTIONS: Record<ChangeKind, { label: string; options: ChangeOption[] }> = {
  foundation: {
    label: "Foundation",
    options: [
      { id: "light", label: "Light", swatch: "#F1D6C0", apply: (r) => ({ ...r, foundation: { ...r.foundation, coverage: 30 } }) },
      { id: "medium", label: "Medium", swatch: "#E3BC9A", apply: (r) => ({ ...r, foundation: { ...r.foundation, coverage: 55 } }) },
      { id: "full", label: "Full", swatch: "#D3A684", apply: (r) => ({ ...r, foundation: { ...r.foundation, coverage: 75 } }) },
    ],
  },
  lip: {
    label: "Lip",
    options: [
      { id: "rose-nude", label: "Rose Nude", swatch: "#C27A72", apply: (r) => ({ ...r, lip: { hex: "#C27A72", texture: "satin", intensity: 55 } }) },
      { id: "soft-mauve", label: "Soft Mauve", swatch: "#B5646A", apply: (r) => ({ ...r, lip: { hex: "#B5646A", texture: "satin", intensity: 65 } }) },
      { id: "classic-red", label: "Classic Red", swatch: "#A3202E", apply: (r) => ({ ...r, lip: { hex: "#A3202E", texture: "matte", intensity: 85 } }) },
      { id: "berry", label: "Berry", swatch: "#8E2A45", apply: (r) => ({ ...r, lip: { hex: "#8E2A45", texture: "satin", intensity: 75 } }) },
      { id: "peach", label: "Peach", swatch: "#E08E79", apply: (r) => ({ ...r, lip: { hex: "#E08E79", texture: "gloss", intensity: 55 } }) },
    ],
  },
  blush: {
    label: "Blush",
    options: [
      { id: "soft-peach", label: "Soft Peach", swatch: "#E9A08A", apply: (r) => ({ ...r, blush: { hex: "#E9A08A", intensity: 40 } }) },
      { id: "rose", label: "Rose", swatch: "#D98880", apply: (r) => ({ ...r, blush: { hex: "#D98880", intensity: 50 } }) },
      { id: "coral", label: "Coral", swatch: "#E57A6A", apply: (r) => ({ ...r, blush: { hex: "#E57A6A", intensity: 50 } }) },
      { id: "mauve", label: "Mauve", swatch: "#B8707A", apply: (r) => ({ ...r, blush: { hex: "#B8707A", intensity: 45 } }) },
    ],
  },
  eyes: {
    label: "Eyes",
    options: [
      { id: "champagne", label: "Champagne", swatch: "#D9B99B", apply: (r) => ({ ...r, eyes: { hex: "#D9B99B", intensity: 40 } }) },
      { id: "soft-brown", label: "Soft Brown", swatch: "#A97C64", apply: (r) => ({ ...r, eyes: { hex: "#A97C64", intensity: 50 } }) },
      { id: "rose-gold", label: "Rose Gold", swatch: "#C9927A", apply: (r) => ({ ...r, eyes: { hex: "#C9927A", intensity: 55 } }) },
      { id: "smoky-plum", label: "Smoky Plum", swatch: "#5E3A48", apply: (r) => ({ ...r, eyes: { hex: "#5E3A48", intensity: 70 } }) },
    ],
  },
  brows: {
    label: "Eyebrows",
    options: [
      { id: "natural", label: "Natural", swatch: "#4B3621", apply: (r) => ({ ...r, brows: { shape: "Original2" } }) },
      { id: "soft-arch", label: "Soft Arch", swatch: "#4B3621", apply: (r) => ({ ...r, brows: { shape: "SoftArch1" } }) },
      { id: "straight", label: "Straight", swatch: "#4B3621", apply: (r) => ({ ...r, brows: { shape: "Straight1" } }) },
      { id: "high-arch", label: "High Arch", swatch: "#4B3621", apply: (r) => ({ ...r, brows: { shape: "HighArch1" } }) },
    ],
  },
  finish: {
    label: "Finish",
    options: [
      { id: "dewy", label: "Dewy", swatch: "#F4DCCB", apply: (r) => ({ ...r, foundation: { ...r.foundation, finish: "dewy" } }) },
      { id: "natural", label: "Natural", swatch: "#E9C9B1", apply: (r) => ({ ...r, foundation: { ...r.foundation, finish: "natural" } }) },
      { id: "matte", label: "Soft Matte", swatch: "#DDB89C", apply: (r) => ({ ...r, foundation: { ...r.foundation, finish: "matte" } }) },
    ],
  },
};

export const BROW_LABELS: Record<BrowShape, string> = {
  Original2: "Natural",
  SoftArch1: "Soft Arch",
  Straight1: "Straight",
  HighArch1: "High Arch",
};

export const CHANGE_KINDS = Object.keys(CHANGE_OPTIONS) as ChangeKind[];

/** A static example photo of an option (lips in that shade, a brow shape, a finish...). No API call. */
export function exampleImage(kind: ChangeKind, optionId: string) {
  return `/examples/${kind}-${optionId}.jpg`;
}

/** The option that matches the recipe as it is now, if any. */
export function currentOption(kind: ChangeKind, r: Recipe) {
  return CHANGE_OPTIONS[kind].options.find((o) => JSON.stringify(o.apply(r)) === JSON.stringify(r)) ?? null;
}

// ---------- Products in a look ----------

const PRICE_TIER_OVERRIDES: Partial<Record<ProductCategory, Tier>> = { lip: "premium", eyes: "premium" };

export function shadeFor(category: ProductCategory, r: Recipe) {
  if (category === "lip") return r.lip.hex;
  if (category === "blush") return r.blush.hex;
  if (category === "eyes") return r.eyes.hex;
  return undefined;
}

/** Products that make up a look, either all premium or the optimized mix. */
export function productsFor(look: BaseLook, recipe: Recipe, mode: "original" | "optimized"): Product[] {
  return look.categories.map((c) => {
    const tier: Tier = mode === "original" ? "premium" : PRICE_TIER_OVERRIDES[c] ?? "budget";
    return findProduct(c, tier, shadeFor(c, recipe));
  });
}

/** Products the user swapped in, per category. A pick only applies while it matches the look's shade. */
export type ProductPicks = Partial<Record<ProductCategory, string>>;

export function withPicks(products: Product[], picks?: ProductPicks): Product[] {
  return products.map((p) => {
    const picked = picks?.[p.category] && PRODUCTS.find((x) => x.id === picks[p.category]);
    return picked && picked.hex.toLowerCase() === p.hex.toLowerCase() ? picked : p;
  });
}

/** The products for a look in a price mode, including the user's swaps. */
export function labProducts(
  look: BaseLook,
  recipe: Recipe,
  mode: "original" | "optimized",
  picks?: Partial<Record<"original" | "optimized", ProductPicks>>,
) {
  return withPicks(productsFor(look, recipe, mode), picks?.[mode]);
}

export function totalPrice(products: Product[]) {
  return products.reduce((s, p) => s + p.price, 0);
}

// ---------- YouCam Makeup VTO payload ----------

const FOUNDATION_HEX = "#E3BC9A";
const GLOW: Record<Finish, number> = { dewy: 70, natural: 45, matte: 15 };

/**
 * Builds the `effects` array for the YouCam makeup-vto task.
 * All API-format details live here, so this is the one place to fix if the API changes.
 */
export function buildMakeupEffects(r: Recipe) {
  const eyeColors = EYE_PALETTES[r.eyes.hex] ?? [r.eyes.hex];
  const eyePattern = eyeColors.length === 1 ? "1color1" : `${eyeColors.length}colors1`;
  const lipPalette: Record<string, unknown> = { color: r.lip.hex, texture: r.lip.texture, colorIntensity: r.lip.intensity };
  if (r.lip.texture === "gloss") Object.assign(lipPalette, { gloss: 60, transparencyIntensity: 40 });

  return [
    {
      category: "foundation",
      palettes: [
        {
          color: FOUNDATION_HEX,
          colorIntensity: Math.round(r.foundation.coverage * 0.5),
          glowIntensity: GLOW[r.foundation.finish],
          coverageIntensity: r.foundation.coverage,
        },
      ],
    },
    {
      category: "eye_shadow",
      pattern: { name: eyePattern },
      palettes: eyeColors.map((color) => ({ color, texture: "matte", colorIntensity: r.eyes.intensity })),
    },
    {
      category: "eye_liner",
      pattern: { name: "2colors1" },
      palettes: [
        { color: "#2B1D1A", texture: "matte", colorIntensity: r.liner.intensity },
        { color: "#2B1D1A", texture: "matte", colorIntensity: Math.round(r.liner.intensity * 0.6) },
      ],
    },
    {
      category: "eyebrows",
      pattern: { type: "shape", name: r.brows.shape, curvature: 0, thickness: 0, definition: 40 },
      palettes: [{ color: "#4B3621", colorIntensity: 45, texture: "matte" }],
    },
    {
      category: "blush",
      pattern: { name: "1color1" },
      palettes: [{ color: r.blush.hex, texture: "matte", colorIntensity: r.blush.intensity }],
    },
    {
      category: "lip_color",
      shape: { name: "original" },
      style: { type: "full" },
      palettes: [lipPalette],
    },
  ];
}

/** Which change kind differs between two recipes (used for labels). */
export function describeRecipe(r: Recipe) {
  const lip = CHANGE_OPTIONS.lip.options.find((o) => o.swatch.toLowerCase() === r.lip.hex.toLowerCase())?.label ?? "Custom";
  const blush = CHANGE_OPTIONS.blush.options.find((o) => o.swatch.toLowerCase() === r.blush.hex.toLowerCase())?.label ?? "Custom";
  const eyes = CHANGE_OPTIONS.eyes.options.find((o) => o.swatch.toLowerCase() === r.eyes.hex.toLowerCase())?.label ?? "Custom";
  const brows = BROW_LABELS[r.brows.shape];
  const finish = CHANGE_OPTIONS.finish.options.find((o) => o.id === r.foundation.finish)?.label ?? "Natural";
  return { lip, blush, eyes, brows, finish };
}
