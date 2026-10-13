"use client";

import { useEffect, useState } from "react";
import { quietMediaPipe } from "./mediapipeQuiet";
import { CHANGE_OPTIONS, type ChangeKind, type Recipe } from "./looks";

// Builds the Fine Tune option thumbnails from the user's own photo: MediaPipe Face Landmarker finds
// the lips, eyelids and cheeks on the device, and each shade is painted onto that area with canvas
// blend modes. It is a quick preview only: no API call and no units. The real render still comes from YouCam.

type Pt = { x: number; y: number };
type Landmarker = { detect: (img: HTMLImageElement) => { faceLandmarks: Pt[][] } };

let landmarker: Promise<Landmarker | null> | null = null;

function load(): Promise<Landmarker | null> {
  if (!landmarker) {
    landmarker = (async () => {
      try {
        quietMediaPipe();
        const vision = await import(/* webpackIgnore: true */ `${location.origin}/mediapipe/vision_bundle.mjs`);
        const files = await vision.FilesetResolver.forVisionTasks(`${location.origin}/mediapipe/wasm`);
        return (await vision.FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task" },
          runningMode: "IMAGE",
          numFaces: 1,
        })) as Landmarker;
      } catch {
        landmarker = null;
        return null;
      }
    })();
  }
  return landmarker;
}

// MediaPipe face mesh indices.
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
// The eye on the left side of the photo, upper lid from outer to inner corner, and its brow's lower edge.
const EYE_UPPER = [33, 246, 161, 160, 159, 158, 157, 173, 133];
const EYE_LOWER = [133, 155, 154, 153, 145, 144, 163, 7, 33];
const BROW_LOWER = [46, 53, 52, 65, 55];
const CHEEKS = [205, 425];
const FACE_MID = [234, 454, 168, 152];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

type Box = { x: number; y: number; w: number; h: number };

/** A 4:3 crop around some landmarks, padded and kept inside the image. */
function cropAround(pts: Pt[], padX: number, padY: number, W: number, H: number): Box {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  let x0 = Math.min(...xs);
  let x1 = Math.max(...xs);
  let y0 = Math.min(...ys);
  let y1 = Math.max(...ys);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let w = (x1 - x0) * (1 + padX * 2);
  let h = (y1 - y0) * (1 + padY * 2);
  if (w / h > 4 / 3) h = (w * 3) / 4;
  else w = (h * 4) / 3;
  w = Math.min(w, W);
  h = Math.min(h, H);
  x0 = Math.max(0, Math.min(W - w, cx - w / 2));
  y0 = Math.max(0, Math.min(H - h, cy - h / 2));
  return { x: x0, y: y0, w, h };
}

function poly(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
}

type Region = { box: Box; paint: (ctx: CanvasRenderingContext2D) => void; blur: number };

/** Where a change shows on the face, and the shape that gets painted. Coordinates are in image pixels. */
function regionFor(kind: ChangeKind, lm: Pt[], W: number, H: number): Region | null {
  const at = (i: number) => lm[i];
  if (kind === "lip") {
    const outer = LIPS_OUTER.map(at);
    const inner = LIPS_INNER.map(at);
    return {
      box: cropAround(outer, 0.45, 0.9, W, H),
      blur: 1.2,
      paint: (ctx) => {
        ctx.beginPath();
        poly(ctx, outer);
        poly(ctx, inner);
        ctx.fill("evenodd");
      },
    };
  }
  if (kind === "eyes") {
    const lid = EYE_UPPER.map(at);
    const brow = BROW_LOWER.map(at);
    const browY = brow.reduce((s, p) => s + p.y, 0) / brow.length;
    // Shadow from the lash line up to about 60% of the way to the brow.
    const top = [...lid].reverse().map((p) => ({ x: p.x, y: p.y - (p.y - browY) * 0.6 }));
    return {
      box: cropAround([...lid, ...brow, ...EYE_LOWER.map(at)], 0.35, 0.45, W, H),
      blur: 5,
      paint: (ctx) => {
        ctx.beginPath();
        poly(ctx, [...lid, ...top]);
        ctx.fill();
      },
    };
  }
  if (kind === "blush") {
    const cheeks = CHEEKS.map(at);
    const faceW = Math.abs(at(454).x - at(234).x);
    const r = faceW * 0.16;
    return {
      box: cropAround(FACE_MID.map(at), 0.02, 0.0, W, H),
      blur: 6,
      paint: (ctx) => {
        for (const c of cheeks) {
          const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
          g.addColorStop(0, ctx.fillStyle as string);
          g.addColorStop(1, "rgba(0,0,0,0)");
          const prev = ctx.fillStyle;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, r * 1.2, r, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = prev;
        }
      },
    };
  }
  return null;
}

const OUT_W = 360;
const OUT_H = 270;

function paintVariant(img: HTMLImageElement, region: Region, hex: string, intensity: number, gloss: boolean) {
  const { box } = region;
  const s = OUT_W / box.w;
  const out = document.createElement("canvas");
  out.width = OUT_W;
  out.height = OUT_H;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, OUT_W, OUT_H);

  // The colour layer, drawn in crop coordinates.
  const layer = document.createElement("canvas");
  layer.width = OUT_W;
  layer.height = OUT_H;
  const l = layer.getContext("2d")!;
  l.setTransform(s, 0, 0, s, -box.x * s, -box.y * s);
  l.fillStyle = hex;
  region.paint(l);
  l.setTransform(1, 0, 0, 1, 0, 0);

  const a = Math.min(0.85, 0.3 + intensity / 130) * (region.blur >= 6 ? 0.7 : 1);
  ctx.save();
  if (region.blur) ctx.filter = `blur(${region.blur}px)`;
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = "color";
  ctx.drawImage(layer, 0, 0);
  ctx.globalAlpha = a * 0.55;
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(layer, 0, 0);
  if (gloss) {
    ctx.globalAlpha = 0.18;
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(layer, 0, 0);
  }
  ctx.restore();
  return out.toDataURL("image/jpeg", 0.85);
}

function shadeOf(kind: ChangeKind, r: Recipe): { hex: string; intensity: number; gloss: boolean } | null {
  if (kind === "lip") return { hex: r.lip.hex, intensity: r.lip.intensity, gloss: r.lip.texture === "gloss" };
  if (kind === "blush") return { hex: r.blush.hex, intensity: r.blush.intensity, gloss: false };
  if (kind === "eyes") return { hex: r.eyes.hex, intensity: r.eyes.intensity, gloss: false };
  return null;
}

export const VARIANT_KINDS: ChangeKind[] = ["lip", "eyes", "blush"];

const cache = new Map<string, Record<string, string> | null>();

async function buildVariants(src: string, kind: ChangeKind, base: Recipe): Promise<Record<string, string> | null> {
  const d = await load();
  if (!d) return null;
  const img = await loadImage(src);
  const faces = d.detect(img).faceLandmarks;
  if (!faces?.length) return null;
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const lm = faces[0].map((p) => ({ x: p.x * W, y: p.y * H }));
  const region = regionFor(kind, lm, W, H);
  if (!region) return null;
  const out: Record<string, string> = {};
  for (const o of CHANGE_OPTIONS[kind].options) {
    const shade = shadeOf(kind, o.apply(base));
    if (shade) out[o.id] = paintVariant(img, region, shade.hex, shade.intensity, shade.gloss);
  }
  return out;
}

/** Option thumbnails painted on the user's own photo: undefined while loading, null when not possible. */
export function useFaceVariants(src: string | null | undefined, kind: ChangeKind, base: Recipe | null) {
  const key = src && base && VARIANT_KINDS.includes(kind) ? `${src.length}:${src.slice(-64)}:${kind}` : null;
  const [variants, setVariants] = useState<Record<string, string> | null | undefined>(key && cache.has(key) ? cache.get(key) : undefined);
  useEffect(() => {
    if (!key || !src || !base) return setVariants(null);
    if (cache.has(key)) return setVariants(cache.get(key) ?? null);
    let alive = true;
    setVariants(undefined);
    buildVariants(src, kind, base)
      .catch(() => null)
      .then((v) => {
        cache.set(key, v);
        if (alive) setVariants(v);
      });
    return () => {
      alive = false;
    };
    // base only matters for its other settings; the key already tracks the photo and the kind.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return variants;
}

/** All 478 face landmarks in image pixels, found on the device. Null when no face is found. */
export async function detectLandmarks(src: string): Promise<{ pts: Pt[]; W: number; H: number } | null> {
  const d = await load();
  if (!d) return null;
  try {
    const img = await loadImage(src);
    const faces = d.detect(img).faceLandmarks;
    if (!faces?.length) return null;
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    return { pts: faces[0].map((p) => ({ x: p.x * W, y: p.y * H })), W, H };
  } catch {
    return null;
  }
}
