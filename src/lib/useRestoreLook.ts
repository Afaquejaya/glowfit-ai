"use client";

import { useRouter } from "next/navigation";
import { useGlowStore, type SavedLook } from "@/store/glowfit";

/** Puts a saved look back into the Decision Lab, then opens the lab or the products page. */
export function useRestoreLook() {
  const router = useRouter();
  return (s: SavedLook, to: "lab" | "products") => {
    const { lab, updateLab } = useGlowStore.getState();
    updateLab({
      step: 5,
      moment: s.moment,
      momentConfirmed: true,
      looksGenerated: true,
      chosenLook: s.lookId,
      currentRecipe: s.recipe,
      currentImage: s.imageKey,
      priceMode: s.priceMode,
      picks: { ...lab.picks, [s.priceMode]: s.picks },
    });
    router.push(to === "lab" ? "/decision-lab" : "/products");
  };
}
