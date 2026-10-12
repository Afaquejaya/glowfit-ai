"use client";

import { useState } from "react";

export type ChartPoint = { id: string; label: string; value: number };

const W = 440;
const H = 290;
const PAD = { l: 30, r: 18, t: 24, b: 28 };

/** One-series line chart of the overall skin score, with a hover tooltip on every scan. */
export function ProgressChart({ points, ghost }: { points: ChartPoint[]; ghost?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const values = points.map((p) => p.value);
  const lo = Math.max(0, Math.floor((Math.min(...values) - 12) / 10) * 10);
  const hi = 100;
  const slots = points.length + (ghost ? 1 : 0);
  const x = (i: number) => (slots <= 1 ? (PAD.l + W - PAD.r) / 2 : PAD.l + (i * (W - PAD.l - PAD.r)) / (slots - 1));
  const y = (v: number) => PAD.t + ((hi - v) * (H - PAD.t - PAD.b)) / (hi - lo);
  const ticks = Array.from({ length: Math.floor((hi - lo) / 20) + 1 }, (_, i) => hi - i * 20).filter((t) => t >= lo);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const area = points.length > 1 ? `${line} L${x(points.length - 1)},${H - PAD.b} L${x(0)},${H - PAD.b} Z` : "";
  const last = points[points.length - 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Skin score over time">
        <defs>
          <linearGradient id="journeyArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C07B73" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#C07B73" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#F1DCD4" strokeWidth="1" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-charcoal/45 text-[11px]">
              {t}
            </text>
          </g>
        ))}
        {area && <path d={area} fill="url(#journeyArea)" />}
        {points.length > 1 && <path d={line} fill="none" stroke="#7A2E2E" strokeWidth="2" strokeLinejoin="round" />}
        {ghost && last && (
          <>
            <line
              x1={x(points.length - 1)}
              y1={y(last.value)}
              x2={x(points.length)}
              y2={y(last.value)}
              stroke="#C07B73"
              strokeWidth="2"
              strokeDasharray="4 5"
            />
            <circle cx={x(points.length)} cy={y(last.value)} r="6" fill="#FDF8F6" stroke="#C07B73" strokeWidth="2" strokeDasharray="3 3" />
            <text x={x(points.length)} y={H - 8} textAnchor="end" className="fill-rose-600 text-[11px]">
              {ghost}
            </text>
          </>
        )}
        {points.map((p, i) => (
          <g key={p.id}>
            <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4.5} fill="#FDF8F6" stroke="#7A2E2E" strokeWidth="2" />
            {(i === 0 || i === points.length - 1 || hover === i) && (
              <text x={x(i)} y={y(p.value) - 12} textAnchor="middle" className="fill-charcoal text-[13px] font-medium">
                {p.value}
              </text>
            )}
            <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-charcoal/55 text-[11px]">
              {p.label}
            </text>
            {/* Wide invisible hit area so hovering near a scan is enough. */}
            <rect
              x={x(i) - 24}
              y={PAD.t - 10}
              width="48"
              height={H - PAD.t - PAD.b + 10}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>
      {hover !== null && points[hover] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-xl bg-white px-3 py-1.5 text-xs shadow-soft ring-1 ring-blush-200"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(points[hover].value) / H) * 100 - 6}%` }}
        >
          <span className="block text-charcoal/55">{points[hover].label}</span>
          <span className="font-serif text-base">Skin score {points[hover].value}</span>
          {hover > 0 && (
            <span className="ml-1.5 text-charcoal/60">
              ({points[hover].value - points[hover - 1].value >= 0 ? "+" : ""}
              {points[hover].value - points[hover - 1].value})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
