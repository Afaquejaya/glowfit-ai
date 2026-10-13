"use client";

// MediaPipe's WebAssembly runtime prints its startup notes (for example
// "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.") through console.error.
// They are not errors, but the Next.js dev overlay shows them as one, so they are dropped here.
// Real errors still reach the console.

const NOISE = /^(INFO:|[IW]\d{4} )|XNNPACK|TensorFlow Lite|inference_feedback_manager|landmark_projection_calculator/;

let installed = false;

/** Call once before loading MediaPipe, so its log functions bind to the filtered console. */
export function quietMediaPipe() {
  if (installed || typeof console === "undefined") return;
  installed = true;
  for (const level of ["error", "warn", "info", "log"] as const) {
    const orig = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      if (typeof args[0] === "string" && NOISE.test(args[0])) return;
      orig(...args);
    };
  }
}
