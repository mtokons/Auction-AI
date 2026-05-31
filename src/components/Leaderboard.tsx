'use client';

import { useStore } from '@/context/PropertyContext';

type SortKey = 'avg' | 'investment_score' | 'transport_score' | 'legal_score' | 'market_score' | 'cash_buy_score';

export default function Leaderboard() {
  const { properties, analyses, openModal } = useStore();

  const rows = properties
    .filter((p) => analyses[p.id])
    .map((p) => {
      const a = analyses[p.id];
      const avg = +(
        ((a.investment_score || 0) +
          (a.transport_score || 0) +
          (a.legal_score || 0) +
          (a.market_score || 0) +
          (a.cash_buy_score || 0)) /
        5
      ).toFixed(1);
      return { p, a, avg };
    })
    .sort((a, b) => b.avg - a.avg);

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 px-6 text-ink/45">
        <div className="text-4xl mb-3">📊</div>
        <div className="font-serif text-lg mb-1">No Analyzed Properties Yet</div>
        <div className="font-mono text-xs">Analyze properties in the catalog view first, then switch to leaderboard to compare them.</div>
      </div>
    );
  }

  const scoreCell = (v: number) => {
    const color = v >= 7 ? 'text-green-700' : v >= 4.5 ? 'text-yellow-700' : 'text-red-700';
    return <span className={`font-serif text-sm ${color}`}>{v}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-ink text-paper">
            <th className="px-4 py-3 text-[.52rem] tracking-[.12em] uppercase font-bold">#</th>
            <th className="px-4 py-3 text-[.52rem] tracking-[.12em] uppercase font-bold">Property</th>
            <th className="px-4 py-3 text-[.52rem] tracking-[.12em] uppercase font-bold">Decision</th>
            <th className="px-4 py-3 text-[.52rem] tracking-[.12em] uppercase font-bold text-center">Avg</th>
            <th className="px-4 py-3 text-[.52rem] tracking-[.12em] uppercase font-bold text-center">Invest</th>
            <th className="px-4 py-3 text-[.52rem] tracking-[.12em] uppercase font-bold text-center">Transport</th>
            <th className="px-4 py-3 text-[.52rem] tracking-[.12em] uppercase font-bold text-center">Legal</th>
            <th className="px-4 py-3 text-[.52rem] tracking-[.12em] uppercase font-bold text-center">Market</th>
            <th className="px-4 py-3 text-[.52rem] tracking-[.12em] uppercase font-bold text-center">Cash</th>
            <th className="px-4 py-3 text-[.52rem] tracking-[.12em] uppercase font-bold text-center">€40k</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const vc =
              r.a.decision === 'BUY'
                ? 'bg-green-50 text-green-700'
                : r.a.decision === 'CAUTION'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-red-50 text-red-700';
            return (
              <tr
                key={r.p.id}
                className="border-b border-ink/10 hover:bg-gold/5 cursor-pointer transition-colors"
                onClick={() => openModal(r.p.id)}
              >
                <td className="px-4 py-3.5 font-serif text-lg text-gold">{i + 1}</td>
                <td className="px-4 py-3.5">
                  <div className="font-serif text-sm text-ink leading-snug">{r.a.title_en || r.p.title}</div>
                  <div className="font-mono text-[.58rem] text-ink/45 mt-0.5">{r.p.addr}</div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-block px-2 py-0.5 text-[.52rem] font-bold rounded-[1px] ${vc}`}>{r.a.decision}</span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="font-serif text-base font-bold text-gold">{r.avg}</span>
                </td>
                <td className="px-4 py-3.5 text-center">{scoreCell(r.a.investment_score)}</td>
                <td className="px-4 py-3.5 text-center">{scoreCell(r.a.transport_score)}</td>
                <td className="px-4 py-3.5 text-center">{scoreCell(r.a.legal_score)}</td>
                <td className="px-4 py-3.5 text-center">{scoreCell(r.a.market_score)}</td>
                <td className="px-4 py-3.5 text-center">{scoreCell(r.a.cash_buy_score ?? 0)}</td>
                <td className="px-4 py-3.5 text-center">
                  {r.a.affordable_at_40k ? (
                    <span className="text-xs text-green-600 font-bold">✓</span>
                  ) : (
                    <span className="text-xs text-red-300">✗</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
