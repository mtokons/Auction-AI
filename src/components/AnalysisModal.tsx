'use client';

import { useStore } from '@/context/PropertyContext';
import type { Analysis } from '@/lib/types';

export default function AnalysisModal() {
  const { properties, analyses, modalPropertyId, closeModal } = useStore();
  if (!modalPropertyId) return null;

  const p = properties.find((x) => x.id === modalPropertyId);
  const a = analyses[modalPropertyId] as Analysis | undefined;
  if (!p || !a) return null;

  const vc =
    a.decision === 'BUY'
      ? 'bg-green-500/15 border-green-500/35 text-green-400'
      : a.decision === 'CAUTION'
        ? 'bg-yellow-500/12 border-yellow-500/30 text-yellow-300'
        : 'bg-red-500/15 border-red-500/35 text-red-300';
  const vi = a.decision === 'BUY' ? '✓' : a.decision === 'CAUTION' ? '⚠' : '✗';

  const scores = [
    { label: 'Investment', value: a.investment_score },
    { label: 'Transport', value: a.transport_score },
    { label: 'Legal', value: a.legal_score },
    { label: 'Market', value: a.market_score },
    { label: p.isAuction ? 'Cash Buy' : 'Islamic Finance', value: p.isAuction ? (a.cash_buy_score ?? 0) : (a.islamic_finance_score ?? 0) },
  ];

  return (
    <div
      className="fixed inset-0 bg-ink/90 z-[1000] flex items-start justify-center p-6 overflow-y-auto backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      <div className="bg-paper max-w-[900px] w-full rounded-sm border border-ink/18 animate-fade-up my-auto">
        {/* Header */}
        <div className="bg-ink px-6 py-5 flex items-start justify-between gap-4 rounded-t-sm">
          <h2 className="font-serif text-xl text-paper leading-snug">
            {a.title_en || p.title}
          </h2>
          <button
            onClick={closeModal}
            className="bg-transparent border-none text-white/35 text-xl cursor-pointer hover:text-red-300 transition-colors leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Verdict row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm text-sm font-bold tracking-wide border ${vc}`}>
              {vi} {a.decision}
            </span>
            <span className="font-mono text-sm text-ink/45 flex-1">{a.decision_reason}</span>
            <a
              href={p.diiaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gold no-underline border border-gold/40 px-3 py-1 rounded-sm whitespace-nowrap hover:bg-gold/5"
            >
              ↗ View Source
            </a>
          </div>

          {/* Summary */}
          <div className="bg-cream px-4 py-3 rounded-sm font-mono text-sm leading-relaxed text-ink/70">
            {a.summary}
          </div>

          {/* Score grid */}
          <div className="grid grid-cols-5 gap-px bg-ink/10 rounded-sm overflow-hidden">
            {scores.map((s) => {
              const color = s.value >= 7 ? 'text-green-700' : s.value >= 4.5 ? 'text-yellow-700' : 'text-red-700';
              const barClass = s.value >= 7 ? 'bg-green-500' : s.value >= 4.5 ? 'bg-yellow-400' : 'bg-red-400';
              return (
                <div key={s.label} className="bg-paper p-3 text-center">
                  <span className="text-[.46rem] tracking-[.1em] uppercase text-ink/40 block mb-1">{s.label}</span>
                  <span className={`font-serif text-lg ${color}`}>{s.value}/10</span>
                  <div className="h-0.5 bg-ink/10 rounded-full overflow-hidden mt-1.5">
                    <div className={`h-full rounded-full ${barClass}`} style={{ width: `${s.value * 10}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Cash Buyer Cost Breakdown (auction properties) ── */}
          {p.isAuction && a.cash_buy_analysis && (
            <div className={`border rounded-sm p-5 ${a.cash_buy_analysis.affordable ? 'bg-gradient-to-br from-emerald-500/[.08] to-teal/[.08] border-emerald-500/20' : 'bg-gradient-to-br from-red-500/[.06] to-orange-500/[.06] border-red-500/20'}`}>
              <h3 className="text-xs tracking-[.12em] uppercase text-teal font-bold mb-4 flex items-center gap-2">
                💰 Cash Purchase Analysis (€40k Budget)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[.52rem] uppercase text-ink/45 mb-1.5">Affordability</div>
                  <div className={`text-lg font-bold ${a.cash_buy_analysis.affordable ? 'text-green-600' : 'text-red-500'}`}>
                    {a.cash_buy_analysis.affordable ? '✓ AFFORDABLE' : '✗ OVER BUDGET'}
                  </div>
                  <div className="font-serif text-xl text-teal mt-2">{a.cash_buy_analysis.total_cost}</div>
                  <div className="font-mono text-xs text-ink/45 mt-1">
                    Remaining: <strong className="text-green-600">{a.cash_buy_analysis.remaining_budget}</strong>
                  </div>
                </div>
                <div>
                  <div className="text-[.52rem] uppercase text-ink/45 mb-1.5">Cost Breakdown</div>
                  {a.cash_buy_analysis.breakdown && (
                    <div className="space-y-1">
                      {[
                        ['Auction Price', a.cash_buy_analysis.breakdown.auction_price],
                        ['Aufgeld (7.14%)', a.cash_buy_analysis.breakdown.aufgeld],
                        ['Grunderwerbsteuer', a.cash_buy_analysis.breakdown.grunderwerbsteuer],
                        ['Notar + Grundbuch', a.cash_buy_analysis.breakdown.notar_grundbuch],
                        ['Renovation Est.', a.cash_buy_analysis.breakdown.renovation_estimate],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between font-mono text-xs text-ink/60">
                          <span>{label}</span>
                          <span className="font-medium">{val}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-mono text-sm font-bold text-ink border-t border-ink/15 pt-1 mt-1">
                        <span>TOTAL</span>
                        <span className="text-teal">{a.cash_buy_analysis.breakdown.total}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 bg-paper/60 rounded-sm px-3 py-2.5">
                <div className="text-[.52rem] uppercase text-ink/45 mb-1">Recommendation</div>
                <p className="font-mono text-xs text-ink/60 leading-relaxed">{a.cash_buy_analysis.recommendation}</p>
              </div>
              {a.cash_buy_analysis.risks?.length > 0 && (
                <div className="mt-3">
                  <div className="text-[.52rem] uppercase text-ink/45 mb-2">Risks</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {a.cash_buy_analysis.risks.map((r, i) => (
                      <span key={i} className="bg-red-500/10 border border-red-500/20 text-danger px-2 py-0.5 rounded-sm text-xs font-mono">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Islamic Finance Section (non-auction properties) ── */}
          {!p.isAuction && a.kt_bank_analysis && (
            <div className="bg-gradient-to-br from-emerald-500/[.08] to-teal/[.08] border border-emerald-500/20 rounded-sm p-5">
              <h3 className="text-xs tracking-[.12em] uppercase text-teal font-bold mb-4 flex items-center gap-2">
                ☪ KT Bank Islamic Finance Analysis
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[.52rem] uppercase text-ink/45 mb-1.5">Eligibility</div>
                  <div className={`text-lg font-bold ${a.kt_bank_analysis.eligible ? 'text-green-600' : 'text-red-500'}`}>
                    {a.kt_bank_analysis.eligible ? '✓ ELIGIBLE' : '✗ NOT ELIGIBLE'}
                  </div>
                  <p className="font-mono text-xs text-ink/50 mt-2 leading-relaxed">{a.kt_bank_analysis.reason}</p>
                </div>
                <div>
                  <div className="text-[.52rem] uppercase text-ink/45 mb-1.5">Down Payment</div>
                  <div className="font-serif text-lg text-teal mb-2">{a.kt_bank_analysis.estimated_downpayment}</div>
                  <div className="font-mono text-xs text-ink/45">
                    Structure: {a.kt_bank_analysis.financing_structure}<br />
                    Term: {a.kt_bank_analysis.term}
                  </div>
                </div>
              </div>
              {a.kt_bank_analysis.requirements?.length > 0 && (
                <div className="mt-4">
                  <div className="text-[.52rem] uppercase text-ink/45 mb-2">Requirements</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {a.kt_bank_analysis.requirements.map((r, i) => (
                      <span key={i} className="bg-teal/10 border border-teal/20 text-teal px-2 py-0.5 rounded-sm text-xs font-mono">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {a.kt_bank_analysis.alternatives?.length > 0 && (
                <div className="mt-3">
                  <div className="text-[.52rem] uppercase text-ink/45 mb-1">Alternative Lenders</div>
                  <div className="font-mono text-xs text-ink/50">{a.kt_bank_analysis.alternatives.join(' · ')}</div>
                </div>
              )}
            </div>
          )}

          {/* Pros / Cons */}
          <div className="bg-cream border border-ink/10 rounded-sm overflow-hidden">
            <div className="bg-cream px-4 py-2.5 flex items-center gap-2 border-b border-ink/10">
              <span className="w-5 h-5 bg-ink rounded-sm flex items-center justify-center text-xs">⚖</span>
              <span className="text-xs tracking-[.12em] uppercase font-bold">Pros & Cons</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-5">
              <div>
                <div className="text-[.55rem] tracking-[.12em] uppercase text-green-700 font-bold mb-2">✓ Strengths</div>
                {(a.pros || []).map((x, i) => (
                  <div key={i} className="font-mono text-sm text-ink/70 mb-1.5 pl-3 border-l-2 border-green-300">{x}</div>
                ))}
              </div>
              <div>
                <div className="text-[.55rem] tracking-[.12em] uppercase text-danger font-bold mb-2">✗ Risks</div>
                {(a.cons || []).map((x, i) => (
                  <div key={i} className="font-mono text-sm text-ink/70 mb-1.5 pl-3 border-l-2 border-red-300">{x}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Legal terms */}
          {a.legal_terms?.length > 0 && (
            <div className="bg-cream border border-ink/10 rounded-sm overflow-hidden">
              <div className="bg-cream px-4 py-2.5 flex items-center gap-2 border-b border-ink/10">
                <span className="w-5 h-5 bg-ink rounded-sm flex items-center justify-center text-xs">📜</span>
                <span className="text-xs tracking-[.12em] uppercase font-bold">German Legal Terms Decoded</span>
              </div>
              <div className="p-0">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-[.52rem] tracking-[.1em] uppercase text-ink/45 text-left p-2.5 bg-paper border-b border-ink/10">Term (DE / EN)</th>
                      <th className="text-[.52rem] tracking-[.1em] uppercase text-ink/45 text-left p-2.5 bg-paper border-b border-ink/10">Explanation</th>
                      <th className="text-[.52rem] tracking-[.1em] uppercase text-ink/45 text-left p-2.5 bg-paper border-b border-ink/10">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.legal_terms.map((l, i) => {
                      const lc = l.status === 'OK' ? 'bg-green-50 text-green-700' : l.status === 'CHECK' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
                      return (
                        <tr key={i} className="hover:bg-ink/[.02]">
                          <td className="p-2.5 text-sm font-mono border-b border-ink/5">
                            <strong>{l.de}</strong><br />
                            <span className="text-ink/45 text-xs">{l.en}</span>
                          </td>
                          <td className="p-2.5 text-sm font-mono text-ink/70 border-b border-ink/5 leading-relaxed">{l.explanation}</td>
                          <td className="p-2.5 border-b border-ink/5">
                            <span className={`inline-block px-1.5 py-0.5 rounded-[1px] text-[.52rem] font-bold ${lc}`}>{l.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transport */}
          {a.transport_analysis && (
            <div className="bg-cream border border-ink/10 rounded-sm overflow-hidden">
              <div className="bg-cream px-4 py-2.5 flex items-center gap-2 border-b border-ink/10">
                <span className="w-5 h-5 bg-ink rounded-sm flex items-center justify-center text-xs">🚂</span>
                <span className="text-xs tracking-[.12em] uppercase font-bold">Transport & Infrastructure</span>
              </div>
              <div className="p-4">
                <p className="font-mono text-sm text-ink/70 leading-relaxed mb-3">{a.transport_analysis.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(a.transport_analysis.connections || []).map((c, i) => {
                    const tc = c.quality === 'good' ? 'bg-green-500/10 border-green-500/25 text-green-700' : c.quality === 'ok' ? 'bg-yellow-500/[.08] border-yellow-500/20 text-yellow-700' : 'bg-red-500/10 border-red-500/20 text-red-700';
                    return (
                      <span key={i} className={`text-xs font-mono px-2.5 py-1 rounded-full border ${tc}`}>
                        {c.type}: {c.detail}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Market outlook */}
          {a.market_outlook && (
            <div className="bg-cream border border-ink/10 rounded-sm overflow-hidden">
              <div className="bg-cream px-4 py-2.5 flex items-center gap-2 border-b border-ink/10">
                <span className="w-5 h-5 bg-ink rounded-sm flex items-center justify-center text-xs">📈</span>
                <span className="text-xs tracking-[.12em] uppercase font-bold">Market Outlook</span>
              </div>
              <div className="p-4">
                {[
                  ['1–2 yrs', a.market_outlook.short_term],
                  ['3–5 yrs', a.market_outlook.mid_term],
                  ['10+ yrs', a.market_outlook.long_term],
                ].map(([label, text], i) => (
                  <div key={i} className={`flex gap-3 ${i < 2 ? 'border-b border-ink/10 mb-3 pb-3' : ''}`}>
                    <span className="text-[.52rem] tracking-[.1em] uppercase text-gold font-bold min-w-[70px] mt-px flex-shrink-0">{label}</span>
                    <span className="font-mono text-sm text-ink/70 leading-relaxed">{text || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Problems & Opportunities */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-cream border border-ink/10 rounded-sm overflow-hidden">
              <div className="bg-cream px-4 py-2.5 flex items-center gap-2 border-b border-ink/10">
                <span className="w-5 h-5 bg-ink rounded-sm flex items-center justify-center text-xs">⚠</span>
                <span className="text-xs tracking-[.12em] uppercase font-bold">Problems</span>
              </div>
              <div className="p-4">
                {(a.major_problems || []).map((x, i) => (
                  <div key={i} className="font-mono text-xs bg-red-50 border border-red-500/15 px-2.5 py-1.5 rounded-sm mb-1.5 text-danger">{x}</div>
                ))}
                {(!a.major_problems || a.major_problems.length === 0) && <span className="text-ink/45 text-xs">None identified</span>}
              </div>
            </div>
            <div className="bg-cream border border-ink/10 rounded-sm overflow-hidden">
              <div className="bg-cream px-4 py-2.5 flex items-center gap-2 border-b border-ink/10">
                <span className="w-5 h-5 bg-ink rounded-sm flex items-center justify-center text-xs">✦</span>
                <span className="text-xs tracking-[.12em] uppercase font-bold">Opportunities</span>
              </div>
              <div className="p-4">
                {(a.investment_opportunities || []).map((x, i) => (
                  <div key={i} className="font-mono text-xs bg-green-50 border border-green-500/15 px-2.5 py-1.5 rounded-sm mb-1.5 text-green-700">{x}</div>
                ))}
                {(!a.investment_opportunities || a.investment_opportunities.length === 0) && <span className="text-ink/45 text-xs">None identified</span>}
              </div>
            </div>
          </div>

          {/* Hidden costs + questions */}
          <div className="bg-cream border border-ink/10 rounded-sm overflow-hidden">
            <div className="bg-cream px-4 py-2.5 flex items-center gap-2 border-b border-ink/10">
              <span className="w-5 h-5 bg-ink rounded-sm flex items-center justify-center text-xs">💶</span>
              <span className="text-xs tracking-[.12em] uppercase font-bold">Hidden Costs & Questions</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-5">
              <div>
                <div className="text-[.52rem] tracking-[.1em] uppercase text-ink/45 mb-2">Budget for these</div>
                {(a.hidden_costs || []).map((x, i) => (
                  <div key={i} className="font-mono text-xs text-ink/70 mb-1.5">💶 {x}</div>
                ))}
              </div>
              <div>
                <div className="text-[.52rem] tracking-[.1em] uppercase text-ink/45 mb-2">Ask the seller</div>
                {(a.key_questions_to_ask || []).map((x, i) => (
                  <div key={i} className="font-mono text-xs text-ink/70 mb-1.5">? {x}</div>
                ))}
              </div>
            </div>
          </div>

          {/* True value footer */}
          <div className="bg-ink text-paper rounded-sm p-5 flex justify-between items-center flex-wrap gap-3">
            <div>
              <div className="text-[.52rem] tracking-[.12em] uppercase text-gold mb-1">Estimated True Market Value</div>
              <div className="font-serif text-xl text-gold-light">{a.estimated_true_value || 'N/A'}</div>
            </div>
            <div className="font-mono text-xs text-white/30 max-w-xs leading-relaxed">
              Total = Price + 7.14% Aufgeld + 3.5–6.5% Grunderwerbsteuer + €500–€2,000 Notar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
