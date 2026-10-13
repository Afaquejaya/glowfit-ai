"use client";

import { faceShapeLabel, type SkinMetricKey, type SkinResult } from "./skin";
import { headline, skinPlan, skinTypeInfo, statusOf, STATUS_LABEL, type MetricStatus } from "./skinCare";
import { measure, type FaceRatios } from "./faceRatios";
import { detectLandmarks } from "./faceVariants";
import { money } from "./catalog";

// Builds a 3-page A4 PDF of a saved profile entirely in the browser: each page is drawn on a canvas,
// then the JPEGs are wrapped in a minimal PDF file. No library and no server call.
//   1. Final look, look recipe and preferences
//   2. Skin profile (GlowMap with every score) and face structure (ratios drawn on the photo)
//   3. Skin priorities and care plan

const PW = 1240; // A4 at 150 dpi
const PH = 1754;
const M = 70; // page margin
const CW = PW - M * 2;
const PAGES = 3;
const WINE = "#7A2E2E";
const INK = "#2B2523";
const MUTED = "rgba(43,37,35,0.62)";
const FAINT = "rgba(43,37,35,0.42)";
const BLUSH = "#F6E3DC";
const PAPER = "#FDF8F6";
const GOLD = "#F6D28B";
const TONE: Record<MetricStatus, { fg: string; bg: string }> = {
  good: { fg: "#5E8466", bg: "#E4EEE5" },
  care: { fg: "#C08532", bg: "#F8EBD4" },
  priority: { fg: "#B8433F", bg: "#F6DEDC" },
};

export type PdfShade = { label: string; hex: string };
/** The finished Decision Lab look, captured when the profile is saved or shared. */
export type PdfLook = {
  name: string;
  image: string | null;
  lip: PdfShade & { texture: string };
  blush: PdfShade;
  eyes: PdfShade;
  brows: string;
  finish: string;
  hair: string | null;
  cost: number;
  priceMode: "original" | "optimized";
};
/** What the user chose in the Decision Lab and on the Profile page. */
export type PdfPrefs = {
  occasion: string;
  time: string;
  style: string;
  budget: number;
  favourites: string[];
  hairGender: string | null;
};

export type ProfilePdfData = { name: string; savedAt: string; photo: string; skin: SkinResult; look?: PdfLook; prefs?: PdfPrefs };

type Fonts = { serif: string; sans: string };
type Pt = { x: number; y: number };
type Scan = { pts: Pt[]; W: number; H: number; ratios: FaceRatios } | null;
type Ctx = CanvasRenderingContext2D;

// Face mesh points used to place each skin score on the face.
const METRIC_POINT: Record<SkinMetricKey, number> = {
  texture: 151, // forehead
  radiance: 337, // upper cheekbone
  moisture: 50, // cheek
  wrinkle: 111, // under-eye
  oiliness: 4, // nose tip (T-zone)
  pore: 358, // side of the nose
  redness: 425, // cheek
  acne: 175, // chin
};
// Fallback positions (percent of the photo) when no face is found on the device.
const ZONE: Record<SkinMetricKey, [number, number]> = {
  moisture: [37, 55],
  texture: [50, 30],
  oiliness: [50, 50],
  pore: [58, 49],
  redness: [63, 58],
  wrinkle: [41, 42],
  acne: [60, 64],
  radiance: [50, 36],
};

// ---------- drawing helpers ----------

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fonts(): Fonts {
  const el = document.querySelector(".font-serif");
  return { serif: el ? getComputedStyle(el).fontFamily : "Georgia, serif", sans: getComputedStyle(document.body).fontFamily || "Arial, sans-serif" };
}

function page() {
  const c = document.createElement("canvas");
  c.width = PW;
  c.height = PH;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PW, PH);
  return { c, ctx };
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function text(ctx: Ctx, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "left") {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
  ctx.textAlign = "left";
}

/** Small spaced capitals, used for labels. */
function caps(ctx: Ctx, s: string, x: number, y: number, f: Fonts, color = FAINT, size = 17, align: CanvasTextAlign = "left") {
  const c = ctx as Ctx & { letterSpacing?: string };
  c.letterSpacing = "2px";
  text(ctx, s.toUpperCase(), x, y, `600 ${size}px ${f.sans}`, color, align);
  c.letterSpacing = "0px";
}

function lines(ctx: Ctx, s: string, maxW: number) {
  const out: string[] = [];
  let line = "";
  for (const word of s.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      out.push(line);
      line = word;
    } else line = test;
  }
  if (line) out.push(line);
  return out;
}

/** Writes text wrapped to a width and returns the y after the last line. */
function wrap(ctx: Ctx, s: string, x: number, y: number, maxW: number, lh: number, font: string, color: string, max = 99) {
  ctx.font = font;
  ctx.fillStyle = color;
  const ls = lines(ctx, s, maxW);
  ls.slice(0, max).forEach((l, i) => ctx.fillText(i === max - 1 && ls.length > max ? `${l.replace(/\W*$/, "")}…` : l, x, y + i * lh));
  return y + Math.min(ls.length, max) * lh;
}

function pill(ctx: Ctx, s: string, x: number, y: number, font: string, bg: string, fg: string, align: "left" | "right" = "left") {
  ctx.font = font;
  const w = ctx.measureText(s).width + 28;
  const bx = align === "right" ? x - w : x;
  box(ctx, bx, y, w, 34, 17, bg);
  text(ctx, s, bx + 14, y + 23, font, fg);
  return w;
}

function ring(ctx: Ctx, cx: number, cy: number, r: number, lw: number, pct: number, color: string, track = BLUSH) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = track;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.01, Math.min(1, pct / 100)));
  ctx.stroke();
  ctx.lineCap = "butt";
}

function bar(ctx: Ctx, x: number, y: number, w: number, h: number, pct: number, color: string) {
  box(ctx, x, y, w, h, h / 2, BLUSH);
  box(ctx, x, y, Math.max(h, (w * pct) / 100), h, h / 2, color);
}

function swatch(ctx: Ctx, cx: number, cy: number, r: number, hex: string) {
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = "rgba(43,37,35,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.stroke();
}

type Icon = "check" | "cross" | "star";
function icon(ctx: Ctx, kind: Icon, cx: number, cy: number, r: number, fg: string, bg: string) {
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineWidth = Math.max(2, r / 4.5);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const k = r * 0.45;
  ctx.beginPath();
  if (kind === "check") {
    ctx.moveTo(cx - k, cy);
    ctx.lineTo(cx - k * 0.25, cy + k * 0.75);
    ctx.lineTo(cx + k, cy - k * 0.7);
    ctx.stroke();
  } else if (kind === "cross") {
    ctx.moveTo(cx - k * 0.8, cy - k * 0.8);
    ctx.lineTo(cx + k * 0.8, cy + k * 0.8);
    ctx.moveTo(cx + k * 0.8, cy - k * 0.8);
    ctx.lineTo(cx - k * 0.8, cy + k * 0.8);
    ctx.stroke();
  } else {
    // A four-point sparkle.
    const s = r * 0.62;
    ctx.moveTo(cx, cy - s);
    ctx.quadraticCurveTo(cx, cy, cx + s, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + s);
    ctx.quadraticCurveTo(cx, cy, cx - s, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - s);
    ctx.fill();
  }
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}

/** Draws an image to fill a rounded box, centred on a focus point (image pixels) when given. Returns the crop. */
function cover(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number, focus?: Pt, zoom = 1) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const s = Math.max(w / iw, h / ih) * zoom;
  const sw = w / s;
  const sh = h / s;
  const fx = focus?.x ?? iw / 2;
  const fy = focus?.y ?? ih / 2;
  const sx = Math.max(0, Math.min(iw - sw, fx - sw / 2));
  const sy = Math.max(0, Math.min(ih - sh, fy - sh / 2));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
  return { sx, sy, k: s, X: (v: number) => x + (v - sx) * s, Y: (v: number) => y + (v - sy) * s };
}

function shade(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, from: number) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y + h * from, 0, y + h);
  g.addColorStop(0, "rgba(30,18,16,0)");
  g.addColorStop(1, "rgba(30,18,16,0.78)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function chrome(ctx: Ctx, f: Fonts, d: ProfilePdfData, n: number, title: string, sub: string) {
  ctx.fillStyle = WINE;
  ctx.fillRect(0, 0, PW, 104);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 104, PW, 5);
  text(ctx, "GlowFit AI", M, 68, `500 40px ${f.serif}`, "#FFFFFF");
  caps(ctx, `Beauty Profile · ${d.name}`, PW - M, 50, f, "rgba(255,255,255,0.75)", 16, "right");
  text(ctx, `Page ${n} of ${PAGES}`, PW - M, 80, `400 20px ${f.sans}`, "#FFFFFF", "right");

  text(ctx, title, M, 196, `500 54px ${f.serif}`, WINE);
  text(ctx, sub, M, 236, `400 22px ${f.sans}`, MUTED);

  ctx.fillStyle = "rgba(122,46,46,0.15)";
  ctx.fillRect(M, PH - 92, CW, 2);
  const date = new Date(d.savedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  text(ctx, `${d.name} · saved ${date}`, M, PH - 52, `400 18px ${f.sans}`, MUTED);
  text(ctx, "Cosmetic guidance, not medical advice. YouCam Skin AI, AI Face Analyzer and Virtual Try-On.", PW - M, PH - 52, `400 18px ${f.sans}`, MUTED, "right");
}

const statusColor = (score: number) => TONE[statusOf(score)].fg;

// ---------- page 1: final look and preferences ----------

async function pageLook(d: ProfilePdfData, f: Fonts, photo: HTMLImageElement, scan: Scan) {
  const { c, ctx } = page();
  chrome(ctx, f, d, 1, d.name, headline(d.skin.overall));
  const { look, prefs, skin } = d;

  // Hero image: the final look, or the selfie when no look is finished yet.
  const hx = M;
  const hy = 280;
  const hw = 560;
  const hh = 730;
  const lookImg = look?.image ? await loadImage(look.image).catch(() => null) : null;
  const heroImg = lookImg ?? photo;
  const focus = !lookImg && scan ? { x: (scan.ratios.cols[0] + scan.ratios.cols[5]) / 2, y: (scan.ratios.rows[0] + scan.ratios.rows[3]) / 2 } : undefined;
  ctx.save();
  ctx.shadowColor = "rgba(122,46,46,0.25)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  box(ctx, hx, hy, hw, hh, 30, "#FFFFFF");
  ctx.restore();
  cover(ctx, heroImg, hx, hy, hw, hh, 30, focus);
  shade(ctx, hx, hy, hw, hh, 30, 0.6);
  pill(ctx, lookImg ? "YouCam Virtual Try-On" : "Your photo", hx + 22, hy + 22, `500 17px ${f.sans}`, "rgba(255,255,255,0.92)", WINE);
  caps(ctx, lookImg ? "Final look" : "No final look yet", hx + 32, hy + hh - 92, f, "rgba(255,255,255,0.85)", 17);
  text(ctx, look?.name ?? "Create one in Decision Lab", hx + 32, hy + hh - 40, `500 ${look ? 50 : 34}px ${f.serif}`, "#FFFFFF");

  // Right column: score card.
  const rx = hx + hw + 30;
  const rw = PW - M - rx;
  box(ctx, rx, hy, rw, 280, 28, "#FFFFFF");
  const cx = rx + 120;
  const cy = hy + 135;
  ring(ctx, cx, cy, 82, 18, skin.overall, statusColor(skin.overall));
  text(ctx, String(skin.overall), cx, cy + 22, `600 64px ${f.serif}`, INK, "center");
  caps(ctx, "Skin score", cx, cy + 128, f, WINE, 16, "center");
  const tx = rx + 250;
  caps(ctx, "Skin type", tx, hy + 70, f);
  text(ctx, skin.skinType ?? "Not detected", tx, hy + 112, `500 38px ${f.serif}`, INK);
  caps(ctx, "Face shape", tx, hy + 170, f);
  text(ctx, skin.face ? faceShapeLabel(skin.face.faceShape) : "Not measured", tx, hy + 212, `500 38px ${f.serif}`, INK);

  // Right column: look recipe.
  const ly = hy + 300;
  const lh = hh - 300;
  box(ctx, rx, ly, rw, lh, 28, "#FFFFFF");
  text(ctx, "Your Look Recipe", rx + 30, ly + 56, `500 32px ${f.serif}`, WINE);
  if (look) {
    const rows: [string, string, string | null][] = [
      ["Lips", `${look.lip.label} · ${cap(look.lip.texture)}`, look.lip.hex],
      ["Blush", look.blush.label, look.blush.hex],
      ["Eyes", look.eyes.label, look.eyes.hex],
      ["Brows", look.brows, null],
      ["Finish", look.finish, null],
      ["Hairstyle", look.hair ?? "Your own hair", null],
    ];
    rows.forEach(([k, v, hex], i) => {
      const y = ly + 100 + i * 48;
      if (hex) swatch(ctx, rx + 46, y - 8, 14, hex);
      else icon(ctx, "star", rx + 46, y - 8, 14, WINE, BLUSH);
      text(ctx, k, rx + 76, y, `400 20px ${f.sans}`, MUTED);
      ctx.font = `500 22px ${f.sans}`;
      const fit = lines(ctx, v, rw - 230)[0];
      text(ctx, fit === v ? v : `${fit}…`, rx + rw - 30, y, `500 22px ${f.sans}`, INK, "right");
    });
    const by = ly + lh - 72;
    box(ctx, rx + 20, by, rw - 40, 54, 16, BLUSH);
    text(ctx, look.priceMode === "optimized" ? "Look cost (Budget Mode)" : "Look cost", rx + 40, by + 35, `400 20px ${f.sans}`, MUTED);
    text(ctx, money(look.cost), rx + rw - 40, by + 37, `600 26px ${f.serif}`, WINE, "right");
  } else {
    wrap(ctx, "Finish a look in the Decision Lab, then share this profile again to add the final look, shades and cost here.", rx + 30, ly + 110, rw - 60, 32, `400 21px ${f.sans}`, MUTED);
  }

  // Preferences
  const py = hy + hh + 70;
  text(ctx, "Your Preferences", M, py, `500 40px ${f.serif}`, WINE);
  text(ctx, "What you told GlowFit, used to rank looks, shades and hairstyles for you.", M, py + 36, `400 20px ${f.sans}`, MUTED);
  const budgetNote = look && prefs ? (look.cost <= prefs.budget ? "Look is within budget" : `${money(look.cost - prefs.budget)} over budget`) : "";
  const tiles: [string, string, string?][] = prefs
    ? [
        ["Occasion", prefs.occasion],
        ["Time of day", prefs.time],
        ["Style", prefs.style],
        ["Budget", money(prefs.budget), budgetNote],
        ["Chosen look", look?.name ?? "Not chosen yet"],
        ["Shopping mode", look ? (look.priceMode === "optimized" ? "Budget Mode" : "Original picks") : "Not set"],
        ["Hairstyles for", prefs.hairGender ? cap(prefs.hairGender) : "Not set"],
        ["Face shape", skin.face ? faceShapeLabel(skin.face.faceShape) : "Not measured"],
      ]
    : [["Preferences", "Not set yet"]];
  const tw = (CW - 3 * 20) / 4;
  tiles.forEach(([k, v, note], i) => {
    const x = M + (i % 4) * (tw + 20);
    const y = py + 66 + Math.floor(i / 4) * 128;
    box(ctx, x, y, tw, 112, 20, "#FFFFFF");
    ctx.fillStyle = i < 4 ? WINE : GOLD;
    ctx.fillRect(x, y + 22, 5, 68);
    caps(ctx, k, x + 24, y + 38, f, FAINT, 15);
    ctx.font = `500 28px ${f.serif}`;
    const fit = lines(ctx, v, tw - 40)[0];
    text(ctx, fit, x + 24, y + 78, `500 28px ${f.serif}`, INK);
    if (note) text(ctx, note, x + 24, y + 101, `400 15px ${f.sans}`, note.includes("over") ? TONE.priority.fg : TONE.good.fg);
  });
  if (prefs?.favourites.length) {
    let x = M;
    const y = py + 66 + 2 * 128 + 8;
    caps(ctx, "Favourite occasions", x, y + 23, f, FAINT, 15);
    ctx.font = `600 15px ${f.sans}`;
    x += ctx.measureText("FAVOURITE OCCASIONS").width + 60;
    for (const o of prefs.favourites) {
      const w = pill(ctx, o, x, y, `500 18px ${f.sans}`, BLUSH, WINE);
      x += w + 10;
      if (x > PW - M - 120) break;
    }
  }

  // Highlights: the strongest area, the area to focus on and the face balance, each with a mini gauge.
  const sorted = [...skin.metrics].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const low = sorted[sorted.length - 1];
  const highlights: [string, string, number, string][] = [
    ["Strongest area", best.label, best.score, statusColor(best.score)],
    ["Focus area", low.label, low.score, statusColor(low.score)],
    scan
      ? ["Face balance", `${skin.face ? faceShapeLabel(skin.face.faceShape) : "Your"} face`, scan.ratios.balance, WINE]
      : ["Overall skin score", skin.skinType ?? "Your skin", skin.overall, statusColor(skin.overall)],
  ];
  const hw3 = (CW - 40) / 3;
  const hy3 = PH - 92 - 30 - 136;
  highlights.forEach(([k, v, n, color], i) => {
    const bx = M + i * (hw3 + 20);
    box(ctx, bx, hy3, hw3, 136, 22, i === 1 ? "#FBEFEA" : "#FFFFFF");
    ring(ctx, bx + 68, hy3 + 68, 40, 10, n, color);
    text(ctx, String(n), bx + 68, hy3 + 78, `600 28px ${f.serif}`, INK, "center");
    caps(ctx, k, bx + 132, hy3 + 56, f, FAINT, 14);
    ctx.font = `500 28px ${f.serif}`;
    text(ctx, lines(ctx, v, hw3 - 150)[0], bx + 132, hy3 + 94, `500 28px ${f.serif}`, INK);
  });
  return c;
}

// ---------- page 2: skin profile and face structure ----------

function drawGlowMap(ctx: Ctx, f: Fonts, d: ProfilePdfData, photo: HTMLImageElement, scan: Scan, x: number, y: number, w: number, h: number) {
  const focus = scan ? { x: (scan.ratios.cols[0] + scan.ratios.cols[5]) / 2, y: (scan.ratios.rows[1] + scan.ratios.rows[3]) / 2 } : undefined;
  // Zoom so the face fills about 62% of the width, leaving room for the score chips at the sides.
  const faceW = scan ? scan.ratios.cols[5] - scan.ratios.cols[0] : 0;
  const base = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
  const zoom = scan ? Math.max(1, (w * 0.5) / (faceW * base)) : 1;
  const t = cover(ctx, photo, x, y, w, h, 28, focus, zoom);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 28);
  ctx.clip();
  ctx.fillStyle = "rgba(30,18,16,0.12)";
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  shade(ctx, x, y, w, h, 28, 0.72);

  const pts = d.skin.metrics.map((m) => {
    const p = scan?.pts[METRIC_POINT[m.key]];
    const at = p ? { x: t.X(p.x), y: t.Y(p.y) } : { x: x + (w * ZONE[m.key][0]) / 100, y: y + (h * ZONE[m.key][1]) / 100 };
    return { m, at: { x: Math.max(x + 10, Math.min(x + w - 10, at.x)), y: Math.max(y + 10, Math.min(y + h - 10, at.y)) } };
  });
  const byX = [...pts].sort((a, b) => a.at.x - b.at.x);
  const half = Math.ceil(byX.length / 2);
  const sides: [typeof pts, "left" | "right"][] = [
    [byX.slice(0, half).sort((a, b) => a.at.y - b.at.y), "left"],
    [byX.slice(half).sort((a, b) => a.at.y - b.at.y), "right"],
  ];
  const chipW = 150;
  const chipH = 62;
  const top = y + 70;
  const bottom = y + h - 130;
  for (const [list, side] of sides) {
    list.forEach(({ m, at }, i) => {
      const cy = list.length > 1 ? top + ((bottom - top - chipH) * i) / (list.length - 1) : top;
      const cx = side === "left" ? x + 16 : x + w - 16 - chipW;
      const ex = side === "left" ? cx + chipW : cx;
      const tone = TONE[statusOf(m.score)];
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex, cy + chipH / 2);
      ctx.lineTo(at.x, at.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = tone.fg;
      ctx.beginPath();
      ctx.arc(at.x, at.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      box(ctx, cx, cy, chipW, chipH, 16, "rgba(255,255,255,0.93)");
      ctx.fillStyle = tone.fg;
      ctx.beginPath();
      ctx.roundRect(cx, cy, 6, chipH, [16, 0, 0, 16]);
      ctx.fill();
      text(ctx, m.label, cx + 18, cy + 24, `500 15px ${f.sans}`, MUTED);
      text(ctx, String(m.score), cx + 18, cy + 52, `600 26px ${f.serif}`, INK);
      text(ctx, STATUS_LABEL[statusOf(m.score)], cx + chipW - 12, cy + 50, `600 13px ${f.sans}`, tone.fg, "right");
    });
  }
  caps(ctx, "Skin profile", x + 26, y + h - 70, f, "rgba(255,255,255,0.85)", 15);
  text(ctx, "GlowMap · YouCam Skin AI", x + 26, y + h - 30, `500 30px ${f.serif}`, "#FFFFFF");
}

function drawRatioPhoto(ctx: Ctx, f: Fonts, photo: HTMLImageElement, r: FaceRatios | null, x: number, y: number, w: number, h: number) {
  if (!r) {
    cover(ctx, photo, x, y, w, h, 28);
    shade(ctx, x, y, w, h, 28, 0.72);
    text(ctx, "Face ratios", x + 26, y + h - 30, `500 30px ${f.serif}`, "#FFFFFF");
    return;
  }
  const fw = r.cols[5] - r.cols[0];
  const fh = r.rows[3] - r.rows[0];
  const focus = { x: (r.cols[0] + r.cols[5]) / 2, y: (r.rows[0] + r.rows[3]) / 2 + fh * 0.04 };
  const base = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
  // Fit the measured face (plus room for labels) inside the frame.
  const zoom = Math.max(1, Math.min((w * 0.62) / (fw * base), (h * 0.74) / (fh * base)));
  const t = cover(ctx, photo, x, y, w, h, 28, focus, zoom);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 28);
  ctx.clip();
  ctx.fillStyle = "rgba(30,18,16,0.2)";
  ctx.fillRect(x, y, w, h);
  // Lines are measured on the upright face; turn them back to the head's tilt.
  const ox = t.X(r.center.x);
  const oy = t.Y(r.center.y);
  ctx.translate(ox, oy);
  ctx.rotate((r.angle * Math.PI) / 180);
  ctx.translate(-ox, -oy);
  const X = t.X;
  const Y = t.Y;
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  for (const cc of r.cols) {
    ctx.beginPath();
    ctx.moveTo(X(cc), Y(r.rows[0]));
    ctx.lineTo(X(cc), Y(r.rows[3]));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 3.5;
  const x0 = X(r.cols[0]) - 22;
  const x1 = X(r.cols[5]) + 22;
  for (const rr of r.rows) {
    ctx.beginPath();
    ctx.moveTo(x0, Y(rr));
    ctx.lineTo(x1, Y(rr));
    ctx.stroke();
  }
  ctx.restore();
  // Labels stay upright: their anchors are turned with the head, then kept inside the frame.
  const rad = (r.angle * Math.PI) / 180;
  const turn = (px: number, py: number) => ({
    x: ox + (px - ox) * Math.cos(rad) - (py - oy) * Math.sin(rad),
    y: oy + (px - ox) * Math.sin(rad) + (py - oy) * Math.cos(rad),
  });
  const clampX = (v: number, bw: number) => Math.max(x + 8, Math.min(x + w - bw - 8, v));
  const clampY = (v: number, bh: number) => Math.max(y + 64, Math.min(y + h - bh - 8, v));
  const names = ["Forehead", "Mid-face", "Lower face"];
  const lw = 128;
  const right = x + w - x1 >= x0 - x;
  r.thirds.forEach((v, i) => {
    const a = turn(right ? x1 + 10 : x0 - 10, (Y(r.rows[i]) + Y(r.rows[i + 1])) / 2);
    const bx = clampX(right ? a.x : a.x - lw, lw);
    const by = clampY(a.y - 30, 60);
    box(ctx, bx, by, lw, 60, 18, "rgba(255,255,255,0.94)");
    text(ctx, names[i], bx + lw / 2, by + 24, `500 15px ${f.sans}`, MUTED, "center");
    text(ctx, `${v}%`, bx + lw / 2, by + 51, `600 24px ${f.serif}`, WINE, "center");
  });
  // Fifths labels just under the chin line.
  const placed: Pt[] = [];
  r.fifths.forEach((v, i) => {
    const a = turn((X(r.cols[i]) + X(r.cols[i + 1])) / 2, Y(r.rows[3]) + 30);
    const bx = clampX(a.x - 30, 60);
    let by = clampY(a.y - 16, 32);
    // A very narrow fifth (head turned) would stack two labels; move the later one up.
    while (placed.some((q) => Math.abs(q.x - bx) < 64 && Math.abs(q.y - by) < 36)) by -= 38;
    placed.push({ x: bx, y: by });
    box(ctx, bx, by, 60, 32, 12, "rgba(30,18,16,0.75)");
    text(ctx, `${v}%`, bx + 30, by + 23, `600 18px ${f.sans}`, GOLD, "center");
  });
  pill(ctx, "Measured on your photo", x + 22, y + 22, `500 17px ${f.sans}`, "rgba(255,255,255,0.92)", WINE);
}

function ratioBlock(ctx: Ctx, f: Fonts, label: string, values: number[], ideal: number, x: number, y: number, w: number) {
  text(ctx, label, x, y, `500 21px ${f.sans}`, INK);
  text(ctx, values.join(" / "), x + w, y, `600 24px ${f.serif}`, WINE, "right");
  let bx = x;
  values.forEach((v) => {
    const segW = (w * v) / 100;
    const ok = Math.abs(v - ideal) / ideal < 0.12;
    box(ctx, bx + 1, y + 14, Math.max(4, segW - 2), 16, 4, ok ? "#E58E9A" : "#E8B65C");
    bx += segW;
  });
  text(ctx, `Ideal ${values.map(() => Math.round(ideal)).join(" / ")} · pink = close to ideal`, x, y + 52, `400 15px ${f.sans}`, FAINT);
}

async function pageAnalysis(d: ProfilePdfData, f: Fonts, photo: HTMLImageElement, scan: Scan) {
  const { c, ctx } = page();
  chrome(ctx, f, d, 2, "Skin Profile & Face Structure", "Every score from your scan, mapped on your own photo.");
  const r = scan?.ratios ?? null;
  const iw = (CW - 30) / 2;
  const iy = 276;
  const ih = 720;
  drawGlowMap(ctx, f, d, photo, scan, M, iy, iw, ih);
  drawRatioPhoto(ctx, f, photo, r, M + iw + 30, iy, iw, ih);

  // Left: all skin metrics.
  const lx = M;
  let y = iy + ih + 64;
  text(ctx, "Skin Metrics", lx, y, `500 34px ${f.serif}`, WINE);
  pill(ctx, `${d.skin.skinType ?? "Skin"} · score ${d.skin.overall}`, lx + iw, y - 28, `500 16px ${f.sans}`, BLUSH, WINE, "right");
  y += 26;
  box(ctx, lx, y, iw, 8 * 50 + 30, 24, "#FFFFFF");
  [...d.skin.metrics].sort((a, b) => b.score - a.score).forEach((m, i) => {
    const ry = y + 44 + i * 50;
    const st = statusOf(m.score);
    text(ctx, m.label, lx + 24, ry, `400 20px ${f.sans}`, INK);
    bar(ctx, lx + 170, ry - 14, iw - 340, 14, m.score, TONE[st].fg);
    text(ctx, String(m.score), lx + iw - 120, ry + 2, `600 24px ${f.serif}`, INK, "right");
    pill(ctx, STATUS_LABEL[st], lx + iw - 18, ry - 24, `600 13px ${f.sans}`, TONE[st].bg, TONE[st].fg, "right");
  });
  const legendY = y + 8 * 50 + 66;
  (["good", "care", "priority"] as MetricStatus[]).forEach((s, i) => {
    const gx = lx + i * 180;
    ctx.fillStyle = TONE[s].fg;
    ctx.beginPath();
    ctx.arc(gx + 8, legendY - 6, 7, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, `${STATUS_LABEL[s]} ${s === "good" ? "80+" : s === "care" ? "60-79" : "<60"}`, gx + 22, legendY, `400 16px ${f.sans}`, MUTED);
  });

  // Right: face analysis.
  const rx = M + iw + 30;
  y = iy + ih + 64;
  text(ctx, "Face Analysis", rx, y, `500 34px ${f.serif}`, WINE);
  y += 26;
  const face = d.skin.face;
  const attrs: [string, string][] = face
    ? ([
        ["Face shape", faceShapeLabel(face.faceShape)],
        ["Eye shape", face.eyeShape],
        ["Lip shape", face.lipShape],
        ["Brow shape", face.eyebrowShape],
        ["Cheekbones", face.cheekbones],
      ].filter(([, v]) => v) as [string, string][])
    : [];
  if (r) {
    attrs.push(["Length : width", `1 : ${r.lengthToWidth.toFixed(2)}`]);
    attrs.push(["Balance", `${r.balance}/100`]);
  }
  const aw = (iw - 16) / 2;
  attrs.slice(0, 6).forEach(([k, v], i) => {
    const ax = rx + (i % 2) * (aw + 16);
    const ay = y + Math.floor(i / 2) * 88;
    box(ctx, ax, ay, aw, 76, 18, i === 0 && face ? "#F3D6CD" : "#FFFFFF");
    caps(ctx, k, ax + 18, ay + 28, f, FAINT, 13);
    ctx.font = `500 25px ${f.serif}`;
    text(ctx, lines(ctx, v, aw - 36)[0], ax + 18, ay + 62, `500 25px ${f.serif}`, INK);
  });
  y += Math.ceil(Math.min(6, attrs.length) / 2) * 88 + 8;
  if (r) {
    box(ctx, rx, y, iw, 196, 22, "#FFFFFF");
    ratioBlock(ctx, f, "Horizontal thirds", r.thirds, 33.3, rx + 22, y + 40, iw - 44);
    ratioBlock(ctx, f, "Vertical fifths", r.fifths, 20, rx + 22, y + 130, iw - 44);
  } else if (!face) {
    wrap(ctx, "Face structure was not available for this scan. A straight-on selfie in good light gives the best result.", rx, y + 30, iw, 30, `400 20px ${f.sans}`, MUTED);
  }
  return c;
}

// ---------- page 3: priorities and care plan ----------

async function pagePlan(d: ProfilePdfData, f: Fonts, photo: HTMLImageElement, scan: Scan) {
  const { c, ctx } = page();
  chrome(ctx, f, d, 3, "Your Skin Priorities", "The three areas with the lowest scores, and what to do about each one.");
  const plan = skinPlan(d.skin);
  let y = 276;
  const cardH = 300;
  for (const [i, p] of plan.priorities.entries()) {
    const tone = TONE[p.status];
    ctx.save();
    ctx.shadowColor = "rgba(122,46,46,0.12)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    box(ctx, M, y, CW, cardH, 26, "#FFFFFF");
    ctx.restore();
    ctx.fillStyle = tone.fg;
    ctx.beginPath();
    ctx.roundRect(M, y, 8, cardH, [26, 0, 0, 26]);
    ctx.fill();

    // Close-up of the area on the person's own photo.
    const pt = scan?.pts[METRIC_POINT[p.key]];
    const ix = M + 32;
    const iy = y + 26;
    const is = cardH - 52;
    if (pt && scan) {
      // Crop to about half the face's width around the area.
      const faceW = scan.ratios.cols[5] - scan.ratios.cols[0];
      const base = Math.max(is / photo.naturalWidth, is / photo.naturalHeight);
      cover(ctx, photo, ix, iy, is, is, 22, pt, Math.max(1, is / (faceW * 0.5) / base));
    } else {
      const stock = p.image ? await loadImage(p.image).catch(() => null) : null;
      if (stock) cover(ctx, stock, ix, iy, is, is, 22);
      else cover(ctx, photo, ix, iy, is, is, 22, { x: (photo.naturalWidth * ZONE[p.key][0]) / 100, y: (photo.naturalHeight * ZONE[p.key][1]) / 100 }, 2.4);
    }
    box(ctx, ix + 14, iy + 14, 56, 56, 28, "rgba(255,255,255,0.94)");
    text(ctx, String(i + 1).padStart(2, "0"), ix + 42, iy + 52, `600 26px ${f.serif}`, WINE, "center");

    // Text
    const tx = ix + is + 34;
    const tw = PW - M - 210 - tx;
    text(ctx, p.label, tx, y + 72, `500 42px ${f.serif}`, INK);
    ctx.font = `500 42px ${f.serif}`;
    pill(ctx, STATUS_LABEL[p.status], tx + ctx.measureText(p.label).width + 18, y + 44, `600 16px ${f.sans}`, tone.bg, tone.fg);
    const after = wrap(ctx, p.text, tx, y + 112, tw, 29, `400 20px ${f.sans}`, MUTED, 2);
    const tipY = after + 2;
    const tipH = y + cardH - 26 - tipY;
    box(ctx, tx, tipY, tw, tipH, 18, "#FBEFEA");
    icon(ctx, "star", tx + 30, tipY + 32, 15, "#FFFFFF", WINE);
    caps(ctx, "Pro tip", tx + 58, tipY + 38, f, WINE, 14);
    wrap(ctx, p.tip, tx + 58, tipY + 68, tw - 78, 27, `400 19px ${f.sans}`, INK, Math.max(1, Math.floor((tipH - 48) / 27)));

    // Score gauge
    const gx = PW - M - 100;
    const gy = y + 118;
    ring(ctx, gx, gy, 64, 14, p.score, tone.fg, tone.bg);
    text(ctx, String(p.score), gx, gy + 14, `600 44px ${f.serif}`, INK, "center");
    text(ctx, "Current score", gx, gy + 106, `400 16px ${f.sans}`, MUTED, "center");
    text(ctx, `Goal 80+  (${p.score >= 80 ? "reached" : `+${80 - p.score}`})`, gx, gy + 130, `600 16px ${f.sans}`, tone.fg, "center");
    y += cardH + 20;
  }

  // Care plan
  y += 40;
  text(ctx, "Your Care Plan", M, y, `500 46px ${f.serif}`, WINE);
  text(ctx, "Built from your lowest scores and your skin type.", M + 360, y - 2, `400 20px ${f.sans}`, MUTED);
  y += 30;
  const cols: { title: string; items: string[]; color: string; light: string; kind: Icon }[] = [
    { title: "What your skin needs", items: plan.needs, color: "#5E8466", light: "#E4EEE5", kind: "check" },
    { title: "What to avoid", items: plan.avoid, color: "#B8433F", light: "#F6DEDC", kind: "cross" },
    { title: "What works for you", items: plan.works, color: "#B9832E", light: "#F8EBD4", kind: "star" },
  ];
  const colW = (CW - 40) / 3;
  const colH = PH - 120 - y;
  cols.forEach((col, i) => {
    const bx = M + i * (colW + 20);
    box(ctx, bx, y, colW, colH, 26, "#FFFFFF");
    ctx.fillStyle = col.color;
    ctx.beginPath();
    ctx.roundRect(bx, y, colW, 84, [26, 26, 0, 0]);
    ctx.fill();
    icon(ctx, col.kind, bx + 46, y + 42, 22, col.color, "#FFFFFF");
    text(ctx, col.title, bx + 80, y + 52, `500 25px ${f.serif}`, "#FFFFFF");
    let iy = y + 128;
    for (const it of col.items) {
      ctx.font = `400 19px ${f.sans}`;
      const n = lines(ctx, it, colW - 92).length;
      if (iy + (n - 1) * 26 > y + colH - 20) break;
      icon(ctx, col.kind, bx + 36, iy - 7, 13, col.color, col.light);
      iy = wrap(ctx, it, bx + 62, iy, colW - 92, 26, `400 19px ${f.sans}`, INK) + 16;
    }
  });
  return c;
}

// ---------- PDF file ----------

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const toJpeg = (c: HTMLCanvasElement) =>
  new Promise<Uint8Array>((resolve, reject) =>
    c.toBlob((b) => (b ? b.arrayBuffer().then((a) => resolve(new Uint8Array(a))) : reject(new Error("pdf_page_failed"))), "image/jpeg", 0.9),
  );

/** Wraps full-page JPEG images in a minimal PDF (one image per A4 page). */
function buildPdf(pages: { jpeg: Uint8Array; w: number; h: number }[]) {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (b: Uint8Array | string) => {
    const bytes = typeof b === "string" ? enc.encode(b) : b;
    chunks.push(bytes);
    length += bytes.length;
  };
  const obj = (n: number, body: () => void) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    body();
    push("\nendobj\n");
  };
  const A4W = 595.28;
  const A4H = 841.89;
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`));
  pages.forEach((p, i) => {
    const pageN = 3 + i * 3;
    const contentN = pageN + 1;
    const imgN = pageN + 2;
    obj(pageN, () =>
      push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4W} ${A4H}] /Resources << /XObject << /Im${i} ${imgN} 0 R >> >> /Contents ${contentN} 0 R >>`),
    );
    const stream = `q ${A4W} 0 0 ${A4H} 0 0 cm /Im${i} Do Q`;
    obj(contentN, () => push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
    obj(imgN, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      push(p.jpeg);
      push("\nendstream");
    });
  });
  const count = 3 + pages.length * 3;
  const xref = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

export async function profilePdf(d: ProfilePdfData) {
  const f = fonts();
  const photo = await loadImage(d.photo);
  const lm = await detectLandmarks(d.photo).catch(() => null);
  const scan: Scan = lm ? { ...lm, ratios: measure(lm.pts, lm.W, lm.H) } : null;
  const canvases = [await pageLook(d, f, photo, scan), await pageAnalysis(d, f, photo, scan), await pagePlan(d, f, photo, scan)];
  const pages = await Promise.all(canvases.map(async (c) => ({ jpeg: await toJpeg(c), w: c.width, h: c.height })));
  return buildPdf(pages);
}

/** Shares the PDF where the device supports it (phones), otherwise downloads it. */
export async function shareProfilePdf(d: ProfilePdfData) {
  const blob = await profilePdf(d);
  const file = new File([blob], `glowfit-profile-${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "me"}.pdf`, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] }) && window.matchMedia("(pointer: coarse)").matches) {
    try {
      await nav.share({ files: [file], title: `${d.name}'s GlowFit profile` });
      return "shared" as const;
    } catch {
      /* cancelled: fall back to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded" as const;
}
