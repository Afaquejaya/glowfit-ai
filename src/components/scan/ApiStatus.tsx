"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useGlowStore } from "@/store/glowfit";

type Status = { ok: boolean; demo?: boolean; error?: string; quota?: { scansLeft: number; unitsLeft: number } } | null;

/** Small badge that shows whether the live YouCam API or demo data is in use. */
export function ApiStatus() {
  const [status, setStatus] = useState<Status>(null);
  const sampleFace = useGlowStore((s) => s.sampleFace);
  useEffect(() => {
    fetch("/api/youcam/credits")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ ok: false, error: "unreachable" }));
  }, []);

  if (!status) return null;
  const q = status.quota;
  const label = !status.ok
    ? "YouCam API key problem"
    : status.demo || sampleFace
      ? sampleFace && !status.demo
        ? "Sample face (no units used)"
        : "Demo mode (sample results)"
      : q
        ? `Live YouCam Skin AI · ${q.scansLeft} free scan${q.scansLeft === 1 ? "" : "s"} left`
        : "Live YouCam Skin AI";
  return (
    <span
      title={status.error}
      className={clsx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs",
        !status.ok ? "bg-rose-100 text-rose-700" : status.demo || sampleFace ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", !status.ok ? "bg-rose-500" : status.demo || sampleFace ? "bg-amber-500" : "bg-emerald-500")} />
      {label}
    </span>
  );
}
