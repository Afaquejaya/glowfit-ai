"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

type Props = { onCapture: (video: HTMLVideoElement) => void; onClose: () => void };

export function CameraView({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setError("We couldn't open your camera. Allow camera access, or choose a photo from your gallery.");
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  return (
    <div className="relative h-full w-full bg-cocoa-900">
      {error ? (
        <div className="flex h-full items-center justify-center p-8 text-center text-white/90">{error}</div>
      ) : (
        <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
      )}
      <button
        onClick={onClose}
        aria-label="Close camera"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur"
      >
        <X className="h-5 w-5" />
      </button>
      {ready && (
        <button
          onClick={() => videoRef.current && onCapture(videoRef.current)}
          aria-label="Capture photo"
          className="absolute bottom-5 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-rose-400/90 shadow-card"
        >
          <Camera className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
  );
}
