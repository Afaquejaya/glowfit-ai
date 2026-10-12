"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Camera, CalendarDays, Cpu, FlaskConical, LineChart, ScanFace, ShieldCheck } from "lucide-react";
import { useGlowStore } from "@/store/glowfit";
import { GlowLoader } from "@/components/ui/GlowLoader";
import { SkinReport } from "@/components/skin/SkinReport";
import { labelOccasion } from "@/lib/scoring";

const MODE_LABEL = { hd: "HD analysis", sd: "SD analysis", demo: "Sample analysis" } as const;

// The page a scan lands on: the full skin profile, then where to go next.
export default function SkinIntelligencePage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);
  const skin = useGlowStore((s) => s.skin);
  const selfie = useGlowStore((s) => s.selfie);
  const scans = useGlowStore((s) => s.scans);
  const moment = useGlowStore((s) => s.lab.moment);

  if (!ready) return <GlowLoader title="Reading your skin" messages={["Loading your analysis", "Building your GlowMap", "Writing your care plan"]} />;

  if (!skin) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center animate-fadeUp">
        <ScanFace className="mx-auto h-12 w-12 text-rose-500" strokeWidth={1.2} />
        <p className="eyebrow mt-4">Skin Intelligence</p>
        <h1 className="mt-2 font-serif text-5xl tracking-tight">Meet Your Skin, In Detail.</h1>
        <p className="mt-3 text-lg text-charcoal/65">
          One selfie gives you a skin score, 8 skin metrics, a GlowMap, your top priorities and a personal care plan.
        </p>
        <Link href="/scan" className="btn-primary mt-8">
          Start My Glow Scan <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  const analyzed = new Date(skin.analyzedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const next = [
    {
      href: "/decision-lab",
      icon: FlaskConical,
      title: "Find your look",
      body: `Three looks for your ${labelOccasion(moment.occasion).toLowerCase()}, matched to this skin profile.`,
      cta: "Enter Decision Lab",
    },
    {
      href: "/journey",
      icon: LineChart,
      title: "Track your skin",
      body: scans.length > 1 ? `${scans.length} scans saved. See how your skin is changing.` : "This scan is saved. Scan again in 2 weeks to see your progress.",
      cta: "Open Skin Journey",
    },
    { href: "/assistant", icon: Bot, title: "Ask about your skin", body: "Get answers that use your own scores, looks and budget.", cta: "Ask Glow Assistant" },
  ];

  return (
    <div className="mx-auto max-w-7xl animate-fadeUp">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Skin Intelligence</p>
          <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">Meet Your Skin, In Detail.</h1>
          <p className="mt-3 text-lg text-charcoal/65">AI-powered skin analysis that turns one selfie into a personalized skin profile.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip">
            <Cpu className="h-3.5 w-3.5" /> YouCam Skin AI · {MODE_LABEL[skin.mode]}
          </span>
          <span className="chip">
            <CalendarDays className="h-3.5 w-3.5" /> {analyzed}
          </span>
          <Link href="/scan" className="chip hover:text-wine-700">
            <Camera className="h-3.5 w-3.5" /> Rescan
          </Link>
        </div>
      </div>

      {skin.mode === "demo" && (
        <p className="mt-4 rounded-2xl bg-blush-50 px-4 py-3 text-sm text-charcoal/70">
          This is a sample analysis because no YouCam API key is set. Add your key in .env.local to analyze real selfies.
        </p>
      )}

      <div className="mt-6">
        <SkinReport skin={skin} photo={selfie?.dataUrl ?? "/profile/avatar.jpg"} sample={!selfie} />
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {next.map((n) => (
          <Link key={n.href} href={n.href} className="card group flex flex-col p-5 transition hover:-translate-y-0.5">
            <n.icon className="h-7 w-7 text-rose-500" strokeWidth={1.4} />
            <p className="mt-3 font-serif text-2xl">{n.title}</p>
            <p className="mt-1 flex-1 text-sm text-charcoal/65">{n.body}</p>
            <span className="mt-4 flex items-center gap-1 text-sm text-wine-700">
              {n.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </section>

      <p className="mt-6 flex items-center gap-2 text-xs text-charcoal/50">
        <ShieldCheck className="h-4 w-4" /> Your selfie and results are stored only in this browser. GlowFit gives cosmetic guidance, not medical advice.
      </p>
    </div>
  );
}
