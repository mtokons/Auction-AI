'use client';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-ink px-6 py-3.5 flex items-center justify-between border-b-2 border-gold">
      <div className="flex items-center gap-2">
        <span className="font-serif text-2xl text-gold">PropClear</span>
        <span className="text-[.52rem] tracking-[.18em] uppercase text-white/30">
          German Real Estate AI
        </span>
      </div>
      <div className="flex items-center gap-2 bg-islamic/10 border border-islamic-light/30 px-3 py-1.5 rounded-sm text-islamic-light text-[.52rem] tracking-[.10em] uppercase">
        <div className="w-1.5 h-1.5 bg-islamic-light rounded-full animate-pulse-dot" />
        Islamic Finance Ready
      </div>
    </header>
  );
}
