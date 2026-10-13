"use client";

import { useEffect, useState } from "react";
import { detectLandmarks } from "./faceVariants";

// Classic facial proportions measured from on-device landmarks (no API call):
// horizontal thirds (forehead / mid-face / lower face), vertical fifths (eye-width columns)
// and the face's length-to-width ratio.

type Pt = { x: number; y: number };

export type FaceRatios = {
  W: number;
  H: number;
  /** The face is measured upright: lines are drawn rotated by `angle` (degrees) around `center`. */
  angle: number;
  center: Pt;
  /** y positions (upright frame): estimated hairline, brow line, nose base, chin. */
  rows: [number, number, number, number];
  /** x positions (upright frame): face edge, outer eye, inner eye, inner eye, outer eye, face edge. */
  cols: [number, number, number, number, number, number];
  thirds: [number, number, number];
  fifths: [number, number, number, number, number];
  lengthToWidth: number;
  /** 0-100: how close the thirds and fifths are to the classic equal split. */
  balance: number;
};

const pct = (xs: number[]) => {
  const sum = xs.reduce((a, b) => a + b, 0) || 1;
  return xs.map((x) => Math.round((Math.max(0, x) / sum) * 100));
};

export function measure(raw: Pt[], W: number, H: number): FaceRatios {
  // Undo head tilt using the eye line, so a tilted selfie still gives level thirds.
  const a = Math.atan2(raw[263].y - raw[33].y, raw[263].x - raw[33].x);
  const center = { x: (raw[33].x + raw[263].x) / 2, y: (raw[33].y + raw[263].y) / 2 };
  const cos = Math.cos(-a);
  const sin = Math.sin(-a);
  const pts = raw.map((p) => ({
    x: center.x + (p.x - center.x) * cos - (p.y - center.y) * sin,
    y: center.y + (p.x - center.x) * sin + (p.y - center.y) * cos,
  }));
  const y = (i: number) => pts[i].y;
  const x = (i: number) => pts[i].x;
  // The face mesh stops mid-forehead (point 10), so the hairline is estimated from the brow-to-mesh-top distance.
  const brow = y(9);
  const hairline = brow - (brow - y(10)) * 1.6;
  const rows: FaceRatios["rows"] = [hairline, brow, y(2), y(152)];
  const xs = [x(234), x(454), x(33), x(133), x(362), x(263)].sort((p, q) => p - q);
  const cols = xs as FaceRatios["cols"];
  const thirds = pct([rows[1] - rows[0], rows[2] - rows[1], rows[3] - rows[2]]) as FaceRatios["thirds"];
  const fifths = pct([cols[1] - cols[0], cols[2] - cols[1], cols[3] - cols[2], cols[4] - cols[3], cols[5] - cols[4]]) as FaceRatios["fifths"];
  const dev = [...thirds.map((t) => Math.abs(t - 33.3) / 33.3), ...fifths.map((f) => Math.abs(f - 20) / 20)];
  const balance = Math.max(0, Math.min(100, Math.round(100 - (dev.reduce((s, d) => s + d, 0) / dev.length) * 160)));
  return {
    W,
    H,
    angle: (a * 180) / Math.PI,
    center,
    rows,
    cols,
    thirds,
    fifths,
    lengthToWidth: (rows[3] - rows[0]) / (cols[5] - cols[0]),
    balance,
  };
}

const cache = new Map<string, FaceRatios | null>();

/** Face proportions for a photo: undefined while measuring, null when no face was found. */
export function useFaceRatios(src: string | null | undefined) {
  const key = src ? `${src.length}:${src.slice(-64)}` : null;
  const [ratios, setRatios] = useState<FaceRatios | null | undefined>(key && cache.has(key) ? cache.get(key) : undefined);
  useEffect(() => {
    if (!key || !src) return setRatios(null);
    if (cache.has(key)) return setRatios(cache.get(key) ?? null);
    let alive = true;
    setRatios(undefined);
    detectLandmarks(src)
      .then((r) => (r ? measure(r.pts, r.W, r.H) : null))
      .catch(() => null)
      .then((r) => {
        cache.set(key, r);
        if (alive) setRatios(r);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ratios;
}

/** Same as the hook, for one-off use (PDF export). */
export async function faceRatiosOf(src: string) {
  const key = `${src.length}:${src.slice(-64)}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  const r = await detectLandmarks(src).catch(() => null);
  const m = r ? measure(r.pts, r.W, r.H) : null;
  cache.set(key, m);
  return m;
}
