// Decorative corner brackets that guide the user to center their face.
export function FaceFrame({ active = false }: { active?: boolean }) {
  const corner = "absolute h-12 w-12 border-white/90";
  return (
    <div className="pointer-events-none absolute left-1/2 top-[12%] h-[68%] w-[46%] -translate-x-1/2">
      <span className={`${corner} left-0 top-0 rounded-tl-2xl border-l-2 border-t-2`} />
      <span className={`${corner} right-0 top-0 rounded-tr-2xl border-r-2 border-t-2`} />
      <span className={`${corner} bottom-0 left-0 rounded-bl-2xl border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 rounded-br-2xl border-b-2 border-r-2`} />
      {active && (
        <span className="absolute inset-x-2 h-0.5 animate-scan rounded-full bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_18px_4px_rgba(255,255,255,0.6)]" />
      )}
    </div>
  );
}
