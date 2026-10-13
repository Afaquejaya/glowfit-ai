"use client";

import { quietMediaPipe } from "./mediapipeQuiet";

// On-device face detection (MediaPipe, served from /public/mediapipe) used to frame the face
// before skin analysis, so YouCam doesn't reject photos where the face is too small.

export type FaceBox = { x: number; y: number; w: number; h: number };

type Detector = { detect: (img: HTMLImageElement) => { detections: { boundingBox?: { originX: number; originY: number; width: number; height: number }; categories?: { score: number }[] }[] } };

let detector: Promise<Detector | null> | null = null;

function load(): Promise<Detector | null> {
  if (!detector) {
    detector = (async () => {
      try {
        quietMediaPipe();
        const vision = await import(/* webpackIgnore: true */ `${location.origin}/mediapipe/vision_bundle.mjs`);
        const files = await vision.FilesetResolver.forVisionTasks(`${location.origin}/mediapipe/wasm`);
        return (await vision.FaceDetector.createFromOptions(files, {
          baseOptions: { modelAssetPath: "/mediapipe/blaze_face_short_range.tflite" },
          runningMode: "IMAGE",
          minDetectionConfidence: 0.5,
        })) as Detector;
      } catch {
        detector = null;
        return null;
      }
    })();
  }
  return detector;
}

/** Starts downloading the detector early so framing is instant when a photo arrives. */
export function warmFaceDetector() {
  void load();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Returns the largest face in the image (in the image's own pixels), or null if none was found. */
export async function detectFace(src: string): Promise<FaceBox | null> {
  const d = await load();
  if (!d) return null;
  try {
    const img = await loadImage(src);
    const faces = d
      .detect(img)
      .detections.map((f) => f.boundingBox)
      .filter((b): b is NonNullable<typeof b> => !!b && b.width > 0);
    if (!faces.length) return null;
    const b = faces.sort((p, q) => q.width * q.height - p.width * p.height)[0];
    return { x: b.originX, y: b.originY, w: b.width, h: b.height };
  } catch {
    return null;
  }
}
