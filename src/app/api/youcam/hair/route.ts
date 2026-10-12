import { NextResponse } from "next/server";
import { createTask, HAIR_FEATURE, HAIR_VERSION, isDemoMode, uploadFile, YouCamError } from "@/lib/youcam";
import { takeQuota } from "@/lib/quota";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { image?: string; templateId?: string; sample?: boolean };

// POST /api/youcam/hair: starts one hairstyle try-on (2 units) on the current look image.
export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body.templateId) return NextResponse.json({ error: "missing_template" }, { status: 400 });

  const limited = isDemoMode() || body.sample ? null : await takeQuota("render", 2);
  if (isDemoMode() || body.sample || limited) return NextResponse.json({ taskId: `demo-${Date.now()}`, demo: true, limited, sample: !!body.sample });

  const match = /^data:(image\/jpeg);base64,(.+)$/.exec(body.image || "");
  if (!match) return NextResponse.json({ error: "missing_image" }, { status: 400 });
  try {
    const bytes = Buffer.from(match[2], "base64");
    const fileId = await uploadFile(HAIR_FEATURE, {
      bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      type: match[1],
      name: "look.jpg",
    });
    const taskId = await createTask(HAIR_FEATURE, { src_file_id: fileId, template_id: body.templateId }, HAIR_VERSION);
    return NextResponse.json({ taskId });
  } catch (e) {
    const err = e as YouCamError;
    return NextResponse.json({ error: err.code || err.message }, { status: err.status && err.status < 500 ? err.status : 502 });
  }
}
