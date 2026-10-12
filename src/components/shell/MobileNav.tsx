"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { isActive, primaryNav, secondaryNav } from "./nav";

const items = [primaryNav[0], primaryNav[1], primaryNav[2], primaryNav[5], secondaryNav[1]];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-3xl border border-white/70 bg-white/85 px-2 py-2 shadow-card backdrop-blur-md lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[11px]", active ? "text-wine-700" : "text-charcoal/60")}
          >
            <Icon className="h-5 w-5" strokeWidth={1.6} />
            {item.label.split(" ")[0]}
          </Link>
        );
      })}
    </nav>
  );
}
