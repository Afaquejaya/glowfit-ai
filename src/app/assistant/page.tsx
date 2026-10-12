"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, ArrowUpRight, Bot, Camera, RotateCcw, SendHorizontal, ShieldCheck, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useGlowStore } from "@/store/glowfit";
import { ASSISTANT_SUGGESTIONS, answer, greeting, type AssistantAction, type AssistantCard, type AssistantCtx, type AssistantReply } from "@/lib/assistant";
import { STATUS_LABEL, skinPlan, type MetricStatus } from "@/lib/skinCare";
import { getBaseLook } from "@/lib/looks";
import { labelOccasion } from "@/lib/scoring";
import { money } from "@/lib/catalog";
import { GlowLoader } from "@/components/ui/GlowLoader";

type Msg = { id: string; role: "user" | "bot"; reply?: AssistantReply; text?: string };

const HISTORY_KEY = "glowfit-assistant";
const TUNE_KEY = "glowfit-tune";

const BAR: Record<MetricStatus, string> = { good: "bg-sage", care: "bg-rose-400", priority: "bg-rose-600" };
const PILL: Record<MetricStatus, string> = { good: "bg-sage/15 text-sage", care: "bg-champagne text-amber-700", priority: "bg-rose-100 text-rose-700" };

function readHistory(): Msg[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as Msg[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(msgs: Msg[]) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-40)));
  } catch {
    /* storage full or blocked: the chat still works for this visit */
  }
}

/** Renders **bold**, line breaks and "- " list lines from the engine's plain text. */
function RichText({ text }: { text: string }) {
  const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") ? <strong key={i} className="font-semibold text-charcoal">{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>));
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((l, i) =>
        /^\s*[-•]\s/.test(l) ? (
          <p key={i} className="flex gap-2 pl-1">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
            <span>{bold(l.replace(/^\s*[-•]\s/, ""))}</span>
          </p>
        ) : l.trim() ? (
          <p key={i}>{bold(l)}</p>
        ) : null,
      )}
    </div>
  );
}

function Card({ card }: { card: AssistantCard }) {
  if (card.type === "metrics") {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {card.items.map((m) => (
          <div key={m.label} className="rounded-2xl bg-white/80 p-3 ring-1 ring-blush-100">
            <p className="truncate text-xs text-charcoal/60">{m.label}</p>
            <p className="font-serif text-2xl leading-tight">{m.score}</p>
            <div className="mt-1 h-1 rounded-full bg-blush-100">
              <div className={clsx("h-1 rounded-full", BAR[m.status])} style={{ width: `${m.score}%` }} />
            </div>
            <span className={clsx("mt-2 inline-block rounded-full px-2 py-0.5 text-[10px]", PILL[m.status])}>{STATUS_LABEL[m.status]}</span>
          </div>
        ))}
      </div>
    );
  }
  if (card.type === "looks") {
    return (
      <div className="space-y-2">
        {card.items.map((l) => (
          <div key={l.name} className={clsx("flex items-center gap-3 rounded-2xl p-3 ring-1", l.best ? "bg-blush-50 ring-rose-300" : "bg-white/80 ring-blush-100")}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white font-serif text-lg text-wine-700 ring-1 ring-blush-200">{l.score}</span>
            <div className="min-w-0">
              <p className="font-serif text-base">
                {l.name} {l.best && <span className="ml-1 rounded-full bg-wine-700 px-2 py-0.5 align-middle font-sans text-[10px] text-white">Best match</span>}
              </p>
              <p className="text-xs text-charcoal/60">{l.why}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (card.type === "routine") {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {card.items.map((s, i) => (
          <div key={s.id} className="overflow-hidden rounded-2xl bg-white/80 ring-1 ring-blush-100">
            <img src={s.image} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
            <div className="p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-rose-600">
                {i + 1} · {s.when}
              </p>
              <p className="font-serif text-sm">{s.name}</p>
              <p className="text-xs text-charcoal/60">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (card.type === "products") {
    const save = card.total - card.budgetTotal;
    return (
      <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-blush-100">
        <div className="space-y-2">
          {card.items.map((p) => (
            <div key={p.name} className="flex items-center gap-3">
              <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{p.name}</p>
                <p className="text-xs text-charcoal/55">{p.brand}</p>
              </div>
              <span className="text-sm">{money(p.price)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-blush-100 pt-3 text-sm">
          <span>
            Total <strong className="font-serif text-lg">{money(card.total)}</strong>
          </span>
          {save > 0 && <span className="rounded-full bg-sage/15 px-2.5 py-1 text-xs text-sage">Budget Mode: {money(card.budgetTotal)} (save {money(save)})</span>}
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {card.items.map((p) => (
        <div key={p.label} className="rounded-2xl bg-white/80 p-3 ring-1 ring-blush-100">
          <p className="truncate text-xs text-charcoal/60">{p.label}</p>
          <p className={clsx("flex items-center gap-1 font-serif text-xl", p.delta > 0 ? "text-sage" : p.delta < 0 ? "text-rose-600" : "text-charcoal")}>
            {p.delta > 0 ? <TrendingUp className="h-4 w-4" /> : p.delta < 0 ? <TrendingDown className="h-4 w-4" /> : null}
            {p.delta > 0 ? "+" : ""}
            {p.delta}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function AssistantPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const skin = useGlowStore((s) => s.skin);
  const scans = useGlowStore((s) => s.scans);
  const lab = useGlowStore((s) => s.lab);
  const profile = useGlowStore((s) => s.profile);
  const savedCount = useGlowStore((s) => s.savedLooks.length);
  const updateLab = useGlowStore((s) => s.updateLab);
  const ctx: AssistantCtx = useMemo(() => ({ skin, scans, lab, profile, savedCount }), [skin, scans, lab, profile, savedCount]);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [polish, setPolish] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read the store directly: the first render still has the pre-hydration state.
    const st = useGlowStore.getState();
    const saved = readHistory();
    setMsgs(saved.length ? saved : [{ id: "hello", role: "bot", reply: greeting({ skin: st.skin, scans: st.scans, lab: st.lab, profile: st.profile, savedCount: st.savedLooks.length }) }]);
    setReady(true);
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => setPolish(Boolean(d.enabled)))
      .catch(() => setPolish(false));
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeHistory(msgs);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, typing, ready]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || typing) return;
    setInput("");
    setMsgs((m) => [...m, { id: `u-${Date.now()}`, role: "user", text: q }]);
    setTyping(true);
    const reply = answer(q, ctx);
    const started = Date.now();
    if (polish) {
      try {
        const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, draft: reply.text }) });
        const d = (await res.json()) as { text?: string };
        if (d.text) reply.text = d.text;
      } catch {
        /* keep the grounded text */
      }
    }
    // A short pause so the answer reads like a reply, not a page jump.
    const wait = Math.max(0, 550 - (Date.now() - started));
    setTimeout(() => {
      setMsgs((m) => [...m, { id: `b-${Date.now()}`, role: "bot", reply }]);
      setTyping(false);
    }, wait);
  }

  function act(a: AssistantAction) {
    if (a.type === "link") return router.push(a.href);
    if (a.type === "occasion") {
      updateLab({ moment: { ...lab.moment, occasion: a.occasion } });
      setMsgs((m) => [...m, { id: `b-${Date.now()}`, role: "bot", reply: { text: `Done. Your moment is now **${labelOccasion(a.occasion)}**, so every look and match score uses it.`, actions: [{ label: "Compare looks in Decision Lab", type: "link", href: "/decision-lab" }] } }]);
      return;
    }
    if (a.type === "tune") {
      try {
        sessionStorage.setItem(TUNE_KEY, JSON.stringify({ kind: a.kind, optionId: a.optionId ?? null }));
      } catch {
        /* Fine Tune still opens, just without the preset */
      }
      updateLab({ step: 4 });
      return router.push("/decision-lab");
    }
    updateLab({ priceMode: "optimized", step: 3 });
    router.push("/decision-lab");
  }

  function reset() {
    const fresh: Msg[] = [{ id: `hello-${Date.now()}`, role: "bot", reply: greeting(ctx) }];
    setMsgs(fresh);
  }

  if (!ready) return <GlowLoader title="Waking up your assistant" messages={["Reading your skin profile", "Loading your looks"]} />;

  const plan = skin ? skinPlan(skin) : null;
  const look = lab.chosenLook ? getBaseLook(lab.chosenLook) : null;
  const lastBot = [...msgs].reverse().find((m) => m.role === "bot");
  const known = [
    { label: "Skin score", value: skin ? `${skin.overall}/100` : "No scan yet" },
    { label: "Top priority", value: plan ? `${plan.priorities[0].label} (${plan.priorities[0].score})` : "Scan to find out" },
    { label: "Moment", value: labelOccasion(lab.moment.occasion) },
    { label: "Current look", value: look ? look.name : "Not chosen" },
    { label: "Skin scans", value: `${scans.length}` },
    { label: "Saved looks", value: `${savedCount}` },
  ];

  return (
    <div className="mx-auto max-w-7xl animate-fadeUp">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Glow Assistant</p>
          <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">Your Beauty Decision Partner.</h1>
          <p className="mt-3 text-lg text-charcoal/65">Answers built from your own skin scan, looks and budget, with one tap to act on them.</p>
        </div>
        <button onClick={reset} className="chip hover:text-wine-900">
          <RotateCcw className="h-3.5 w-3.5" /> New chat
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card flex h-[72vh] min-h-[480px] flex-col overflow-hidden lg:h-[calc(100vh-220px)] lg:min-h-[560px]">
          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" aria-live="polite">
            {msgs.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-3xl rounded-br-md bg-gradient-to-b from-cocoa-700 to-cocoa-900 px-4 py-2.5 text-white">{m.text}</p>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush-100">
                    <Sparkles className="h-4 w-4 text-wine-700" />
                  </span>
                  <div className="min-w-0 max-w-[92%] flex-1 space-y-3">
                    <div className="rounded-3xl rounded-tl-md bg-white/85 px-4 py-3 text-[15px] leading-relaxed text-charcoal/85 ring-1 ring-blush-100">
                      <RichText text={m.reply!.text} />
                    </div>
                    {m.reply!.cards?.map((c, i) => <Card key={i} card={c} />)}
                    {!!m.reply!.actions?.length && (
                      <div className="flex flex-wrap gap-2">
                        {m.reply!.actions.map((a) => (
                          <button key={a.label} onClick={() => act(a)} className="inline-flex items-center gap-1.5 rounded-full bg-wine-700 px-4 py-2 text-sm text-white transition hover:brightness-110">
                            {a.label} <ArrowRight className="h-4 w-4" />
                          </button>
                        ))}
                      </div>
                    )}
                    {m === lastBot && !typing && !!m.reply!.followUps?.length && (
                      <div className="flex flex-wrap gap-2">
                        {m.reply!.followUps.map((f) => (
                          <button key={f} onClick={() => ask(f)} className="rounded-full border border-blush-200 bg-white/70 px-3 py-1.5 text-sm text-wine-700 transition hover:bg-blush-50">
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
            {typing && (
              <div className="flex items-center gap-3" aria-label="Glow Assistant is typing">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-100">
                  <Sparkles className="h-4 w-4 text-wine-700" />
                </span>
                <span className="flex gap-1 rounded-full bg-white/85 px-4 py-3 ring-1 ring-blush-100">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-rose-400" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 border-t border-blush-100 bg-white/60 p-3 sm:p-4"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your skin, your look or your budget"
              aria-label="Ask Glow Assistant"
              className="min-w-0 flex-1 rounded-full border border-blush-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-rose-400"
              maxLength={300}
            />
            <button type="submit" disabled={!input.trim() || typing} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-cocoa-700 to-cocoa-900 text-white disabled:opacity-40" aria-label="Send">
              <SendHorizontal className="h-5 w-5" />
            </button>
          </form>
        </section>

        <aside className="space-y-5">
          <div className="card p-5">
            <p className="flex items-center gap-2 font-serif text-xl">
              <Bot className="h-5 w-5 text-rose-500" /> What I know about you
            </p>
            <dl className="mt-3 divide-y divide-blush-100 text-sm">
              {known.map((k) => (
                <div key={k.label} className="flex justify-between gap-3 py-2">
                  <dt className="text-charcoal/55">{k.label}</dt>
                  <dd className="text-right">{k.value}</dd>
                </div>
              ))}
            </dl>
            {!skin && (
              <Link href="/scan" className="btn-primary mt-4 w-full !py-2.5 !text-base">
                <Camera className="h-4 w-4" /> Scan my skin
              </Link>
            )}
          </div>

          <div className="card p-5">
            <p className="font-serif text-xl">Try asking</p>
            <div className="mt-3 space-y-1.5">
              {ASSISTANT_SUGGESTIONS.concat(["Which look is best for a wedding?", "What is niacinamide?"]).map((s) => (
                <button key={s} onClick={() => ask(s)} disabled={typing} className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-blush-50 disabled:opacity-50">
                  {s} <ArrowUpRight className="h-4 w-4 shrink-0 text-rose-400" />
                </button>
              ))}
            </div>
          </div>

          <p className="flex gap-2 px-1 text-xs text-charcoal/50">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {polish
              ? "Answers come from your own data. A free AI model only polishes the wording, and every number is checked."
              : "Answers come from your own data and run in your browser. Cosmetic guidance only, not medical advice."}
          </p>
        </aside>
      </div>
    </div>
  );
}
