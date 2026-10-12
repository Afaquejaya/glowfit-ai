"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Minus, Move, Plus, RotateCcw, X } from "lucide-react";
import { cropImage, type PreparedImage } from "@/lib/image";

type Props = { src: string; onApply: (img: PreparedImage) => void; onCancel: () => void };

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
// Skin analysis needs at least 480px on the short side, so zoom stops before the crop gets smaller.
const MIN_CROP_PX = 480;
// Portrait crop window (4:5), the same shape YouCam skin analysis works best with.
const WINDOW_HEIGHT = 0.9;
const WINDOW_RATIO = 4 / 5;

/** Drag to move, zoom with the slider, mouse wheel or pinch, then crop to the face frame. */
export function PhotoAdjuster({ src, onApply, onCancel }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  const win = { h: size.h * WINDOW_HEIGHT, w: size.h * WINDOW_HEIGHT * WINDOW_RATIO };
  const base = natural.w ? Math.max(win.w / natural.w, win.h / natural.h) : 1;
  // Before the frame is measured, base is 0 and the ratio would be NaN.
  const maxZoom = natural.w && base > 0 ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, win.w / (MIN_CROP_PX * base))) : MAX_ZOOM;
  const scale = base * zoom;
  const cropPx = { w: Math.round(win.w / scale), h: Math.round(win.h / scale) };
  const dw = natural.w * scale;
  const dh = natural.h * scale;

  // Keep the photo covering the whole crop window.
  const clamp = useCallback(
    (o: { x: number; y: number }, s = scale) => {
      const mx = Math.max(0, (natural.w * s - win.w) / 2);
      const my = Math.max(0, (natural.h * s - win.h) / 2);
      return { x: Math.max(-mx, Math.min(mx, o.x)), y: Math.max(-my, Math.min(my, o.y)) };
    },
    [scale, natural, win.w, win.h],
  );

  const setZoomClamped = (z: number) => {
    const nz = Math.max(MIN_ZOOM, Math.min(maxZoom, z));
    setZoom(nz);
    setOffset((o) => clamp(o, base * nz));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      setZoomClamped((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist);
      return;
    }
    setOffset((o) => clamp({ x: o.x + e.clientX - prev.x, y: o.y + e.clientY - prev.y }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  // Wheel zoom needs a non-passive listener so the page doesn't scroll.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => {
        const nz = Math.max(MIN_ZOOM, Math.min(maxZoom, z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
        setOffset((o) => clamp(o, base * nz));
        return nz;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [base, clamp, maxZoom]);

  const apply = async () => {
    setBusy(true);
    const sx = (dw / 2 - win.w / 2 - offset.x) / scale;
    const sy = (dh / 2 - win.h / 2 - offset.y) / scale;
    const cropped = await cropImage(src, sx, sy, win.w / scale, win.h / scale);
    setBusy(false);
    onApply(cropped);
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={box}
        className="relative flex-1 touch-none select-none overflow-hidden bg-cocoa-900"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: "grab" }}
      >
        {natural.w > 0 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Adjust your photo"
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{
              width: dw,
              height: dh,
              left: size.w / 2 + offset.x - dw / 2,
              top: size.h / 2 + offset.y - dh / 2,
            }}
          />
        )}
        {/* Dim everything outside the crop window */}
        <div
          className="pointer-events-none absolute rounded-[28px] border-2 border-white/90"
          style={{
            width: win.w,
            height: win.h,
            left: (size.w - win.w) / 2,
            top: (size.h - win.h) / 2,
            boxShadow: "0 0 0 9999px rgba(30, 18, 16, 0.55)",
          }}
        >
          <span className="absolute left-1/2 top-[12%] h-[62%] w-[70%] -translate-x-1/2 rounded-[50%] border border-dashed border-white/60" />
        </div>
        <span className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-black/40 px-3 py-1 text-xs text-white backdrop-blur">
          <Move className="h-3.5 w-3.5" /> Drag to move · scroll or pinch to zoom
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white/80 px-4 py-3">
        <button onClick={() => setZoomClamped(zoom / 1.2)} aria-label="Zoom out" className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-100 text-wine-700">
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={maxZoom}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoomClamped(Number(e.target.value))}
          aria-label="Zoom"
          className="min-w-[100px] flex-1 accent-[#7A2E2E]"
        />
        <button onClick={() => setZoomClamped(zoom * 1.2)} aria-label="Zoom in" className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-100 text-wine-700">
          <Plus className="h-4 w-4" />
        </button>
        <button onClick={reset} aria-label="Reset" className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-100 text-wine-700">
          <RotateCcw className="h-4 w-4" />
        </button>
        <span className={cropPx.w < MIN_CROP_PX ? "text-xs text-rose-600" : "text-xs text-charcoal/50"}>
          {cropPx.w}×{cropPx.h}px{cropPx.w < MIN_CROP_PX ? " · photo too small" : ""}
        </span>
        <div className="ml-auto flex gap-2">
          <button onClick={onCancel} className="flex items-center gap-1.5 rounded-full border border-rose-400/70 px-4 py-2 text-sm text-wine-700">
            <X className="h-4 w-4" /> Cancel
          </button>
          <button onClick={apply} disabled={busy || !natural.w} className="flex items-center gap-1.5 rounded-full bg-cocoa-800 px-5 py-2 text-sm text-white disabled:opacity-50">
            <Check className="h-4 w-4" /> Use This Crop
          </button>
        </div>
      </div>
    </div>
  );
}
