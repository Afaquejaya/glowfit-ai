import {
  Bot,
  FlaskConical,
  House,
  Images,
  LineChart,
  ScanFace,
  ShoppingBag,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; match?: string[] };

export const primaryNav: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/scan", label: "Skin Intelligence", icon: ScanFace, match: ["/scan", "/skin-intelligence"] },
  { href: "/decision-lab", label: "Decision Lab", icon: FlaskConical },
  { href: "/looks", label: "Looks", icon: Images },
  { href: "/products", label: "Products", icon: ShoppingBag },
  { href: "/journey", label: "Beauty Journey", icon: LineChart },
];

export const secondaryNav: NavItem[] = [
  { href: "/assistant", label: "AI Assistant", icon: Bot },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function isActive(pathname: string, item: NavItem) {
  const targets = item.match ?? [item.href];
  return targets.some((t) => (t === "/" ? pathname === "/" : pathname.startsWith(t)));
}
