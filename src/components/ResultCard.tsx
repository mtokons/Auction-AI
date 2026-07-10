'use client';

import { useStore } from '@/context/PropertyContext';
import type { SearchListing } from '@/lib/types';
import { SOURCE_META } from '@/lib/types';

function ScorePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`font-serif text-sm font-bold ${color}`}>{value}</span>
      <span className="text-[.5rem] text-ink/40 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export default function ResultCard({ listing }: { listing: SearchListing }) {
  const { analyses, analyzingIds, analyzeSearchListing, openModal } = useStore();
  const a = analyses[listing.id];
  const isAnalyzing = analyzingIds.has(listing.id);
  const meta = SOURCE_META[listing.source] || { label: listing.sourceLabel, color: 'bg-gray-100 text-gray-700 border-gray-200', isAuction: false };

  const decisionColor = a?.decision === 'BUY'
    ? 'text-green-600 bg-green-50 border-green-200'
    : a?.decision === 'CAUTION'
      ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
      : a?.decision === 'AVOID'
        ? 'text-red-600 bg-red-50 border-red-200'
        : '';

  const handleAnalyze = async () => {
    if (a) {
      openModal(listing.id);
      return;
    }
    await analyzeSearchListing(listing);
  };

  return (
    <div className={`bg-paper border-b border-ink/10 p-5 flex flex-col gap-3 hover:bg-[#f2efe8] transition-colors relative group ${
      a ? 'border-l-2 border-l-gold' : ''
    }`}>
      {/* Top row: source badge + auction badge + decision */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[.52rem] font-bold border px-2 py-0.5 rounded-[2px] ${meta.color}`}>
          {listing.isAuction ? `⚡ ${meta.label}` : meta.label}
        </span>
        {listing.isAuction && (
          <span className="text-[.5rem] bg-red-50 border border-red-200 text-red-700 px-1.5 py-0.5 rounded-[2px] font-bold">
            AUCTION · CASH
          </span>
        )}
        {a?.decision && (
          <span className={`text-[.52rem] font-bold border px-2 py-0.5 rounded-[2px] ${decisionColor}`}>
            {a.decision === 'BUY' ? '✓' : a.decision === 'CAUTION' ? '⚠' : '✗'} {a.decision}
          </span>
        )}
        {listing.postedAt && (
          <span className="ml-auto text-[.52rem] text-ink/30 font-mono">{listing.postedAt}</span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-serif text-base leading-snug text-ink group-hover:text-teal transition-colors">
        {listing.title}
      </h3>

      {/* Address */}
      <div className="flex items-center gap-1.5 font-mono text-xs text-ink/45">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
        {listing.addr}
      </div>

      {/* Key facts grid */}
      <div className="flex gap-5 flex-wrap">
        <div>
          <div className="text-[.46rem] uppercase text-ink/35 tracking-widest font-semibold">Price</div>
          <div className={`font-mono text-sm font-bold ${listing.isAuction ? 'text-red-600' : 'text-teal'}`}>
            {listing.priceLabel}
          </div>
        </div>
        <div>
          <div className="text-[.46rem] uppercase text-ink/35 tracking-widest font-semibold">Size</div>
          <div className="font-mono text-sm">{listing.size}</div>
        </div>
        {listing.rooms && (
          <div>
            <div className="text-[.46rem] uppercase text-ink/35 tracking-widest font-semibold">Rooms</div>
            <div className="font-mono text-sm">{listing.rooms}</div>
          </div>
        )}
        {listing.energyRating && (
          <div>
            <div className="text-[.46rem] uppercase text-ink/35 tracking-widest font-semibold">Energy</div>
            <div className={`font-mono text-sm font-bold ${
              listing.energyRating <= 'B' ? 'text-green-600' : listing.energyRating <= 'D' ? 'text-yellow-600' : 'text-red-600'
            }`}>{listing.energyRating}</div>
          </div>
        )}
        {listing.constructionYear && (
          <div>
            <div className="text-[.46rem] uppercase text-ink/35 tracking-widest font-semibold">Built</div>
            <div className="font-mono text-sm">{listing.constructionYear}</div>
          </div>
        )}
      </div>

      {/* Description */}
      {listing.description && (
        <p className="font-mono text-xs text-ink/50 leading-relaxed line-clamp-2">{listing.description}</p>
      )}

      {/* Features */}
      {listing.features.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {listing.features.slice(0, 5).map((f, i) => (
            <span key={i} className="text-[.52rem] bg-cream border border-ink/10 px-2 py-0.5 rounded-[2px] text-ink/55 font-mono">
              {f}
            </span>
          ))}
          {listing.features.length > 5 && (
            <span className="text-[.52rem] text-ink/30 font-mono">+{listing.features.length - 5} more</span>
          )}
        </div>
      )}

      {/* Analysis scores (if analyzed) */}
      {a && (
        <div className="bg-cream/60 border border-ink/10 rounded-sm px-3 py-2.5 flex items-center gap-4 flex-wrap">
          <ScorePill label="Invest" value={a.investment_score} color={a.investment_score >= 7 ? 'text-green-700' : a.investment_score >= 4.5 ? 'text-yellow-700' : 'text-red-600'} />
          <span className="text-ink/15">|</span>
          <ScorePill label="Transport" value={a.transport_score} color={a.transport_score >= 7 ? 'text-green-700' : a.transport_score >= 4.5 ? 'text-yellow-700' : 'text-red-600'} />
          <span className="text-ink/15">|</span>
          <ScorePill label="Market" value={a.market_score} color={a.market_score >= 7 ? 'text-green-700' : a.market_score >= 4.5 ? 'text-yellow-700' : 'text-red-600'} />
          <span className="text-ink/15">|</span>
          {listing.isAuction ? (
            <ScorePill label="Cash" value={a.cash_buy_score ?? 0} color={a.cash_buy_score >= 7 ? 'text-green-700' : a.cash_buy_score >= 4.5 ? 'text-yellow-700' : 'text-red-600'} />
          ) : (
            <ScorePill label="IF" value={a.islamic_finance_score ?? 0} color={(a.islamic_finance_score ?? 0) >= 7 ? 'text-green-700' : (a.islamic_finance_score ?? 0) >= 4.5 ? 'text-yellow-700' : 'text-red-600'} />
          )}
          <span className="ml-auto font-serif text-base font-bold text-gold">{a.estimated_true_value?.split('–')[0]?.trim() || 'N/A'}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-0.5">
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 border border-ink/12 px-3 py-2 text-[.58rem] font-mono text-ink/40 rounded-sm hover:border-gold hover:text-gold transition-all whitespace-nowrap no-underline"
        >
          ↗ Source
        </a>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className={`flex-1 flex items-center justify-center gap-1.5 border-none px-4 py-2.5 font-syne text-xs font-bold tracking-wider uppercase cursor-pointer rounded-sm transition-all ${
            a
              ? 'bg-[#1b3a18] text-green-400 hover:bg-[#163012]'
              : isAnalyzing
                ? 'bg-teal text-gold cursor-wait'
                : 'bg-ink text-gold hover:bg-teal'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isAnalyzing ? (
            <>
              <span className="w-3 h-3 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              Deep Analysis…
            </>
          ) : a ? (
            '✓ View Full Analysis'
          ) : (
            '🤖 Deep Analysis'
          )}
        </button>
      </div>
    </div>
  );
}
