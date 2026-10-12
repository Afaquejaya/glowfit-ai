"use client";

import { useCallback, useEffect, useState } from "react";
import { useGlowStore } from "@/store/glowfit";
import { getRender, hash, putRender } from "./renderCache";
import { resolveImage } from "./useMakeupRender";
import { friendlyYouCam } from "./skin";
import { notifyLimited } from "./limits";

const POLL_MS = 2500;
const TIMEOUT_MS = 150_000;
const MAX_SIDE = 1024; // hair-transfer accepts JPG up to 1024px on the long side

export type HairGender = "women" | "men" | "any";
export type HairStyle = { id: string; title: string; thumb: string | null; gender: HairGender; trend?: number; hot?: boolean };

// Most requested cuts right now (salon and search trend round-ups), best first.
// A YouCam template whose name matches one of these is marked Trending and listed first.
const TRENDING: Record<"women" | "men", [RegExp, string][]> = {
  women: [
    [/butterfly/i, "Butterfly Cut"],
    [/curtain/i, "Curtain Bangs"],
    [/long.*layer|layer/i, "Long Layers"],
    [/wolf/i, "Wolf Cut"],
    [/french bob|bob/i, "Bob"],
    [/lob/i, "Lob"],
    [/beach|wav/i, "Beach Waves"],
    [/pixie/i, "Pixie"],
    [/shag/i, "Shag"],
    [/ponytail|pony/i, "Sleek Ponytail"],
    [/bang|fringe/i, "Bangs"],
    [/curl/i, "Curls"],
    [/bun|updo/i, "Updo"],
  ],
  men: [
    [/textured crop|french crop|crop/i, "Textured Crop"],
    [/taper|fade/i, "Fade"],
    [/mullet/i, "Modern Mullet"],
    [/quiff|pompadour/i, "Quiff"],
    [/buzz/i, "Buzz Cut"],
    [/side part|comb/i, "Side Part"],
    [/slick/i, "Slick Back"],
    [/curl|fringe/i, "Curly Fringe"],
    [/two[- ]block|undercut/i, "Two Block"],
    [/man bun|bun/i, "Man Bun"],
  ],
};

/** Trend rank for a style (lower is hotter), or undefined when it is not on the list. */
function trendRank(s: HairStyle, gender: "women" | "men") {
  const i = TRENDING[gender].findIndex(([re]) => re.test(s.title));
  return i === -1 ? undefined : i;
}

/** Styles for one gender, trending first; styles that suit anyone are included. */
export function stylesFor(styles: HairStyle[], gender: "women" | "men"): HairStyle[] {
  const sorted = styles
    .filter((s) => s.gender === gender || s.gender === "any")
    .map((s) => ({ ...s, trend: trendRank(s, gender) }))
    .sort((a, b) => (a.trend ?? 99) - (b.trend ?? 99));
  // Badge only the best match for each of the top trends, so "Trending" stays meaningful.
  const seen = new Set<number>();
  return sorted.map((s) => {
    const hot = s.trend !== undefined && s.trend < 6 && !seen.has(s.trend);
    if (hot) seen.add(s.trend!);
    return { ...s, hot };
  });
}

const HINTS: Record<string, string> = {
  error_no_shoulder: "Hairstyle try-on needs your shoulders in the photo. Retake the selfie a little further from the camera.",
  error_large_face_angle: "Face the camera straight on for hairstyle try-on.",
  error_face_pose: "Face the camera straight on for hairstyle try-on.",
  error_insufficient_landmarks: "We couldn't see enough of your face and shoulders. Try a clearer, wider photo.",
  error_hair_too_short: "Your hair in the photo is too short for this style transfer.",
};

function friendly(code: string) {
  return friendlyYouCam(code, "The hairstyle try-on didn't work this time. Please try again.", HINTS);
}

/** Loads YouCam's real hairstyle templates once. `reason` explains an empty list. */
export function useHairstyles() {
  const [state, setState] = useState<{ styles: HairStyle[]; loading: boolean; reason: "demo" | "error" | null; error?: string }>({
    styles: [],
    loading: true,
    reason: null,
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch("/api/youcam/hairstyles")
      .then((r) => r.json())
      .then((b: { templates?: HairStyle[]; demo?: boolean; error?: string }) => {
        if (!alive) return;
        const styles = b.templates ?? [];
        setState({ styles, loading: false, reason: styles.length ? null : b.demo ? "demo" : "error", error: b.error });
      })
      .catch((e) => alive && setState({ styles: [], loading: false, reason: "error", error: String(e) }));
    return () => {
      alive = false;
    };
  }, [attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

/** Re-encodes any image as a JPEG data URL no larger than MAX_SIDE. */
async function toJpeg(src: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Puts a hairstyle on an already rendered look (so makeup and hair show together).
 * Cached by source image + style, so trying the same style again is free.
 */
export function useHairRender() {
  return useCallback(async (sourceKey: string, style: HairStyle): Promise<{ key: string; image: string; demo: boolean }> => {
    const src = await resolveImage(sourceKey);
    if (!src) throw new Error("Your current look image is missing. Go back a step and render it again.");

    const key = `h-${hash(src)}-${hash(style.id)}`;
    const cached = await getRender(key);
    if (cached) return { key, image: cached, demo: false };

    const image = await toJpeg(src);
    const res = await fetch("/api/youcam/hair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, templateId: style.id, sample: useGlowStore.getState().sampleFace }),
    });
    const started = await res.json();
    if (!res.ok) throw new Error(friendly(started.error || "render_failed"));
    if (!started.demo) useGlowStore.getState().countRender(2);
    // Demo mode has no hairstyle engine.
    if (started.limited) notifyLimited(started.limited);
    if (started.demo) {
      throw new Error(
        started.sample
          ? "Hairstyles are real YouCam renders, so they need your own selfie. Scan your face to try them."
          : started.limited
            ? "You've used this demo's free try-ons. Run GlowFit locally with your own free YouCam key to keep going."
            : "Hairstyle try-on needs your YouCam API key.",
      );
    }

    const t0 = Date.now();
    for (;;) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      const body = await (await fetch(`/api/youcam/hair/${encodeURIComponent(started.taskId)}`)).json();
      if (body.status === "error") throw new Error(friendly(body.error || "render_failed"));
      if (body.status === "success") {
        // Demo mode has no hairstyle engine, so the look stays as it is.
        if (body.demo) return { key: sourceKey, image: src, demo: true };
        await putRender(key, body.image);
        return { key, image: body.image, demo: false };
      }
      if (Date.now() - t0 > TIMEOUT_MS) throw new Error("The hairstyle try-on is taking too long. Please try again.");
    }
  }, []);
}
