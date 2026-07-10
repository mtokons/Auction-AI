'use client';

import { useStore } from '@/context/PropertyContext';

export default function TopChart() {
  const { properties, analyses, openModal } = useStore();

  const rows = properties
    .filter(p => analyses[p.id])
    .map(p => {
      const a = analyses[p.id];
      const score5 = p.isAuction ? (a.cash_buy_score || 0) : (a.islamic_finance_score || 0);
      const avg = +((
        (a.investment_score || 0) +
        (a.transport_score || 0) +
        (a.legal_score || 0) +
        (a.market_score || 0) +
        score5
      ) / 5).toFixed(1);
      return { p, a, avg };
    })
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  if (rows.length === 0) return null;

  return (
    <section className="px-6 py-8 bg-cream border-t border-ink/10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl text-ink flex items-center gap-2">
            🏆 Top Analyzed Properties
          </h2>
          <span className="font-mono text-xs text-ink/40">{rows.length} of {Object.keys(analyses).length} analyzed · ranked by score</span>
        </div>
        <div className="bg-paper border border-ink/10 rounded-sm overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-ink text-paper text-[.48rem] tracking-[.1em] uppercase">
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Property</th>
                <th className="px-3 py-2.5 text-center">Score</th>
                <th className="px-3 py-2.5 text-center hidden md:table-cell">Invest</th>
                <th className="px-3 py-2.5 text-center hidden md:table-cell">Transport</th>
                <th className="px-3 py-2.5 text-center hidden md:table-cell">Market</th>
                <th className="px-3 py-2.5 text-center">Verdict</th>
                <th className="px-3 py-2.5 text-center">Mode</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const vc = r.a.decision === 'BUY'
                  ? 'text-green-700 bg-green-50'
                  : r.a.decision === 'CAUTION'
                    ? 'text-yellow-700 bg-yellow-50'
                    : 'text-red-600 bg-red-50';
                const avgColor = r.avg >= 7 ? 'text-green-700' : r.avg >= 5 ? 'text-yellow-700' : 'text-red-600';
                const scoreColor = (v: number) => v >= 7 ? 'text-green-700' : v >= 5 ? 'text-yellow-600' : 'text-red-600';
                return (
                  <tr
                    key={r.p.id}
                    onClick={() => openModal(r.p.id)}
                    className="border-t border-ink/[.06] hover:bg-gold/5 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <span className={`font-serif text-base font-bold ${i === 0 ? 'text-gold' : i <= 2 ? 'text-teal' : 'text-ink/35'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <div className="font-serif text-sm leading-snug text-ink truncate">{r.a.title_en || r.p.title}</div>
                      <div className="font-mono text-[.52rem] text-ink/35 truncate">{r.p.addr}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-serif text-base font-bold ${avgColor}`}>{r.avg}</span>
                    </td>
                    <td className={`px-3 py-2.5 text-center hidden md:table-cell font-serif text-sm ${scoreColor(r.a.investment_score)}`}>{r.a.investment_score}</td>
                    <td className={`px-3 py-2.5 text-center hidden md:table-cell font-serif text-sm ${scoreColor(r.a.transport_score)}`}>{r.a.transport_score}</td>
                    <td className={`px-3 py-2.5 text-center hidden md:table-cell font-serif text-sm ${scoreColor(r.a.market_score)}`}>{r.a.market_score}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[.48rem] font-bold px-1.5 py-0.5 rounded-[2px] ${vc}`}>{r.a.decision}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[.46rem] font-bold font-mono px-1.5 py-0.5 rounded-[2px] ${r.p.isAuction ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                        {r.p.isAuction ? '⚡ Cash' : '🏦 Bank'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
