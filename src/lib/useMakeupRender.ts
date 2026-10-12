"use client";

import { useCallback } from "react";
import { useGlowStore } from "@/store/glowfit";
import { buildMakeupEffects, type Recipe } from "./looks";
import { getRender, hash, putRender } from "./renderCache";
import { notifyLimited } from "./limits";
import { friendlyYouCam, networkSafe } from "./skin";

const RENDER_FAIL = "The try-on didn't render this time. Please try again.";

const POLL_MS = 2500;
const TIMEOUT_MS = 120_000;
const FILE_TTL_MS = 12 * 60 * 60 * 1000;

export function renderKey(selfieDataUrl: string, recipe: Recipe) {
  return `r-${hash(selfieDataUrl)}-${hash(JSON.stringify(recipe))}`;
}

async function startTask(payload: Record<string, unknown>) {
  const res = await fetch("/api/youcam/makeup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((e) => {
    throw new Error(networkSafe(e));
  });
  const body = await res.json();
  if (!res.ok) throw Object.assign(new Error(friendlyYouCam(body.error, RENDER_FAIL)), { code: body.error });
  if (body.limited) notifyLimited(body.limited);
  return body as { taskId: string; fileId?: string; demo?: boolean };
}

async function poll(taskId: string) {
  const t0 = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const res = await fetch(`/api/youcam/makeup/${encodeURIComponent(taskId)}`).catch((e) => {
      throw new Error(networkSafe(e));
    });
    const body = await res.json();
    if (body.status === "success") return body as { image: string; demo?: boolean };
    if (body.status === "error") throw new Error(friendlyYouCam(body.error, RENDER_FAIL));
    if (Date.now() - t0 > TIMEOUT_MS) throw new Error("The try-on is taking too long. Please try again.");
  }
}

/**
 * Renders a recipe on the user's selfie with YouCam Makeup VTO.
 * Cache first; the selfie is uploaded once and its file_id reused; every real call is counted.
 */
export function useMakeupRender() {
  return useCallback(async (recipe: Recipe, demoKey: string): Promise<{ key: string; image: string }> => {
    const state = useGlowStore.getState();
    const selfie = state.selfie;
    if (!selfie) throw new Error("Please scan your selfie first.");

    const key = renderKey(selfie.dataUrl, recipe);
    const cached = await getRender(key);
    if (cached) return { key, image: cached };

    const selfieKey = hash(selfie.dataUrl);
    const file = state.makeupFile;
    const fileId = file && file.selfieKey === selfieKey && Date.now() - file.at < FILE_TTL_MS ? file.fileId : undefined;
    const effects = buildMakeupEffects(recipe);

    let started;
    try {
      started = await startTask({ fileId, image: fileId ? undefined : selfie.dataUrl, effects, demoKey, sample: state.sampleFace });
    } catch (e) {
      // An expired file_id: upload the selfie again once.
      if (!fileId) throw e;
      state.setMakeupFile(null);
      started = await startTask({ image: selfie.dataUrl, effects, demoKey, sample: state.sampleFace });
    }
    if (started.fileId) useGlowStore.getState().setMakeupFile({ fileId: started.fileId, selfieKey, at: Date.now() });
    if (!started.demo) useGlowStore.getState().countRender();

    const done = await poll(started.taskId);
    // Demo images are static files, so they are not stored in the cache.
    if (!done.demo) await putRender(key, done.image);
    return { key: done.demo ? `demo:${done.image}` : key, image: done.image };
  }, []);
}

/** Resolves a stored cache key back to an image (demo keys point at static files). */
export async function resolveImage(key: string | null | undefined) {
  if (!key) return null;
  if (key.startsWith("demo:")) return key.slice(5);
  return getRender(key);
}
