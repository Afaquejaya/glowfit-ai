"use client";

import { useEffect, useState } from "react";
import { METRIC_LABELS } from "@/lib/skin";

const steps = Object.values(METRIC_LABELS);

// Shown while YouCam Skin AI processes the photo. Progress is illustrative, the real result arrives by polling.
export function AnalyzingOverlay({ phase }: { phase: "uploading" | "analyzing" }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 450);
    return () => clearInterval(id);
  }, []);
  const progress = Math.min(94, phase === "uploading" ? 8 + tick * 2 : 20 + tick * 3);

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-cocoa-900/90 via-cocoa-900/50 to-transparent p-6 text-white">
      <p className="font-serif text-3xl">{progress}%</p>
      <p className="font-serif text-2xl">Your Beauty Intelligence is working…</p>
      <p className="mb-4 text-sm text-white/80">
        {phase === "uploading" ? "Securely uploading your photo" : "Analyzing your skin with YouCam Skin AI"}
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {steps.map((label, i) => {
          const fill = Math.max(0, Math.min(100, (tick - i) * 14));
          return (
            <div key={label} className="text-xs">
              <div className="mb-1 flex justify-between text-white/85">
                <span>{label}</span>
              </div>
              <div className="h-1 rounded-full bg-white/25">
                <div className="h-1 rounded-full bg-white transition-all duration-500" style={{ width: `${fill}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
