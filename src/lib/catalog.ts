import data from "@/data/products.json";

// Demo product catalog. All brands are fictional on purpose (no third-party trademarks).

export type ProductCategory = "foundation" | "lip" | "blush" | "eyes" | "setting" | "fragrance";
export type Tier = "premium" | "mid" | "budget";
export type Product = {
  id: string;
  category: ProductCategory;
  tier: Tier;
  brand: string;
  name: string;
  price: number;
  hex: string;
  type: string;
  image: string;
};

export const CURRENCY = data.currency;
export const PRODUCTS = data.products as Product[];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  foundation: "Foundation",
  lip: "Lip Color",
  blush: "Blush",
  eyes: "Eyes",
  setting: "Setting",
  fragrance: "Fragrance",
};

export const CATEGORY_ORDER: ProductCategory[] = ["foundation", "lip", "blush", "eyes", "setting", "fragrance"];

export const TIER_LABELS: Record<Tier, string> = { premium: "Premium", mid: "Mid-range", budget: "Budget" };

/** Every product that can fill a category in the same shade, priciest first. */
export function variantsFor(category: ProductCategory, hex: string): Product[] {
  return PRODUCTS.filter((p) => p.category === category && p.hex.toLowerCase() === hex.toLowerCase()).sort(
    (a, b) => b.price - a.price,
  );
}

/** Finds the product of a category and tier that matches a shade. */
export function findProduct(category: ProductCategory, tier: Tier, hex?: string): Product {
  const pool = PRODUCTS.filter((p) => p.category === category && p.tier === tier);
  return (hex && pool.find((p) => p.hex.toLowerCase() === hex.toLowerCase())) || pool[0];
}

export function money(n: number) {
  return `${CURRENCY}${Math.round(n).toLocaleString("en-IN")}`;
}
