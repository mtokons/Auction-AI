'use client';

import React, { useState } from 'react';
import { PropertyProvider, useStore } from '@/context/PropertyContext';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import ResultCard from '@/components/ResultCard';
import PropertyCard from '@/components/PropertyCard';
import AnalysisModal from '@/components/AnalysisModal';
import TopChart from '@/components/TopChart';
import Leaderboard from '@/components/Leaderboard';
import Footer from '@/components/Footer';
import type { FilterType } from '@/lib/types';
import { TYPE_LABELS } from '@/lib/types';

function SortBar({ count, sort, onSort }: { count: number; sort: string; onSort: (s: string) => void }) {
  const options = [
    { key: 'default', label: 'Best Match' },
    { key: 'price_asc', label: 'Price ↑' },
    { key: 'price_desc', label: 'Price ↓' },
    { key: 'score', label: 'Score' },
  ];
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-paper border-b border-ink/10">
      <span className="font-mono text-xs text-ink/45">
        <strong className="text-ink">{count}</strong> results
      </span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[.55rem] text-ink/35 uppercase tracking-wide">Sort:</span>
        {options.map(o => (
          <button key={o.key} onClick={() => onSort(o.key)}
            className={`px-2.5 py-1 text-[.58rem] font-mono border rounded-sm transition-all ${sort === o.key ? 'bg-ink text-gold border-ink' : 'bg-transparent text-ink/40 border-ink/10 hover:border-gold hover:text-gold'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toast() {
  const { toastMessage } = useStore();
  if (!toastMessage) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[2000] bg-ink text-gold-light border border-gold/30 px-5 py-3 rounded-sm shadow-2xl font-mono text-xs animate-fade-up max-w-sm leading-relaxed">
      {toastMessage}
    </div>
  );
}

function AuctionPanel() {
  const { properties, analyses, analyzeAll, analyzingIds } = useStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [progress, setProgress] = useState<string | null>(null);

  const auctionProps = properties.filter(p => p.isAuction);
  const isRunning = analyzingIds.size > 0;

  const filtered = auctionProps.filter(p => {
    const matchType = filter === 'all' || (filter === 'analyzed' && !!analyses[p.id]) || p.type === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.addr.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const handleAnalyzeAll = async () => {
    setProgress('Starting…');
    await analyzeAll((done, total) => setProgress(`${done}/${total}`));
    setProgress(null);
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'analyzed', label: 'Analyzed' },
    { key: 'residential', label: TYPE_LABELS.residential },
    { key: 'land', label: TYPE_LABELS.land },
    { key: 'forest', label: TYPE_LABELS.forest },
    { key: 'wine', label: TYPE_LABELS.wine },
    { key: 'agri', label: TYPE_LABELS.agri },
  ];

  return (
    <div>
      <div className="flex items-center justify-between px-6 py-3.5 bg-paper border-b border-ink/10 sticky top-[57px] z-10">
        <div>
          <h2 className="font-serif text-base text-ink flex items-center gap-2">
            ⚡ DIIA Auction Properties
            <span className="font-mono text-sm text-ink/35">({filtered.length})</span>
          </h2>
          <p className="font-mono text-[.55rem] text-ink/35">Cash-only purchases · 7.14% Aufgeld + Grunderwerbsteuer applies</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="bg-cream border border-ink/10 px-3 py-1.5 font-mono text-xs outline-none rounded-sm focus:border-gold transition-colors w-32" />
          <button onClick={handleAnalyzeAll} disabled={isRunning}
            className="bg-teal text-gold-light px-3 py-1.5 font-syne text-[.55rem] font-bold tracking-wider uppercase border-none rounded-sm hover:bg-ink disabled:opacity-50 transition-colors whitespace-nowrap">
            {progress ? `⏳ ${progress}` : '🤖 Analyze All'}
          </button>
        </div>
      </div>
      <div className="px-6 py-2 bg-paper/60 border-b border-ink/10 flex gap-1.5 flex-wrap">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 text-[.55rem] font-mono border rounded-sm transition-all ${filter === f.key ? 'bg-ink text-gold border-ink' : 'bg-transparent text-ink/40 border-ink/10 hover:border-gold hover:text-gold'}`}>
            {f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <div className="py-12 text-center text-ink/35 font-mono text-xs">No auction properties match</div>
        : <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink/10">{filtered.map(p => <PropertyCard key={p.id} property={p} />)}</div>
      }
    </div>
  );
}

function SearchResultsPanel() {
  const { searchListings, analyses, isSearching, lastQuery, analyzeSearchListing } = useStore();
  const [sort, setSort] = useState('default');
  const [analyzeProgress, setAnalyzeProgress] = useState<string | null>(null);

  if (isSearching) {
    return (
      <div className="py-20 flex flex-col items-center gap-5 bg-paper">
        <div className="w-10 h-10 border-[3px] border-ink/10 border-t-gold rounded-full animate-spin" />
        <div className="font-serif text-lg text-ink">Searching {lastQuery?.sources.length} sources…</div>
        <div className="font-mono text-xs text-ink/35 max-w-sm text-center">Finding properties for <strong>{lastQuery?.location}</strong></div>
      </div>
    );
  }

  if (searchListings.length === 0) {
    return (
      <div className="py-24 text-center bg-paper">
        <div className="text-5xl mb-4">🏠</div>
        <div className="font-serif text-xl text-ink mb-2">Search for Properties</div>
        <div className="font-mono text-xs text-ink/40 max-w-sm mx-auto leading-relaxed">
          Enter location, budget and property type above to find listings across Kleinanzeigen, ImmobilienScout24, DIIA auctions and more.
        </div>
        <div className="flex gap-2 justify-center mt-5 flex-wrap">
          {['Hamburg', 'Berlin', 'München', 'Frankfurt', 'Bremen'].map(city => (
            <span key={city} className="font-mono text-[.6rem] bg-cream border border-ink/10 px-3 py-1.5 rounded-sm text-ink/45">
              Try: {city}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const sorted = [...searchListings].sort((a, b) => {
    if (sort === 'price_asc') return a.price - b.price;
    if (sort === 'price_desc') return b.price - a.price;
    if (sort === 'score') return (analyses[b.id]?.investment_score || 0) - (analyses[a.id]?.investment_score || 0);
    return 0;
  });

  const handleAnalyzeAll = async () => {
    let done = 0;
    for (const l of sorted) {
      if (!analyses[l.id]) {
        setAnalyzeProgress(`${done}/${sorted.length}`);
        await analyzeSearchListing(l);
        await new Promise(r => setTimeout(r, 800));
      }
      done++;
    }
    setAnalyzeProgress(null);
  };

  const unanyzedCount = sorted.filter(l => !analyses[l.id]).length;

  return (
    <div>
      <SortBar count={sorted.length} sort={sort} onSort={setSort} />
      {unanyzedCount > 0 && (
        <div className="flex items-center justify-between bg-teal/5 border-b border-teal/15 px-6 py-2.5">
          <span className="font-mono text-xs text-teal/70">{unanyzedCount} not yet analyzed</span>
          <button onClick={handleAnalyzeAll}
            className="bg-teal text-gold-light px-4 py-1.5 font-syne text-[.58rem] font-bold tracking-wider uppercase border-none rounded-sm hover:bg-ink transition-colors whitespace-nowrap">
            {analyzeProgress ? `⏳ ${analyzeProgress}` : '🤖 Analyze All'}
          </button>
        </div>
      )}
      <div className="divide-y divide-ink/[.06]">{sorted.map(l => <ResultCard key={l.id} listing={l} />)}</div>
    </div>
  );
}

type MainTab = 'search' | 'auctions' | 'leaderboard';

function MainContent() {
  const { searchListings, properties, analyzedCount } = useStore();
  const [tab, setTab] = useState<MainTab>('search');
  const auctionProps = properties.filter(p => p.isAuction);

  const tabs: { key: MainTab; label: string; icon: string; badge?: number }[] = [
    { key: 'search', label: 'Search Results', icon: '🔍', badge: searchListings.length || undefined },
    { key: 'auctions', label: 'Auction List', icon: '⚡', badge: auctionProps.length },
    { key: 'leaderboard', label: 'Top Chart', icon: '📊', badge: analyzedCount || undefined },
  ];

  return (
    <main className="flex-1 flex flex-col bg-paper">
      <div className="flex border-b border-ink/10 overflow-x-auto flex-shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-5 py-3.5 font-syne text-xs font-bold tracking-wider uppercase cursor-pointer border-b-2 transition-all whitespace-nowrap ${tab === t.key ? 'border-gold text-gold bg-gold/5' : 'border-transparent text-ink/40 hover:text-ink/65 hover:border-ink/20'}`}>
            <span>{t.icon}</span>
            {t.label}
            {t.badge !== undefined && (
              <span className={`text-[.5rem] px-1.5 py-0.5 rounded-full font-mono ${tab === t.key ? 'bg-gold/20 text-gold' : 'bg-ink/5 text-ink/35'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1">
        {tab === 'search' && <SearchResultsPanel />}
        {tab === 'auctions' && <AuctionPanel />}
        {tab === 'leaderboard' && <Leaderboard />}
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <PropertyProvider>
      <div className="min-h-screen flex flex-col bg-cream">
        <Header />
        <SearchBar />
        <MainContent />
        <TopChart />
        <Footer />
        <AnalysisModal />
        <Toast />
      </div>
    </PropertyProvider>
  );
}
