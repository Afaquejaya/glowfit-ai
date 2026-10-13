import { NextResponse } from "next/server";
import { getTask, isDemoMode, normalizeFace, type RawFaceResults, YouCamError } from "@/lib/youcam";
import type { FaceAttrs } from "@/lib/skin";

export const runtime = "nodejs";

const DEMO_FACE: FaceAttrs = { faceShape: "Oval", eyeShape: "Almond", lipShape: "Average", eyebrowShape: "Soft Angled", cheekbones: "Flat Cheekbone", demo: true };

// GET /api/youcam/face/:taskId: polls a YouCam Face Analyzer task and returns the face structure.
export async function GET(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  if (taskId.startsWith("demo-")) return NextResponse.json({ status: "success", face: DEMO_FACE });
  if (isDemoMode()) return NextResponse.json({ status: "error", error: "demo_mode_unknown_task" }, { status: 400 });
  try {
    const task = await getTask<RawFaceResults>("face-attr-analysis", taskId);
    if (task.status === "success") return NextResponse.json({ status: "success", face: normalizeFace(task.results) });
    if (task.status === "error") return NextResponse.json({ status: "error", error: task.code });
    return NextResponse.json({ status: "running" });
  } catch (e) {
    const err = e as YouCamError;
    return NextResponse.json({ status: "error", error: err.code || err.message }, { status: 502 });
  }
}
