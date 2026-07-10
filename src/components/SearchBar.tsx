'use client';

import React, { useState } from 'react';
import { useStore } from '@/context/PropertyContext';
import type { SearchQuery, SourceKey } from '@/lib/types';
import { SOURCE_META } from '@/lib/types';

const SOURCE_GROUPS = {
  listings: ['kleinanzeigen', 'immoscout24', 'immowelt', 'immonet', 'ebay_immobilien'] as SourceKey[],
  auctions: ['diia', 'zvg', 'ndga'] as SourceKey[],
};

const LOCATION_SUGGESTIONS = [
  'Hamburg', 'Berlin', 'München', 'Frankfurt', 'Köln',
  'Stuttgart', 'Düsseldorf', 'Leipzig', 'Bremen', 'Dresden',
];

const PROPERTY_TYPES = [
  { key: 'any', label: 'Any', icon: '🏠' },
  { key: 'apartment', label: 'Apartment', icon: '🏢' },
  { key: 'house', label: 'House', icon: '🏡' },
  { key: 'villa', label: 'Villa', icon: '🏰' },
  { key: 'land', label: 'Land', icon: '🌱' },
] as const;

type PropertyType = 'apartment' | 'house' | 'villa' | 'land' | 'any';

function formatBudget(v: number) {
  return v >= 1_000_000 ? `€${(v / 1_000_000).toFixed(1)}M` : `€${(v / 1000).toFixed(0)}k`;
}

export default function SearchBar() {
  const { runSearch, isSearching } = useStore();

  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('any');
  const [budgetMin, setBudgetMin] = useState(50_000);
  const [budgetMax, setBudgetMax] = useState(500_000);
  const [rooms, setRooms] = useState<number | undefined>();
  const [sizeMin, setSizeMin] = useState<number | undefined>();
  const [sources, setSources] = useState<SourceKey[]>(['kleinanzeigen', 'immoscout24', 'immowelt', 'diia', 'zvg']);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'url'>('search');

  const { scrapeAndAnalyze } = useStore();
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);

  const filteredSuggestions = location.length > 0
    ? LOCATION_SUGGESTIONS.filter(l => l.toLowerCase().startsWith(location.toLowerCase()) && l.toLowerCase() !== location.toLowerCase())
    : [];

  const toggleSource = (s: SourceKey) => {
    setSources(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleSearch = async () => {
    if (!location.trim()) return;
    if (sources.length === 0) return;
    const query: SearchQuery = {
      location: location.trim(),
      propertyType,
      budgetMin,
      budgetMax,
      rooms,
      sizeMin,
      sources,
    };
    await runSearch(query);
  };

  const handleUrlAnalyze = async () => {
    if (!urlInput.trim()) return;
    setIsScrapingUrl(true);
    try {
      await scrapeAndAnalyze(urlInput.trim());
      setUrlInput('');
    } finally {
      setIsScrapingUrl(false);
    }
  };

  return (
    <section className="bg-ink px-6 py-10 md:py-16">
      <div className="max-w-4xl mx-auto">
        {/* Hero heading */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl md:text-4xl text-paper mb-2 leading-tight">
            Find Your Home in Germany
          </h1>
          <p className="font-mono text-sm text-white/35 max-w-xl mx-auto">
            Search across Kleinanzeigen, ImmobilienScout24, Immowelt, DIIA auctions and more.
            Get AI deep analysis on any property.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-white/[.06] p-1 rounded-sm w-fit mx-auto">
          {[
            { key: 'search', label: '🔍 Search Properties' },
            { key: 'url', label: '🔗 Analyze URL' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as 'search' | 'url')}
              className={`px-5 py-2 text-xs font-bold font-syne tracking-wider uppercase rounded-[2px] transition-all ${
                activeTab === t.key
                  ? 'bg-gold text-ink'
                  : 'text-white/45 hover:text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'url' ? (
          /* ── URL Analyzer tab ── */
          <div className="bg-white/[.04] border border-white/[.08] rounded-sm p-6">
            <p className="font-mono text-xs text-white/40 mb-4">
              Paste any listing URL to get a deep AI analysis — works with Kleinanzeigen, ImmobilienScout24,
              Immowelt, DIIA, ZVG, NDGA and more.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlAnalyze()}
                placeholder="https://www.kleinanzeigen.de/s-anzeige/... or any property URL"
                className="flex-1 bg-white/[.06] border border-white/[.08] px-4 py-3 font-mono text-sm text-white/80 placeholder:text-white/20 outline-none rounded-sm focus:border-gold transition-colors"
                disabled={isScrapingUrl}
              />
              <button
                onClick={handleUrlAnalyze}
                disabled={isScrapingUrl || !urlInput.trim()}
                className="bg-gold text-ink px-6 py-3 font-syne text-xs font-bold tracking-wider uppercase rounded-sm hover:bg-gold-pale disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {isScrapingUrl ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
                    Analyzing…
                  </span>
                ) : '✦ Analyze'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Search tab ── */
          <div className="bg-white/[.04] border border-white/[.08] rounded-sm overflow-hidden">
            {/* Location */}
            <div className="relative border-b border-white/[.06] p-4 flex items-center gap-3">
              <svg className="text-gold flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <input
                type="text"
                value={location}
                onChange={e => { setLocation(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="City, district, or ZIP code (e.g. Hamburg, Berlin-Mitte, 22301)"
                className="flex-1 bg-transparent font-syne text-base text-white placeholder:text-white/20 outline-none"
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-ink border border-white/[.1] z-50 shadow-xl mt-px">
                  {filteredSuggestions.map(s => (
                    <button
                      key={s}
                      onMouseDown={() => { setLocation(s); setShowSuggestions(false); }}
                      className="w-full text-left px-6 py-3 text-sm text-white/60 hover:bg-white/[.06] hover:text-white font-mono border-b border-white/[.04] last:border-0 transition-colors"
                    >
                      📍 {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Property type */}
            <div className="border-b border-white/[.06] p-4">
              <div className="text-[.52rem] tracking-[.12em] uppercase text-white/30 mb-2.5">Property Type</div>
              <div className="flex gap-2 flex-wrap">
                {PROPERTY_TYPES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setPropertyType(t.key)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-syne font-bold tracking-wide rounded-sm border transition-all ${
                      propertyType === t.key
                        ? 'bg-gold text-ink border-gold'
                        : 'bg-transparent text-white/45 border-white/[.1] hover:border-gold/50 hover:text-white/70'
                    }`}
                  >
                    <span>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget range */}
            <div className="border-b border-white/[.06] p-4">
              <div className="text-[.52rem] tracking-[.12em] uppercase text-white/30 mb-2.5">Budget Range</div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-[.6rem] text-white/25 mb-1">Min</div>
                  <input
                    type="number"
                    value={budgetMin}
                    onChange={e => setBudgetMin(Number(e.target.value))}
                    step={5000}
                    className="w-full bg-white/[.06] border border-white/[.08] px-3 py-2 font-mono text-sm text-white outline-none rounded-sm focus:border-gold transition-colors"
                    placeholder="50,000"
                  />
                </div>
                <div className="text-white/30 font-serif text-xl mt-4">—</div>
                <div className="flex-1">
                  <div className="text-[.6rem] text-white/25 mb-1">Max</div>
                  <input
                    type="number"
                    value={budgetMax}
                    onChange={e => setBudgetMax(Number(e.target.value))}
                    step={5000}
                    className="w-full bg-white/[.06] border border-white/[.08] px-3 py-2 font-mono text-sm text-white outline-none rounded-sm focus:border-gold transition-colors"
                    placeholder="500,000"
                  />
                </div>
                <div className="text-sm font-serif text-gold mt-4 whitespace-nowrap">
                  {formatBudget(budgetMin)} – {formatBudget(budgetMax)}
                </div>
              </div>
            </div>

            {/* Advanced filters */}
            <div className="border-b border-white/[.06]">
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-mono text-white/35 hover:text-white/55 transition-colors"
              >
                <span>Advanced Filters (rooms, size, sources)</span>
                <span className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showAdvanced && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Rooms + Size */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="text-[.52rem] tracking-[.1em] uppercase text-white/30 mb-2">Min Rooms</div>
                      <div className="flex gap-1.5">
                        {[undefined, 1, 2, 3, 4, 5].map(r => (
                          <button
                            key={String(r)}
                            onClick={() => setRooms(r)}
                            className={`w-9 h-9 text-xs font-mono rounded-sm border transition-all ${
                              rooms === r
                                ? 'bg-gold text-ink border-gold font-bold'
                                : 'bg-white/[.04] text-white/40 border-white/[.08] hover:border-gold/50'
                            }`}
                          >
                            {r === undefined ? 'Any' : `${r}+`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[.52rem] tracking-[.1em] uppercase text-white/30 mb-2">Min Size (m²)</div>
                      <input
                        type="number"
                        value={sizeMin ?? ''}
                        onChange={e => setSizeMin(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Any"
                        className="w-full bg-white/[.06] border border-white/[.08] px-3 py-2 font-mono text-sm text-white outline-none rounded-sm focus:border-gold transition-colors"
                      />
                    </div>
                  </div>

                  {/* Sources */}
                  <div>
                    <div className="text-[.52rem] tracking-[.1em] uppercase text-white/30 mb-2">Sources to Search</div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-[.5rem] text-white/20 mb-1.5 uppercase tracking-widest">Regular Listings</div>
                        <div className="flex gap-1.5 flex-wrap">
                          {SOURCE_GROUPS.listings.map(s => {
                            const meta = SOURCE_META[s];
                            const active = sources.includes(s);
                            return (
                              <button
                                key={s}
                                onClick={() => toggleSource(s)}
                                className={`px-2.5 py-1 text-[.58rem] font-mono border rounded-sm transition-all ${
                                  active
                                    ? 'bg-blue-500/20 border-blue-400/40 text-blue-300'
                                    : 'bg-transparent border-white/[.08] text-white/30 hover:border-white/20'
                                }`}
                              >
                                {meta.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[.5rem] text-white/20 mb-1.5 uppercase tracking-widest">Auction Platforms ⚡</div>
                        <div className="flex gap-1.5 flex-wrap">
                          {SOURCE_GROUPS.auctions.map(s => {
                            const meta = SOURCE_META[s];
                            const active = sources.includes(s);
                            return (
                              <button
                                key={s}
                                onClick={() => toggleSource(s)}
                                className={`px-2.5 py-1 text-[.58rem] font-mono border rounded-sm transition-all ${
                                  active
                                    ? 'bg-red-500/20 border-red-400/40 text-red-300'
                                    : 'bg-transparent border-white/[.08] text-white/30 hover:border-white/20'
                                }`}
                              >
                                ⚡ {meta.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search button */}
            <div className="p-4">
              <button
                onClick={handleSearch}
                disabled={isSearching || !location.trim() || sources.length === 0}
                className="w-full bg-gold text-ink py-4 font-syne text-sm font-bold tracking-widest uppercase rounded-sm hover:bg-gold-pale disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
              >
                {isSearching ? (
                  <>
                    <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
                    Searching {sources.length} sources…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    Search Properties in {location || '...'}
                  </>
                )}
              </button>
              {sources.length === 0 && (
                <p className="text-center font-mono text-[.6rem] text-red-400 mt-2">Select at least one source above</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
