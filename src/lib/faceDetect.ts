"use client";

import { quietMediaPipe } from "./mediapipeQuiet";

// On-device face detection (MediaPipe, served from /public/mediapipe) used to frame the face
// before skin analysis, so YouCam doesn't reject photos where the face is too small.

export type FaceBox = { x: number; y: number; w: number; h: number };

type Keypoint = { x: number; y: number };
type Detection = {
  boundingBox?: { originX: number; originY: number; width: number; height: number };
  categories?: { score: number }[];
  /** Normalized: right eye, left eye, nose tip, mouth, right ear, left ear. */
  keypoints?: Keypoint[];
};
type Detector = { detect: (img: HTMLImageElement) => { detections: Detection[] } };

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

export type FacePose = { turned: boolean; tilted: boolean };

/**
 * Rough head-pose check from the six face keypoints, so we can warn before YouCam rejects a
 * photo with error_large_face_angle. "Turned": one ear is much closer to its eye than the other.
 * "Tilted": the eye line is more than 15 degrees off level. Returns null when no face is found.
 */
export async function facePose(src: string): Promise<FacePose | null> {
  const d = await load();
  if (!d) return null;
  try {
    const img = await loadImage(src);
    const face = d
      .detect(img)
      .detections.filter((f) => f.boundingBox && (f.keypoints?.length ?? 0) >= 6)
      .sort((p, q) => q.boundingBox!.width * q.boundingBox!.height - p.boundingBox!.width * p.boundingBox!.height)[0];
    if (!face?.keypoints) return null;
    const [re, le, , , rear, lear] = face.keypoints.map((k) => ({ x: k.x * img.naturalWidth, y: k.y * img.naturalHeight }));
    const earR = Math.abs(rear.x - re.x);
    const earL = Math.abs(lear.x - le.x);
    const balance = Math.min(earR, earL) / Math.max(earR, earL, 1);
    let roll = (Math.atan2(le.y - re.y, le.x - re.x) * 180) / Math.PI;
    if (roll > 90) roll -= 180;
    if (roll < -90) roll += 180;
    return { turned: balance < 0.45, tilted: Math.abs(roll) > 15 };
  } catch {
    return null;
  }
}
