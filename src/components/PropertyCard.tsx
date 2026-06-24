'use client';

import { useStore } from '@/context/PropertyContext';
import type { Property, Analysis } from '@/lib/types';
import { TYPE_LABELS, TYPE_COLORS } from '@/lib/types';

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 7 ? '#4CAF50' : value >= 4.5 ? '#FFC107' : '#ef5350';
  const barClass = value >= 7 ? 'bg-green-500' : value >= 4.5 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="bg-white/[.04] p-2.5 text-center">
      <span className="text-[.46rem] tracking-[.1em] uppercase text-white/30 block mb-0.5">
        {label}
      </span>
      <span className="font-serif text-base" style={{ color }}>
        {value}
      </span>
      <div className="h-0.5 bg-white/[.08] rounded-full overflow-hidden mt-1">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

function InlineResult({ pid, analysis, isAuction }: { pid: string; analysis: Analysis; isAuction: boolean }) {
  const { openModal } = useStore();
  const a = analysis;
  const vc =
    a.decision === 'BUY'
      ? 'bg-green-500/15 border-green-500/35 text-green-400'
      : a.decision === 'CAUTION'
        ? 'bg-yellow-500/12 border-yellow-500/30 text-yellow-300'
        : 'bg-red-500/15 border-red-500/35 text-red-300';
  const vi = a.decision === 'BUY' ? '✓' : a.decision === 'CAUTION' ? '⚠' : '✗';

  const cashBadge = a.affordable_at_40k
    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
    : 'bg-red-500/10 border-red-500/25 text-red-400';

  const ifBadge = a.islamic_finance_eligible
    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
    : 'bg-red-500/10 border-red-500/25 text-red-400';

  return (
    <div className="bg-ink rounded-sm p-5 animate-fade-up">
      {/* Top row */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold tracking-wide border ${vc}`}>
          {vi} {a.decision}
        </span>
        <span className="font-serif text-lg text-gold-light">
          {a.investment_score}/10
        </span>
        {/* Badge: cash for auction, Islamic finance for non-auction */}
        {isAuction ? (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[.55rem] font-bold font-mono border ${cashBadge}`}>
            💰 {a.affordable_at_40k ? 'Affordable' : 'Over Budget'} · {a.cash_buy_score}/10
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[.55rem] font-bold font-mono border ${ifBadge}`}>
            ☪ {a.islamic_finance_eligible ? 'IF Eligible' : 'Not IF Eligible'} · {a.islamic_finance_score ?? 0}/10
          </span>
        )}
        <span className="font-mono text-[.62rem] text-white/40 leading-snug flex-1 min-w-[140px]">
          {a.decision_reason}
        </span>
      </div>

      {/* 5 score grid */}
      <div className="grid grid-cols-5 gap-px bg-white/[.06] rounded-sm overflow-hidden mb-4">
        <ScoreBar label="Invest" value={a.investment_score} />
        <ScoreBar label="Transport" value={a.transport_score} />
        <ScoreBar label="Legal" value={a.legal_score} />
        <ScoreBar label="Market" value={a.market_score} />
        <ScoreBar label={isAuction ? 'Cash Buy' : 'Islamic'} value={isAuction ? (a.cash_buy_score ?? 0) : (a.islamic_finance_score ?? 0)} />
      </div>

      {/* Pros / Cons */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[.52rem] tracking-[.12em] uppercase font-bold mb-1.5 text-green-400 flex items-center gap-1.5 before:w-3 before:h-px before:bg-current">
            Strengths
          </div>
          {(a.pros || []).slice(0, 3).map((x, i) => (
            <div key={i} className="font-mono text-[.62rem] text-white/50 leading-relaxed mb-1 pl-3 relative before:absolute before:left-0 before:text-white/20 before:content-['–']">
              {x}
            </div>
          ))}
        </div>
        <div>
          <div className="text-[.52rem] tracking-[.12em] uppercase font-bold mb-1.5 text-red-300 flex items-center gap-1.5 before:w-3 before:h-px before:bg-current">
            Risks
          </div>
          {(a.cons || []).slice(0, 3).map((x, i) => (
            <div key={i} className="font-mono text-[.62rem] text-white/50 leading-relaxed mb-1 pl-3 relative before:absolute before:left-0 before:text-white/20 before:content-['–']">
              {x}
            </div>
          ))}
        </div>
      </div>

      {/* True value */}
      <div className="bg-gold/[.08] border border-gold/20 rounded-sm px-3 py-2.5 mb-3">
        <div className="text-[.5rem] tracking-[.12em] uppercase text-gold mb-0.5">
          Estimated True Value
        </div>
        <div className="font-serif text-lg text-gold-light">
          {a.estimated_true_value || 'N/A'}
        </div>
      </div>

      <button
        onClick={() => openModal(pid)}
        className="w-full bg-transparent border border-gold/30 text-gold-light px-4 py-2 font-syne text-xs font-bold tracking-wider uppercase cursor-pointer rounded-sm hover:bg-gold/10 hover:border-gold transition-all"
      >
        → Full Report + {isAuction ? 'Cost Breakdown' : 'Finance Details'}
      </button>
    </div>
  );
}

export default function PropertyCard({ property }: { property: Property }) {
  const { analyses, analyzingIds, analyzeProperty } = useStore();
  const p = property;
  const a = analyses[p.id];
  const isAnalyzing = analyzingIds.has(p.id);

  const tc = TYPE_COLORS[p.type] || TYPE_COLORS.land;

  return (
    <div
      className={`bg-paper p-5 flex flex-col gap-3.5 relative transition-colors hover:bg-[#f2efe8] ${
        a ? 'border-l-[3px] border-l-gold' : isAnalyzing ? 'border-l-[3px] border-l-teal-light' : ''
      }`}
    >
      {/* Top: lot + type */}
      <div className="flex justify-between items-start gap-1.5">
        <span className="font-mono text-[.52rem] tracking-[.12em] bg-ink text-gold px-2 py-0.5 rounded-[1px]">
          {p.lot}
        </span>
        <span className={`text-[.5rem] tracking-[.1em] uppercase font-bold px-2 py-0.5 rounded-[1px] ${tc.bg} ${tc.text}`}>
          {TYPE_LABELS[p.type] || p.type}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-serif text-base leading-snug text-ink">{p.title}</h3>

      {/* Address */}
      <div className="flex items-start gap-1.5 font-mono text-xs text-ink/45 leading-relaxed">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {p.addr}
      </div>

      {/* Meta */}
      <div className="flex gap-5 flex-wrap">
        <div>
          <span className="block text-[.48rem] tracking-[.14em] uppercase text-ink/45 font-semibold">Size</span>
          <span className="font-mono text-xs font-medium">{p.size}</span>
        </div>
        <div>
          <span className="block text-[.48rem] tracking-[.14em] uppercase text-ink/45 font-semibold">Start</span>
          <span className="font-mono text-xs font-medium text-teal">€{p.startPrice.toLocaleString()}</span>
        </div>
        {p.highBid != null && (
          <div>
            <span className="block text-[.48rem] tracking-[.14em] uppercase text-ink/45 font-semibold">Current</span>
            <span className="font-mono text-xs font-medium text-danger">€{p.highBid.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Bid status */}
      <div className="flex items-center justify-between bg-cream px-3 py-2 rounded-sm border border-ink/10">
        {p.highBid != null ? (
          <>
            <span className="font-mono text-xs text-danger font-medium">€{p.highBid.toLocaleString()} highest</span>
            <span className="font-mono text-[.58rem] text-ink/45">{p.bids} bid{p.bids !== 1 ? 's' : ''}</span>
          </>
        ) : (
          <>
            <span className="font-mono text-xs text-ink/45">No bids yet</span>
            <span className="font-mono text-[.58rem] text-ink/45">starts €{p.startPrice.toLocaleString()}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={p.diiaUrl?.startsWith('http') ? p.diiaUrl : `https://${p.diiaUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 bg-transparent border border-ink/10 px-2.5 py-2 rounded-sm text-[.58rem] text-ink/45 no-underline font-mono hover:border-gold hover:text-gold transition-all whitespace-nowrap"
        >
          ↗ Source
        </a>
        <button
          onClick={() => analyzeProperty(p)}
          disabled={isAnalyzing}
          className={`flex-1 flex items-center justify-center gap-1.5 border-none px-4 py-2.5 font-syne text-xs font-bold tracking-wider uppercase cursor-pointer rounded-sm transition-colors ${
            a
              ? 'bg-[#1b3a18] text-green-400 hover:bg-[#163012]'
              : isAnalyzing
                ? 'bg-teal cursor-wait text-gold'
                : 'bg-ink text-gold hover:bg-teal'
          } disabled:opacity-45 disabled:cursor-not-allowed`}
        >
          {isAnalyzing ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              Analyzing…
            </>
          ) : a ? (
            '✓ Analyzed — View Report'
          ) : (
            '🤖 AI Analyze'
          )}
        </button>
      </div>

      {/* Inline result */}
      {a && <InlineResult pid={p.id} analysis={a} isAuction={p.isAuction} />}
    </div>
  );
}
