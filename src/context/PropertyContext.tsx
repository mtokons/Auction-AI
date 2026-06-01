'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { Property, Analysis, ViewType, FilterType } from '@/lib/types';
import { DEFAULT_PROPERTIES } from '@/lib/data';

// ── Store shape ──
interface PropertyStore {
  properties: Property[];
  analyses: Record<string, Analysis>;
  view: ViewType;
  filter: FilterType;
  search: string;
  modalPropertyId: string | null;
  toastMessage: string | null;
  analyzingIds: Set<string>;

  setView: (v: ViewType) => void;
  setFilter: (f: FilterType) => void;
  setSearch: (s: string) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  showToast: (msg: string) => void;
  addProperty: (p: Property) => void;
  saveAnalysis: (id: string, a: Analysis) => void;
  setAnalyzing: (id: string, busy: boolean) => void;
  analyzeProperty: (p: Property) => Promise<void>;
  scrapeAndAnalyze: (url: string) => Promise<void>;
  analyzeAll: (onProgress?: (done: number, total: number) => void) => Promise<void>;
  analyzedCount: number;
  filteredProperties: Property[];
}

const StoreContext = createContext<PropertyStore | null>(null);

export function useStore(): PropertyStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within PropertyProvider');
  return ctx;
}

// ── Provider ──
export function PropertyProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});
  const [view, setView] = useState<ViewType>('catalog');
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [modalPropertyId, setModalPropertyId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  // Load from localStorage on mount
  useEffect(() => {
    let customProps: Property[] = [];
    try {
      customProps = JSON.parse(localStorage.getItem('auction_ai_custom_props') || '[]');
    } catch { /* empty */ }

    let savedAnalyses: Record<string, Analysis> = {};
    try {
      savedAnalyses = JSON.parse(localStorage.getItem('auction_ai_analyses') || '{}');
    } catch { /* empty */ }

    setProperties([...DEFAULT_PROPERTIES, ...customProps]);
    setAnalyses(savedAnalyses);
  }, []);

  // Persist analyses
  const persistAnalyses = useCallback(
    (updated: Record<string, Analysis>) => {
      setAnalyses(updated);
      try {
        localStorage.setItem('auction_ai_analyses', JSON.stringify(updated));
      } catch { /* quota exceeded — ignore */ }
    },
    [],
  );

  // Persist custom properties
  const persistProperties = useCallback(
    (allProps: Property[]) => {
      setProperties(allProps);
      const custom = allProps.filter(
        (p) => !DEFAULT_PROPERTIES.some((d) => d.id === p.id),
      );
      try {
        localStorage.setItem('auction_ai_custom_props', JSON.stringify(custom));
      } catch { /* ignore */ }
    },
    [],
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  }, []);

  const addProperty = useCallback(
    (p: Property) => {
      setProperties((prev) => {
        if (prev.some((x) => x.id === p.id)) return prev;
        const next = [...prev, p];
        persistProperties(next);
        return next;
      });
    },
    [persistProperties],
  );

  const saveAnalysis = useCallback(
    (id: string, a: Analysis) => {
      setAnalyses((prev) => {
        const next = { ...prev, [id]: a };
        persistAnalyses(next);
        return next;
      });
    },
    [persistAnalyses],
  );

  const setAnalyzing = useCallback((id: string, busy: boolean) => {
    setAnalyzingIds((prev) => {
      const next = new Set(prev);
      busy ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  // ── AI call for a single property ──
  const analyzeProperty = useCallback(
    async (p: Property) => {
      // Already analyzed → just open modal
      if (analyses[p.id]) {
        setModalPropertyId(p.id);
        return;
      }

      setAnalyzing(p.id, true);
      try {
        const msg = `Property: ${p.titleDE}
Location: ${p.addr}
Size: ${p.size}
Start price: €${p.startPrice}
Current highest bid: ${p.highBid != null ? '€' + p.highBid : 'none'}
Bids so far: ${p.bids}
Type: ${p.type}`;

        const resp = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId: p.id, userMessage: msg }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${resp.status}`);
        }

        const data = await resp.json();

        // If it was cached on the server, data.text might already be the analysis
        let parsed: Analysis;
        if (data.cached) {
          parsed = typeof data.text === 'string' ? JSON.parse(data.text) : data.text;
        } else {
          const raw = (data.text || '').replace(/```json|```/g, '').trim();
          const si = raw.indexOf('{');
          const ei = raw.lastIndexOf('}');
          if (si === -1 || ei === -1) throw new Error('Invalid JSON from AI');
          parsed = JSON.parse(raw.slice(si, ei + 1));
        }

        saveAnalysis(p.id, parsed);
      } catch (e) {
        showToast(`Analysis failed: ${(e as Error).message}`);
      } finally {
        setAnalyzing(p.id, false);
      }
    },
    [analyses, saveAnalysis, setAnalyzing, showToast],
  );

  // ── Scrape external URL ──
  const scrapeAndAnalyze = useCallback(
    async (url: string) => {
      try {
        const resp = await fetch('/api/scrape-and-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${resp.status}`);
        }

        const result = await resp.json();
        const { property, analysis } = result;

        if (!property || !analysis) throw new Error('Invalid AI response structure');

        // Ensure the property has needed fields for display
        const prop: Property = {
          id: property.id,
          lot: property.lot || 'CUSTOM',
          title: property.title,
          titleDE: property.titleDE || property.title,
          addr: property.addr || '',
          size: property.size || '',
          startPrice: property.startPrice || 0,
          highBid: null,
          bids: 0,
          type: property.type || 'residential',
          diiaUrl: property.diiaUrl || url,
          isAuction: false,
        };

        addProperty(prop);
        saveAnalysis(prop.id, analysis);
        showToast(`Analyzed: ${analysis.title_en || prop.title}`);
        setModalPropertyId(prop.id);
      } catch (e) {
        showToast(`Scrape failed: ${(e as Error).message}`);
        throw e;
      }
    },
    [addProperty, saveAnalysis, showToast],
  );

  // ── Analyze all ──
  const analyzeAll = useCallback(
    async (onProgress?: (done: number, total: number) => void) => {
      let done = 0;
      for (const p of properties) {
        if (analyses[p.id]) {
          done++;
          onProgress?.(done, properties.length);
          continue;
        }
        await analyzeProperty(p);
        done++;
        onProgress?.(done, properties.length);
        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 600));
      }
    },
    [properties, analyses, analyzeProperty],
  );

  // ── Derived data ──
  const analyzedCount = Object.keys(analyses).length;

  const filteredProperties = properties.filter((p) => {
    const matchType =
      filter === 'all' ||
      (filter === 'analyzed' && !!analyses[p.id]) ||
      p.type === filter;

    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.addr.toLowerCase().includes(q) ||
      p.lot.toLowerCase().includes(q);

    return matchType && matchSearch;
  });

  return (
    <StoreContext.Provider
      value={{
        properties,
        analyses,
        view,
        filter,
        search,
        modalPropertyId,
        toastMessage,
        analyzingIds,
        setView,
        setFilter,
        setSearch,
        openModal: setModalPropertyId,
        closeModal: () => setModalPropertyId(null),
        showToast,
        addProperty,
        saveAnalysis,
        setAnalyzing,
        analyzeProperty,
        scrapeAndAnalyze,
        analyzeAll,
        analyzedCount,
        filteredProperties,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
