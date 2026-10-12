"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { LIMIT_EVENT, type LimitReason } from "@/lib/limits";

const TEXT: Record<LimitReason, string> = {
  visitor: "You've used this live demo's free YouCam calls, so you're now seeing sample results. Run GlowFit locally with your own free YouCam key for unlimited tries.",
  reserve: "This live demo is saving its last YouCam units, so you're seeing sample results for now. Everything else works as normal.",
};

/** A small notice that appears when the public demo answers with sample results instead of a real YouCam call. */
export function LimitNotice() {
  const [reason, setReason] = useState<LimitReason | null>(null);
  useEffect(() => {
    const on = (e: Event) => setReason((e as CustomEvent<LimitReason>).detail);
    window.addEventListener(LIMIT_EVENT, on);
    return () => window.removeEventListener(LIMIT_EVENT, on);
  }, []);
  if (!reason) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-charcoal/80 shadow-soft ring-1 ring-blush-200 lg:bottom-6">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
      <p className="flex-1">{TEXT[reason]}</p>
      <button onClick={() => setReason(null)} aria-label="Dismiss" className="text-charcoal/50 hover:text-charcoal">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
