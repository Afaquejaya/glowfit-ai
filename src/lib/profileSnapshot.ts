"use client";

import { useGlowStore } from "@/store/glowfit";
import { BASE_LOOKS, describeRecipe, labProducts, totalPrice } from "./looks";
import { labelOccasion, type StylePref } from "./scoring";
import { resolveImage } from "./useMakeupRender";
import { thumbnail } from "./thumbnail";
import type { PdfLook, PdfPrefs } from "./profilePdf";

// Captures the Decision Lab look and the user's preferences for a saved profile and its PDF.

const STYLE_LABEL: Record<StylePref, string> = { natural: "Natural", elegant: "Elegant", glam: "Glam", bold: "Bold" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The current Decision Lab look with a small copy of its image, or undefined when no look is chosen. */
export async function snapshotLook(): Promise<PdfLook | undefined> {
  const { lab } = useGlowStore.getState();
  const look = lab.chosenLook ? BASE_LOOKS.find((l) => l.id === lab.chosenLook) : undefined;
  const r = lab.currentRecipe;
  if (!look || !r) return undefined;
  const src = await resolveImage(lab.currentImage).catch(() => null);
  const image = src ? await thumbnail(src, 900).catch(() => null) : null;
  const d = describeRecipe(r);
  return {
    name: look.name,
    image,
    lip: { label: d.lip, hex: r.lip.hex, texture: r.lip.texture },
    blush: { label: d.blush, hex: r.blush.hex },
    eyes: { label: d.eyes, hex: r.eyes.hex },
    brows: d.brows,
    finish: d.finish,
    hair: r.hair?.title ?? null,
    cost: totalPrice(labProducts(look, r, lab.priceMode, lab.picks)),
    priceMode: lab.priceMode,
  };
}

export function snapshotPrefs(): PdfPrefs {
  const { lab, profile } = useGlowStore.getState();
  const m = lab.moment;
  return {
    occasion: labelOccasion(m.occasion),
    time: cap(m.time),
    style: STYLE_LABEL[m.style] ?? cap(m.style),
    budget: m.budget,
    favourites: profile.occasions.map(labelOccasion),
    hairGender: profile.hairGender ?? null,
  };
}
