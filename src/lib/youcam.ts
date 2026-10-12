import "server-only";
import { METRIC_KEYS, METRIC_LABELS, overallScore, type SkinMetric, type SkinMetricKey, type SkinResult } from "./skin";

// Server-side YouCam API client. The API key never reaches the browser.
// Flow per feature: create file -> PUT upload -> create task -> poll task.

const BASE = process.env.YOUCAM_API_BASE || "https://yce-api-01.makeupar.com";

export class YouCamError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
  }
}

export function isDemoMode() {
  return process.env.GLOWFIT_DEMO_MODE === "1" || !process.env.YOUCAM_API_KEY;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.YOUCAM_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (typeof body.status === "number" && body.status !== 200)) {
    const code = body.error_code || body.error || body.message || `http_${res.status}`;
    throw new YouCamError(`YouCam ${path} failed: ${code}`, String(code), res.status);
  }
  return body as T;
}

type FileResponse = {
  data: {
    files: {
      file_id: string;
      requests: { method: string; url: string; headers: Record<string, string | number> }[];
    }[];
  };
};

/** Registers a file with YouCam and uploads the bytes to the signed URL. Returns file_id. */
export async function uploadFile(feature: string, file: { bytes: ArrayBuffer; type: string; name: string }) {
  const init = {
    method: "POST",
    body: JSON.stringify({
      files: [{ content_type: file.type, file_name: file.name, file_size: file.bytes.byteLength }],
    }),
  };
  // Most features take /file/<feature>; the hair docs show the generic /file endpoint, so fall back to it.
  const created = await call<FileResponse>(`/s2s/v2.0/file/${feature}`, init).catch((e: YouCamError) => {
    if (e.status === 404) return call<FileResponse>(`/s2s/v2.0/file`, init);
    throw e;
  });
  const entry = created.data.files[0];
  const upload = entry.requests[0];
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(upload.headers || {})) headers[k] = String(v);
  const put = await fetch(upload.url, { method: upload.method || "PUT", headers, body: file.bytes });
  if (!put.ok) throw new YouCamError(`Upload failed (${put.status})`, "upload_failed", put.status);
  return entry.file_id;
}

export async function createTask(feature: string, payload: Record<string, unknown>, version = "v2.0") {
  const res = await call<{ data: { task_id: string } }>(`/s2s/${version}/task/${feature}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data.task_id;
}

export type TaskStatus<R> =
  | { status: "running" }
  | { status: "success"; results: R }
  | { status: "error"; code?: string };

export async function getTask<R>(feature: string, taskId: string, version = "v2.0"): Promise<TaskStatus<R>> {
  const res = await call<{
    data: { task_status: string; results?: R; error?: string; error_message?: string; failure_reason?: string };
  }>(
    `/s2s/${version}/task/${feature}/${encodeURIComponent(taskId)}`,
  );
  const d = res.data;
  if (d.task_status === "success") return { status: "success", results: d.results as R };
  if (d.task_status === "error") return { status: "error", code: d.error || d.failure_reason || d.error_message };
  return { status: "running" };
}

export async function getCredits() {
  return call<{ data?: unknown }>(`/s2s/v1.0/client/credit`);
}

// ---------- Skin analysis ----------

export function skinActions(mode: "hd" | "sd"): string[] {
  const actions = [...METRIC_KEYS, "skin_type"];
  return mode === "hd" ? actions.map((a) => `hd_${a}`) : actions;
}

type SkinOutput = { type: string; ui_score?: number; raw_score?: number; mask_urls?: string[]; [k: string]: unknown };
export type RawSkinResults = { output?: SkinOutput[] } | SkinOutput[];

/** Turns YouCam skin-analysis output into the app's SkinResult shape. */
export function normalizeSkin(results: RawSkinResults, mode: "hd" | "sd"): SkinResult {
  const output = Array.isArray(results) ? results : results.output || [];
  const grouped = new Map<SkinMetricKey, SkinOutput[]>();
  let skinType: string | undefined;

  for (const item of output) {
    const base = item.type.replace(/^hd_/, "").split(/[_-](whole|forehead|nose|cheek|glabellar|crowfeet|periocular|nasolabial|marionette)$/)[0];
    if (base === "skin_type") {
      const v = (item.skin_type ?? item.value ?? item.result ?? item.label) as string | undefined;
      if (typeof v === "string") skinType = v;
      continue;
    }
    if (!(METRIC_KEYS as string[]).includes(base) || typeof item.ui_score !== "number") continue;
    const key = base as SkinMetricKey;
    grouped.set(key, [...(grouped.get(key) || []), item]);
  }

  const metrics: SkinMetric[] = [];
  for (const key of METRIC_KEYS) {
    const items = grouped.get(key);
    if (!items?.length) continue;
    const whole = items.find((i) => /whole/.test(i.type)) || items[0];
    metrics.push({
      key,
      label: METRIC_LABELS[key],
      score: Math.round(whole.ui_score as number),
      raw: whole.raw_score,
      maskUrl: whole.mask_urls?.[0],
    });
  }

  return {
    mode,
    overall: overallScore(metrics),
    skinType: skinType ? skinType.charAt(0).toUpperCase() + skinType.slice(1) : undefined,
    metrics,
    analyzedAt: new Date().toISOString(),
  };
}

// ---------- Makeup VTO ----------

/** Finds the result image URL; the docs show both `results[].download_url` and `results.url`. */
export function extractResultUrl(results: unknown): string | null {
  if (!results) return null;
  if (typeof results === "string") return /^https?:/.test(results) ? results : null;
  if (Array.isArray(results)) {
    for (const r of results) {
      const u = extractResultUrl(r);
      if (u) return u;
    }
    return null;
  }
  if (typeof results === "object") {
    const o = results as Record<string, unknown>;
    for (const k of ["download_url", "url", "output_url", "result_url"]) {
      if (typeof o[k] === "string") return o[k] as string;
    }
    for (const v of Object.values(o)) {
      const u = extractResultUrl(v);
      if (u) return u;
    }
  }
  return null;
}

/** Downloads a result image and returns it as a data URL, so the browser can cache it past YouCam's 24h expiry. */
export async function fetchAsDataUrl(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new YouCamError(`Result download failed (${res.status})`, "download_failed", res.status);
  const type = res.headers.get("content-type") || "image/jpeg";
  const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  return `data:${type};base64,${b64}`;
}

// ---------- Hairstyle try-on (AI Hair Style, "hair-transfer", v2.1, 2 units per render) ----------

export const HAIR_FEATURE = "hair-transfer";
export const HAIR_VERSION = "v2.1";

export type HairGender = "women" | "men" | "any";
export type HairTemplate = { id: string; title: string; thumb: string | null; gender: HairGender };

type RawTemplate = Record<string, unknown>;

function pickString(o: RawTemplate, keys: string[]) {
  for (const k of keys) if (typeof o[k] === "string" && o[k]) return o[k] as string;
  return null;
}

const MEN_WORDS = /\b(men|male|man|boy|fade|taper|buzz|crew|quiff|undercut|pompadour|mohawk|caesar|ivy|comb[- ]?over|slick(ed)?[- ]?back|spiky|two[- ]block|mullet|beard|french crop|textured crop|man bun)\b/i;
const WOMEN_WORDS = /\b(women|woman|female|girl|lady|bob|lob|bangs?|fringe|waves?|wavy|ponytail|bun|updo|pixie|layers?|layered|butterfly|curtain|braids?|shag|chignon|princess|long)\b/i;

/** Who a template is for: an explicit field when YouCam sends one, else the style name. */
function genderOf(t: RawTemplate, title: string): HairGender {
  const explicit = ["gender", "sex", "category", "group", "type", "tags", "tag"]
    .map((k) => t[k])
    .flat()
    .filter((v) => typeof v === "string")
    .join(" ");
  const text = `${explicit} ${title}`;
  if (/\b(female|women|woman|girl)\b/i.test(explicit)) return "women";
  if (/\b(male|men|man|boy)\b/i.test(explicit)) return "men";
  if (MEN_WORDS.test(text)) return "men";
  if (WOMEN_WORDS.test(text)) return "women";
  return "any";
}

/** Finds the template array whatever wrapper the API uses. */
function templateArray(data: unknown): RawTemplate[] {
  if (Array.isArray(data)) return data as RawTemplate[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const k of ["templates", "template_list", "results", "items", "list"]) if (Array.isArray(o[k])) return o[k] as RawTemplate[];
  }
  return [];
}

/** Lists YouCam's preset hairstyles (page_size max is 20). Listing costs no units; only renders do. */
export async function listHairTemplates(): Promise<HairTemplate[]> {
  const out: HairTemplate[] = [];
  let token: string | null = null;
  for (let page = 0; page < 6; page++) {
    const q = new URLSearchParams({ page_size: "20" });
    if (token) q.set("starting_token", token);
    const res = await call<{ data?: unknown; next_token?: string }>(`/s2s/${HAIR_VERSION}/task/template/${HAIR_FEATURE}?${q}`);
    const list = templateArray(res.data);
    for (const t of list) {
      const id = pickString(t, ["id", "template_id"]);
      if (!id) continue;
      const title = pickString(t, ["title", "name", "display_name", "style_name"]) ?? "Hairstyle";
      out.push({
        id,
        title,
        thumb: pickString(t, ["thumb", "thumb_url", "thumbnail", "thumbnail_url", "preview_url", "preview", "image_url", "image", "url"]),
        gender: genderOf(t, title),
      });
    }
    const d = (res.data && typeof res.data === "object" ? res.data : {}) as Record<string, unknown>;
    token = (typeof d.next_token === "string" && d.next_token) || res.next_token || null;
    if (!token || !list.length) break;
  }
  return out;
}

/** Hair-transfer errors in words a user can act on. */
export const HAIR_ERROR_HINTS: Record<string, string> = {
  error_no_shoulder: "Hairstyle try-on needs your shoulders in the photo. Retake the selfie a little further from the camera.",
  error_large_face_angle: "Face the camera straight on for hairstyle try-on.",
  error_face_pose: "Face the camera straight on for hairstyle try-on.",
  error_insufficient_landmarks: "We couldn't see enough of your face and shoulders. Try a clearer, wider photo.",
  error_hair_too_short: "Your hair in the photo is too short for this style transfer.",
};
