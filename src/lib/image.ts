"use client";

import { HD_MIN_SHORT_SIDE, SD_MIN_SHORT_SIDE } from "./skin";

export type QualityLevel = "good" | "ok" | "poor";
export type PhotoQuality = {
  lighting: { level: QualityLevel; label: string; value: number };
  resolution: { level: QualityLevel; label: string; value: number };
  sharpness: { level: QualityLevel; label: string; value: number };
  canAnalyze: boolean;
};

export type PreparedImage = { blob: Blob; dataUrl: string; width: number; height: number; quality: PhotoQuality };

const MAX_LONG_SIDE = 2400;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality = 0.92) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image."))), "image/jpeg", quality),
  );
}

/** Measures brightness and sharpness on a small grayscale copy of the image. */
function measure(canvas: HTMLCanvasElement) {
  const size = 256;
  const scale = size / Math.max(canvas.width, canvas.height);
  const w = Math.max(1, Math.round(canvas.width * scale));
  const h = Math.max(1, Math.round(canvas.height * scale));
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray[i] = g;
    sum += g;
  }
  const brightness = sum / (w * h);
  // Variance of the Laplacian: low values mean a blurry photo.
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  }
  const mean = lapSum / n;
  const sharpness = lapSq / n - mean * mean;
  return { brightness, sharpness };
}

function assess(width: number, height: number, brightness: number, sharpness: number): PhotoQuality {
  const short = Math.min(width, height);
  const lighting =
    brightness < 60
      ? { level: "poor" as const, label: "Too dark" }
      : brightness > 215
        ? { level: "poor" as const, label: "Too bright" }
        : brightness < 85 || brightness > 190
          ? { level: "ok" as const, label: "Fair" }
          : { level: "good" as const, label: "Good" };
  const resolution =
    short >= HD_MIN_SHORT_SIDE
      ? { level: "good" as const, label: "HD ready" }
      : short >= SD_MIN_SHORT_SIDE
        ? { level: "ok" as const, label: "Standard" }
        : { level: "poor" as const, label: "Too small" };
  const sharp =
    sharpness > 120
      ? { level: "good" as const, label: "Excellent" }
      : sharpness > 40
        ? { level: "ok" as const, label: "Good" }
        : { level: "poor" as const, label: "Blurry" };
  return {
    lighting: { ...lighting, value: Math.round(brightness) },
    resolution: { ...resolution, value: short },
    sharpness: { ...sharp, value: Math.round(sharpness) },
    canAnalyze: resolution.level !== "poor" && lighting.label !== "Too dark",
  };
}

async function finalize(canvas: HTMLCanvasElement): Promise<PreparedImage> {
  const { brightness, sharpness } = measure(canvas);
  const blob = await toBlob(canvas);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return {
    blob,
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    quality: assess(canvas.width, canvas.height, brightness, sharpness),
  };
}

/** Reads an uploaded file, fixes orientation, downsizes very large photos and scores quality. */
export async function prepareFile(file: File): Promise<PreparedImage> {
  if (!/^image\/(jpe?g|png|webp|heic)$/i.test(file.type)) throw new Error("Please choose a JPG or PNG photo.");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_LONG_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return finalize(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Captures a portrait (4:5) crop from the live camera so the face fills most of the frame. */
export async function captureVideo(video: HTMLVideoElement): Promise<PreparedImage> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const targetRatio = 4 / 5;
  let cw = vw;
  let ch = vh;
  if (vw / vh > targetRatio) cw = Math.round(vh * targetRatio);
  else ch = Math.round(vw / targetRatio);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  canvas.getContext("2d")!.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, cw, ch);
  return finalize(canvas);
}

export async function dataUrlToPrepared(dataUrl: string): Promise<PreparedImage> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return finalize(canvas);
}

/** Crops a region (in the image's own pixels) out of a data URL and scores the result. */
export async function cropImage(dataUrl: string, sx: number, sy: number, sw: number, sh: number): Promise<PreparedImage> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_LONG_SIDE / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return finalize(canvas);
}
