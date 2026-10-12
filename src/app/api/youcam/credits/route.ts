import { NextResponse } from "next/server";
import { getCredits, isDemoMode, YouCamError } from "@/lib/youcam";
import { quotaStatus } from "@/lib/quota";

// GET /api/youcam/credits: confirms the API key works and shows the unit balance.
// On a public demo link it shows what this visitor has left instead of the account balance.
export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ ok: true, demo: true, message: "Demo mode: no API key set, sample results are used." });
  }
  const quota = await quotaStatus();
  try {
    const credits = await getCredits();
    if (quota.limited) return NextResponse.json({ ok: true, demo: false, quota });
    return NextResponse.json({ ok: true, demo: false, credits: credits.data ?? credits });
  } catch (e) {
    const err = e as YouCamError;
    return NextResponse.json({ ok: false, error: err.code || err.message }, { status: err.status || 500 });
  }
}
