import { NextResponse } from "next/server";
import { getTask, isDemoMode, normalizeSkin, type RawSkinResults, YouCamError } from "@/lib/youcam";
import { demoSkinResult } from "@/lib/demo";

export const runtime = "nodejs";

// GET /api/youcam/skin/:taskId?mode=hd|sd: polls the task and returns a normalized SkinResult.
export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const mode = new URL(req.url).searchParams.get("mode") === "hd" ? "hd" : "sd";

  if (taskId.startsWith("demo-")) {
    const started = Number(taskId.slice(5));
    // Simulate a few seconds of processing so the loading experience is visible.
    if (Date.now() - started < 4500) return NextResponse.json({ status: "running" });
    return NextResponse.json({ status: "success", result: demoSkinResult() });
  }
  if (isDemoMode()) return NextResponse.json({ status: "error", error: "demo_mode_unknown_task" }, { status: 400 });

  try {
    const task = await getTask<RawSkinResults>("skin-analysis", taskId);
    if (task.status === "success") {
      return NextResponse.json({ status: "success", result: normalizeSkin(task.results, mode) });
    }
    if (task.status === "error") return NextResponse.json({ status: "error", error: task.code });
    return NextResponse.json({ status: "running" });
  } catch (e) {
    const err = e as YouCamError;
    return NextResponse.json({ status: "error", error: err.code || err.message }, { status: 502 });
  }
}
