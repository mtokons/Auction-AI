'use client';

import { PropertyProvider, useStore } from '@/context/PropertyContext';
import Header from '@/components/Header';
import ScraperForm from '@/components/ScraperForm';
import PropertyCard from '@/components/PropertyCard';
import AnalysisModal from '@/components/AnalysisModal';
import Leaderboard from '@/components/Leaderboard';
import HamburgPremium from '@/components/HamburgPremium';
import IslamicFinanceView from '@/components/IslamicFinanceView';
import Footer from '@/components/Footer';
import type { ViewType, FilterType } from '@/lib/types';
import { TYPE_LABELS } from '@/lib/types';

function ViewTabs() {
  const { view, setView, properties, analyses, analyzedCount } = useStore();

  const tabs: { key: ViewType; label: string; icon: string }[] = [
    { key: 'catalog', label: `Catalog (${properties.length})`, icon: '📋' },
    { key: 'leaderboard', label: `Leaderboard (${analyzedCount})`, icon: '📊' },
    { key: 'hamburg', label: 'Hamburg Premium', icon: '⚓' },
    { key: 'islamic', label: 'Islamic Finance', icon: '☪' },
  ];

  return (
    <div className="flex border-b border-ink/10 bg-paper overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setView(t.key)}
          className={`flex items-center gap-1.5 px-5 py-3.5 font-syne text-xs font-bold tracking-wider uppercase cursor-pointer border-b-2 transition-all whitespace-nowrap ${
            view === t.key
              ? 'border-gold text-gold bg-gold/5'
              : 'border-transparent text-ink/45 hover:text-ink/70 hover:border-ink/20'
          }`}
        >
          <span>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function CatalogToolbar() {
  const { filter, setFilter, search, setSearch, analyzeAll, analyzedCount, properties, analyzingIds } = useStore();
  const [progress, setProgress] = React.useState<string | null>(null);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'analyzed', label: 'Analyzed' },
    { key: 'residential', label: TYPE_LABELS.residential },
    { key: 'land', label: TYPE_LABELS.land },
    { key: 'commercial', label: TYPE_LABELS.commercial },
    { key: 'forest', label: TYPE_LABELS.forest },
    { key: 'wine', label: TYPE_LABELS.wine },
    { key: 'agri', label: TYPE_LABELS.agri },
  ];

  const handleAnalyzeAll = async () => {
    setProgress('Starting...');
    await analyzeAll((done, total) => {
      setProgress(`${done}/${total}`);
    });
    setProgress(null);
  };

  const isRunning = analyzingIds.size > 0;

  return (
    <div className="px-6 py-4 flex flex-wrap items-center gap-3 bg-paper/50 border-b border-ink/10">
      <div className="flex gap-1 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 text-[.58rem] font-mono cursor-pointer border rounded-sm transition-all ${
              filter === f.key
                ? 'bg-ink text-gold border-ink'
                : 'bg-transparent text-ink/45 border-ink/10 hover:border-gold hover:text-gold'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search properties..."
        className="flex-1 min-w-[140px] bg-paper border border-ink/18 px-3 py-1.5 font-mono text-xs outline-none rounded-sm focus:border-gold transition-colors"
      />

      <button
        onClick={handleAnalyzeAll}
        disabled={isRunning || analyzedCount === properties.length}
        className="bg-teal text-gold-light px-4 py-1.5 font-syne text-[.58rem] font-bold tracking-wider uppercase cursor-pointer border-none rounded-sm hover:bg-ink disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        {progress ? `⏳ ${progress}` : isRunning ? '⏳ Analyzing...' : `🤖 Analyze All (${properties.length - analyzedCount} left)`}
      </button>
    </div>
  );
}

function CatalogView() {
  const { filteredProperties } = useStore();

  if (filteredProperties.length === 0) {
    return (
      <div className="text-center py-16 px-6 text-ink/45">
        <div className="text-4xl mb-3">🔍</div>
        <div className="font-serif text-lg mb-1">No Properties Match</div>
        <div className="font-mono text-xs">Try adjusting your filter or search terms.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink/10">
      {filteredProperties.map((p) => (
        <PropertyCard key={p.id} property={p} />
      ))}
    </div>
  );
}

function Toast() {
  const { toastMessage } = useStore();
  if (!toastMessage) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[2000] bg-ink text-gold-light border border-gold/30 px-5 py-3 rounded-sm shadow-lg font-mono text-xs animate-fade-up max-w-sm">
      {toastMessage}
    </div>
  );
}

function MainContent() {
  const { view } = useStore();
  return (
    <>
      <ViewTabs />
      {view === 'catalog' && (
        <>
          <CatalogToolbar />
          <CatalogView />
        </>
      )}
      {view === 'leaderboard' && <Leaderboard />}
      {view === 'hamburg' && <HamburgPremium />}
      {view === 'islamic' && <IslamicFinanceView />}
      <AnalysisModal />
      <Toast />
    </>
  );
}

// Need React import for useState in CatalogToolbar
import React from 'react';

export default function HomePage() {
  return (
    <PropertyProvider>
      <Header />
      <ScraperForm />
      <main className="flex-1 flex flex-col">
        <MainContent />
      </main>
      <Footer />
    </PropertyProvider>
  );
}
