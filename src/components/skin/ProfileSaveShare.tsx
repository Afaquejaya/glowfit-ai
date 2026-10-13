"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, FileDown, Loader2, Lock, Save, Trash2, UserRound } from "lucide-react";
import { useGlowStore, type SavedProfile } from "@/store/glowfit";
import { hash } from "@/lib/renderCache";
import { thumbnail } from "@/lib/thumbnail";
import { faceShapeLabel } from "@/lib/skin";
import { shareProfilePdf } from "@/lib/profilePdf";
import { snapshotLook, snapshotPrefs } from "@/lib/profileSnapshot";

/** Save the current skin + face analysis under a name, then share it as a PDF. */
export function ProfileSaveShare() {
  const selfie = useGlowStore((s) => s.selfie);
  const skin = useGlowStore((s) => s.skin);
  const profile = useGlowStore((s) => s.profile);
  const setProfile = useGlowStore((s) => s.setProfile);
  const saved = useGlowStore((s) => s.savedProfiles);
  const saveProfile = useGlowStore((s) => s.saveProfile);
  const hasLook = useGlowStore((s) => !!s.lab.chosenLook && !!s.lab.currentRecipe);
  const removeProfile = useGlowStore((s) => s.removeProfile);
  const [name, setName] = useState(profile.name);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const photoSrc = selfie?.dataUrl ?? (skin ? "/profile/avatar.jpg" : null);
  const currentId = skin && photoSrc ? `prof-${hash(`${photoSrc.length}:${photoSrc.slice(-200)}:${skin.analyzedAt}`)}` : null;
  const current = saved.find((p) => p.id === currentId);
  const dirty = !!current && current.name !== name.trim();

  const save = async () => {
    if (!skin || !photoSrc || !currentId || !name.trim()) return;
    setBusy("save");
    try {
      const photo = current?.photo ?? (await thumbnail(photoSrc, 900));
      const look = (await snapshotLook().catch(() => undefined)) ?? current?.look;
      saveProfile({ id: currentId, name: name.trim(), savedAt: new Date().toISOString(), photo, skin, look, prefs: snapshotPrefs() });
      if (!profile.name.trim()) setProfile({ name: name.trim() });
      setNote(`Saved as ${name.trim()}. You can share it as a PDF now.`);
    } finally {
      setBusy(null);
    }
  };

  const share = async (p: SavedProfile) => {
    setBusy(p.id);
    setNote(null);
    try {
      // The profile from this scan picks up the latest Decision Lab look and preferences.
      let data = p;
      if (p.id === currentId) {
        data = { ...p, look: (await snapshotLook().catch(() => undefined)) ?? p.look, prefs: snapshotPrefs() };
        saveProfile(data);
      }
      const how = await shareProfilePdf(data);
      setNote(how === "shared" ? "PDF shared." : `PDF downloaded: ${p.name}'s GlowFit profile.`);
    } catch {
      setNote("The PDF could not be created. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-3xl text-wine-700">Save &amp; Share Profile</h3>
          <p className="mt-1 text-sm text-charcoal/60">Save this skin and face analysis under a name, then share it as a PDF report.</p>
        </div>
      </div>

      {skin ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Profile name, e.g. Ayesha"
            maxLength={40}
            className="rounded-xl border border-blush-200 bg-white px-4 py-3 font-serif text-xl outline-none focus:border-rose-400"
          />
          <button className="btn-primary !py-3 text-base" onClick={save} disabled={!name.trim() || busy !== null || (!!current && !dirty)}>
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : current && !dirty ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {current && !dirty ? "Saved" : current ? "Rename" : "Save Profile"}
          </button>
          <button
            className={clsx("btn-outline !py-3 text-base", !current && "cursor-not-allowed opacity-60")}
            onClick={() => current && share(current)}
            disabled={!current || busy !== null}
            title={current ? "Share this profile as a PDF" : "Save the profile with a name first"}
          >
            {busy === current?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : current ? <FileDown className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            Share PDF
          </button>
          <p className="text-xs text-charcoal/50 sm:col-span-3">
            {current ? "" : "Enter a name and save the profile to unlock the PDF. "}
            {hasLook
              ? "The PDF includes your final look, your preferences, your skin and face maps, and your care plan."
              : "Tip: finish a look in the Decision Lab first and the PDF will include it."}
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-blush-50 p-4 text-sm text-charcoal/65">
          Scan your face first, then save the profile here.{" "}
          <Link href="/scan" className="text-wine-700 underline">
            Start a scan
          </Link>
        </p>
      )}

      {note && <p className="mt-3 rounded-xl bg-sage/10 px-4 py-2 text-sm text-sage">{note}</p>}

      {saved.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs uppercase tracking-wider text-charcoal/50">Saved profiles</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {saved.map((p) => (
              <li key={p.id} className={clsx("flex items-center gap-3 rounded-2xl bg-white/80 p-3 ring-1", p.id === currentId ? "ring-rose-300" : "ring-blush-200")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.photo} alt={p.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-serif text-lg">
                    <UserRound className="h-4 w-4 shrink-0 text-rose-500" /> {p.name}
                  </p>
                  <p className="truncate text-xs text-charcoal/55">
                    Skin {p.skin.overall}/100
                    {p.skin.face ? ` · ${faceShapeLabel(p.skin.face.faceShape)} face` : ""} · {new Date(p.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => share(p)} disabled={busy !== null} className="flex items-center gap-1 rounded-full bg-blush-100 px-3 py-2 text-xs text-wine-700 hover:bg-blush-200">
                  {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} PDF
                </button>
                <button
                  onClick={() => window.confirm(`Delete the saved profile "${p.name}"?`) && removeProfile(p.id)}
                  aria-label={`Delete ${p.name}`}
                  className="rounded-full p-2 text-charcoal/40 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
