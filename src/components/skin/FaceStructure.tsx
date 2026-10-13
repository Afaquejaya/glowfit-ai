"use client";

import { useState } from "react";
import clsx from "clsx";
import { Eye, Ruler, Scissors, Smile, Sparkles, User } from "lucide-react";
import { FACE_SHAPES, faceTip } from "@/lib/hairMatch";
import { FACE_SHAPE_MAP, faceShapeLabel, type FaceAttrs } from "@/lib/skin";
import { useFaceRatios, type FaceRatios } from "@/lib/faceRatios";

type Guide = "thirds" | "fifths" | "both";

/** Face shape from YouCam AI Face Analyzer, plus facial proportions drawn on the user's own photo. */
export function FaceStructure({ face, photo }: { face?: FaceAttrs | null; photo: string }) {
  const ratios = useFaceRatios(photo);
  const [guide, setGuide] = useState<Guide>("both");
  if (!face && ratios === null) return null;

  const shape = face ? FACE_SHAPE_MAP[face.faceShape.toLowerCase()] : undefined;
  const meta = FACE_SHAPES.find((f) => f.id === shape);
  const rows = face
    ? [
        { icon: Eye, label: "Eye shape", value: face.eyeShape },
        { icon: Smile, label: "Lip shape", value: face.lipShape },
        { icon: Sparkles, label: "Brow shape", value: face.eyebrowShape },
        { icon: User, label: "Cheekbones", value: face.cheekbones },
      ].filter((r) => r.value)
    : [];

  return (
    <section className="card p-5 sm:p-6 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-3xl text-wine-700">Face Structure</h3>
          <p className="mt-1 text-sm text-charcoal/60">
            {face ? (
              <>
                Your face shape is <b className="font-medium text-wine-700">{faceShapeLabel(face.faceShape)}</b>
                {meta ? `: ${meta.hint.toLowerCase()}.` : "."}
              </>
            ) : (
              "Facial proportions measured on your photo."
            )}
          </p>
        </div>
        <span className="chip text-xs">{face?.demo ? "Sample result" : face ? "YouCam AI Face Analyzer" : "Measured on your photo"}</span>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <RatioPhoto photo={photo} ratios={ratios} guide={guide} />
          {ratios && (
            <div className="mt-3 flex justify-center gap-1 rounded-full bg-blush-50 p-1 text-xs">
              {(["both", "thirds", "fifths"] as Guide[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGuide(g)}
                  className={clsx("rounded-full px-3 py-1.5 capitalize transition", guide === g ? "bg-white text-wine-700 shadow-soft" : "text-charcoal/60")}
                >
                  {g === "both" ? "Thirds + fifths" : g}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {face && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 rounded-2xl bg-gradient-to-br from-blush-100 to-blush-50 p-4">
                <p className="text-xs uppercase tracking-wider text-charcoal/50">Face shape</p>
                <p className="mt-1 font-serif text-4xl text-wine-700">{faceShapeLabel(face.faceShape)}</p>
              </div>
              {rows.map((r) => (
                <div key={r.label} className="rounded-2xl bg-blush-50 p-3">
                  <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-charcoal/50">
                    <r.icon className="h-3.5 w-3.5 text-rose-500" /> {r.label}
                  </p>
                  <p className="mt-1 font-serif text-xl">{r.value}</p>
                </div>
              ))}
            </div>
          )}

          {ratios ? (
            <div className="rounded-2xl border border-blush-200 bg-white/70 p-4">
              <p className="flex items-center gap-1.5 font-serif text-lg text-wine-700">
                <Ruler className="h-4 w-4" /> Facial Ratios
              </p>
              <RatioRow label="Horizontal thirds" hint="Forehead · mid-face · lower face (ideal 33 / 33 / 33)" values={ratios.thirds} ideal={33.3} />
              <RatioRow label="Vertical fifths" hint="Five eye-width columns (ideal 20 each)" values={ratios.fifths} ideal={20} />
              {Math.min(...ratios.fifths) < 10 && (
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Your head is turned a little in this photo, so the fifths are less exact. A straight-on selfie gives the truest ratios.
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-blush-50 p-3">
                  <p className="text-xs text-charcoal/50">Length : width</p>
                  <p className="font-serif text-2xl">1 : {ratios.lengthToWidth.toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-blush-50 p-3">
                  <p className="text-xs text-charcoal/50">Proportion balance</p>
                  <p className="font-serif text-2xl">{ratios.balance}/100</p>
                </div>
              </div>
            </div>
          ) : ratios === undefined ? (
            <p className="rounded-2xl bg-blush-50 p-4 text-sm text-charcoal/60">Measuring your facial proportions…</p>
          ) : null}

          {shape && (
            <p className="flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-3 text-sm text-charcoal/75 ring-1 ring-blush-200">
              <Scissors className="h-4 w-4 shrink-0 text-wine-700" />
              Hairstyle tip: {faceTip(shape)}. Decision Lab hairstyles are ranked for your face shape.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function RatioRow({ label, hint, values, ideal }: { label: string; hint: string; values: number[]; ideal: number }) {
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-charcoal/80">{label}</p>
        <p className="font-serif text-lg tabular-nums text-wine-700">{values.join(" / ")}</p>
      </div>
      <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full">
        {values.map((v, i) => (
          <span
            key={i}
            style={{ width: `${v}%` }}
            className={clsx("h-full border-r border-white last:border-0", Math.abs(v - ideal) / ideal < 0.12 ? "bg-rose-400" : "bg-amber-400")}
          />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-charcoal/50">{hint}</p>
    </div>
  );
}

/** The photo cropped to the face, with the thirds and fifths drawn on it in image coordinates. */
function RatioPhoto({ photo, ratios, guide }: { photo: string; ratios: FaceRatios | null | undefined; guide: Guide }) {
  if (!ratios) {
    return (
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-blush-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="Your face" className={clsx("h-full w-full object-cover", ratios === undefined && "animate-pulse")} />
      </div>
    );
  }
  const { rows, cols, W, H, thirds, fifths } = ratios;
  const fw = cols[5] - cols[0];
  const fh = rows[3] - rows[0];
  // Crop to the face with some room for labels, in a 4:5 frame.
  let vw = fw * 2.1;
  let vh = fh * 1.45;
  if (vw / vh > 4 / 5) vh = (vw * 5) / 4;
  else vw = (vh * 4) / 5;
  // Never show past the photo's edges: shrink the frame to fit, keeping its shape where possible.
  const fit = Math.min(1, W / vw, H / vh);
  vw *= fit;
  vh *= fit;
  const vx = Math.max(0, Math.min(W - vw, (cols[0] + cols[5]) / 2 - vw / 2));
  const vy = Math.max(0, Math.min(H - vh, (rows[0] + rows[3]) / 2 - vh / 2));
  const u = vw / 320; // one "screen pixel" in image units
  const x0 = cols[0] - 14 * u;
  const x1 = cols[5] + 14 * u;
  const showThirds = guide !== "fifths";
  const showFifths = guide !== "thirds";
  const thirdLabel = ["Forehead", "Mid-face", "Lower"];
  // Labels go on whichever side of the face has room inside the frame.
  const roomRight = vx + vw - x1;
  const roomLeft = x0 - vx;
  const lx = roomRight >= roomLeft ? x1 + 4 * u : x0 - 54 * u;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-cocoa-900">
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className="block w-full" style={{ aspectRatio: `${vw} / ${vh}` }} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Face ratios drawn on your photo">
        <image href={photo} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />
        <rect x={vx} y={vy} width={vw} height={vh} fill="rgba(30,18,16,0.18)" />
        <g transform={`rotate(${ratios.angle} ${ratios.center.x} ${ratios.center.y})`}>
        {showFifths &&
          cols.map((c, i) => (
            <line key={`c${i}`} x1={c} x2={c} y1={rows[0]} y2={rows[3]} stroke="#F6D28B" strokeWidth={1.4 * u} strokeDasharray={`${5 * u} ${4 * u}`} />
          ))}
        {showFifths &&
          fifths.map((f, i) => (
            <text key={`f${i}`} x={(cols[i] + cols[i + 1]) / 2} y={rows[3] + 16 * u} textAnchor="middle" fontSize={10 * u} fill="#F6D28B" fontFamily="system-ui">
              {f}%
            </text>
          ))}
        {showThirds &&
          rows.map((r, i) => <line key={`r${i}`} x1={x0} x2={x1} y1={r} y2={r} stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={1.6 * u} />)}
        {showThirds &&
          thirds.map((t, i) => (
            <g key={`t${i}`}>
              <rect x={lx} y={(rows[i] + rows[i + 1]) / 2 - 11 * u} width={50 * u} height={22 * u} rx={11 * u} fill="rgba(255,255,255,0.92)" />
              <text x={lx + 25 * u} y={(rows[i] + rows[i + 1]) / 2 - 1 * u} textAnchor="middle" fontSize={8 * u} fill="#7A2E2E" fontFamily="system-ui">
                {thirdLabel[i]}
              </text>
              <text x={lx + 25 * u} y={(rows[i] + rows[i + 1]) / 2 + 8 * u} textAnchor="middle" fontSize={9 * u} fontWeight={600} fill="#7A2E2E" fontFamily="system-ui">
                {t}%
              </text>
            </g>
          ))}
        </g>
      </svg>
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] text-wine-700">Measured on your photo</span>
    </div>
  );
}
