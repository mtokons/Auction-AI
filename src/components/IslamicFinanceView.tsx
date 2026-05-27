'use client';

import { useStore } from '@/context/PropertyContext';
import PropertyCard from './PropertyCard';

export default function IslamicFinanceView() {
  const { properties, analyses } = useStore();

  const eligible = properties.filter(
    (p) => analyses[p.id]?.islamic_finance_eligible,
  );
  const notEligible = properties.filter(
    (p) => analyses[p.id] && !analyses[p.id].islamic_finance_eligible,
  );
  const unanalyzed = properties.filter((p) => !analyses[p.id]);

  const avgIslamicScore =
    eligible.length > 0
      ? (
          eligible.reduce(
            (s, p) => s + (analyses[p.id]?.islamic_finance_score || 0),
            0,
          ) / eligible.length
        ).toFixed(1)
      : '—';

  return (
    <div className="px-6 py-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-2xl text-ink mb-1 flex items-center gap-2">
          ☪ Islamic Finance Properties
        </h2>
        <p className="font-mono text-xs text-ink/45 mb-5 max-w-3xl">
          Properties checked for <strong>KT Bank</strong> Islamic finance
          eligibility (Murabaha / Ijara structure, Sharia-compliant).
        </p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'IF Eligible', value: String(eligible.length), color: 'text-islamic-light' },
            { label: 'Not Eligible', value: String(notEligible.length), color: 'text-danger' },
            { label: 'Avg IF Score', value: avgIslamicScore, color: 'text-teal' },
            { label: 'Unanalyzed', value: String(unanalyzed.length), color: 'text-ink/45' },
          ].map((stat) => (
            <div key={stat.label} className="bg-paper border border-ink/10 rounded-sm px-4 py-3 text-center">
              <div className="text-[.52rem] tracking-[.12em] uppercase text-ink/45 mb-1">{stat.label}</div>
              <div className={`font-serif text-xl ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {eligible.length === 0 ? (
          <div className="text-center py-16 text-ink/45">
            <div className="text-4xl mb-3">☪</div>
            <div className="font-serif text-lg mb-1">No IF-Eligible Properties Found</div>
            <div className="font-mono text-xs max-w-md mx-auto">
              Analyze properties first — the AI will check each one for Islamic
              finance eligibility via KT Bank criteria.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink/10">
            {eligible.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
