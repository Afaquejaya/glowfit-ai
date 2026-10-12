import { METRIC_LABELS, overallScore, type SkinMetric, type SkinResult } from "./skin";

// Sample result used when no API key is set or GLOWFIT_DEMO_MODE=1.
const demoScores: Record<string, number> = {
  moisture: 82,
  texture: 76,
  oiliness: 68,
  pore: 71,
  redness: 62,
  wrinkle: 58,
  acne: 84,
  radiance: 74,
};

export function demoSkinResult(): SkinResult {
  const metrics: SkinMetric[] = Object.entries(demoScores).map(([key, score]) => ({
    key: key as SkinMetric["key"],
    label: METRIC_LABELS[key as SkinMetric["key"]],
    score,
  }));
  return {
    mode: "demo",
    overall: overallScore(metrics),
    skinType: "Combination",
    metrics,
    analyzedAt: new Date().toISOString(),
  };
}
