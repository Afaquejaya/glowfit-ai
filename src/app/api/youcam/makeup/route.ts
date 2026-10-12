import { NextResponse } from "next/server";
import { createTask, isDemoMode, uploadFile, YouCamError } from "@/lib/youcam";
import { takeQuota } from "@/lib/quota";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { fileId?: string; image?: string; effects: unknown[]; demoKey?: string; sample?: boolean };

// POST /api/youcam/makeup: starts one YouCam Makeup VTO render (1 unit).
// The selfie is uploaded only when no fileId is passed, so one upload serves every render.
export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!Array.isArray(body.effects) || !body.effects.length) {
    return NextResponse.json({ error: "missing_effects" }, { status: 400 });
  }

  const limited = isDemoMode() || body.sample ? null : await takeQuota("render", 1);
  if (isDemoMode() || body.sample || limited) {
    const key = (body.demoKey || "soft-glam").replace(/[^a-z0-9-]/g, "");
    return NextResponse.json({ taskId: `demo-${Date.now()}-${key}`, demo: true, limited });
  }

  try {
    let fileId = body.fileId;
    if (!fileId) {
      const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(body.image || "");
      if (!match) return NextResponse.json({ error: "missing_image" }, { status: 400 });
      const bytes = Buffer.from(match[2], "base64");
      fileId = await uploadFile("makeup-vto", {
        bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
        type: match[1],
        name: "selfie.jpg",
      });
    }
    const taskId = await createTask("makeup-vto", { src_file_id: fileId, version: "1.0", effects: body.effects });
    return NextResponse.json({ taskId, fileId });
  } catch (e) {
    const err = e as YouCamError;
    return NextResponse.json({ error: err.code || err.message }, { status: err.status && err.status < 500 ? err.status : 502 });
  }
}
