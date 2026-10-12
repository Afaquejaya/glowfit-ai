import { NextResponse } from "next/server";
import { isDemoMode, listHairTemplates, YouCamError, type HairTemplate } from "@/lib/youcam";

export const runtime = "nodejs";

// Templates rarely change, so one listing serves every visitor for an hour.
let cache: { at: number; templates: HairTemplate[] } | null = null;
const TTL_MS = 60 * 60 * 1000;

// GET /api/youcam/hairstyles: YouCam's real preset hairstyles (free to list). Empty in demo mode.
export async function GET() {
  if (isDemoMode()) return NextResponse.json({ templates: [], demo: true });
  try {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      const templates = await listHairTemplates();
      if (!templates.length) return NextResponse.json({ templates: [], error: "no_templates_returned" });
      cache = { at: Date.now(), templates };
    }
    return NextResponse.json({ templates: cache.templates });
  } catch (e) {
    const err = e as YouCamError;
    return NextResponse.json({ templates: [], error: err.code || err.message });
  }
}
