"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Sparkle } from "lucide-react";
import clsx from "clsx";
import { isActive, primaryNav, secondaryNav, type NavItem } from "./nav";

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] transition",
        active ? "bg-blush-100 text-wine-700 shadow-soft" : "text-charcoal/80 hover:bg-blush-50",
      )}
    >
      <Icon className={clsx("h-5 w-5", active ? "text-wine-600" : "text-charcoal/60")} strokeWidth={1.6} />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-blush-200/70 bg-white/40 px-4 py-7 backdrop-blur-md lg:flex">
      <Link href="/" className="mb-10 flex items-center gap-2 px-2">
        <Sparkle className="h-6 w-6 text-rose-500" strokeWidth={1.4} />
        <span className="font-serif text-2xl tracking-tight">GlowFit AI</span>
      </Link>

      <nav className="flex flex-col gap-1.5">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
      <div className="my-5 h-px bg-blush-200" />
      <nav className="flex flex-col gap-1.5">
        {secondaryNav.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="mt-auto overflow-hidden rounded-3xl bg-gradient-to-br from-blush-100 via-blush-200 to-champagne p-5 shadow-card">
        <div className="-mx-2 -mt-2 mb-3 flex h-24 items-end justify-center">
          {["/products/foundation-premium.jpg", "/products/setting-premium.jpg"].map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-full w-1/2 object-contain mix-blend-multiply" />
          ))}
        </div>
        <p className="font-serif text-lg leading-snug text-charcoal">
          Your next signature look is closer than you think.
        </p>
        <Link
          href="/scan"
          aria-label="Start skin scan"
          className="mt-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-cocoa-800 text-white"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </aside>
  );
}
