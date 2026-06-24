'use client';

import { useState } from 'react';
import { useStore } from '@/context/PropertyContext';

const EXAMPLES = [
  { label: 'Hamburg Villa (Kleinanzeigen)', url: 'https://www.kleinanzeigen.de/s-anzeige/auf-parkaehnlichem-grundstueck-repraesentative-villa-in-bestlage-/3379022918-208-9502' },
  { label: 'Hamburg Land (NDGA)', url: 'https://www.ndga.de/auktionen/objekt/hamburg-suhrenkamp-24' },
  { label: 'Bremen Forest (ZVG)', url: 'https://www.zvg-portal.de/bremen-aumund-12k' },
];

const STEPS = [
  '🔍 Fetching page & detecting site type...',
  '🧹 Cleaning HTML & extracting content...',
  '🤖 AI analysis + Islamic finance check...',
  '📊 Calculating scores & generating report...',
];

export default function ScraperForm() {
  const { scrapeAndAnalyze, setView } = useStore();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const handleSubmit = async () => {
    let trimmed = url.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }
    setLoading(true);
    setStep(0);

    // Simulate steps
    const stepTimer = setInterval(() => {
      setStep((s) => Math.min(s + 1, 3));
    }, 1200);

    try {
      await scrapeAndAnalyze(trimmed);
      setUrl('');
      setView('catalog'); // Switch to catalog to see the new property
    } catch {
      // Toast is shown by context
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  };

  return (
    <section className="bg-cream px-6 py-5 border-b border-ink/10">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-2xl text-ink mb-1 flex items-center gap-2">
          ✦ Analyze Any German Property
        </h2>
        <p className="font-mono text-xs text-ink/45 leading-relaxed mb-4 max-w-3xl">
          Paste any listing URL from{' '}
          <strong>ImmobilienScout24</strong>, <strong>Immowelt</strong>,{' '}
          <strong>Kleinanzeigen</strong>, <strong>DIIA</strong>,{' '}
          <strong>NDGA</strong>, or <strong>ZVG-Portal</strong>. AI extracts
          data, scores investment potential, and checks Islamic finance
          eligibility.
        </p>

        <div className="flex gap-3 items-center mb-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="https://www.kleinanzeigen.de/s-anzeige/... or any German listing URL"
            className="flex-1 bg-paper border border-ink/18 px-4 py-3 font-mono text-sm text-ink outline-none rounded-sm focus:border-gold transition-colors"
            disabled={loading}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !url.trim()}
            className="bg-ink text-gold border-none px-6 py-3 font-syne text-xs font-bold tracking-wider uppercase cursor-pointer rounded-sm hover:bg-teal disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            ✦ Analyze
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="font-mono text-[.55rem] text-ink/45 uppercase">
            Quick Examples:
          </span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.url}
              onClick={() => {
                setUrl(ex.url);
              }}
              className="bg-transparent border border-ink/10 px-2.5 py-1 font-mono text-[.58rem] text-ink/45 cursor-pointer rounded-sm hover:border-gold hover:text-gold hover:bg-gold/5 transition-all"
            >
              {ex.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="bg-ink rounded-sm p-4 mt-4 flex items-center gap-5 animate-fade-up">
            <div className="w-9 h-9 border-[3px] border-gold/20 border-t-gold rounded-full animate-spin flex-shrink-0" />
            <div className="flex flex-col gap-1.5">
              {STEPS.map((text, i) => (
                <span
                  key={i}
                  className={`font-mono text-xs transition-colors ${
                    i < step
                      ? 'text-green-400'
                      : i === step
                        ? 'text-gold-light font-medium'
                        : 'text-white/25'
                  }`}
                >
                  {text}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
