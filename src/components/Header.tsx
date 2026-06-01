'use client';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-ink px-6 py-3.5 flex items-center justify-between border-b-2 border-gold">
      <div className="flex items-center gap-2">
        <span className="font-serif text-2xl text-gold">Auction AI</span>
        <span className="text-[.52rem] tracking-[.18em] uppercase text-white/30">
          German Real Estate AI
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gold/10 border border-gold/30 px-3 py-1.5 rounded-sm text-gold-light text-[.52rem] tracking-[.10em] uppercase">
          <div className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse-dot" />
          Auction: Cash €40k
        </div>
        <div className="flex items-center gap-2 bg-teal/10 border border-teal/30 px-3 py-1.5 rounded-sm text-teal-light text-[.52rem] tracking-[.10em] uppercase">
          <div className="w-1.5 h-1.5 bg-teal-light rounded-full animate-pulse-dot" />
          Listings: Bank Finance
        </div>
      </div>
    </header>
  );
}
