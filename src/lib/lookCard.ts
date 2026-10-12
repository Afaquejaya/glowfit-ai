import { money, type Product } from "./catalog";

// Draws a shareable "Look Card" (1080 x 1350, Instagram portrait) entirely in the browser.

export type LookCardData = {
  image: string;
  lookName: string;
  occasion: string;
  score: number;
  level: string;
  products: Product[];
  total: number;
  skinScore: number | null;
};

const W = 1080;
const H = 1350;

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Draws an image to fill a box, cropping the overflow like CSS object-fit: cover. */
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, focusY = 0.4) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) * focusY, sw, sh, x, y, w, h);
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fonts() {
  const pick = (cls: string, fallback: string) => {
    const el = document.querySelector(`.${cls}`);
    return el ? getComputedStyle(el).fontFamily : fallback;
  };
  return { serif: pick("font-serif", "Georgia, serif"), sans: getComputedStyle(document.body).fontFamily || "Arial, sans-serif" };
}

export async function drawLookCard(d: LookCardData): Promise<Blob> {
  const { serif, sans } = fonts();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#FDF8F6");
  bg.addColorStop(1, "#F6E3DC");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Look photo
  const photo = await load(d.image);
  ctx.save();
  rounded(ctx, 60, 60, 600, 800, 40);
  ctx.clip();
  cover(ctx, photo, 60, 60, 600, 800);
  ctx.restore();

  // Score
  const cx = 860;
  const cy = 200;
  ctx.lineWidth = 18;
  ctx.strokeStyle = "#F1DCD4";
  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#7A2E2E";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, 110, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * d.score) / 100);
  ctx.stroke();
  ctx.fillStyle = "#2B2523";
  ctx.textAlign = "center";
  ctx.font = `600 84px ${serif}`;
  ctx.fillText(String(d.score), cx, cy + 28);
  ctx.font = `500 22px ${sans}`;
  ctx.fillStyle = "#7A2E2E";
  ctx.fillText("MATCH SCORE", cx, cy + 165);
  ctx.fillStyle = "#6B8F71";
  ctx.font = `600 22px ${sans}`;
  ctx.fillText(`${d.level} CONFIDENCE`, cx, cy + 200);

  // Highlights
  ctx.textAlign = "left";
  const facts = [
    ["For", d.occasion],
    ["Products", String(d.products.length)],
    ["Total", money(d.total)],
    ...(d.skinScore !== null ? [["Skin score", `${d.skinScore}/100`]] : []),
  ];
  let fy = 470;
  for (const [k, v] of facts) {
    ctx.fillStyle = "rgba(43,37,35,0.55)";
    ctx.font = `400 24px ${sans}`;
    ctx.fillText(k, 710, fy);
    ctx.fillStyle = "#2B2523";
    ctx.font = `500 34px ${serif}`;
    ctx.fillText(v, 710, fy + 42);
    fy += 98;
  }

  // Title
  ctx.fillStyle = "#7A2E2E";
  ctx.font = `500 22px ${sans}`;
  ctx.fillText("MY GLOWFIT LOOK", 60, 925);
  ctx.fillStyle = "#2B2523";
  ctx.font = `500 76px ${serif}`;
  ctx.fillText(d.lookName, 60, 1005);

  // Products
  const items = d.products.slice(0, 4);
  const pw = (W - 120 - 3 * 24) / 4;
  for (let i = 0; i < items.length; i++) {
    const p = items[i];
    const x = 60 + i * (pw + 24);
    const y = 1045;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    rounded(ctx, x, y, pw, 190, 24);
    ctx.fill();
    try {
      const img = await load(p.image);
      ctx.save();
      rounded(ctx, x + 14, y + 14, 80, 80, 16);
      ctx.clip();
      cover(ctx, img, x + 14, y + 14, 80, 80, 0.5);
      ctx.restore();
    } catch {
      ctx.fillStyle = p.hex;
      rounded(ctx, x + 14, y + 14, 80, 80, 16);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(43,37,35,0.55)";
    ctx.font = `400 18px ${sans}`;
    ctx.fillText(p.brand.slice(0, 18), x + 16, y + 126);
    ctx.fillStyle = "#2B2523";
    ctx.font = `500 21px ${sans}`;
    const name = p.name.length > 18 ? `${p.name.slice(0, 17)}…` : p.name;
    ctx.fillText(name, x + 16, y + 154);
    ctx.fillStyle = "#7A2E2E";
    ctx.fillText(money(p.price), x + 16, y + 180);
  }

  // Footer
  ctx.fillStyle = "rgba(43,37,35,0.5)";
  ctx.font = `400 20px ${sans}`;
  ctx.fillText("GlowFit AI · Rendered with YouCam Makeup VTO · Products are fictional demo brands", 60, 1300);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("card_failed"))), "image/png"));
}

/** Shares the card where the browser supports it, otherwise downloads it. */
export async function shareLookCard(d: LookCardData) {
  const blob = await drawLookCard(d);
  const file = new File([blob], `glowfit-${d.lookName.toLowerCase().replace(/\s+/g, "-")}.png`, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] }) && window.matchMedia("(pointer: coarse)").matches) {
    try {
      await nav.share({ files: [file], title: `My ${d.lookName} look`, text: `My GlowFit match score: ${d.score}` });
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
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded" as const;
}
