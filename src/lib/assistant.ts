import { BASE_LOOKS, CHANGE_OPTIONS, getBaseLook, labProducts, productsFor, totalPrice, type ChangeKind } from "./looks";
import { OCCASIONS, labelOccasion, scoreLook, type Occasion } from "./scoring";
import { money } from "./catalog";
import { CARE, STATUS_LABEL, headline, skinPlan, skinTypeInfo, statusOf, type MetricStatus } from "./skinCare";
import { insights, routine, type RoutineStep } from "./journey";
import { FACE_SHAPES } from "./hairMatch";
import type { SkinMetricKey, SkinResult } from "./skin";
import type { LabState, Profile, ScanEntry } from "@/store/glowfit";

// Glow Assistant: answers come only from the user's own data and the app's rules,
// so every number is real and nothing is made up. No network call is needed.

export type AssistantCtx = { skin: SkinResult | null; scans: ScanEntry[]; lab: LabState; profile: Profile; savedCount: number };

export type AssistantAction =
  | { label: string; type: "link"; href: string }
  | { label: string; type: "occasion"; occasion: Occasion }
  | { label: string; type: "tune"; kind: ChangeKind | "hair"; optionId?: string }
  | { label: string; type: "budget" };

export type AssistantCard =
  | { type: "metrics"; items: { label: string; score: number; status: MetricStatus }[] }
  | { type: "looks"; items: { name: string; score: number; why: string; best: boolean }[] }
  | { type: "routine"; items: RoutineStep[] }
  | { type: "products"; items: { name: string; brand: string; image: string; price: number }[]; total: number; budgetTotal: number }
  | { type: "progress"; items: { label: string; delta: number }[] };

export type AssistantReply = { text: string; cards?: AssistantCard[]; actions?: AssistantAction[]; followUps?: string[] };

const METRIC_WORDS: [SkinMetricKey, RegExp][] = [
  ["moisture", /hydrat|moistur(e|ised|ized)? level|dry|dehydrat|moisture/],
  ["texture", /textur|rough|bumpy|smooth/],
  ["oiliness", /oil|shin(e|y)|greasy|sebum/],
  ["pore", /pore/],
  ["redness", /red(ness)?\b|irritat|flush/],
  ["wrinkle", /wrinkl|fine line|aging|ageing|crow/],
  ["acne", /acne|pimple|breakout|blemish|clarity|spots?\b/],
  ["radiance", /radian|dull|bright|luminous/],
];

const MAKEUP_TIP: Record<SkinMetricKey, string> = {
  moisture: "Prep with a hydrating primer and choose a natural or dewy finish so base doesn't cling to dry patches.",
  texture: "A smoothing primer and thin layers of foundation keep texture from showing.",
  oiliness: "A natural or soft matte finish and a little setting powder on the T-zone keep shine down.",
  pore: "A blurring primer on the nose and cheeks plus medium coverage softens pores in photos.",
  redness: "Medium coverage, or a touch of green corrector first, evens out redness.",
  wrinkle: "Skip heavy powder around the eyes and use a satin finish so lines stay soft.",
  acne: "Spot-conceal blemishes instead of adding full coverage everywhere.",
  radiance: "A dewy finish or a touch of highlighter on the cheekbones brings back glow.",
};

const GLOSSARY: [RegExp, string, string][] = [
  [/niacinamide/, "Niacinamide", "A form of vitamin B3. It helps refine pores, balance oil and calm redness. Gentle enough for daily use, morning and night."],
  [/hyaluronic/, "Hyaluronic acid", "Pulls water into the skin for plumper, more hydrated skin. Apply on damp skin and seal it with moisturiser."],
  [/retinol|retinoid/, "Retinol", "A vitamin A derivative that smooths texture and softens fine lines. Use at night only, start 2 to 3 times a week, and always wear SPF the next day."],
  [/vitamin c|ascorbic/, "Vitamin C", "An antioxidant that brightens dull skin and evens tone. Best in the morning under sunscreen."],
  [/\bspf\b|sunscreen|sun ?block/, "Sunscreen (SPF)", "The single most effective step for healthy skin. Use SPF 30 to 50 every morning, even indoors, and reapply when outside."],
  [/\baha\b|glycolic|lactic/, "AHA", "Exfoliating acids that smooth texture and brighten. Use 2 to 3 nights a week, not with retinol on the same night."],
  [/\bbha\b|salicylic/, "BHA (salicylic acid)", "Oil-soluble exfoliant that clears inside pores. Good for oily skin, pores and breakouts; 2 to 3 times a week."],
  [/centella|cica/, "Centella (cica)", "A soothing plant extract that calms redness and supports the skin barrier."],
  [/peptide/, "Peptides", "Building blocks that support firmness. A gentle option for fine lines, fine to use morning and night."],
  [/ceramide/, "Ceramides", "Lipids that rebuild the skin barrier and lock in moisture. Great for dry or sensitive skin."],
];

const MEDICAL = /rash|bleed|infect|pain|burn(ing)?\b|allerg|prescri|medic(ine|ation)|cyst|eczema|psoriasis|dermatitis|rosacea|melasma|swell|itch/;

const SUGGESTIONS = ["What should I fix first?", "Is my look right for my skin?", "Give me a skincare routine", "How can I save money?", "Am I improving?", "Make my lip softer"];

const lower = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function needScan(): AssistantReply {
  return {
    text: "I need a skin scan first so my answers use **your** real scores. It takes one selfie and about 20 seconds.",
    actions: [{ label: "Start My Glow Scan", type: "link", href: "/scan" }],
    followUps: ["What does the scan measure?", "How does GlowFit work?"],
  };
}

const metricCard = (skin: SkinResult, keys?: SkinMetricKey[]): AssistantCard => ({
  type: "metrics",
  items: skin.metrics.filter((m) => !keys || keys.includes(m.key)).map((m) => ({ label: m.label, score: m.score, status: statusOf(m.score) })),
});

/** Figures out which Fine Tune change the user is asking for, if any. */
function tuneRequest(q: string, ctx: AssistantCtx): { kind: ChangeKind; optionId: string } | null {
  const lip = /lip|lipstick/.test(q);
  const softer = /soft|light|subtle|natural|nude|less|tone down|calmer/.test(q);
  const bolder = /bold|dark|strong|more|statement|pop|intense/.test(q);
  if (lip || /\b(red|berry|peach|mauve|nude)\b/.test(q)) {
    if (/berry/.test(q)) return { kind: "lip", optionId: "berry" };
    if (/peach/.test(q)) return { kind: "lip", optionId: "peach" };
    if (/mauve/.test(q)) return { kind: "lip", optionId: "soft-mauve" };
    if (/\bred\b/.test(q) || (lip && bolder)) return { kind: "lip", optionId: "classic-red" };
    if (/nude/.test(q)) return { kind: "lip", optionId: "rose-nude" };
    if (lip && softer) {
      const now = ctx.lab.currentRecipe?.lip.hex;
      return { kind: "lip", optionId: now === "#C27A72" ? "soft-mauve" : "rose-nude" };
    }
    if (lip) return { kind: "lip", optionId: "soft-mauve" };
  }
  if (/blush|cheek/.test(q)) {
    if (/coral/.test(q)) return { kind: "blush", optionId: "coral" };
    if (/mauve/.test(q)) return { kind: "blush", optionId: "mauve" };
    if (/rose|pink/.test(q) || bolder) return { kind: "blush", optionId: "rose" };
    return { kind: "blush", optionId: "soft-peach" };
  }
  if (/eye|shadow|smoky|smokey/.test(q)) {
    if (/smok|plum/.test(q) || bolder) return { kind: "eyes", optionId: "smoky-plum" };
    if (/rose gold/.test(q)) return { kind: "eyes", optionId: "rose-gold" };
    if (/brown/.test(q)) return { kind: "eyes", optionId: "soft-brown" };
    return { kind: "eyes", optionId: "champagne" };
  }
  if (/brow/.test(q)) {
    if (/straight/.test(q)) return { kind: "brows", optionId: "straight" };
    if (/high/.test(q)) return { kind: "brows", optionId: "high-arch" };
    if (/arch/.test(q)) return { kind: "brows", optionId: "soft-arch" };
    return { kind: "brows", optionId: "natural" };
  }
  if (/matte/.test(q)) return { kind: "finish", optionId: "matte" };
  if (/dewy|glowy|radiant finish/.test(q)) return { kind: "finish", optionId: "dewy" };
  if (/coverage|foundation/.test(q)) {
    if (/full|more|heav/.test(q)) return { kind: "foundation", optionId: "full" };
    if (/light|less|sheer/.test(q)) return { kind: "foundation", optionId: "light" };
    return { kind: "foundation", optionId: "medium" };
  }
  return null;
}

function tuneReply(req: { kind: ChangeKind; optionId: string }, ctx: AssistantCtx): AssistantReply {
  const { lab, skin } = ctx;
  const opt = CHANGE_OPTIONS[req.kind].options.find((o) => o.id === req.optionId)!;
  const what = `${CHANGE_OPTIONS[req.kind].label.toLowerCase()} to **${opt.label}**`;
  if (!lab.chosenLook || !lab.currentRecipe) {
    return {
      text: `I can change your ${what}, but first pick a look in the Decision Lab. Then I'll take you straight to the change.`,
      actions: [{ label: "Open Decision Lab", type: "link", href: "/decision-lab" }],
    };
  }
  const look = getBaseLook(lab.chosenLook);
  const after = opt.apply(lab.currentRecipe);
  const a = scoreLook(look.id, lab.currentRecipe, lab.moment, skin);
  const b = scoreLook(look.id, after, lab.moment, skin);
  const d = b.total - a.total;
  const verdict = d > 0 ? `It raises your match score from ${a.total} to **${b.total}**.` : d < 0 ? `Your match score would drop from ${a.total} to **${b.total}**, so it's a trade-off.` : `Your match score stays at **${a.total}**.`;
  return {
    text: `Changing your ${what} on ${look.name}: ${verdict} I've set it up in Fine Tune so you can preview it on your face (1 render).`,
    actions: [{ label: `Preview ${opt.label} on my face`, type: "tune", kind: req.kind, optionId: req.optionId }],
    followUps: ["Is my look right for my skin?", "How much does my look cost?"],
  };
}

const WEAK = /little light|more dramatic|can look shiny|may feel dry/;
/** The most encouraging reason for a look, so the best match isn't explained by its weak point. */
const bestReason = (reasons: string[], fallback: string) => reasons.find((r) => !WEAK.test(r)) ?? reasons[0] ?? fallback;

function lookFit(ctx: AssistantCtx, occasion: Occasion): AssistantReply {
  const moment = { ...ctx.lab.moment, occasion };
  const ranked = BASE_LOOKS.map((l) => ({ l, s: scoreLook(l.id, l.recipe, moment, ctx.skin) })).sort((x, y) => y.s.total - x.s.total);
  const best = ranked[0];
  const chosen = ctx.lab.chosenLook && ctx.lab.currentRecipe ? { l: getBaseLook(ctx.lab.chosenLook), s: scoreLook(ctx.lab.chosenLook, ctx.lab.currentRecipe, moment, ctx.skin) } : null;
  const label = labelOccasion(occasion).toLowerCase();
  let text = `For a **${label}**, your best match is **${best.l.name}** at ${best.s.total}/100. ${bestReason(best.s.reasons, best.l.tagline)}`;
  if (chosen) {
    text +=
      chosen.l.id === best.l.id
        ? ` Your current look is already the best choice, scoring **${chosen.s.total}** with your changes.`
        : ` Your current ${chosen.l.name} scores **${chosen.s.total}**. ${chosen.s.reasons[0] ?? ""}`;
  }
  if (!ctx.skin) text += " Scan your skin to make the skin part of this score personal.";
  const actions: AssistantAction[] = [];
  if (occasion !== ctx.lab.moment.occasion) actions.push({ label: `Set my moment to ${labelOccasion(occasion)}`, type: "occasion", occasion });
  actions.push({ label: "Compare looks in Decision Lab", type: "link", href: "/decision-lab" });
  return {
    text,
    cards: [{ type: "looks", items: ranked.map(({ l, s }, i) => ({ name: l.name, score: s.total, why: i === 0 ? bestReason(s.reasons, l.tagline) : (s.reasons[0] ?? l.tagline), best: i === 0 })) }],
    actions,
    followUps: ["How much does my look cost?", "Make my lip softer"],
  };
}

/** The main entry point: one question in, one grounded reply out. */
export function answer(input: string, ctx: AssistantCtx): AssistantReply {
  const q = lower(input);
  const { skin } = ctx;
  const name = ctx.profile.name.trim();

  if (!q) return greeting(ctx);

  if (MEDICAL.test(q)) {
    return {
      text: "That sounds like something a **dermatologist** should look at. GlowFit gives cosmetic guidance only, not medical advice. Until then, keep it simple: a gentle cleanser, a fragrance-free moisturiser and SPF, and skip new actives or exfoliants on that area.",
      followUps: ["Give me a gentle routine", "What should I fix first?"],
    };
  }

  if (/^(hi|hello|hey|salam|assalam|good (morning|evening|afternoon))\b|what can you do|help me|^help$|how does (glowfit|this|the app) work/.test(q)) return greeting(ctx);

  if (/what does the scan measure|what do you measure|which metrics/.test(q)) {
    return {
      text: "YouCam Skin AI measures **8 areas** from one selfie: hydration, texture, oiliness, pores, redness, fine lines, clarity (blemishes) and radiance. Each gets a 0 to 100 score where higher is healthier, plus your skin type.",
      actions: [{ label: "Start My Glow Scan", type: "link", href: "/scan" }],
    };
  }

  const gloss = GLOSSARY.find(([re]) => re.test(q));
  if (gloss && /what|is|does|how|use|should|good|explain|tell/.test(q)) {
    const fits = skin ? skinPlan(skin).priorities.some((p) => CARE[p.key].tip.toLowerCase().includes(gloss[1].toLowerCase().split(" ")[0])) : false;
    return {
      text: `**${gloss[1]}:** ${gloss[2]}${fits ? " It also targets one of your top skin priorities, so it's a good fit for you." : ""}`,
      followUps: ["Give me a skincare routine", "What should I fix first?"],
    };
  }

  const tune = /(make|change|switch|try|want|prefer|softer|bolder|lighter|darker|more|less)/.test(q) ? tuneRequest(q, ctx) : null;
  if (tune) return tuneReply(tune, ctx);

  if (/hair|haircut|hairstyle|fringe|bangs/.test(q)) {
    const face = FACE_SHAPES.find((f) => f.id === ctx.profile.faceShape);
    return {
      text: face
        ? `For your **${face.label.toLowerCase()} face**, the Hairstyle tab ranks every YouCam style with a match %, using your face shape, your ${labelOccasion(ctx.lab.moment.occasion).toLowerCase()} and your ${ctx.lab.moment.style} style. Tap one to try it on your own photo (2 units).`
        : `In Fine Tune, the **Hairstyle** tab lets you try real YouCam hairstyles on your own photo. Pick your face shape there and every style gets a match % for your face and your ${labelOccasion(ctx.lab.moment.occasion).toLowerCase()}.`,
      actions: [{ label: "Try hairstyles on my photo", type: "tune", kind: "hair" }],
      followUps: ["Is my look right for my skin?"],
    };
  }

  const occ = OCCASIONS.find((o) => q.includes(o.label.toLowerCase()) || q.includes(o.id.replace("-", " ")));
  if (occ && /look|makeup|wear|going|for|best|suit|what/.test(q)) return lookFit(ctx, occ.id);

  if (/cheap|budget|afford|save|saving|price|cost|expens|how much|total/.test(q)) {
    if (!ctx.lab.chosenLook || !ctx.lab.currentRecipe) {
      return {
        text: `Your budget is set to **${money(ctx.lab.moment.budget)}**. Pick a look in the Decision Lab and I'll show its exact price and the cheapest way to get it.`,
        actions: [{ label: "Open Decision Lab", type: "link", href: "/decision-lab" }],
      };
    }
    const look = getBaseLook(ctx.lab.chosenLook);
    const items = labProducts(look, ctx.lab.currentRecipe, ctx.lab.priceMode, ctx.lab.picks);
    const total = totalPrice(items);
    const budgetTotal = totalPrice(productsFor(look, ctx.lab.currentRecipe, "optimized"));
    const save = total - budgetTotal;
    const over = total - ctx.lab.moment.budget;
    return {
      text:
        `Your ${look.name} costs **${money(total)}** for ${items.length} products` +
        (over > 0 ? `, ${money(over)} over your ${money(ctx.lab.moment.budget)} budget.` : `, within your ${money(ctx.lab.moment.budget)} budget.`) +
        (save > 0 ? ` Budget Mode keeps the same shades for **${money(budgetTotal)}**, saving ${money(save)}.` : " You're already on the best price."),
      cards: [{ type: "products", items: items.map((p) => ({ name: p.name, brand: p.brand, image: p.image, price: p.price })), total, budgetTotal }],
      actions: save > 0 && ctx.lab.priceMode !== "optimized" ? [{ label: `Switch to Budget Mode (save ${money(save)})`, type: "budget" }] : [{ label: "Shop these products", type: "link", href: "/products" }],
      followUps: ["Is my look right for my skin?", "Make my lip softer"],
    };
  }

  if (/improv|progress|journey|better|worse|changed|compare|before and after|track/.test(q)) {
    const scans = [...ctx.scans].sort((a, b) => a.at.localeCompare(b.at));
    if (scans.length < 2) {
      return {
        text: scans.length
          ? "You have **1 scan** so far, your starting point. Scan again in about 2 weeks, in the same light and without makeup, and I'll show exactly what changed."
          : "Your Skin Journey starts with your first scan. After two scans I can tell you what improved and by how much.",
        actions: [
          { label: scans.length ? "Scan again" : "Start My Glow Scan", type: "link", href: "/scan" },
          { label: "Open Skin Journey", type: "link", href: "/journey" },
        ],
      };
    }
    const first = scans[0].skin;
    const last = scans[scans.length - 1].skin;
    const tips = insights(scans);
    const d = last.overall - first.overall;
    return {
      text: `Across **${scans.length} scans**, your skin score went from ${first.overall} to **${last.overall}** (${d >= 0 ? "+" : ""}${d}). ${tips.map((t) => t.title).join(" ")}`,
      cards: [{ type: "progress", items: last.metrics.map((m) => ({ label: m.label, delta: m.score - (first.metrics.find((x) => x.key === m.key)?.score ?? m.score) })) }],
      actions: [{ label: "Open Skin Journey", type: "link", href: "/journey" }],
      followUps: ["What should I fix first?", "Give me a skincare routine"],
    };
  }

  if (/routine|skincare|skin care|regimen|morning|night|\bam\b|\bpm\b|cleanser|toner|serum|moisturi[sz]er|what should i (use|apply)/.test(q)) {
    if (!skin) return needScan();
    const steps = routine(skin);
    const low = skinPlan(skin).priorities[0];
    return {
      text: `Here's a simple 5-step routine for your **${(skin.skinType ?? "normal").toLowerCase()} skin**. The serum targets your lowest area, **${low.label.toLowerCase()}** (${low.score}). Morning: cleanser, toner, serum, moisturiser, SPF. Night: the same without SPF.`,
      cards: [{ type: "routine", items: steps }],
      actions: [{ label: "See my full care plan", type: "link", href: "/profile#skin-profile" }],
      followUps: ["What is niacinamide?", "Am I improving?"],
    };
  }

  if (/look|makeup|suit|right for me|best for me|which/.test(q)) return lookFit(ctx, ctx.lab.moment.occasion);

  if (/first|focus|priorit|fix|worst|lowest|weak|problem|concern|improve/.test(q)) {
    if (!skin) return needScan();
    const plan = skinPlan(skin);
    const list = plan.priorities.map((p, i) => `${i + 1}. **${p.label} (${p.score})**: ${p.tip}`).join("\n");
    return {
      text: `${name ? `${name}, here` : "Here"} are your top 3 priorities, lowest score first:\n${list}`,
      cards: [metricCard(skin, plan.priorities.map((p) => p.key))],
      actions: [{ label: "See my full skin profile", type: "link", href: "/skin-intelligence" }],
      followUps: ["Give me a skincare routine", "Is my look right for my skin?"],
    };
  }

  const metricHit = METRIC_WORDS.find(([, re]) => re.test(q));
  if (metricHit) {
    if (!skin) return needScan();
    const m = skin.metrics.find((x) => x.key === metricHit[0]);
    if (!m) return { text: "That metric wasn't part of your last scan. Try a new scan to get all 8 areas." };
    const st = statusOf(m.score);
    const info = CARE[m.key];
    return {
      text: `Your **${m.label.toLowerCase()} score is ${m.score}/100** (${STATUS_LABEL[st]}). ${st === "good" ? info.good : info.care}\n**Skincare:** ${info.tip}\n**Makeup:** ${MAKEUP_TIP[m.key]}`,
      cards: [metricCard(skin, [m.key])],
      followUps: ["What should I fix first?", "Give me a skincare routine"],
    };
  }

  if (/skin|score|type|analysis|result|scan/.test(q)) {
    if (!skin) return needScan();
    const sorted = [...skin.metrics].sort((a, b) => b.score - a.score);
    const type = skinTypeInfo(skin.skinType);
    return {
      text: `Your skin score is **${skin.overall}/100**. ${headline(skin.overall)} Skin type: **${skin.skinType ?? "Normal"}** (${type.line.toLowerCase()}) Strongest: ${sorted
        .slice(0, 2)
        .map((m) => `${m.label.toLowerCase()} ${m.score}`)
        .join(", ")}. Needs care: ${sorted
        .slice(-2)
        .reverse()
        .map((m) => `${m.label.toLowerCase()} ${m.score}`)
        .join(", ")}.`,
      cards: [metricCard(skin)],
      actions: [{ label: "Open full skin profile", type: "link", href: "/skin-intelligence" }],
      followUps: ["What should I fix first?", "Give me a skincare routine"],
    };
  }

  if (/product|foundation|lipstick|recommend|buy|shop/.test(q)) return answer("how much does my look cost", ctx);

  return {
    text: "I'm not sure about that one. I can answer questions about **your skin scan**, your **look and products**, your **budget**, your **skin journey**, hairstyles and skincare ingredients. Try one of these:",
    followUps: SUGGESTIONS.slice(0, 4),
  };
}

export function greeting(ctx: AssistantCtx): AssistantReply {
  const name = ctx.profile.name.trim();
  const hi = `Hi${name ? ` ${name}` : ""}! I'm your **Glow Assistant**.`;
  if (!ctx.skin) {
    return {
      text: `${hi} I answer using your own skin scan, looks and budget, so nothing is guesswork. Start with a scan, or ask me how GlowFit works.`,
      actions: [{ label: "Start My Glow Scan", type: "link", href: "/scan" }],
      followUps: ["What does the scan measure?", "Which look is best for a wedding?", "What is niacinamide?"],
    };
  }
  const low = skinPlan(ctx.skin).priorities[0];
  const look = ctx.lab.chosenLook ? getBaseLook(ctx.lab.chosenLook).name : null;
  return {
    text: `${hi} Your skin score is **${ctx.skin.overall}/100** and your top priority is **${low.label.toLowerCase()}** (${low.score}).${look ? ` You're working on **${look}** for your ${labelOccasion(ctx.lab.moment.occasion).toLowerCase()}.` : ""} What would you like to know?`,
    followUps: SUGGESTIONS,
  };
}

export const ASSISTANT_SUGGESTIONS = SUGGESTIONS;
