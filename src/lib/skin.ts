// Shared skin-analysis types and helpers (safe to import on client and server).

export type SkinMetricKey =
  | "moisture"
  | "oiliness"
  | "pore"
  | "texture"
  | "redness"
  | "wrinkle"
  | "acne"
  | "radiance";

export type SkinMetric = {
  key: SkinMetricKey;
  label: string;
  score: number; // YouCam ui_score, 0-100, higher is healthier
  raw?: number;
  maskUrl?: string;
};

export type SkinResult = {
  mode: "hd" | "sd" | "demo";
  overall: number;
  skinType?: string;
  metrics: SkinMetric[];
  analyzedAt: string;
};

export const METRIC_LABELS: Record<SkinMetricKey, string> = {
  moisture: "Hydration",
  oiliness: "Oiliness",
  pore: "Pores",
  texture: "Texture",
  redness: "Redness",
  wrinkle: "Fine Lines",
  acne: "Clarity",
  radiance: "Radiance",
};

export const METRIC_KEYS = Object.keys(METRIC_LABELS) as SkinMetricKey[];

// HD analysis needs the short side of the photo to be at least 1080px.
export const HD_MIN_SHORT_SIDE = 1080;
export const SD_MIN_SHORT_SIDE = 480;

export function pickMode(width: number, height: number): "hd" | "sd" {
  return Math.min(width, height) >= HD_MIN_SHORT_SIDE ? "hd" : "sd";
}

export function overallScore(metrics: SkinMetric[]) {
  if (!metrics.length) return 0;
  return Math.round(metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length);
}

// Friendly messages for YouCam image errors.
export const YOUCAM_ERROR_HINTS: Record<string, string> = {
  error_below_min_image_size: "The photo is too small. Use a sharper, larger photo.",
  error_exceed_max_image_size: "The photo is too large. Try a smaller one.",
  error_src_face_too_small: "Your face is too small in the photo. Move closer so it fills the frame.",
  error_src_face_out_of_bound: "Part of your face is outside the frame. Center your face and try again.",
  error_lighting_dark: "The lighting is too dark. Face a window or a soft light.",
  error_no_face: "We couldn't find a face. Use a clear, front-facing selfie.",
};

/** Problems any YouCam call can hit: account, network and service issues, in plain words. */
const COMMON_HINTS: [RegExp, string][] = [
  [/credit|insufficient_unit|quota|exceed.*unit/i, "The YouCam account is out of API units. Top up the units, or use the sample face to keep exploring."],
  [/unauthori[sz]ed|invalid.*key|api_key|http_401|http_403/i, "The YouCam API key isn't accepted. Check YOUCAM_API_KEY in .env.local, or use the sample face."],
  [/http_429|rate|too_many/i, "YouCam is busy right now. Wait a few seconds and try again."],
  [/failed to fetch|network|load failed|econn|enotfound|fetch failed/i, "The connection dropped. Check your internet and try again."],
  [/http_5\d\d|502|503|504|internal|unavailable/i, "YouCam had a temporary problem. Please try again in a moment."],
  [/taking too long|timeout|timed out/i, "This is taking longer than usual. Please try again; your earlier results are kept."],
];

/** Turns a YouCam error code or message into a sentence the user can act on. */
export function friendlyYouCam(code: string | undefined, fallback: string, hints: Record<string, string> = YOUCAM_ERROR_HINTS) {
  if (!code) return fallback;
  const hit = Object.entries(hints).find(([k]) => code.includes(k));
  if (hit) return hit[1];
  const common = COMMON_HINTS.find(([re]) => re.test(code));
  return common ? common[1] : fallback;
}

/** A fetch that never reached the server throws a TypeError; say so plainly instead of "Failed to fetch". */
export function networkSafe(e: unknown) {
  const m = (e as Error)?.message ?? "";
  return e instanceof TypeError && /fetch|network|load failed/i.test(m) ? "The connection dropped. Check your internet and try again." : m;
}

export function friendlyError(code?: string, fallback = "Something went wrong while analyzing your skin. Please try again.") {
  return friendlyYouCam(code, fallback);
}
