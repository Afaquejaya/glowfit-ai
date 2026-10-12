"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Droplet,
  Droplets,
  Grip,
  Image as ImageIcon,
  Lightbulb,
  Palette,
  Pencil,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Wallet,
  Gem,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import { useGlowStore, initialProfile } from "@/store/glowfit";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { GlowLoader } from "@/components/ui/GlowLoader";
import { CATEGORY_LABELS, money } from "@/lib/catalog";
import { describeRecipe, getBaseLook, labProducts, type LookId } from "@/lib/looks";
import { OCCASIONS, labelOccasion, type Occasion, type StylePref } from "@/lib/scoring";
import { deleteRenders } from "@/lib/renderCache";
import { SkinReport } from "@/components/skin/SkinReport";
import { useRestoreLook } from "@/lib/useRestoreLook";

const STYLES: { id: StylePref; label: string; line: string; look: LookId }[] = [
  { id: "natural", label: "Natural", line: "Fresh, barely-there", look: "natural-glow" },
  { id: "elegant", label: "Elegant", line: "Soft and polished", look: "soft-glam" },
  { id: "glam", label: "Glam", line: "Defined and radiant", look: "soft-glam" },
  { id: "bold", label: "Bold", line: "Statement colour", look: "modern-bold" },
];

const FINISH_LABEL: Record<string, string> = { dewy: "Radiant (Dewy)", natural: "Natural", matte: "Matte" };

export default function Page() {
  return (
    <Suspense fallback={<GlowLoader title="Loading your profile" messages={["Gathering your skin results"]} />}>
      <ProfileRouter />
    </Suspense>
  );
}

/** /profile shows the account owner; /profile?look=<id> shows the person saved with that look. */
function ProfileRouter() {
  const lookId = useSearchParams().get("look");
  return lookId ? <SavedPersonProfile lookId={lookId} /> : <ProfilePage />;
}

function ProfilePage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  const selfie = useGlowStore((s) => s.selfie);
  const skin = useGlowStore((s) => s.skin);
  const lab = useGlowStore((s) => s.lab);
  const profile = useGlowStore((s) => s.profile);
  const setProfile = useGlowStore((s) => s.setProfile);
  const updateLab = useGlowStore((s) => s.updateLab);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [deleted, setDeleted] = useState(false);

  // The look the profile describes: the user's decision if made, else the one matching their style.
  const styleLook = STYLES.find((s) => s.id === lab.moment.style)?.look ?? "soft-glam";
  const lookId: LookId = lab.chosenLook ?? styleLook;
  const look = getBaseLook(lookId);
  const recipe = lab.currentRecipe ?? look.recipe;
  const names = describeRecipe(recipe);
  const products = useMemo(() => labProducts(look, recipe, lab.priceMode, lab.picks), [look, recipe, lab.priceMode, lab.picks]);

  if (!ready) return <GlowLoader title="Loading your profile" messages={["Gathering your skin results", "Reading your style", "Building your profile"]} />;

  const displayName = profile.name.trim() || "Your Name";

  const saveProfile = () => {
    setProfile({ name: draft.name.trim(), tagline: draft.tagline.trim() || initialProfile.tagline });
    setEditing(false);
  };

  const toggleOccasion = (o: Occasion) =>
    setProfile({ occasions: profile.occasions.includes(o) ? profile.occasions.filter((x) => x !== o) : [...profile.occasions, o] });

  const deleteHistory = async () => {
    if (!window.confirm("Delete your selfie, skin analyses, skin journey, saved looks and bag from this device? Your name and preferences stay.")) return;
    const keys = [
      ...Object.values(lab.lookImages),
      lab.currentImage,
      ...lab.history.map((h) => h.image),
      ...useGlowStore.getState().savedLooks.map((l) => l.imageKey),
    ].filter((k): k is string => !!k);
    await deleteRenders(keys).catch(() => undefined);
    useGlowStore.getState().reset();
    useGlowStore.setState({ bag: [], rendersUsed: 0, savedLooks: [], scans: [] });
    setDeleted(true);
  };

  return (
    <div className="mx-auto max-w-6xl animate-fadeUp">
      <p className="eyebrow mb-3">Your profile</p>
      <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">Your GlowFit Profile.</h1>

      {/* Profile card */}
      <section className="card mt-8 grid gap-6 p-5 sm:p-6 md:grid-cols-[280px_1fr]">
        <div className="relative aspect-[287/249] overflow-hidden rounded-2xl bg-blush-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selfie?.dataUrl ?? "/profile/avatar.jpg"} alt={displayName} className="h-full w-full object-cover" />
          {!selfie && (
            <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[10px] uppercase tracking-wide text-charcoal/60">
              Sample photo
            </span>
          )}
          <Link
            href="/scan"
            aria-label="Change photo"
            className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-charcoal shadow-soft hover:bg-white"
          >
            <Camera className="h-5 w-5" strokeWidth={1.6} />
          </Link>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {editing ? (
              <div className="grid w-full max-w-md gap-2">
                <input
                  autoFocus
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Your name"
                  maxLength={40}
                  className="rounded-xl border border-blush-200 bg-white px-4 py-2.5 font-serif text-2xl outline-none focus:border-rose-400"
                />
                <input
                  value={draft.tagline}
                  onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
                  placeholder="A line about you"
                  maxLength={80}
                  className="rounded-xl border border-blush-200 bg-white px-4 py-2 text-sm outline-none focus:border-rose-400"
                />
                <div className="flex gap-2">
                  <button className="btn-primary !px-5 !py-2 !text-base" onClick={saveProfile}>
                    <Check className="h-4 w-4" /> Save
                  </button>
                  <button className="btn-outline !px-5 !py-2 !text-base" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-w-0">
                <h2 className="flex items-center gap-3 font-serif text-4xl">
                  <span className={clsx("truncate", !profile.name && "text-charcoal/40")}>{displayName}</span>
                  <button
                    aria-label="Edit name"
                    onClick={() => {
                      setDraft(profile);
                      setEditing(true);
                    }}
                    className="text-rose-500 hover:text-wine-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </h2>
                <p className="mt-1 text-charcoal/60">{profile.tagline}</p>
              </div>
            )}
            {!editing && (
              <button
                className="btn-primary !px-5 !py-2.5 !text-base"
                onClick={() => {
                  setDraft(profile);
                  setEditing(true);
                }}
              >
                <Pencil className="h-4 w-4" /> Edit Profile
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">
              <Sparkles className="h-3.5 w-3.5" /> {STYLES.find((s) => s.id === lab.moment.style)?.label ?? "Elegant"}
            </span>
            <span className="chip">
              <Gem className="h-3.5 w-3.5" /> {look.name}
            </span>
            <span className="chip">
              <CalendarDays className="h-3.5 w-3.5" /> {labelOccasion(lab.moment.occasion)}
            </span>
          </div>

          <div className="mt-auto grid gap-4 pt-6 sm:grid-cols-3 sm:divide-x sm:divide-blush-200">
            <Stat icon={Target} label="Skin" value={skin?.skinType ?? (skin ? "Analyzed" : "Not scanned")} />
            <Stat icon={Sun} label="Preferred Finish" value={FINISH_LABEL[recipe.foundation.finish]} className="sm:pl-5" />
            <Stat icon={Wallet} label="Budget" value={`Up to ${money(lab.moment.budget)}`} className="sm:pl-5" />
          </div>
        </div>
      </section>

      {deleted && (
        <p className="mt-4 rounded-2xl bg-sage/10 px-4 py-3 text-sm text-sage">
          Your analysis history was deleted from this device.{" "}
          <Link href="/scan" className="underline">
            Start a new scan
          </Link>
        </p>
      )}

      {/* Beauty style */}
      <section className="card mt-6 p-5 sm:p-6">
        <Header title="My Beauty Style" href="/decision-lab" link="Update Preferences" />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STYLES.map((s) => {
            const active = lab.moment.style === s.id;
            return (
              <button
                key={s.id}
                onClick={() => updateLab({ moment: { ...lab.moment, style: s.id } })}
                aria-pressed={active}
                className={clsx(
                  "overflow-hidden rounded-2xl border bg-white/80 text-center transition",
                  active ? "border-rose-400 ring-2 ring-rose-400/30" : "border-blush-200 hover:border-rose-400",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/profile/style-${s.id}.jpg`} alt="" className="aspect-[5/4] w-full object-cover" />
                <span className={clsx("block px-2 pt-2 font-serif text-lg", active && "text-wine-700")}>{s.label}</span>
                <span className="block px-2 pb-2.5 text-[11px] text-charcoal/50">{s.line}</span>
              </button>
            );
          })}
        </div>
      </section>


      {/* Full skin profile from the latest scan */}
      <section id="skin-profile" className="mt-10 scroll-mt-24">
        <p className="eyebrow mb-2">Skin Intelligence</p>
        <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">Meet Your Skin, In Detail.</h2>
        <p className="mb-5 mt-2 text-charcoal/65">AI-powered skin analysis that turns one selfie into a personalized skin profile.</p>
        {skin ? (
          <SkinReport skin={skin} photo={selfie?.dataUrl ?? "/profile/avatar.jpg"} sample={!selfie} />
        ) : (
          <div className="card p-6 text-center">
            <p className="font-serif text-2xl">No skin scan yet</p>
            <p className="mt-1 text-sm text-charcoal/60">One selfie gives you your skin score, GlowMap, priorities and a care plan.</p>
            <Link href="/scan" className="btn-primary mt-4 !px-5 !py-2.5 !text-base">
              Start My Glow Scan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Preferences */}
        <section className="card p-5 sm:p-6">
          <Header title="My Preferences" href="/decision-lab" link="Update Preferences" />
          <div className="mt-5 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            <Pref icon={Palette} title="Preferred Colors">
              <div className="flex gap-2">
                {[recipe.lip.hex, recipe.blush.hex, recipe.eyes.hex].map((hex) => (
                  <span key={hex} className="h-8 w-8 rounded-full border-2 border-white shadow-soft" style={{ background: hex }} />
                ))}
              </div>
              <p className="mt-2 text-sm text-charcoal/60">
                {names.lip} lip, {names.blush} blush, {names.eyes} eyes
              </p>
            </Pref>
            <Pref icon={Sparkles} title="Preferred Finishes">
              <div className="flex flex-wrap gap-1.5">
                {(["dewy", "natural", "matte"] as const).map((f) => (
                  <span
                    key={f}
                    className={clsx(
                      "rounded-full px-2.5 py-1 text-xs capitalize",
                      f === recipe.foundation.finish ? "bg-wine-700 text-white" : "bg-blush-100 text-charcoal/60",
                    )}
                  >
                    {f}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm text-charcoal/60">
                {names.finish} skin, {recipe.lip.texture} lips
              </p>
            </Pref>
            <Pref icon={CalendarDays} title="Occasion Preferences">
              <div className="flex flex-wrap gap-1.5">
                {OCCASIONS.map((o) => {
                  const on = profile.occasions.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggleOccasion(o.id)}
                      aria-pressed={on}
                      className={clsx(
                        "rounded-full px-2.5 py-1 text-xs transition",
                        on ? "bg-blush-200 text-wine-700" : "bg-white text-charcoal/50 ring-1 ring-blush-200 hover:text-wine-700",
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </Pref>
            <Pref icon={Gem} title="Product Preferences">
              <div className="flex -space-x-2">
                {products.slice(0, 4).map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={p.image} alt={p.name} className="h-10 w-10 rounded-full border-2 border-white bg-blush-50 object-cover" />
                ))}
              </div>
              <p className="mt-2 text-sm text-charcoal/60">{look.categories.map((c) => CATEGORY_LABELS[c]).join(", ")}</p>
            </Pref>
          </div>
        </section>

        {/* Privacy */}
        <section className="card p-5 sm:p-6">
          <p className="eyebrow flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.6} /> Privacy
          </p>
          <ul className="mt-4 divide-y divide-blush-200 border-t border-blush-200">
            <PrivacyRow icon={ImageIcon} label="Manage photos" href="/scan" />
            <PrivacyRow icon={SlidersHorizontal} label="Manage personalization" href="/decision-lab" />
            <li>
              <button onClick={deleteHistory} className="flex w-full items-center gap-3 py-3.5 text-left text-sm hover:text-wine-700">
                <Trash2 className="h-5 w-5 text-charcoal/60" strokeWidth={1.5} />
                <span className="flex-1">Delete analysis history</span>
                <ChevronRight className="h-4 w-4 text-charcoal/40" />
              </button>
            </li>
          </ul>
          <p className="mt-3 text-xs text-charcoal/50">Your selfie and results are stored only in this browser.</p>
        </section>
      </div>

    </div>
  );
}

function Header({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="eyebrow">{title}</p>
      {href && link && (
        <Link href={href} className="flex items-center gap-1 text-sm text-rose-600 hover:text-wine-700">
          {link} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, className }: { icon: LucideIcon; label: string; value: string; className?: string }) {
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <Icon className="h-8 w-8 shrink-0 text-rose-500" strokeWidth={1.3} />
      <span>
        <span className="block text-sm text-charcoal/60">{label}</span>
        <span className="block font-serif text-lg">{value}</span>
      </span>
    </div>
  );
}

function Pref({ icon: Icon, title, className, children }: { icon: LucideIcon; title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Icon className="h-5 w-5 text-rose-500" strokeWidth={1.5} />
      <p className="mb-3 mt-2 font-serif text-lg">{title}</p>
      {children}
    </div>
  );
}

function PrivacyRow({ icon: Icon, label, href }: { icon: LucideIcon; label: string; href: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-3.5 text-sm hover:text-wine-700">
        <Icon className="h-5 w-5 text-charcoal/60" strokeWidth={1.5} />
        <span className="flex-1">{label}</span>
        <ChevronRight className="h-4 w-4 text-charcoal/40" />
      </Link>
    </li>
  );
}

/** The skin profile of whoever wore a saved look, so each person keeps their own analysis. */
function SavedPersonProfile({ lookId }: { lookId: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);
  const savedLooks = useGlowStore((s) => s.savedLooks);
  const currentSkin = useGlowStore((s) => s.skin);
  const selfie = useGlowStore((s) => s.selfie);
  const renamePerson = useGlowStore((s) => s.renamePerson);
  const restore = useRestoreLook();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!ready) return <GlowLoader title="Opening skin profile" messages={["Loading the saved scan", "Building the GlowMap"]} />;

  const saved = savedLooks.find((l) => l.id === lookId);
  if (!saved) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="font-serif text-4xl">This look is no longer saved</h1>
        <Link href="/looks" className="btn-primary mt-6">
          Back to Your Looks <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  // Looks saved before profiles were attached fall back to the latest scan on this device.
  const person = saved.person;
  const skin = person?.skin ?? currentSkin;
  const photo = person?.photo ?? selfie?.dataUrl ?? "/profile/avatar.jpg";
  const name = person?.name || "Unnamed profile";
  const theirLooks = person ? savedLooks.filter((l) => l.person?.id === person.id) : [saved];
  const others = [...new Map(savedLooks.filter((l) => l.person && l.person.id !== person?.id).map((l) => [l.person!.id, l])).values()];

  const saveName = () => {
    if (person) renamePerson(person.id, draft.trim());
    setEditing(false);
  };

  return (
    <div className="mx-auto max-w-7xl animate-fadeUp">
      <Link href="/looks" className="inline-flex items-center gap-1 text-sm text-rose-600 hover:text-wine-700">
        <ArrowLeft className="h-4 w-4" /> Back to Your Looks
      </Link>
      <p className="eyebrow mb-2 mt-4">Skin Intelligence · Saved profile</p>
      <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">Meet Your Skin, In Detail.</h1>
      <p className="mt-2 text-lg text-charcoal/65">The skin analysis saved with this look, with what to focus on and how to care for it.</p>

      <section className="card mt-6 flex flex-wrap items-center gap-4 p-4 sm:p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={name} className="h-16 w-16 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-wrap gap-2">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                placeholder="Name this profile"
                maxLength={40}
                className="rounded-xl border border-blush-200 bg-white px-3 py-1.5 font-serif text-xl outline-none focus:border-rose-400"
              />
              <button className="btn-primary !px-4 !py-1.5 !text-sm" onClick={saveName}>
                <Check className="h-4 w-4" /> Save
              </button>
            </div>
          ) : (
            <p className="flex items-center gap-2 font-serif text-2xl">
              <span className={clsx("truncate", !person?.name && "text-charcoal/50")}>{name}</span>
              {person && (
                <button
                  aria-label="Rename profile"
                  onClick={() => {
                    setDraft(person.name);
                    setEditing(true);
                  }}
                  className="text-rose-500 hover:text-wine-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </p>
          )}
          <p className="mt-0.5 text-sm text-charcoal/60">
            Saved with {getBaseLook(saved.lookId).name} for {labelOccasion(saved.moment.occasion).toLowerCase()} on{" "}
            {new Date(saved.savedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            {theirLooks.length > 1 && ` · ${theirLooks.length} saved looks`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => restore(saved, "lab")} className="btn-outline !px-4 !py-2 !text-sm">
            <Sparkles className="h-4 w-4" /> Open Look
          </button>
          <button onClick={() => restore(saved, "products")} className="btn-primary !px-4 !py-2 !text-sm">
            Shop Products <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {!person && (
        <p className="mt-3 rounded-2xl bg-blush-50 px-4 py-3 text-sm text-charcoal/70">
          This look was saved before skin profiles were added, so it shows the latest scan on this device. Save the look again to keep its own profile.
        </p>
      )}

      <div id="skin-profile" className="mt-6 scroll-mt-24">
        {skin ? (
          <SkinReport skin={skin} photo={photo} sample={!person && !selfie} />
        ) : (
          <div className="card p-6 text-center">
            <p className="font-serif text-2xl">No skin scan saved</p>
            <Link href="/scan" className="btn-primary mt-4 !px-5 !py-2.5 !text-base">
              Start a Glow Scan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {others.length > 0 && (
        <section className="card mt-6 p-5">
          <p className="eyebrow">Other saved profiles</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {others.map((l) => (
              <Link
                key={l.person!.id}
                href={`/profile?look=${encodeURIComponent(l.id)}`}
                className="flex items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-4 text-sm ring-1 ring-blush-200 hover:text-wine-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.person!.photo} alt="" className="h-9 w-9 rounded-full object-cover" />
                {l.person!.name || "Unnamed profile"}
                <span className="font-serif text-charcoal/60">{l.person!.skin.overall}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
