import { demoSkinResult } from "./demo";
import { CARE } from "./skinCare";
import type { SkinMetric, SkinMetricKey, SkinResult } from "./skin";
import type { ScanEntry } from "@/store/glowfit";

// Turns a list of scans into changes, insights and a routine. Scores are 0-100, higher is healthier.

export const TRACKED: SkinMetricKey[] = ["moisture", "texture", "oiliness", "pore"];

export const score = (skin: SkinResult, key: SkinMetricKey) => skin.metrics.find((m) => m.key === key)?.score ?? null;

export function delta(a: SkinResult, b: SkinResult, key: SkinMetricKey) {
  const x = score(a, key);
  const y = score(b, key);
  return x === null || y === null ? null : y - x;
}

const IMPROVED: Record<SkinMetricKey, string> = {
  moisture: "Skin feels more hydrated and healthy",
  texture: "Smoother and more even texture",
  oiliness: "Better oil balance through the day",
  pore: "Pores appear smaller and more refined",
  redness: "Calmer, less red skin",
  wrinkle: "Fine lines look softer",
  acne: "Clearer skin with fewer blemishes",
  radiance: "Brighter, more radiant skin",
};

const DECLINED: Record<SkinMetricKey, string> = {
  moisture: "Skin is a little drier than before",
  texture: "Texture is a little rougher than before",
  oiliness: "More shine than before",
  pore: "Pores look a little more visible",
  redness: "A little more redness than before",
  wrinkle: "Fine lines are a little more visible",
  acne: "A few more blemishes than before",
  radiance: "Skin looks a little duller",
};

export function changeLine(key: SkinMetricKey, d: number | null) {
  if (d === null) return "";
  if (d > 1) return IMPROVED[key];
  if (d < -1) return DECLINED[key];
  return "Holding steady";
}

export type Insight = { key: SkinMetricKey | "overall"; title: string; body: string; tone: "up" | "down" | "steady" };

/** Three short, plain-language takeaways comparing the first and the latest scan. */
export function insights(scans: ScanEntry[]): Insight[] {
  const first = scans[0].skin;
  const last = scans[scans.length - 1].skin;
  const changes = first.metrics
    .map((m) => ({ m, d: delta(first, last, m.key) ?? 0 }))
    .sort((a, b) => b.d - a.d);
  const out: Insight[] = [];
  const [best, second] = changes;
  const steady = (key: SkinMetricKey) => scans.every((s, i) => i === 0 || (score(s.skin, key) ?? 0) >= (score(scans[i - 1].skin, key) ?? 0));
  if (best && best.d > 1) {
    out.push({
      key: best.m.key,
      title: `Your ${best.m.label.toLowerCase()} improved${steady(best.m.key) ? " consistently" : ""}.`,
      body: `Up ${best.d} points since your first scan. ${IMPROVED[best.m.key]}.`,
      tone: "up",
    });
  }
  if (second && second.d > 1) {
    out.push({ key: second.m.key, title: `${second.m.label} is trending better.`, body: `${IMPROVED[second.m.key]} in recent scans.`, tone: "up" });
  }
  const worst = changes[changes.length - 1];
  if (worst && worst.d < -1) {
    out.push({ key: worst.m.key, title: `${worst.m.label} dipped a little.`, body: `${CARE[worst.m.key].tip}`, tone: "down" });
  }
  const overall = last.overall - first.overall;
  out.splice(2);
  out.push(
    overall > 1
      ? { key: "overall", title: "Your routine appears to be working well.", body: "You're making visible progress. Keep it up!", tone: "up" }
      : overall < -1
        ? { key: "overall", title: "Your skin needs a little extra care.", body: "Stick to the basics: gentle cleanser, moisturiser and daily SPF.", tone: "down" }
        : { key: "overall", title: "Your skin is holding steady.", body: "Consistency is working. Scan again in two weeks to see what changes.", tone: "steady" },
  );
  return out;
}

/** The two lowest metrics in a scan, the ones to work on next. */
export function nextFocus(skin: SkinResult): SkinMetric[] {
  return [...skin.metrics].sort((a, b) => a.score - b.score).slice(0, 2);
}

/** A default note for a scan, comparing it with the one before. */
export function autoNote(scan: ScanEntry, prev?: ScanEntry) {
  if (!prev) return "First scan: your starting point.";
  const changes = scan.skin.metrics
    .map((m) => ({ m, d: delta(prev.skin, scan.skin, m.key) ?? 0 }))
    .filter((c) => Math.abs(c.d) > 1)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 2);
  if (!changes.length) return "Skin is steady since the last scan.";
  return changes.map(({ m, d }) => `${m.label} ${d > 0 ? "up" : "down"} ${Math.abs(d)}`).join(", ") + ".";
}

export type RoutineStep = { id: string; name: string; when: string; detail: string; image: string };

/** A five-step routine chosen from the latest scan's lowest metric and skin type. */
export function routine(skin: SkinResult): RoutineStep[] {
  const low = nextFocus(skin)[0]?.key ?? "moisture";
  const SERUM: Record<SkinMetricKey, string> = {
    moisture: "Hyaluronic acid",
    texture: "Gentle AHA/BHA",
    oiliness: "Niacinamide",
    pore: "Niacinamide",
    redness: "Centella",
    wrinkle: "Peptide",
    acne: "Salicylic acid",
    radiance: "Vitamin C",
  };
  const type = (skin.skinType ?? "").toLowerCase();
  const oily = type.includes("oily") || type.includes("combination");
  return [
    { id: "cleanser", name: "Cleanser", when: "AM · PM", detail: oily ? "Gentle gel cleanser" : "Creamy, low-foam cleanser", image: "/journey/routine-cleanser.jpg" },
    { id: "toner", name: "Toner", when: "AM · PM", detail: "Alcohol-free, hydrating", image: "/journey/routine-toner.jpg" },
    { id: "serum", name: "Serum", when: low === "radiance" ? "AM" : "AM · PM", detail: SERUM[low], image: "/journey/routine-serum.jpg" },
    { id: "moisturizer", name: "Moisturizer", when: "AM · PM", detail: oily ? "Light gel moisturiser" : "Rich barrier cream", image: "/journey/routine-moisturizer.jpg" },
    { id: "sunscreen", name: "Sunscreen", when: "AM", detail: "SPF 50, every day", image: "/journey/routine-sunscreen.jpg" },
  ];
}

/** Four monthly scans that show what a journey looks like before the user has one. */
export function sampleJourney(): ScanEntry[] {
  const base = demoSkinResult();
  const steps: Record<string, number[]> = {
    moisture: [70, 74, 78, 82],
    texture: [68, 71, 74, 76],
    oiliness: [62, 64, 66, 68],
    pore: [64, 66, 69, 71],
    redness: [58, 59, 61, 62],
    wrinkle: [56, 57, 57, 58],
    acne: [80, 81, 83, 84],
    radiance: [66, 69, 72, 74],
  };
  const notes = ["First scan: your starting point.", "Texture feels smoother.", "Less oiliness, pores look smaller.", "Skin looks brighter and more even."];
  return [0, 1, 2, 3].map((i) => {
    const metrics = base.metrics.map((m) => ({ ...m, score: steps[m.key][i] }));
    const at = new Date(Date.now() - (3 - i) * 30 * 86400000).toISOString();
    return {
      id: `sample-${i}`,
      at,
      skin: { ...base, metrics, overall: Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length), analyzedAt: at },
      photo: "/profile/sample-face.jpg",
      note: notes[i],
    };
  });
}
