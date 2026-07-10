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
  isAuction: boolean;
}

// ── Analysis Types ──

export interface CashBuyAnalysis {
  affordable: boolean;
  total_cost: string;
  breakdown: {
    auction_price: string;
    aufgeld: string;
    grunderwerbsteuer: string;
    notar_grundbuch: string;
    renovation_estimate: string;
    total: string;
  };
  remaining_budget: string;
  recommendation: string;
  risks: string[];
}

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
  // Cash buyer fields (auction properties)
  cash_buy_score: number;
  affordable_at_40k: boolean;
  cash_buy_analysis: CashBuyAnalysis;
  // Islamic finance fields (non-auction / regular listings)
  islamic_finance_score?: number;
  islamic_finance_eligible?: boolean;
  kt_bank_analysis?: KTBankAnalysis;
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

// ── Search Types ──

export type SourceKey =
  | 'kleinanzeigen'
  | 'immoscout24'
  | 'immowelt'
  | 'immonet'
  | 'ebay_immobilien'
  | 'diia'
  | 'zvg'
  | 'ndga';

export interface SearchQuery {
  location: string;
  propertyType: 'apartment' | 'house' | 'villa' | 'land' | 'any';
  budgetMin: number;
  budgetMax: number;
  sizeMin?: number;
  sizeMax?: number;
  rooms?: number;
  sources: SourceKey[];
}

export interface SearchListing {
  id: string;
  title: string;
  addr: string;
  price: number;
  priceLabel: string;
  size: string;
  rooms?: number;
  propertyType: string;
  source: SourceKey;
  sourceLabel: string;
  url: string;
  isAuction: boolean;
  description: string;
  features: string[];
  energyRating?: string;
  constructionYear?: string;
  postedAt?: string;
}

export const SOURCE_META: Record<SourceKey, { label: string; color: string; isAuction: boolean; domain: string }> = {
  kleinanzeigen:  { label: 'Kleinanzeigen',     color: 'bg-yellow-100 text-yellow-800 border-yellow-200', isAuction: false, domain: 'kleinanzeigen.de' },
  immoscout24:    { label: 'ImmobilienScout24',  color: 'bg-blue-100 text-blue-800 border-blue-200',       isAuction: false, domain: 'immobilienscout24.de' },
  immowelt:       { label: 'Immowelt',           color: 'bg-orange-100 text-orange-800 border-orange-200', isAuction: false, domain: 'immowelt.de' },
  immonet:        { label: 'Immonet',            color: 'bg-green-100 text-green-800 border-green-200',    isAuction: false, domain: 'immonet.de' },
  ebay_immobilien:{ label: 'eBay Immobilien',    color: 'bg-purple-100 text-purple-800 border-purple-200', isAuction: false, domain: 'ebay-kleinanzeigen.de' },
  diia:           { label: 'DIIA Auction',       color: 'bg-red-100 text-red-800 border-red-200',          isAuction: true,  domain: 'diia.de' },
  zvg:            { label: 'ZVG Portal',         color: 'bg-red-100 text-red-800 border-red-200',          isAuction: true,  domain: 'zvg-portal.de' },
  ndga:           { label: 'NDGA',               color: 'bg-red-100 text-red-800 border-red-200',          isAuction: true,  domain: 'ndga.de' },
};

export type ViewType = 'catalog' | 'leaderboard' | 'hamburg' | 'budget' | 'islamic';

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
