// ── Property Types ──

export type PropertyType =
  | 'land'
  | 'forest'
  | 'wine'
  | 'agri'
  | 'splitter'
  | 'residential'
  | 'commercial';

export interface Property {
  id: string;
  lot: string;
  title: string;
  titleDE: string;
  addr: string;
  size: string;
  startPrice: number;
  highBid: number | null;
  bids: number;
  type: PropertyType;
  diiaUrl: string;
}

// ── Analysis Types ──

export interface KTBankAnalysis {
  eligible: boolean;
  reason: string;
  estimated_downpayment: string;
  financing_structure: string;
  term: string;
  requirements: string[];
  alternatives: string[];
}

export interface TransportConnection {
  type: string;
  detail: string;
  quality: 'good' | 'ok' | 'poor';
}

export interface TransportAnalysis {
  overall: 'good' | 'ok' | 'poor';
  summary: string;
  connections: TransportConnection[];
}

export interface LegalTerm {
  de: string;
  en: string;
  explanation: string;
  status: 'OK' | 'CHECK' | 'WARN';
}

export interface MarketOutlook {
  short_term: string;
  mid_term: string;
  long_term: string;
}

export interface Analysis {
  title_en: string;
  location: string;
  property_type: string;
  decision: 'BUY' | 'CAUTION' | 'AVOID';
  decision_reason: string;
  investment_score: number;
  transport_score: number;
  legal_score: number;
  market_score: number;
  islamic_finance_score: number;
  islamic_finance_eligible: boolean;
  kt_bank_analysis: KTBankAnalysis;
  summary: string;
  pros: string[];
  cons: string[];
  legal_terms: LegalTerm[];
  transport_analysis: TransportAnalysis;
  market_outlook: MarketOutlook;
  major_problems: string[];
  investment_opportunities: string[];
  key_questions_to_ask: string[];
  estimated_true_value: string;
  hidden_costs: string[];
}

export interface ScrapeResult {
  property: Property;
  analysis: Analysis;
}

// ── UI Types ──

export type ViewType = 'catalog' | 'leaderboard' | 'hamburg' | 'islamic';

export type FilterType = 'all' | PropertyType | 'analyzed';

export const TYPE_LABELS: Record<string, string> = {
  land: 'Grundstück',
  forest: 'Waldstück',
  wine: 'Weinberg',
  agri: 'Agricultural',
  splitter: 'Splitter',
  residential: 'Residential',
  commercial: 'Commercial',
};

export const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  land: { bg: 'bg-green-50', text: 'text-green-700' },
  forest: { bg: 'bg-teal-50', text: 'text-teal-700' },
  wine: { bg: 'bg-pink-50', text: 'text-pink-800' },
  agri: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  splitter: { bg: 'bg-gray-100', text: 'text-gray-600' },
  residential: { bg: 'bg-blue-50', text: 'text-blue-700' },
  commercial: { bg: 'bg-orange-50', text: 'text-orange-700' },
};
