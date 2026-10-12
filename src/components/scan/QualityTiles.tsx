import { Aperture, Focus, Sun } from "lucide-react";
import clsx from "clsx";
import type { PhotoQuality, QualityLevel } from "@/lib/image";

const dot: Record<QualityLevel, string> = { good: "bg-sage", ok: "bg-amber-400", poor: "bg-rose-500" };
const text: Record<QualityLevel, string> = { good: "text-sage", ok: "text-amber-600", poor: "text-rose-600" };

export function QualityTiles({ quality }: { quality: PhotoQuality | null }) {
  const tiles = [
    { name: "Lighting", icon: Sun, q: quality?.lighting },
    { name: "Resolution", icon: Aperture, q: quality?.resolution },
    { name: "Sharpness", icon: Focus, q: quality?.sharpness },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map(({ name, icon: Icon, q }) => (
        <div key={name} className="flex flex-col items-center gap-1.5 rounded-2xl border border-blush-200 bg-white/70 px-2 py-4 text-center">
          <Icon className="h-6 w-6 text-rose-500" strokeWidth={1.5} />
          <span className="text-sm text-charcoal/80">{name}</span>
          {q ? (
            <span className={clsx("flex items-center gap-1.5 text-sm font-medium", text[q.level])}>
              <span className={clsx("h-2 w-2 rounded-full", dot[q.level])} />
              {q.label}
            </span>
          ) : (
            <span className="text-sm text-charcoal/40">Waiting</span>
          )}
        </div>
      ))}
    </div>
  );
}
