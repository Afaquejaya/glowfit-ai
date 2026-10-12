"use client";

import clsx from "clsx";
import { ArrowRight, Check, Clock, Gem, Wallet } from "lucide-react";
import { useGlowStore } from "@/store/glowfit";
import { labelOccasion, OCCASIONS, type Moment, type StylePref, type TimeOfDay } from "@/lib/scoring";
import { money } from "@/lib/catalog";
import { LabHeader } from "./shared";

const TIMES: TimeOfDay[] = ["morning", "afternoon", "evening"];
const STYLES: StylePref[] = ["natural", "elegant", "glam", "bold"];
const BUDGETS = [1500, 2000, 3000, 4000, 5000];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const img = (id: string) => `/demo/moments/${id}.jpg`;

function Pills<T extends string | number>({
  value,
  options,
  onChange,
  format,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o)}
          onClick={() => onChange(o)}
          className={clsx(
            "rounded-full px-3 py-1 text-xs transition",
            o === value ? "bg-cocoa-800 text-white" : "bg-blush-100 text-wine-700 hover:bg-blush-200",
          )}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}

// Step 1: pick the moment. Uses static demo photos only, no API calls.
export function StepMoment() {
  const moment = useGlowStore((s) => s.lab.moment);
  const looksGenerated = useGlowStore((s) => s.lab.looksGenerated);
  const updateLab = useGlowStore((s) => s.updateLab);
  const setMoment = useGlowStore((s) => s.setMoment);
  const set = (patch: Partial<Moment>) => updateLab({ moment: { ...moment, ...patch } });
  const selected = OCCASIONS.find((o) => o.id === moment.occasion)!;

  const confirm = () => {
    setMoment(labelOccasion(moment.occasion));
    updateLab({ momentConfirmed: true, step: 2 });
  };

  return (
    <>
      <LabHeader
        eyebrow="Moment Mode"
        title="What Are You Getting Ready For?"
        subtitle="Your moment changes the look. Tell GlowFit where you're going."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
        <div id="occasions" className="grid grid-cols-12 gap-4">
          {OCCASIONS.map((o, i) => {
            const active = o.id === moment.occasion;
            return (
              <button
                key={o.id}
                onClick={() => set({ occasion: o.id })}
                className={clsx(
                  "group card overflow-hidden p-0 text-left transition",
                  i < 4 ? "col-span-6 md:col-span-3" : "col-span-6 md:col-span-4",
                  active ? "ring-2 ring-rose-400" : "hover:-translate-y-0.5",
                )}
              >
                <div className="relative m-1.5 h-36 overflow-hidden rounded-[20px] sm:h-44">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(o.id)} alt={o.label} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  {active && (
                    <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-wine-700 text-white">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <div className="px-4 pb-4 pt-1.5">
                  <p className="font-serif text-2xl text-wine-700">{o.label}</p>
                  <p className="text-sm leading-snug text-charcoal/65">{o.line}</p>
                </div>
              </button>
            );
          })}
        </div>

        <aside className="card h-fit p-5">
          <h2 className="mb-3 font-serif text-3xl text-wine-700">Your Moment</h2>
          <div className="relative h-44 overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(selected.id)} alt={selected.label} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/95 via-white/70 to-transparent p-3 pt-10">
              <p className="font-serif text-xl">Going to a {selected.label}</p>
              <p className="text-xs text-charcoal/70">{selected.line}</p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-blush-200 rounded-2xl border border-blush-200 bg-white/60">
            <div className="space-y-2 p-3">
              <p className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-rose-500" /> Time <span className="ml-auto text-charcoal/70">{cap(moment.time)}</span>
              </p>
              <Pills value={moment.time} options={TIMES} onChange={(time) => set({ time })} format={cap} />
            </div>
            <div className="space-y-2 p-3">
              <p className="flex items-center gap-2 text-sm">
                <Gem className="h-4 w-4 text-rose-500" /> Style <span className="ml-auto text-charcoal/70">{cap(moment.style)}</span>
              </p>
              <Pills value={moment.style} options={STYLES} onChange={(style) => set({ style })} format={cap} />
            </div>
            <div className="space-y-2 p-3">
              <p className="flex items-center gap-2 text-sm">
                <Wallet className="h-4 w-4 text-rose-500" /> Budget <span className="ml-auto text-charcoal/70">{money(moment.budget)}</span>
              </p>
              <Pills value={moment.budget} options={BUDGETS} onChange={(budget) => set({ budget })} format={money} />
            </div>
          </div>

          <button className="btn-primary mt-4 w-full text-base" onClick={confirm}>
            Continue to Decision Lab <ArrowRight className="h-5 w-5" />
          </button>
          {looksGenerated && (
            <p className="mt-2 text-center text-xs text-charcoal/55">
              Your 3 looks are kept. Changing the moment only updates their scores.
            </p>
          )}
        </aside>
      </div>

      <section className="card relative mt-6 overflow-hidden bg-gradient-to-r from-blush-100 via-white/70 to-blush-100 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="max-w-sm">
            <h3 className="font-serif text-3xl leading-tight text-wine-700">The right look for every moment.</h3>
            <p className="mt-2 text-sm text-charcoal/70">
              From everyday to extraordinary, GlowFit creates personalized looks that match your moment, your skin and your style.
            </p>
          </div>
          <div className="flex flex-1 justify-center gap-3 lg:justify-end">
            {["vacation", "party", "work", "wedding"].map((id, i) => (
              <figure
                key={id}
                className="w-20 bg-white p-1.5 pb-5 shadow-card sm:w-32"
                style={{ transform: `rotate(${[-6, 3, -2, 5][i]}deg)` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(id)} alt="" className="aspect-square w-full object-cover" />
                <figcaption className="mt-1 text-center font-script text-base text-charcoal/70 sm:text-xl">
                  {labelOccasion(id as Moment["occasion"])}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
