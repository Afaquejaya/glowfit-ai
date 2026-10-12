import { NextResponse } from "next/server";
import { extractResultUrl, fetchAsDataUrl, getTask, isDemoMode, YouCamError } from "@/lib/youcam";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/youcam/makeup/:taskId: polls a render and returns the image as a data URL when done.
export async function GET(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;

  if (taskId.startsWith("demo-")) {
    const [, ts, ...rest] = taskId.split("-");
    if (Date.now() - Number(ts) < 2500) return NextResponse.json({ status: "running" });
    return NextResponse.json({ status: "success", image: `/demo/looks/${rest.join("-")}.jpg`, demo: true });
  }
  if (isDemoMode()) return NextResponse.json({ status: "error", error: "demo_mode_unknown_task" }, { status: 400 });

  try {
    const task = await getTask<unknown>("makeup-vto", taskId);
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
