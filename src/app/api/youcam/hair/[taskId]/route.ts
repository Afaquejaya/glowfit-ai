import { NextResponse } from "next/server";
import { extractResultUrl, fetchAsDataUrl, getTask, HAIR_FEATURE, HAIR_VERSION, isDemoMode, YouCamError } from "@/lib/youcam";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/youcam/hair/:taskId: polls a hairstyle render and returns the image as a data URL when done.
export async function GET(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;

  if (taskId.startsWith("demo-")) {
    if (Date.now() - Number(taskId.split("-")[1]) < 2500) return NextResponse.json({ status: "running" });
    return NextResponse.json({ status: "success", demo: true });
  }
  if (isDemoMode()) return NextResponse.json({ status: "error", error: "demo_mode_unknown_task" }, { status: 400 });

  try {
    const task = await getTask<unknown>(HAIR_FEATURE, taskId, HAIR_VERSION);
    if (task.status === "running") return NextResponse.json({ status: "running" });
    if (task.status === "error") return NextResponse.json({ status: "error", error: task.code });
    const url = extractResultUrl(task.results);
    if (!url) return NextResponse.json({ status: "error", error: "no_result_url" });
    return NextResponse.json({ status: "success", image: await fetchAsDataUrl(url) });
  } catch (e) {
    const err = e as YouCamError;
    return NextResponse.json({ status: "error", error: err.code || err.message }, { status: 502 });
  }
}
