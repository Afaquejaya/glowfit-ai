import { NextResponse } from "next/server";
import { createTask, FACE_FEATURES, faceShapeEnabled, isDemoMode, skinActions, uploadFile, YouCamError } from "@/lib/youcam";
import { pickMode, SD_MIN_SHORT_SIDE } from "@/lib/skin";
import { takeQuota } from "@/lib/quota";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

// POST /api/youcam/skin: uploads the selfie and starts a YouCam skin-analysis task.
export async function POST(req: Request) {
  const form = await req.formData();
  const image = form.get("image");
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));

  if (!(image instanceof File)) return NextResponse.json({ error: "missing_image" }, { status: 400 });
  if (image.size > MAX_BYTES) return NextResponse.json({ error: "error_exceed_max_image_size" }, { status: 400 });
  if (Math.min(width, height) < SD_MIN_SHORT_SIDE) {
    return NextResponse.json({ error: "error_below_min_image_size" }, { status: 400 });
  }

  // Sample face, demo mode, or a used-up public-demo quota: answer with the sample analysis.
  const sample = form.get("sample") === "1";
  const limited = isDemoMode() || sample ? null : await takeQuota("scan", 1);
  if (isDemoMode() || sample || limited) {
    return NextResponse.json({ taskId: `demo-${Date.now()}`, faceTaskId: `demo-${Date.now()}`, mode: "demo", limited });
  }

  const mode = pickMode(width, height);
  const bytes = await image.arrayBuffer();
  const file = { bytes, type: image.type || "image/jpeg", name: image.name || "selfie.jpg" };
  // Face shape runs next to the skin scan. It is best effort: a failure never blocks the skin result.
  const faceTask = faceShapeEnabled()
    ? uploadFile("face-attr-analysis", file)
        .then((id) => createTask("face-attr-analysis", { src_file_id: id, features: FACE_FEATURES, face_angle_strictness_level: "low" }))
        .catch(() => null)
    : Promise.resolve(null);
  try {
    const fileId = await uploadFile("skin-analysis", file);
    const taskId = await createTask("skin-analysis", {
      src_file_id: fileId,
      dst_actions: skinActions(mode),
      miniserver_args: { enable_mask_overlay: true },
      format: "json",
    });
    return NextResponse.json({ taskId, mode, faceTaskId: await faceTask });
  } catch (e) {
    const err = e as YouCamError;
    return NextResponse.json({ error: err.code || err.message }, { status: err.status && err.status < 500 ? err.status : 502 });
  }
}
