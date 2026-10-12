"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Camera,
  CheckCircle2,
  Droplet,
  Droplets,
  Eye,
  Grip,
  LineChart,
  Minus,
  NotebookPen,
  Pencil,
  Plus,
  RefreshCw,
  ScanFace,
  Shapes,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { useGlowStore, type ScanEntry } from "@/store/glowfit";
import { GlowLoader } from "@/components/ui/GlowLoader";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ProgressChart } from "@/components/journey/ProgressChart";
import { CARE } from "@/lib/skinCare";
import { TRACKED, autoNote, changeLine, delta, insights, nextFocus, routine, sampleJourney, score } from "@/lib/journey";
import type { SkinMetricKey } from "@/lib/skin";
import { PoweredBy } from "@/components/ui/PoweredBy";

const ICON: Partial<Record<SkinMetricKey, LucideIcon>> = { moisture: Droplet, texture: Grip, oiliness: Droplets, pore: Shapes };
const RESCAN_DAYS = 14;

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleDateString(undefined, opts);
const short = (iso: string) => fmt(iso, { month: "short", day: "numeric" });
const long = (iso: string) => fmt(iso, { month: "short", day: "numeric", year: "numeric" });
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export default function JourneyPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);
  const stored = useGlowStore((s) => s.scans);
  const skin = useGlowStore((s) => s.skin);
  const selfie = useGlowStore((s) => s.selfie);
  const addScan = useGlowStore((s) => s.addScan);
  const [sample, setSample] = useState(false);

  // A scan made before the journey existed still counts as the starting point.
  useEffect(() => {
    if (!ready) return;
    const { scans } = useGlowStore.getState();
    if (scans.length === 0 && skin) {
      addScan({ id: `scan-${Date.parse(skin.analyzedAt) || Date.now()}`, at: skin.analyzedAt, skin, photo: selfie?.dataUrl ?? null, note: "" });
    }
  }, [ready, skin, selfie, addScan]);

  const scans = useMemo(
    () => (sample ? sampleJourney() : [...stored].sort((a, b) => a.at.localeCompare(b.at))),
    [sample, stored],
  );

  if (!ready) return <GlowLoader title="Loading your skin journey" messages={["Collecting your scans", "Measuring your progress"]} />;

  return (
    <div className="mx-auto max-w-7xl animate-fadeUp">
      <header className="relative -mx-4 overflow-hidden px-4 sm:mx-0 sm:rounded-[32px] sm:px-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/demo/looks/soft-glam.jpg"
          alt=""
          className="absolute inset-y-0 right-0 hidden h-full w-[46%] object-cover object-[50%_30%] md:block"
        />
        <span className="absolute inset-y-0 right-0 hidden w-[46%] bg-gradient-to-r from-ivory via-ivory/40 to-transparent md:block" />
        <div className="relative z-10 max-w-2xl py-2 sm:py-8">
          <p className="eyebrow mb-3">Your progress</p>
          <h1 className="font-serif text-5xl tracking-tight sm:text-7xl">Your Skin Journey.</h1>
          <p className="mt-3 font-serif text-xl text-charcoal/70 sm:text-2xl">See how your skin changes over time.</p>
          <PoweredBy apis={["skin"]} className="mt-3" />
        </div>
      </header>

      {sample && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-wine-700 px-4 py-3 text-sm text-white">
          <span className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> You&apos;re viewing a sample journey with example data. Your own scans will appear here.
          </span>
          <button onClick={() => setSample(false)} className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 hover:bg-white/25">
            <X className="h-4 w-4" /> Exit sample
          </button>
        </div>
      )}

      {scans.length === 0 ? (
        <HowItWorks onSample={() => setSample(true)} />
      ) : scans.length === 1 ? (
        <JourneyStarted scan={scans[0]} onSample={() => setSample(true)} />
      ) : (
        <Dashboard scans={scans} sample={sample} />
      )}
    </div>
  );
}

/* ---------- No scans yet: explain the flow ---------- */

const FLOW = [
  { icon: Camera, title: "Take your first scan", body: "One selfie. YouCam Skin AI measures 8 skin metrics in seconds." },
  { icon: NotebookPen, title: "It's saved automatically", body: "Every scan is added to your journey with its photo, scores and a note." },
  { icon: RefreshCw, title: `Rescan every ${RESCAN_DAYS} days`, body: "Use the same light and no makeup, so scans are easy to compare." },
  { icon: TrendingUp, title: "Watch your progress", body: "Score trend, before and after, insights and your next focus." },
];

const TIPS = ["Same spot and light each time", "Clean face, no makeup", "Face the camera, hair off the face", "Same time of day if you can"];

function HowItWorks({ onSample }: { onSample: () => void }) {
  return (
    <>
      <section className="card mt-8 p-5 sm:p-7">
        <p className="eyebrow">How Skin Journey works</p>
        <h2 className="mt-2 font-serif text-3xl text-wine-700 sm:text-4xl">Track your skin in four simple steps.</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl bg-white/70 p-5 ring-1 ring-blush-200">
              <span className="font-serif text-3xl text-rose-400">{String(i + 1).padStart(2, "0")}</span>
              <s.icon className="absolute right-5 top-5 h-7 w-7 text-rose-500" strokeWidth={1.4} />
              <p className="mt-3 font-serif text-xl">{s.title}</p>
              <p className="mt-1 text-sm text-charcoal/65">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/scan" className="btn-primary">
            Start My First Scan <ArrowRight className="h-5 w-5" />
          </Link>
          <button onClick={onSample} className="btn-outline">
            <Eye className="h-5 w-5" /> Preview a Sample Journey
          </button>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <p className="font-serif text-2xl text-wine-700">What you&apos;ll see after two scans</p>
          <ul className="mt-4 space-y-3 text-sm text-charcoal/75">
            {[
              [LineChart, "Your skin score over time, scan by scan"],
              [ArrowUp, "Which metrics improved and which dipped"],
              [ScanFace, "First scan next to your latest, side by side"],
              [Sparkles, "Insights and what to focus on next"],
              [ShoppingBag, "A simple daily routine matched to your skin"],
            ].map(([Icon, text]) => {
              const I = Icon as LucideIcon;
              return (
                <li key={text as string} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush-100 text-rose-600">
                    <I className="h-4 w-4" />
                  </span>
                  {text as string}
                </li>
              );
            })}
          </ul>
        </section>
        <section className="card p-5 sm:p-6">
          <p className="font-serif text-2xl text-wine-700">Tips for scans you can compare</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {TIPS.map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-2xl bg-blush-50 p-3 text-sm text-charcoal/75">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" /> {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-charcoal/55">Scans and photos stay in this browser only.</p>
        </section>
      </div>
    </>
  );
}

/* ---------- One scan: the journey has started ---------- */

function JourneyStarted({ scan, onSample }: { scan: ScanEntry; onSample: () => void }) {
  const next = new Date(Date.parse(scan.at) + RESCAN_DAYS * 86400000);
  const daysLeft = Math.max(0, Math.ceil((next.getTime() - Date.now()) / 86400000));
  return (
    <>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-serif text-2xl text-wine-700">Your journey has started</p>
            <span className="chip">
              <CalendarDays className="h-3.5 w-3.5" /> First scan {long(scan.at)}
            </span>
          </div>
          <div className="mt-5 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
            <ScoreBlock value={scan.skin.overall} sub="Your starting score" />
            <ProgressChart points={[{ id: scan.id, label: short(scan.at), value: scan.skin.overall }]} ghost={daysLeft ? `in ${daysLeft} days` : "Scan now"} />
          </div>
          <MetricTiles first={scan} last={scan} />
        </section>

        <section className="card flex flex-col p-5 sm:p-6">
          <p className="font-serif text-2xl text-wine-700">Next step</p>
          <p className="mt-2 text-sm text-charcoal/70">
            Scan again {daysLeft ? `around ${long(next.toISOString())}` : "now"} to see your first change. Your score trend, before and after, and insights unlock with
            your second scan.
          </p>
          <ol className="mt-5 space-y-3">
            {FLOW.map((s, i) => {
              const done = i < 2;
              return (
                <li key={s.title} className="flex items-center gap-3 text-sm">
                  <span
                    className={clsx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      done ? "bg-sage text-white" : i === 2 ? "bg-wine-700 text-white" : "bg-blush-100 text-charcoal/50",
                    )}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={clsx(done && "text-charcoal/50 line-through")}>{s.title}</span>
                </li>
              );
            })}
          </ol>
          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            <Link href="/scan" className="btn-primary !px-5 !py-2.5 !text-base">
              <RefreshCw className="h-4 w-4" /> Scan Again
            </Link>
            <button onClick={onSample} className="btn-outline !px-5 !py-2.5 !text-base">
              <Eye className="h-4 w-4" /> Preview Sample
            </button>
          </div>
        </section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">
        <Timeline scans={[scan]} selected={scan.id} onSelect={() => undefined} />
        <Routine scan={scan} />
      </div>
    </>
  );
}

/* ---------- Two or more scans: the full dashboard ---------- */

type Range = "all" | "3" | "6";

function Dashboard({ scans, sample }: { scans: ScanEntry[]; sample: boolean }) {
  const [range, setRange] = useState<Range>("all");
  const [selected, setSelected] = useState(scans[scans.length - 1].id);
  const current = scans.find((s) => s.id === selected) ?? scans[scans.length - 1];
  const first = scans[0];
  const shown = range === "all" ? scans : scans.slice(-Number(range));
  const overallDelta = current.skin.overall - first.skin.overall;
  const tips = insights(scans.slice(0, scans.indexOf(current) + 1).length > 1 ? scans.slice(0, scans.indexOf(current) + 1) : scans);
  const focus = nextFocus(current.skin);

  return (
    <>
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card flex flex-col p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:divide-x lg:divide-blush-200">
            <div>
              <p className="font-serif text-2xl text-wine-700">Skin Score</p>
              <div className="mt-4">
                <ScoreBlock value={current.skin.overall} delta={overallDelta} sub="since first scan" />
              </div>
            </div>
            <div className="min-w-0 lg:pl-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-serif text-2xl text-wine-700">Your Progress Over Time</p>
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value as Range)}
                  aria-label="Scans to show"
                  className="rounded-full border border-blush-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-rose-400"
                >
                  <option value="all">All scans ({scans.length})</option>
                  {scans.length > 3 && <option value="3">Last 3 scans</option>}
                  {scans.length > 6 && <option value="6">Last 6 scans</option>}
                </select>
              </div>
              <div className="mt-2">
                <ProgressChart points={shown.map((s) => ({ id: s.id, label: short(s.at), value: s.skin.overall }))} />
              </div>
            </div>
          </div>
          <JourneyStats scans={scans} first={first} current={current} />
          <MetricTiles first={first} last={current} />
        </section>

        <section className="card flex flex-col p-5 sm:p-6">
          <p className="flex items-center gap-2 font-serif text-2xl text-wine-700">
            <Sparkles className="h-5 w-5" /> GlowFit Insights
          </p>
          <ul className="mt-4 space-y-3">
            {tips.map((t) => {
              const Icon = t.key === "overall" ? TrendingUp : ICON[t.key] ?? Sparkles;
              return (
                <li key={t.title} className="flex gap-3 rounded-2xl bg-white/70 p-3.5 ring-1 ring-blush-200">
                  <Icon className={clsx("mt-0.5 h-6 w-6 shrink-0", t.tone === "down" ? "text-rose-600" : "text-rose-500")} strokeWidth={1.4} />
                  <span>
                    <span className="block font-serif text-lg leading-snug">{t.title}</span>
                    <span className="mt-0.5 block text-sm text-charcoal/60">{t.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 font-serif text-xl text-wine-700">Next Focus</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {focus.map((m) => (
              <div key={m.key} className="rounded-2xl bg-white/70 p-3 ring-1 ring-blush-200">
                <p className="flex items-baseline justify-between font-serif text-lg">
                  {m.label} <span className="text-base text-charcoal/60">{m.score}</span>
                </p>
                <p className="mt-0.5 text-xs leading-snug text-charcoal/60">{CARE[m.key].need}</p>
              </div>
            ))}
          </div>
          <Link href="/scan" className="btn-primary mt-5 w-full !text-base">
            Refresh My Skin Analysis <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>

      <Compare first={first} current={current} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Timeline scans={scans} selected={current.id} onSelect={setSelected} />
        <Notes scans={scans} readOnly={sample} />
      </div>
      <div className="mt-6">
        <Routine scan={current} />
      </div>
    </>
  );
}

function JourneyStats({ scans, first, current }: { scans: ScanEntry[]; first: ScanEntry; current: ScanEntry }) {
  const last = scans[scans.length - 1];
  const days = Math.max(1, Math.round((Date.parse(last.at) - Date.parse(first.at)) / 86400000));
  const nextIn = Math.ceil((Date.parse(last.at) + RESCAN_DAYS * 86400000 - Date.now()) / 86400000);
  const improved = first.skin.metrics.filter((m) => (delta(first.skin, current.skin, m.key) ?? 0) > 1).length;
  const stats = [
    { label: "Scans tracked", value: String(scans.length) },
    { label: "Days tracked", value: String(days) },
    { label: "Areas improved", value: `${improved} of ${first.skin.metrics.length}` },
    { label: "Next scan", value: nextIn > 0 ? `in ${nextIn} days` : "Due now" },
  ];
  return (
    <dl className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-blush-50 p-4 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label}>
          <dt className="text-xs text-charcoal/55">{s.label}</dt>
          <dd className="font-serif text-2xl">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ScoreBlock({ value, delta: d, sub }: { value: number; delta?: number; sub: string }) {
  return (
    <div className="flex items-center gap-5">
      <ScoreRing value={value} size={112} stroke={12} className="shrink-0" />
      <div>
        <p className="whitespace-nowrap font-serif text-6xl leading-none">
          {value}
          <span className="text-2xl text-charcoal/50"> / 100</span>
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-charcoal/65">
          {d !== undefined && <Trend d={d} />}
          {d !== undefined && <span className="font-medium text-charcoal">{signed(d)}</span>} {sub}
        </p>
      </div>
    </div>
  );
}

function Trend({ d, className }: { d: number | null; className?: string }) {
  if (d === null || Math.abs(d) <= 1) return <Minus className={clsx("h-4 w-4 text-charcoal/40", className)} />;
  return d > 0 ? <ArrowUp className={clsx("h-4 w-4 text-sage", className)} /> : <ArrowDown className={clsx("h-4 w-4 text-rose-600", className)} />;
}

function MetricTiles({ first, last }: { first: ScanEntry; last: ScanEntry }) {
  const same = first.id === last.id;
  return (
    <div className="mt-auto grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
      {TRACKED.map((key) => {
        const Icon = ICON[key] ?? Sparkles;
        const v = score(last.skin, key);
        const d = same ? null : delta(first.skin, last.skin, key);
        const label = last.skin.metrics.find((m) => m.key === key)?.label ?? key;
        if (v === null) return null;
        return (
          <div key={key} className="flex gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-blush-200">
            <Icon className="mt-1 h-7 w-7 shrink-0 text-rose-500" strokeWidth={1.3} />
            <div className="min-w-0">
              <p className="text-sm">{label}</p>
              <p className="flex items-center gap-1.5 font-serif text-3xl">
                {v} {!same && <Trend d={d} className="h-5 w-5" />}
                {!same && d !== null && <span className="text-sm text-charcoal/50">{signed(d)}</span>}
              </p>
              <p className="mt-1 text-xs leading-snug text-charcoal/55">{same ? CARE[key].need : changeLine(key, d)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Photo({ src, className }: { src: string | null; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={clsx("object-cover", className)} />
  ) : (
    <span className={clsx("flex items-center justify-center bg-blush-100 text-rose-400", className)}>
      <ScanFace className="h-6 w-6" strokeWidth={1.4} />
    </span>
  );
}

const COMPARE_KEYS: SkinMetricKey[] = ["moisture", "texture", "oiliness", "pore"];

function Compare({ first, current }: { first: ScanEntry; current: ScanEntry }) {
  const lowest = (s: ScanEntry) => [...s.skin.metrics].sort((a, b) => a.score - b.score).slice(0, 2).map((m) => m.label.toLowerCase());
  const highest = (s: ScanEntry) => [...s.skin.metrics].sort((a, b) => b.score - a.score).slice(0, 2).map((m) => m.label.toLowerCase());
  const improved = first.skin.metrics.filter((m) => (delta(first.skin, current.skin, m.key) ?? 0) > 1).length;
  const rows = (s: ScanEntry) => [
    ["Skin Score", s.skin.overall] as const,
    ...COMPARE_KEYS.map((k) => [s.skin.metrics.find((m) => m.key === k)?.label ?? k, score(s.skin, k)] as const),
  ];

  const Column = ({ title, date, scan, foot, tone }: { title: string; date: string; scan: ScanEntry; foot: string; tone: "rose" | "sage" }) => (
    <div className="flex flex-col rounded-2xl bg-white/70 p-4 ring-1 ring-blush-200">
      <p className="font-serif text-xl">{title}</p>
      <p className="text-xs text-charcoal/55">{date}</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
        <Photo src={scan.photo} className="aspect-square w-full rounded-xl" />
        <dl className="space-y-1.5 self-center text-sm">
          {rows(scan).map(([label, v]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="truncate text-charcoal/55">{label}</dt>
              <dd className="font-serif">{v ?? "--"}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className={clsx("mt-3 rounded-full px-3 py-1.5 text-center text-xs", tone === "sage" ? "bg-sage/10 text-sage" : "bg-blush-100 text-rose-600")}>{foot}</p>
    </div>
  );

  return (
    <section className="card mt-6 p-5 sm:p-6">
      <p className="eyebrow">Your progress</p>
      <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <Column title="First Scan" date={long(first.at)} scan={first} foot={`Focus then: ${lowest(first).join(" and ")}`} tone="rose" />
        <ArrowRight className="hidden h-5 w-5 self-center text-rose-400 lg:block" />
        <Column title="Current" date={long(current.at)} scan={current} foot={`Strongest now: ${highest(current).join(" and ")}`} tone="sage" />
        <ArrowRight className="hidden h-5 w-5 self-center text-rose-400 lg:block" />
        <div className="flex flex-col rounded-2xl bg-white/70 p-4 ring-1 ring-blush-200">
          <p className="font-serif text-xl">Change</p>
          <p className="text-xs text-charcoal/55">Since first scan</p>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <div className="relative grid aspect-square w-full grid-cols-2 overflow-hidden rounded-xl">
              <Photo src={first.photo} className="h-full w-full object-left" />
              <Photo src={current.photo} className="h-full w-full object-right" />
              <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white" />
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/85 px-1.5 text-[10px] text-charcoal/70">Before</span>
              <span className="absolute bottom-1.5 right-1.5 rounded-full bg-white/85 px-1.5 text-[10px] text-charcoal/70">After</span>
            </div>
            <dl className="space-y-1.5 self-center text-sm">
              {[
                ["Skin Score", current.skin.overall - first.skin.overall] as const,
                ...COMPARE_KEYS.map((k) => [current.skin.metrics.find((m) => m.key === k)?.label ?? k, delta(first.skin, current.skin, k)] as const),
              ].map(
                ([k, d]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <dt className="flex-1 truncate text-charcoal/55">{k}</dt>
                    <Trend d={d} className="h-3.5 w-3.5 shrink-0" />
                    <dd className={clsx("w-9 text-right font-serif", d !== null && d > 1 ? "text-sage" : d !== null && d < -1 ? "text-rose-600" : "text-charcoal/60")}>
                      {d === null ? "--" : signed(d)}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          </div>
          <p className="mt-3 rounded-full bg-sage/10 px-3 py-1.5 text-center text-xs text-sage">
            {improved} of {first.skin.metrics.length} skin areas improved
          </p>
        </div>
      </div>
    </section>
  );
}

function Timeline({ scans, selected, onSelect }: { scans: ScanEntry[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <section className="card p-5">
      <p className="font-serif text-2xl text-wine-700">My Scan Timeline</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {scans.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            aria-pressed={s.id === selected}
            title={`Compare with ${long(s.at)}`}
            className={clsx(
              "flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-2xl p-1.5 text-xs transition",
              s.id === selected ? "bg-blush-100 ring-2 ring-rose-400" : "hover:bg-blush-50",
            )}
          >
            <Photo src={s.photo} className="h-14 w-14 rounded-xl" />
            <span className="text-charcoal/60">{short(s.at)}</span>
            <span className="font-serif text-base">{s.skin.overall}</span>
          </button>
        ))}
        <Link
          href="/scan"
          className="flex min-h-[108px] w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-rose-400/60 p-1.5 text-xs text-charcoal/60 hover:bg-blush-50"
        >
          <Plus className="h-6 w-6 text-rose-500" />
          New Scan
        </Link>
      </div>
      {scans.length > 1 && <p className="mt-2 text-xs text-charcoal/50">Tap a scan to compare it with your first one.</p>}
    </section>
  );
}

function Notes({ scans, readOnly }: { scans: ScanEntry[]; readOnly: boolean }) {
  const updateScan = useGlowStore((s) => s.updateScan);
  const removeScan = useGlowStore((s) => s.removeScan);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const ordered = [...scans].reverse();
  return (
    <section className="card p-5">
      <p className="flex items-center gap-2 font-serif text-2xl text-wine-700">
        <NotebookPen className="h-5 w-5" /> Skin Notes
      </p>
      <ul className="mt-3 max-h-[260px] divide-y divide-blush-200 overflow-y-auto">
        {ordered.map((s) => {
          const prev = scans[scans.indexOf(s) - 1];
          const text = s.note || autoNote(s, prev);
          return (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <Photo src={s.photo} className="h-9 w-9 shrink-0 rounded-lg" />
              <span className="w-16 shrink-0 text-xs text-charcoal/55">{short(s.at)}</span>
              {editing === s.id ? (
                <input
                  autoFocus
                  value={draft}
                  maxLength={120}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    updateScan(s.id, { note: draft.trim() });
                    setEditing(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className="min-w-0 flex-1 rounded-lg border border-blush-200 bg-white px-2 py-1 text-sm outline-none focus:border-rose-400"
                />
              ) : (
                <span className={clsx("min-w-0 flex-1 text-sm", !s.note && "text-charcoal/70")}>{text}</span>
              )}
              {!readOnly && editing !== s.id && (
                <span className="flex shrink-0 gap-1">
                  <button
                    aria-label="Edit note"
                    onClick={() => {
                      setDraft(s.note || text);
                      setEditing(s.id);
                    }}
                    className="rounded-full p-1.5 text-charcoal/40 hover:text-wine-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Remove scan"
                    onClick={() => window.confirm(`Remove the scan from ${long(s.at)} from your journey?`) && removeScan(s.id)}
                    className="rounded-full p-1.5 text-charcoal/40 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Routine({ scan }: { scan: ScanEntry }) {
  const steps = routine(scan.skin);
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-2xl text-wine-700">My Routine</p>
        <Link href="/profile#skin-profile" className="flex items-center gap-1 text-sm text-rose-600 hover:text-wine-700">
          Care plan <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {steps.map((s) => (
          <li key={s.id} className="text-center" title={s.detail}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.image} alt="" className="h-28 w-full rounded-xl object-cover" />
            <p className="mt-1.5 text-sm">{s.name}</p>
            <p className="text-[11px] text-charcoal/50">{s.when}</p>
            <p className="mt-0.5 text-xs leading-snug text-rose-600">{s.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-charcoal/55">
        <Sun className="h-3.5 w-3.5" /> Matched to your latest scan. Serum picked for your lowest area.
      </p>
    </section>
  );
}
