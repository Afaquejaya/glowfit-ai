"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ScanFace } from "lucide-react";
import { useGlowStore } from "@/store/glowfit";
import { Stepper } from "@/components/lab/shared";
import { GlowLoader } from "@/components/ui/GlowLoader";
import { StepMoment } from "@/components/lab/StepMoment";
import { StepLooks } from "@/components/lab/StepLooks";
import { StepBudget } from "@/components/lab/StepBudget";
import { StepFineTune } from "@/components/lab/StepFineTune";
import { StepDecision } from "@/components/lab/StepDecision";

// What GlowFit is "doing" while each step opens, so a step change reads as progress.
const STEP_LOADING: Record<number, { title: string; messages: string[] }> = {
  1: { title: "Loading your moment", messages: ["Reading your occasion", "Preparing moment ideas"] },
  2: { title: "Designing your 3 looks", messages: ["Reading your skin profile", "Scoring looks for your moment", "Preparing your try-on"] },
  3: { title: "Optimizing your budget", messages: ["Matching shades across brands", "Comparing prices", "Keeping what matters most"] },
  4: { title: "Opening the experiment lab", messages: ["Loading shade examples", "Calculating impact scores"] },
  5: { title: "Finalizing your decision", messages: ["Checking skin compatibility", "Scoring occasion fit", "Totaling your look"] },
};
const TRANSITION_MS = 1200;

export default function DecisionLabPage() {
  // Wait for the persisted store so the page doesn't flash the wrong step.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const selfie = useGlowStore((s) => s.selfie);
  const step = useGlowStore((s) => s.lab.step);
  const chosen = useGlowStore((s) => s.lab.chosenLook);

  const [switching, setSwitching] = useState(false);
  const prevStep = useRef<number | null>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!ready) return;
    const first = prevStep.current === null;
    prevStep.current = step;
    if (first) return;
    setSwitching(true);
    const id = setTimeout(() => setSwitching(false), TRANSITION_MS);
    return () => clearTimeout(id);
  }, [step, ready]);

  if (!ready) return <GlowLoader title="Loading your Decision Lab" messages={["Restoring your session", "Loading your looks"]} />;

  if (!selfie) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blush-100">
          <ScanFace className="h-8 w-8 text-wine-700" strokeWidth={1.4} />
        </span>
        <h1 className="mt-5 font-serif text-4xl">Start with your skin</h1>
        <p className="mt-2 text-charcoal/65">
          The Decision Lab builds every look on your own face. Take a quick selfie scan first.
        </p>
        <Link href="/scan" className="btn-primary mt-6">
          Scan My Skin <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  const safeStep = step >= 3 && !chosen ? 2 : step;

  return (
    <div className="mx-auto max-w-[1400px]">
      <Stepper />
      {switching ? (
        <GlowLoader {...STEP_LOADING[safeStep]} />
      ) : (
        <div key={safeStep} className="animate-fadeUp">
          {safeStep === 1 && <StepMoment />}
      {safeStep === 2 && <StepLooks />}
      {safeStep === 3 && <StepBudget />}
      {safeStep === 4 && <StepFineTune />}
          {safeStep === 5 && <StepDecision />}
        </div>
      )}
    </div>
  );
}
