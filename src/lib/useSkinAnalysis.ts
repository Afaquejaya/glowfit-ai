"use client";

import { useCallback, useRef, useState } from "react";
import { friendlyError, networkSafe, type FaceAttrs, type SkinResult } from "./skin";
import type { PreparedImage } from "./image";
import { notifyLimited } from "./limits";

type Phase = "idle" | "uploading" | "analyzing" | "done" | "error";

const POLL_MS = 2000;
const TIMEOUT_MS = 120_000;
const FACE_TIMEOUT_MS = 90_000;

/** Polls the YouCam Face Analyzer task that the skin route started. Never throws. */
async function pollFace(taskId: string | null | undefined): Promise<FaceAttrs | null> {
  if (!taskId) return null;
  const t0 = Date.now();
  while (Date.now() - t0 < FACE_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    try {
      const body = await (await fetch(`/api/youcam/face/${encodeURIComponent(taskId)}`)).json();
      if (body.status === "success") return (body.face as FaceAttrs | null) ?? null;
      if (body.status === "error") return null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Starts a skin-analysis task through our API route and polls it until it finishes. */
export function useSkinAnalysis() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const run = useCallback(async (image: PreparedImage, opts?: { sample?: boolean }): Promise<SkinResult | null> => {
    cancelled.current = false;
    setError(null);
    setPhase("uploading");
    try {
      const form = new FormData();
      form.append("image", new File([image.blob], "selfie.jpg", { type: "image/jpeg" }));
      form.append("width", String(image.width));
      form.append("height", String(image.height));
      if (opts?.sample) form.append("sample", "1");
      const start = await fetch("/api/youcam/skin", { method: "POST", body: form });
      const started = await start.json();
      if (!start.ok) throw new Error(friendlyError(started.error));
      if (started.limited) notifyLimited(started.limited);

      setPhase("analyzing");
      const face = pollFace(started.faceTaskId);
      const t0 = Date.now();
      while (!cancelled.current) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const res = await fetch(`/api/youcam/skin/${encodeURIComponent(started.taskId)}?mode=${started.mode}`);
        const body = await res.json();
        if (body.status === "success") {
          const result = { ...(body.result as SkinResult), face: await face };
          setPhase("done");
          return result;
        }
        if (body.status === "error") throw new Error(friendlyError(body.error));
        if (Date.now() - t0 > TIMEOUT_MS) throw new Error("The analysis is taking too long. Please try again.");
      }
      return null;
    } catch (e) {
      setError(networkSafe(e));
      setPhase("error");
      return null;
    }
  }, []);

  const cancel = useCallback(() => {
    cancelled.current = true;
    setPhase("idle");
  }, []);

  return { phase, error, run, cancel };
}
