import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

// Optional wording polish for Glow Assistant answers. The answer itself is always built in the
// browser from the user's own data; this route only rewrites it to sound more natural.
// Works with any free OpenAI-compatible endpoint (Groq, Gemini, OpenRouter, Ollama). Off unless
// ASSISTANT_LLM_URL and ASSISTANT_LLM_MODEL are set in .env.local.

const URL_ = process.env.ASSISTANT_LLM_URL?.replace(/\/+$/, "");
const KEY = process.env.ASSISTANT_LLM_KEY;
const MODEL = process.env.ASSISTANT_LLM_MODEL;
const enabled = () => Boolean(URL_ && MODEL);

const SYSTEM =
  "You rewrite answers for a beauty and skincare app called GlowFit. Rewrite the DRAFT so it sounds warm, clear and natural, " +
  "in 2 to 4 short sentences. Keep every number, score, price and product or look name exactly as written. " +
  "Do not add facts, products, ingredients or medical claims that are not in the draft. Keep **bold** around key words. " +
  "Reply with the rewritten text only.";

const numbers = (s: string): string[] => s.match(/\d+(?:[.,]\d+)?/g) ?? [];

// GET /api/assistant: tells the page whether wording polish is on.
export async function GET() {
  return NextResponse.json({ enabled: enabled() });
}

// POST /api/assistant: { question, draft } -> { text, polished }
export async function POST(req: Request) {
  const { question, draft } = (await req.json().catch(() => ({}))) as { question?: string; draft?: string };
  if (!draft) return NextResponse.json({ error: "missing_draft" }, { status: 400 });
  if (!enabled()) return NextResponse.json({ text: draft, polished: false });

  try {
    const res = await fetch(`${URL_}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}) },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 300,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `QUESTION: ${(question ?? "").slice(0, 300)}\n\nDRAFT:\n${draft.slice(0, 2000)}` },
        ],
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return NextResponse.json({ text: draft, polished: false });
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    // Reject a rewrite that dropped or changed any number: the grounded draft is the source of truth.
    const kept = text ? numbers(text) : [];
    if (!text || numbers(draft).some((n) => !kept.includes(n))) return NextResponse.json({ text: draft, polished: false });
    return NextResponse.json({ text, polished: true });
  } catch {
    return NextResponse.json({ text: draft, polished: false });
  }
}
