'use client';

import { useStore } from '@/context/PropertyContext';
import PropertyCard from './PropertyCard';

export default function BudgetView() {
  const { properties, analyses } = useStore();

  const BUDGET = 40000;

  // Properties where total cost fits within €40k budget
  const affordable = properties.filter(
    (p) => analyses[p.id]?.affordable_at_40k,
  );
  const overBudget = properties.filter(
    (p) => analyses[p.id] && !analyses[p.id].affordable_at_40k,
  );
  const unanalyzed = properties.filter((p) => !analyses[p.id]);

  // Properties under €40k start price (likely affordable with fees)
  const likelyAffordable = properties.filter(
    (p) => p.startPrice <= 35000, // leaves room for ~15% fees
  );

  const avgCashScore =
    affordable.length > 0
      ? (
          affordable.reduce(
            (s, p) => s + (analyses[p.id]?.cash_buy_score || 0),
            0,
          ) / affordable.length
        ).toFixed(1)
      : '—';

  const cheapest = [...properties].sort((a, b) => a.startPrice - b.startPrice);
  const cheapestPrice = cheapest.length > 0 ? cheapest[0].startPrice : 0;

  return (
    <div className="px-6 py-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-2xl text-ink mb-1 flex items-center gap-2">
          💰 My Budget: €40,000 Cash
        </h2>
        <p className="font-mono text-xs text-ink/45 mb-5 max-w-3xl">
          Direct cash purchase — <strong>no bank financing</strong>. Total cost
          includes: auction price + <strong>7.14% Aufgeld</strong> +{' '}
          <strong>Grunderwerbsteuer</strong> (3.5–6.5%) + Notar fees. Only
          showing properties you can actually afford.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Budget', value: `€${BUDGET.toLocaleString()}`, color: 'text-gold' },
            { label: 'Affordable', value: String(affordable.length), color: 'text-green-600' },
            { label: 'Over Budget', value: String(overBudget.length), color: 'text-danger' },
            { label: 'Avg Cash Score', value: avgCashScore, color: 'text-teal' },
            { label: 'Cheapest Start', value: `€${cheapestPrice.toLocaleString()}`, color: 'text-ink' },
          ].map((stat) => (
            <div key={stat.label} className="bg-paper border border-ink/10 rounded-sm px-4 py-3 text-center">
              <div className="text-[.52rem] tracking-[.12em] uppercase text-ink/45 mb-1">{stat.label}</div>
              <div className={`font-serif text-xl ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Budget hint */}
        <div className="bg-gold/10 border border-gold/20 rounded-sm px-4 py-3 mb-5 font-mono text-xs text-ink/60 leading-relaxed">
          <strong className="text-gold">💡 Tip:</strong> {likelyAffordable.length} properties start
          under €35k (likely under €40k total with fees). Analyze them to see the exact total cost
          breakdown. Properties starting at €100 to €15,000 are your best bets.
        </div>

        {affordable.length === 0 && unanalyzed.length > 0 ? (
          <div className="text-center py-16 text-ink/45">
            <div className="text-4xl mb-3">💰</div>
            <div className="font-serif text-lg mb-1">Analyze Properties First</div>
            <div className="font-mono text-xs max-w-md mx-auto">
              Run AI analysis on properties to see which ones fit your €40k cash
              budget. The AI calculates total cost including all fees.
            </div>
          </div>
        ) : affordable.length === 0 ? (
          <div className="text-center py-16 text-ink/45">
            <div className="text-4xl mb-3">😔</div>
            <div className="font-serif text-lg mb-1">No Affordable Properties Found</div>
            <div className="font-mono text-xs max-w-md mx-auto">
              None of the analyzed properties fit within your €40k budget after
              fees. Try adding new listings from DIIA with lower start prices.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink/10">
            {affordable.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
