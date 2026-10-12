"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SkinResult } from "@/lib/skin";
import type { LookId, ProductPicks, Recipe } from "@/lib/looks";
import type { Moment, Occasion } from "@/lib/scoring";
import type { FaceShape } from "@/lib/hairMatch";

export type Selfie = { dataUrl: string; width: number; height: number; source: "camera" | "upload" };

export type LabStep = 1 | 2 | 3 | 4 | 5;
export type PriceMode = "original" | "optimized";

/** Rendered images live in IndexedDB; the store only keeps their cache keys. */
export type LabState = {
  step: LabStep;
  moment: Moment;
  momentConfirmed: boolean;
  looksGenerated: boolean;
  lookImages: Partial<Record<LookId, string>>; // cache keys
  chosenLook: LookId | null;
  priceMode: PriceMode;
  currentRecipe: Recipe | null;
  currentImage: string | null; // cache key
  history: { recipe: Recipe; image: string | null }[];
  savedAt: string | null;
  picks: Record<PriceMode, ProductPicks>; // product swaps made in Budget Mode
};

/** A finished look the user saved from Step 5. The image itself stays in the IndexedDB render cache. */
export type SavedLook = {
  id: string;
  lookId: LookId;
  recipe: Recipe;
  imageKey: string | null;
  moment: Moment;
  priceMode: PriceMode;
  picks: ProductPicks;
  productIds: string[];
  total: number;
  score: number;
  savedAt: string;
  /** Who wore the look: a small photo and their skin scan, so every person keeps their own skin profile. */
  person?: SavedPerson;
};

/** One skin analysis kept for the Skin Journey. */
export type ScanEntry = { id: string; at: string; skin: SkinResult; photo: string | null; note: string };

export type SavedPerson = { id: string; name: string; photo: string; skin: SkinResult };

/** What the user tells us about themselves on the Profile page. */
export type Profile = { name: string; tagline: string; occasions: Occasion[]; hairGender?: "women" | "men"; faceShape?: FaceShape | null };

export const initialProfile: Profile = {
  name: "",
  tagline: "Exploring beauty, one look at a time.",
  occasions: ["wedding", "date-night", "party", "everyday"],
};

type GlowState = {
  selfie: Selfie | null;
  skin: SkinResult | null;
  moment: string | null;
  lab: LabState;
  makeupFile: { fileId: string; selfieKey: string; at: number } | null;
  /** The built-in sample face is in use: every YouCam call answers with sample results, so it costs nothing. */
  sampleFace: boolean;
  rendersUsed: number;
  bag: string[]; // product ids the user added on the Products page
  profile: Profile;
  savedLooks: SavedLook[];
  saveLook: (look: SavedLook) => void;
  removeSavedLook: (id: string) => void;
  renamePerson: (personId: string, name: string) => void;
  scans: ScanEntry[];
  addScan: (scan: ScanEntry) => void;
  updateScan: (id: string, patch: Partial<ScanEntry>) => void;
  removeScan: (id: string) => void;
  setProfile: (patch: Partial<Profile>) => void;
  addToBag: (ids: string[]) => void;
  removeFromBag: (id: string) => void;
  setSelfie: (s: Selfie | null) => void;
  setSkin: (r: SkinResult | null) => void;
  setMoment: (m: string | null) => void;
  updateLab: (patch: Partial<LabState>) => void;
  resetLab: () => void;
  setMakeupFile: (f: GlowState["makeupFile"]) => void;
  setSampleFace: (on: boolean) => void;
  countRender: (units?: number) => void;
  reset: () => void;
};

export const initialLab: LabState = {
  step: 1,
  moment: { occasion: "wedding", time: "evening", style: "elegant", budget: 3000 },
  momentConfirmed: false,
  looksGenerated: false,
  lookImages: {},
  chosenLook: null,
  priceMode: "original",
  currentRecipe: null,
  currentImage: null,
  history: [],
  savedAt: null,
  picks: { original: {}, optimized: {} },
};

// Session state lives in the browser, so judges can try the app without signing in.
export const useGlowStore = create<GlowState>()(
  persist(
    (set) => ({
      selfie: null,
      skin: null,
      moment: null,
      lab: initialLab,
      makeupFile: null,
      sampleFace: false,
      rendersUsed: 0,
      bag: [],
      profile: initialProfile,
      savedLooks: [],
      scans: [],
      addScan: (scan) => set((s) => ({ scans: [...s.scans.filter((x) => x.id !== scan.id), scan].slice(-24) })),
      updateScan: (id, patch) => set((s) => ({ scans: s.scans.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeScan: (id) => set((s) => ({ scans: s.scans.filter((x) => x.id !== id) })),
      // Saving the same look again refreshes it and moves it to the top instead of duplicating it.
      saveLook: (look) => set((s) => ({ savedLooks: [look, ...s.savedLooks.filter((l) => l.id !== look.id)] })),
      removeSavedLook: (id) => set((s) => ({ savedLooks: s.savedLooks.filter((l) => l.id !== id) })),
      renamePerson: (personId, name) =>
        set((s) => ({
          savedLooks: s.savedLooks.map((l) => (l.person?.id === personId ? { ...l, person: { ...l.person, name } } : l)),
        })),
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      addToBag: (ids) => set((s) => ({ bag: [...s.bag, ...ids.filter((id) => !s.bag.includes(id))] })),
      removeFromBag: (id) => set((s) => ({ bag: s.bag.filter((x) => x !== id) })),
      // A new selfie invalidates the uploaded file and every rendered look.
      setSelfie: (selfie) => set({ selfie, makeupFile: null, lab: initialLab, sampleFace: false }),
      setSkin: (skin) => set({ skin }),
      setMoment: (moment) => set({ moment }),
      updateLab: (patch) => set((s) => ({ lab: { ...s.lab, ...patch } })),
      resetLab: () => set({ lab: initialLab }),
      setMakeupFile: (makeupFile) => set({ makeupFile }),
      setSampleFace: (sampleFace) => set({ sampleFace }),
      countRender: (units = 1) => set((s) => ({ rendersUsed: s.rendersUsed + units })),
      reset: () => set({ selfie: null, skin: null, moment: null, lab: initialLab, makeupFile: null, sampleFace: false }),
    }),
    {
      name: "glowfit-session",
      version: 3,
      // v2 -> v3 only added lab.picks, so keep the user's progress; older versions start the lab over.
      migrate: (persisted, version) => {
        const p = persisted as Partial<GlowState>;
        return { ...p, lab: version === 2 && p.lab ? { ...initialLab, ...p.lab } : initialLab } as GlowState;
      },
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          return sessionStorage;
        }
      }),
    },
  ),
);
