import type { HairStyle } from "./useHairRender";
import type { Occasion, StylePref } from "./scoring";

// Rule-based hairstyle matching: every percentage comes from the style's name, the user's
// face shape, their moment and their style preference, so the app can explain each match.

export type FaceShape = "oval" | "round" | "square" | "heart" | "long";
export type HairCategory = "all" | "short" | "medium" | "long" | "curly" | "bangs" | "updo" | "fade" | "textured" | "classic";

export const FACE_SHAPES: { id: FaceShape; label: string; hint: string }[] = [
  { id: "oval", label: "Oval", hint: "Balanced, slightly longer than wide" },
  { id: "round", label: "Round", hint: "Soft jaw, about as wide as long" },
  { id: "square", label: "Square", hint: "Strong jaw, straight sides" },
  { id: "heart", label: "Heart", hint: "Wider forehead, narrow chin" },
  { id: "long", label: "Long", hint: "Clearly longer than wide" },
];

export const CATEGORIES: Record<"women" | "men", { id: HairCategory; label: string }[]> = {
  women: [
    { id: "all", label: "All" },
    { id: "short", label: "Short" },
    { id: "medium", label: "Medium" },
    { id: "long", label: "Long" },
    { id: "curly", label: "Curls & Waves" },
    { id: "bangs", label: "Bangs" },
    { id: "updo", label: "Updos & Ponytails" },
  ],
  men: [
    { id: "all", label: "All" },
    { id: "short", label: "Short" },
    { id: "fade", label: "Fades" },
    { id: "textured", label: "Textured" },
    { id: "classic", label: "Classic" },
    { id: "curly", label: "Curly" },
    { id: "long", label: "Long" },
  ],
};

const has = (title: string, re: RegExp) => re.test(title);

const RE = {
  short: /pixie|buzz|crop|crew|fade|taper|short|caesar|ivy|two[- ]block|undercut|french bob/i,
  medium: /\blob\b|bob|shoulder|shag|mullet|wolf|medium|mid/i,
  long: /long|mermaid|princess|butterfly|man bun|flow|length/i,
  curly: /curl|wav|perm|afro|coil|ringlet|beach|spiral/i,
  bangs: /bang|fringe/i,
  updo: /updo|up[- ]?do|bun|chignon|ponytail|pony|braid|half[- ]up|top ?knot/i,
  fade: /fade|taper|undercut|skin/i,
  textured: /textur|messy|crop|quiff|spiky|tousled|shag|mullet|wolf/i,
  classic: /side part|slick|comb|pompadour|classic|gentleman|ivy|crew/i,
  volume: /volume|blowout|voluminous|big|bouncy|butterfly|princess/i,
  sleek: /sleek|straight|slick|wet/i,
  layers: /layer|feather|butterfly|shag|wolf/i,
};

export function inCategory(s: HairStyle, c: HairCategory) {
  if (c === "all") return true;
  if (c === "medium") return has(s.title, RE.medium) && !has(s.title, RE.short);
  if (c === "short") return has(s.title, RE.short);
  return has(s.title, RE[c]);
}

// What each moment calls for, as name patterns.
const OCCASION_FIT: Record<Occasion, RegExp> = {
  wedding: /updo|bun|chignon|braid|princess|curl|wav|half[- ]up|volume|elegant|side part|slick|classic|pompadour/i,
  party: /volume|blowout|curl|wav|wet|sleek|ponytail|wolf|mullet|quiff|butterfly|textur/i,
  work: /bob|lob|sleek|straight|ponytail|low bun|side part|crop|crew|taper|classic|ivy|layer/i,
  "date-night": /wav|curtain|layer|soft|half[- ]up|curl|side[- ]swept|textur|quiff|messy/i,
  vacation: /beach|braid|ponytail|messy|bun|buzz|crop|natural|wav|curl/i,
  photoshoot: /volume|butterfly|wolf|bang|curl|wav|mullet|pompadour|quiff|slick|sleek|wet/i,
  everyday: /layer|lob|pixie|messy|natural|crop|ponytail|straight|textur|crew|buzz|bob/i,
};

const STYLE_FIT: Record<StylePref, RegExp> = {
  natural: /natural|layer|wav|messy|soft|crop|crew|lob|straight/i,
  elegant: /updo|chignon|bob|sleek|side part|low bun|classic|slick|princess/i,
  glam: /volume|blowout|curl|wav|butterfly|princess|wet|pompadour|quiff/i,
  bold: /pixie|buzz|wolf|mullet|wet|bang|fade|two[- ]block|undercut|shag/i,
};

// Classic stylist guidance: what flatters each face shape, and what to avoid.
const FACE_FIT: Record<FaceShape, { good: RegExp; avoid: RegExp; why: string }> = {
  oval: { good: /./, avoid: /$^/, why: "Oval faces suit almost every cut" },
  round: {
    good: /long|layer|side[- ]swept|lob|quiff|pompadour|textur|crop|high pony|curtain|undercut|fade/i,
    avoid: /blunt|chin|\bbob\b|full bang|buzz/i,
    why: "Adds height and length to a round face",
  },
  square: {
    good: /wav|curl|layer|side part|side[- ]swept|curtain|shag|textur|soft|lob|messy/i,
    avoid: /blunt|sleek bob|buzz|straight bang/i,
    why: "Softens a strong jawline",
  },
  heart: {
    good: /lob|bob|curtain|side[- ]swept|chin|wav|side part|textur|fringe|bang/i,
    avoid: /volume on top|pompadour|high pony|slick/i,
    why: "Balances a wider forehead",
  },
  long: {
    good: /bang|fringe|bob|lob|wav|curl|volume|layer|side part|crop/i,
    avoid: /long straight|sleek|high pony|pompadour|top ?knot/i,
    why: "Adds width and shortens a long face",
  },
};

export type HairMatch = { score: number; reasons: string[] };

export function matchHair(
  s: HairStyle,
  ctx: { face: FaceShape | null; occasion: Occasion; style: StylePref; occasionLabel: string },
): HairMatch {
  const reasons: string[] = [];
  let score = 64;

  if (ctx.face) {
    const f = FACE_FIT[ctx.face];
    if (f.avoid.test(s.title)) {
      score -= 12;
      reasons.push(`Less flattering for a ${ctx.face} face`);
    } else if (ctx.face === "oval" || f.good.test(s.title)) {
      score += 14;
      reasons.push(ctx.face === "oval" ? f.why : f.why);
    }
  }
  if (OCCASION_FIT[ctx.occasion].test(s.title)) {
    score += 12;
    reasons.push(`Great for ${ctx.occasionLabel.toLowerCase()}`);
  }
  if (STYLE_FIT[ctx.style].test(s.title)) {
    score += 7;
    reasons.push(`Fits your ${ctx.style} style`);
  }
  if (s.trend !== undefined) {
    score += Math.max(2, 8 - s.trend);
    if (s.hot) reasons.push("Trending now");
  }
  return { score: Math.max(55, Math.min(98, score)), reasons };
}
