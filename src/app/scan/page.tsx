"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, Camera, Check, Crop, ImageIcon, Lock, RotateCcw, Sparkles, Upload, UserRound } from "lucide-react";
import { CameraView } from "@/components/scan/CameraView";
import { FaceFrame } from "@/components/scan/FaceFrame";
import { QualityTiles } from "@/components/scan/QualityTiles";
import { AnalyzingOverlay } from "@/components/scan/AnalyzingOverlay";
import { ApiStatus } from "@/components/scan/ApiStatus";
import { PhotoAdjuster } from "@/components/scan/PhotoAdjuster";
import { captureVideo, dataUrlToPrepared, prepareFile, type PreparedImage } from "@/lib/image";
import { useSkinAnalysis } from "@/lib/useSkinAnalysis";
import { thumbnail } from "@/lib/thumbnail";
import { useGlowStore } from "@/store/glowfit";
import { PoweredBy } from "@/components/ui/PoweredBy";

const SAMPLE_FACE = "/profile/avatar.jpg";

async function toDataUrl(src: string) {
  const blob = await (await fetch(src)).blob();
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

const tips = [
  { title: "Face clearly visible", body: "Look directly at the camera, hair away from your face" },
  { title: "Natural lighting", body: "Face a window or soft light, avoid harsh shadows" },
  { title: "Minimal makeup", body: "A clean, fresh face gives the most accurate result" },
];

export default function ScanPage() {
  const router = useRouter();
  const { setSelfie, setSkin, setSampleFace } = useGlowStore();
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  // Photo being adjusted (drag + zoom) before it is used; the uncropped original allows re-adjusting.
  const [adjust, setAdjust] = useState<{ src: string; source: "camera" | "upload" } | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { phase, error, run } = useSkinAnalysis();
  const busy = phase === "uploading" || phase === "analyzing";

  // Restore the last selfie so a page refresh doesn't lose it.
  // Read straight from the store: during hydration the hook still returns the initial empty state.
  useEffect(() => {
    const saved = useGlowStore.getState().selfie;
    if (saved) dataUrlToPrepared(saved.dataUrl).then(setImage).catch(() => setSelfie(null));
  }, [setSelfie]);

  const accept = useCallback(
    (prepared: PreparedImage, source: "camera" | "upload") => {
      setLocalError(null);
      setImage(prepared);
      setSelfie({ dataUrl: prepared.dataUrl, width: prepared.width, height: prepared.height, source });
      setSkin(null);
    },
    [setSelfie, setSkin],
  );

  const onFile = useCallback(
    async (file?: File | null) => {
      if (!file) return;
      try {
        const prepared = await prepareFile(file);
        setOriginal(prepared.dataUrl);
        setAdjust({ src: prepared.dataUrl, source: "upload" });
      } catch (e) {
        setLocalError((e as Error).message);
      }
    },
    [],
  );

  const onCapture = useCallback(
    async (video: HTMLVideoElement) => {
      const captured = await captureVideo(video);
      setOriginal(captured.dataUrl);
      setAdjust({ src: captured.dataUrl, source: "camera" });
      setCameraOpen(false);
    },
    [],
  );

  const analyze = async () => {
    if (!image) return;
    const result = await run(image, { sample: useGlowStore.getState().sampleFace });
    if (result) {
      setSkin(result);
      // Every analysis also goes into the Skin Journey, with a small copy of the photo.
      const photo = await thumbnail(image.dataUrl, 360).catch(() => null);
      useGlowStore.getState().addScan({ id: `scan-${Date.now()}`, at: result.analyzedAt, skin: result, photo, note: "" });
      router.push("/skin-intelligence");
    }
  };

  // Lets judges and first-time visitors try the full flow without a selfie or spending API units.
  const trySample = async () => {
    try {
      const prepared = await dataUrlToPrepared(await toDataUrl(SAMPLE_FACE));
      setAdjust(null);
      setOriginal(null);
      accept(prepared, "upload");
      setSampleFace(true);
    } catch {
      setLocalError("The sample face could not be loaded. Please try again.");
    }
  };

  const clear = () => {
    setAdjust(null);
    setOriginal(null);
    setImage(null);
    setSelfie(null);
    setSkin(null);
    setLocalError(null);
  };

  const shownError = localError || error;
  const selfieSource = () => useGlowStore.getState().selfie?.source ?? "upload";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Skin Intelligence · Skin Scan</p>
          <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-6xl">Let&apos;s Get to Know Your Skin.</h1>
          <p className="mt-2 font-serif text-lg text-charcoal/70 sm:text-2xl">
            Upload a selfie or take a photo to create your personalized skin profile.
          </p>
          <PoweredBy apis={["skin"]} className="mt-3" />
        </div>
        <p className="hidden -rotate-6 font-script text-4xl leading-none text-wine-700/80 xl:block">
          Real Skin
          <br />
          Real Possibilities
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* Snapshot */}
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blush-100">
                <Camera className="h-6 w-6 text-wine-700" strokeWidth={1.5} />
              </span>
              <div>
                <h2 className="font-serif text-2xl text-wine-700">Your Skin Snapshot</h2>
                <p className="text-sm text-charcoal/60">Take a clear, front-facing photo for the best results.</p>
              </div>
            </div>
            {image && image.quality.canAnalyze && (
              <span className="chip whitespace-nowrap">
                <Check className="h-4 w-4" /> Photo Ready
              </span>
            )}
          </div>

          <div
            className={clsx(
              "relative overflow-hidden rounded-3xl bg-gradient-to-br from-blush-100 to-champagne",
              adjust ? "h-[460px] sm:h-[540px]" : "aspect-[4/3]",
              dragging && "ring-4 ring-rose-400/60",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onFile(e.dataTransfer.files?.[0]);
            }}
          >
            {adjust ? (
              <PhotoAdjuster
                src={adjust.src}
                onApply={(cropped) => {
                  accept(cropped, adjust.source);
                  setAdjust(null);
                }}
                onCancel={() => setAdjust(null)}
              />
            ) : cameraOpen ? (
              <CameraView onCapture={onCapture} onClose={() => setCameraOpen(false)} />
            ) : image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.dataUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.dataUrl} alt="Your selfie" className="relative h-full w-full object-contain" />
                <FaceFrame active={busy} />
                {busy ? (
                  <AnalyzingOverlay phase={phase as "uploading" | "analyzing"} />
                ) : (
                  <>
                    <span className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-black/35 px-5 py-2.5 text-sm text-white backdrop-blur">
                      <Sparkles className="h-4 w-4" /> Ready for Skin Analysis
                    </span>
                    <button
                      onClick={() => setAdjust({ src: original ?? image.dataUrl, source: selfieSource() })}
                      className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm text-wine-700 shadow-soft"
                    >
                      <Crop className="h-4 w-4" /> Adjust Photo
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <FaceFrame />
                <ImageIcon className="h-10 w-10 text-rose-400" strokeWidth={1.3} />
                <p className="font-serif text-xl text-wine-700">Your selfie appears here</p>
                <p className="max-w-xs text-sm text-charcoal/60">Position your face inside the frame, about an arm&apos;s length away.</p>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button className="btn-primary" onClick={() => setCameraOpen(true)} disabled={busy || !!adjust}>
              <Camera className="h-5 w-5" /> Take a Photo
            </button>
            <button className="btn-outline" onClick={() => fileInput.current?.click()} disabled={busy || !!adjust}>
              <ImageIcon className="h-5 w-5" /> Choose from Gallery
            </button>
          </div>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="mt-3 hidden w-full flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-blush-300 py-5 text-charcoal/60 transition hover:bg-blush-50 sm:flex"
          >
            <Upload className="h-6 w-6" strokeWidth={1.5} />
            <span className="font-serif text-wine-700">Drag &amp; drop a photo here</span>
            <span className="text-xs">or click to browse · JPG or PNG</span>
          </button>
          <button
            onClick={trySample}
            disabled={busy || !!adjust}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-blush-50 py-3 text-sm text-wine-700 ring-1 ring-blush-200 transition hover:bg-blush-100 disabled:opacity-50"
          >
            <UserRound className="h-4 w-4" /> No selfie handy? <span className="font-medium underline underline-offset-2">Try with a sample face</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </section>

        {/* Checklist + analyze */}
        <div className="flex flex-col gap-6">
          <section className="card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-serif text-2xl text-wine-700">Before We Analyze</h2>
              <ApiStatus />
            </div>
            <p className="mb-4 text-sm text-charcoal/60">For the most accurate results, make sure:</p>
            <ul className="space-y-3">
              {tips.map((t) => (
                <li key={t.title} className="flex items-center gap-4 rounded-2xl border border-blush-200 bg-white/70 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-400/80 text-white">
                    <Check className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-serif text-lg">{t.title}</span>
                    <span className="block text-sm text-charcoal/60">{t.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-4 rounded-2xl bg-blush-100/70 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
                <Lock className="h-5 w-5 text-wine-700" />
              </span>
              <p className="text-sm text-charcoal/70">
                <span className="block font-serif text-lg text-wine-700">Your privacy matters.</span>
                Your photo is only sent to YouCam Skin AI to build your skin profile. It stays in this browser and is
                never sold or shared.
              </p>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <p className="eyebrow mb-4">Photo Quality</p>
            <QualityTiles quality={image?.quality ?? null} />
            {shownError && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{shownError}</p>}
            {image && !image.quality.canAnalyze && !shownError && (
              <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                This photo is too dark or too small for an accurate analysis. Try another one.
              </p>
            )}
            <button className="btn-primary mt-5 w-full" onClick={analyze} disabled={!image || !image.quality.canAnalyze || busy || !!adjust}>
              {busy ? "Analyzing…" : "Analyze My Skin"} <ArrowRight className="h-5 w-5" />
            </button>
            <button className="btn-outline mt-3 w-full" onClick={clear} disabled={!image || busy}>
              <RotateCcw className="h-5 w-5" /> Use Another Photo
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
