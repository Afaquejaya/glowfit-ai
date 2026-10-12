"use client";

import Link from "next/link";
import { CalendarHeart, ChevronDown, ShoppingBag, Sparkle, UserRound } from "lucide-react";
import { useGlowStore } from "@/store/glowfit";
import { ScoreRing } from "@/components/ui/ScoreRing";

export function TopBar() {
  const skin = useGlowStore((s) => s.skin);
  const moment = useGlowStore((s) => s.moment);
  const selfie = useGlowStore((s) => s.selfie);
  const bagCount = useGlowStore((s) => s.bag.length);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-ivory/70 px-4 py-4 backdrop-blur-md sm:px-8">
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <Sparkle className="h-5 w-5 text-rose-500" strokeWidth={1.4} />
        <span className="whitespace-nowrap font-serif text-xl">GlowFit AI</span>
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <button className="hidden items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2.5 text-sm shadow-soft backdrop-blur sm:flex">
          <CalendarHeart className="h-4 w-4 text-rose-500" strokeWidth={1.6} />
          {moment ? `Going to a ${moment}` : "Choose your moment"}
          <ChevronDown className="h-4 w-4 text-charcoal/50" />
        </button>
        <Link
          href={skin ? "/skin-intelligence" : "/scan"}
          className="flex items-center gap-2.5 rounded-full border border-white/80 bg-white/70 py-1.5 pl-1.5 pr-4 shadow-soft backdrop-blur"
        >
          <ScoreRing value={skin?.overall ?? 0} size={34} stroke={4} />
          <span className="leading-tight">
            <span className="block text-[11px] text-charcoal/60">Skin Score</span>
            <span className="block text-sm">{skin ? `${skin.overall}/100` : "Not scanned"}</span>
          </span>
        </Link>
        <Link
          href="/products#bag"
          aria-label={`Bag, ${bagCount} items`}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/70 shadow-soft backdrop-blur"
        >
          <ShoppingBag className="h-5 w-5 text-wine-700" strokeWidth={1.6} />
          {bagCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] text-white">
              {bagCount}
            </span>
          )}
        </Link>
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-blush-100 shadow-soft">
          {selfie ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selfie.dataUrl} alt="You" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-5 w-5 text-rose-500" />
          )}
        </div>
      </div>
    </header>
  );
}
