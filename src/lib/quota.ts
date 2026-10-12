import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getCredits } from "./youcam";

// Protects the YouCam unit balance on a public demo link (GLOWFIT_PUBLIC_DEMO=1).
// Each visitor gets a few real YouCam calls; after that, or when the account balance
// falls to the reserve, the app answers with sample results instead of failing.
// Off by default, so local development is never limited.

export type Spend = "scan" | "render";
export type Limited = "visitor" | "reserve" | null;

const COOKIE = "gf_quota";
const on = () => process.env.GLOWFIT_PUBLIC_DEMO === "1";
const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);
const MAX_SCANS = () => num(process.env.GLOWFIT_MAX_SCANS, 2);
const MAX_UNITS = () => num(process.env.GLOWFIT_MAX_UNITS, 12);
const RESERVE = () => num(process.env.GLOWFIT_MIN_CREDITS, 100);
const secret = () => process.env.GLOWFIT_QUOTA_SECRET || process.env.YOUCAM_API_KEY || "glowfit";

type Used = { s: number; u: number };

const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");

function readCookie(raw: string | undefined): Used {
  if (!raw) return { s: 0, u: 0 };
  const [body, sig] = raw.split(".");
  if (!body || !sig) return { s: 0, u: 0 };
  const a = Buffer.from(sign(body));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { s: MAX_SCANS(), u: MAX_UNITS() }; // tampered: treat as used up
  try {
    const v = JSON.parse(Buffer.from(body, "base64url").toString()) as Used;
    return { s: Number(v.s) || 0, u: Number(v.u) || 0 };
  } catch {
    return { s: 0, u: 0 };
  }
}

// Best effort per server instance: stops simply clearing cookies from resetting the limit.
const byIp = new Map<string, Used>();

let creditCache: { at: number; value: number | null } | null = null;

/** Finds the unit balance in the credit response without depending on its exact shape. */
function findBalance(v: unknown, depth = 0): number | null {
  if (depth > 4 || v === null || typeof v !== "object") return null;
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (typeof x === "number" && /credit|amount|balance|remain|unit/i.test(k)) return x;
  }
  for (const x of Object.values(v as Record<string, unknown>)) {
    const found = findBalance(x, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

async function balance(): Promise<number | null> {
  if (creditCache && Date.now() - creditCache.at < 60_000) return creditCache.value;
  const value = await getCredits()
    .then((c) => findBalance(c))
    .catch(() => null);
  creditCache = { at: Date.now(), value };
  return value;
}

/**
 * Asks whether a real YouCam call may run. Returns null when allowed (and records the spend),
 * or the reason it was limited, in which case the route should answer with sample results.
 */
export async function takeQuota(kind: Spend, units: number): Promise<Limited> {
  if (!on()) return null;
  const jar = await cookies();
  const ip = ((await headers()).get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const fromCookie = readCookie(jar.get(COOKIE)?.value);
  const fromIp = byIp.get(ip) ?? { s: 0, u: 0 };
  const used = { s: Math.max(fromCookie.s, fromIp.s), u: Math.max(fromCookie.u, fromIp.u) };

  if (kind === "scan" ? used.s >= MAX_SCANS() : used.u + units > MAX_UNITS()) return "visitor";
  const left = await balance();
  if (left !== null && left - units < RESERVE()) return "reserve";

  const next = kind === "scan" ? { ...used, s: used.s + 1 } : { ...used, u: used.u + units };
  byIp.set(ip, next);
  const body = Buffer.from(JSON.stringify(next)).toString("base64url");
  jar.set(COOKIE, `${body}.${sign(body)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return null;
}

/** What the visitor has left, for the notice in the app. */
export async function quotaStatus() {
  if (!on()) return { limited: false as const };
  const jar = await cookies();
  const used = readCookie(jar.get(COOKIE)?.value);
  return { limited: true as const, scansLeft: Math.max(0, MAX_SCANS() - used.s), unitsLeft: Math.max(0, MAX_UNITS() - used.u) };
}
