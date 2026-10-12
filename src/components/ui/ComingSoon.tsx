import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ComingSoon({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-3xl py-16 text-center">
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h1 className="font-serif text-5xl tracking-tight">{title}</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-charcoal/70">{body}</p>
      <Link href="/scan" className="btn-primary mt-8">
        Start My Glow Scan <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
