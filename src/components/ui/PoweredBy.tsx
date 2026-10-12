import { Cpu } from "lucide-react";

export type YouCamApi = "skin" | "makeup" | "hair";

export const YOUCAM_APIS: Record<YouCamApi, { name: string; does: string }> = {
  skin: { name: "YouCam Skin Analysis", does: "8 skin metrics, skin type and AI masks from one selfie" },
  makeup: { name: "YouCam Makeup VTO", does: "Renders every look and every change on your own face" },
  hair: { name: "YouCam AI Hairstyle", does: "Tries real hairstyles on top of your finished look" },
};

/** Names the YouCam API behind a screen, so it's always clear what the AI is doing. */
export function PoweredBy({ apis, className = "" }: { apis: YouCamApi[]; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {apis.map((a) => (
        <span key={a} title={YOUCAM_APIS[a].does} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] text-wine-700 ring-1 ring-blush-200">
          <Cpu className="h-3 w-3" /> Powered by {YOUCAM_APIS[a].name}
        </span>
      ))}
    </span>
  );
}
