'use client';

import { useStore } from '@/context/PropertyContext';
import PropertyCard from './PropertyCard';

export default function HamburgPremium() {
  const { properties, analyses } = useStore();

  const hamburg = properties.filter((p) => {
    const addrLower = p.addr.toLowerCase();
    const titleLower = p.title.toLowerCase();
    const isHamburg = addrLower.includes('hamburg');
    const inRange = p.startPrice >= 200000 && p.startPrice <= 400000;
    const isResidential = p.type === 'residential';
    const isNotApartment =
      !titleLower.includes('wohnung') && !titleLower.includes('apartment');
    return isHamburg && inRange && isResidential && isNotApartment;
  });

  const analyzedHamburg = hamburg.filter((p) => analyses[p.id]);
  const avgScore =
    analyzedHamburg.length > 0
      ? (
          analyzedHamburg.reduce(
            (s, p) => s + (analyses[p.id]?.investment_score || 0),
            0,
          ) / analyzedHamburg.length
        ).toFixed(1)
      : '—';
  const affordable = analyzedHamburg.filter(
    (p) => analyses[p.id]?.affordable_at_40k,
  ).length;

  return (
    <div className="px-6 py-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-2xl text-ink mb-1 flex items-center gap-2">
          ⚓ Hamburg Premium Residential
        </h2>
        <p className="font-mono text-xs text-ink/45 mb-5 max-w-3xl">
          Curated view: <strong>Hamburg</strong> properties only ·{' '}
          <strong>€200k – €400k</strong> · Residential (houses, no apartments)
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Matching', value: String(hamburg.length) },
            { label: 'Analyzed', value: `${analyzedHamburg.length}/${hamburg.length}` },
            { label: 'Avg. Invest Score', value: avgScore },
            { label: 'Affordable €40k', value: String(affordable) },
          ].map((stat) => (
            <div key={stat.label} className="bg-paper border border-ink/10 rounded-sm px-4 py-3 text-center">
              <div className="text-[.52rem] tracking-[.12em] uppercase text-ink/45 mb-1">{stat.label}</div>
              <div className="font-serif text-xl text-ink">{stat.value}</div>
            </div>
          ))}
        </div>

        {hamburg.length === 0 ? (
          <div className="text-center py-16 text-ink/45">
            <div className="text-4xl mb-3">⚓</div>
            <div className="font-serif text-lg mb-1">No Hamburg Properties Match</div>
            <div className="font-mono text-xs max-w-md mx-auto">
              No properties found in Hamburg within €200k – €400k, residential
              (non-apartment). Add more via the URL scraper above.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink/10">
            {hamburg.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
