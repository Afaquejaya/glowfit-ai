"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Sparkle } from "lucide-react";

/**
 * Branded loading state: orbiting sparkle, cycling status lines and a shimmer bar,
 * so waiting reads as "GlowFit is working" instead of a frozen page.
 */
export function GlowLoader({
  title,
  messages,
  variant = "panel",
  className,
}: {
  title: string;
  messages: string[];
  variant?: "panel" | "overlay";
  className?: string;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % messages.length), 1100);
    return () => clearInterval(id);
  }, [messages.length]);

  const overlay = variant === "overlay";
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "flex flex-col items-center justify-center gap-4 text-center",
        overlay ? "absolute inset-0 z-10 bg-cocoa-900/45 text-white backdrop-blur-[3px]" : "min-h-[55vh] text-wine-700",
        className,
      )}
    >
      <span className="relative flex h-20 w-20 items-center justify-center">
        <span className={clsx("absolute inset-0 animate-pulseRing rounded-full border-2", overlay ? "border-white/80" : "border-rose-400/70")} />
        <span
          className={clsx("absolute inset-2 animate-pulseRing rounded-full border", overlay ? "border-white/50" : "border-rose-400/40")}
          style={{ animationDelay: "0.5s" }}
        />
        <span className="absolute inset-0 animate-orbit">
          <span className={clsx("absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full", overlay ? "bg-white" : "bg-rose-500")} />
        </span>
        <span className={clsx("flex h-12 w-12 items-center justify-center rounded-full", overlay ? "bg-white/15" : "bg-blush-100")}>
          <Sparkle className="h-6 w-6" strokeWidth={1.6} />
        </span>
      </span>
      <div>
        <p className={clsx("font-serif", overlay ? "text-xl" : "text-3xl")}>{title}</p>
        <p key={i} className={clsx("mt-1 animate-fadeUp text-sm", overlay ? "text-white/85" : "text-charcoal/60")}>
          {messages[i]}…
        </p>
      </div>
      <span className={clsx("relative h-1 w-40 overflow-hidden rounded-full", overlay ? "bg-white/25" : "bg-blush-200")}>
        <span className={clsx("absolute inset-y-0 left-0 w-2/5 animate-shimmer rounded-full", overlay ? "bg-white" : "bg-rose-500")} />
      </span>
    </div>
  );
}
