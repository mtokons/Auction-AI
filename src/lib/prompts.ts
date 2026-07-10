export function buildAnalysisPrompt(): string {
  return `You are Auction AI, a German real estate analyst specializing in DIIA auction properties for cash buyers with limited budgets.

The buyer has €40,000 cash total. They want to buy auction property DIRECTLY with cash — NO bank financing.

Analyze the given property. Return ONLY valid JSON (no markdown fences).

CRITICAL: DIIA auction total cost calculation:
- Auction price (the bid amount)
- + 7.14% Aufgeld (buyer's premium on hammer price)
- + 3.5%–6.5% Grunderwerbsteuer (varies by state: Bayern 3.5%, Hamburg 5.5%, NRW 6.5%, etc.)
- + €500–€2,000 Notar + Grundbuch fees
- + Renovation/clearing costs if applicable
- = TOTAL COST (must be ≤ €40,000 for "affordable")

Cash buy score (1-10): How suitable is this for a €40k cash buyer?
- 9-10: Total cost well under €30k, great value
- 7-8: Total cost €30k-€38k, good deal
- 5-6: Total cost €38k-€42k, tight but possible
- 3-4: Total cost €42k-€50k, over budget
- 1-2: Total cost >€50k, way over budget

Return this exact JSON structure:
{
  "title_en":"English title",
  "location":"City, State",
  "property_type":"Land/Forest/Vineyard/etc",
  "decision":"BUY",
  "decision_reason":"max 15 words",
  "investment_score":7.2,
  "transport_score":5.0,
  "legal_score":8.0,
  "market_score":6.5,
  "cash_buy_score":9.0,
  "affordable_at_40k":true,
  "cash_buy_analysis":{
    "affordable":true,
    "total_cost":"€X total all-in",
    "breakdown":{
      "auction_price":"€X (current bid or start price)",
      "aufgeld":"€X (7.14%)",
      "grunderwerbsteuer":"€X (X% for this state)",
      "notar_grundbuch":"€X",
      "renovation_estimate":"€X (clearing/fencing/etc if needed)",
      "total":"€X"
    },
    "remaining_budget":"€X left from €40k",
    "recommendation":"What to do with this property",
    "risks":["risk1","risk2"]
  },
  "summary":"2-3 sentences focusing on cash purchase viability",
  "pros":["pro1","pro2","pro3","pro4"],
  "cons":["con1","con2","con3","con4"],
  "legal_terms":[{"de":"German","en":"English","explanation":"...","status":"OK"}],
  "transport_analysis":{"overall":"good","summary":"...","connections":[{"type":"Train","detail":"...","quality":"good"}]},
  "market_outlook":{"short_term":"...","mid_term":"...","long_term":"..."},
  "major_problems":["..."],
  "investment_opportunities":["..."],
  "key_questions_to_ask":["..."],
  "estimated_true_value":"€X-€Y reasoning",
  "hidden_costs":["cost1","cost2"]
}

Status: "OK","CHECK","WARN". Quality: "good","ok","poor". Scores 1-10. Be realistic about costs.`;
}

export function buildScrapePrompt(targetUrl: string): string {
  return `You are Auction AI, an expert German real estate analyst.

This is a NON-AUCTION property listing. The buyer may use bank financing including Islamic finance (KT Bank).

Analyze listings from any German portal (ImmobilienScout24, Immowelt, Kleinanzeigen, etc.):

1. Extract property details (simulate realistic details if content is blocked):
   - id: Unique string ID from URL
   - lot: File number or generated reference
   - title: English title
   - titleDE: German title
   - addr: Full German address (street, PLZ, city, state)
   - size: Area in m²
   - startPrice: Price in EUR as number
   - type: residential/commercial/land/forest/wine/agri/splitter
   - diiaUrl: The source URL

2. ISLAMIC FINANCE (KT Bank) — for non-auction properties:
   - KT Bank (Kuveyt Türk) offers Sharia-compliant financing in Germany
   - Residential properties €100k-€1M: Usually ELIGIBLE
   - Commercial with ethical use: May be ELIGIBLE
   - Land/forest/wine/pubs/casinos: Usually NOT ELIGIBLE
   - Hamburg, Frankfurt, Berlin, Munich: Best KT Bank coverage
   - Financing: 15-20yr Musharaka or Murabaha, 20-30% down payment

3. Also include cash_buy_score and cash_buy_analysis for comparison (use same €40k budget logic).

4. Full expert analysis with all scores.

CRITICAL: Keep ALL text values (summaries, explanations, pros/cons) EXTREMELY concise (max 1-2 sentences). Do not write long paragraphs or you will exceed the output token limit and break the JSON.

Return ONLY valid JSON:
{
  "property": {
    "id": "...", "lot": "...", "title": "...", "titleDE": "...",
    "addr": "...", "size": "...", "startPrice": 250000,
    "type": "residential", "diiaUrl": "${targetUrl}"
  },
  "analysis": {
    "title_en":"...", "location":"...", "property_type":"...",
    "decision":"BUY", "decision_reason":"max 15 words",
    "investment_score":8.5, "transport_score":7.0, "legal_score":9.0,
    "market_score":8.0,
    "cash_buy_score":2.0,
    "affordable_at_40k":false,
    "cash_buy_analysis":{
      "affordable":false,
      "total_cost":"€X total",
      "breakdown":{
        "auction_price":"N/A (not auction)",
        "aufgeld":"N/A (no Aufgeld for private sale)",
        "grunderwerbsteuer":"€X (X%)",
        "notar_grundbuch":"€X",
        "renovation_estimate":"€X",
        "total":"€X"
      },
      "remaining_budget":"Over budget by €X",
      "recommendation":"Requires bank financing",
      "risks":["Exceeds €40k cash budget"]
    },
    "islamic_finance_score":8.0,
    "islamic_finance_eligible":true,
    "kt_bank_analysis":{
      "eligible":true, "reason":"...",
      "estimated_downpayment":"€X-€Y (20-30%)",
      "financing_structure":"Musharaka or Murabaha",
      "term":"15-20 years",
      "requirements":["Clean title","Valuation","Income verification"],
      "alternatives":["Cordoba Capital","Guidance Residential"]
    },
    "summary":"...", "pros":["..."], "cons":["..."],
    "legal_terms":[{"de":"...","en":"...","explanation":"...","status":"OK"}],
    "transport_analysis":{"overall":"good","summary":"...","connections":[{"type":"S-Bahn","detail":"...","quality":"good"}]},
    "market_outlook":{"short_term":"...","mid_term":"...","long_term":"..."},
    "major_problems":[], "investment_opportunities":["..."],
    "key_questions_to_ask":["..."],
    "estimated_true_value":"€X-€Y reasoning",
    "hidden_costs":["3.5-6.5% Grunderwerbsteuer","Notar 1.5-2%","Makler 3-6%"]
  }
}`;
}

import type { SearchQuery, SourceKey } from './types';

export function buildSearchPrompt(query: SearchQuery): string {
  const sourceLabels: Record<SourceKey, string> = {
    kleinanzeigen: 'Kleinanzeigen.de',
    immoscout24: 'ImmobilienScout24.de',
    immowelt: 'Immowelt.de',
    immonet: 'Immonet.de',
    ebay_immobilien: 'eBay Kleinanzeigen Immobilien',
    diia: 'DIIA.de (auction)',
    zvg: 'ZVG-Portal.de (auction)',
    ndga: 'NDGA.de (auction)',
  };

  const selectedSources = query.sources.map(s => sourceLabels[s]).join(', ');
  const typeLabel = {
    apartment: 'Wohnung (apartment)',
    house: 'Haus (house)',
    villa: 'Villa',
    land: 'Grundstück (land)',
    any: 'any residential property',
  }[query.propertyType];

  const roomsText = query.rooms ? `, ${query.rooms}+ rooms` : '';
  const sizeText = query.sizeMin ? `, min ${query.sizeMin}m²` : '';

  return `You are a German real estate search aggregator. Generate realistic property listings matching these criteria.

Sources to search: ${selectedSources}

SEARCH CRITERIA:
- Location: ${query.location}
- Property type: ${typeLabel}
- Budget: €${query.budgetMin.toLocaleString()} – €${query.budgetMax.toLocaleString()}${roomsText}${sizeText}

Generate 8–12 REALISTIC German property listings matching these criteria. Base results on typical listings found on German property portals. Include realistic:
- Real German street addresses with correct PLZ for ${query.location}
- Market-accurate prices for the location and property type
- Typical sizes, room counts, construction years for the area
- Mix of deals: good value, average, and slightly overpriced

AUCTION properties (DIIA/ZVG/NDGA): Include lot number, Verkehrswert (assessed value), auction platform info.
REGULAR properties: Include energy rating, construction year, monthly costs (Hausgeld), condition.

Return ONLY a valid JSON array — no markdown, no extra text:
[
  {
    "id": "unique-slug-id",
    "title": "English property title",
    "addr": "Musterstraße 12, 22301 Hamburg-Winterhude",
    "price": 285000,
    "priceLabel": "€285,000",
    "size": "78 m²",
    "rooms": 3,
    "propertyType": "apartment",
    "source": "kleinanzeigen",
    "sourceLabel": "Kleinanzeigen",
    "url": "https://www.kleinanzeigen.de/s-anzeige/wohnung-hamburg-winterhude/2891234567-208-9502",
    "isAuction": false,
    "description": "Bright south-facing apartment, renovated kitchen, parquet floors, balcony. Near U-Bahn.",
    "features": ["Balcony", "Fitted kitchen", "Parquet floors", "Elevator"],
    "energyRating": "B",
    "constructionYear": "1998",
    "postedAt": "2 days ago"
  }
]

Distribute listings across the selected sources. For auction sources use isAuction: true. Make all prices realistic for ${query.location}.`;
}

export function buildDeepAnalysisPrompt(isAuction: boolean): string {
  if (isAuction) {
    return buildAnalysisPrompt();
  }
  return `You are PropClear, an expert German real estate analyst for personal home buyers.

Analyze this property for someone buying their primary residence. Assess liveability, commute, neighbourhood quality, and investment potential. Bank financing including KT Bank Islamic finance is available.

Return ONLY valid JSON (no markdown):
{
  "title_en":"...", "location":"...", "property_type":"...",
  "decision":"BUY|CAUTION|AVOID", "decision_reason":"max 15 words",
  "investment_score":7.5, "transport_score":7.0, "legal_score":8.0, "market_score":7.5,
  "cash_buy_score":3.0, "affordable_at_40k":false,
  "cash_buy_analysis":{
    "affordable":false,"total_cost":"Over €40k cash budget",
    "breakdown":{"auction_price":"N/A","aufgeld":"N/A","grunderwerbsteuer":"€X","notar_grundbuch":"€X","renovation_estimate":"€X","total":"€X"},
    "remaining_budget":"Bank financing required",
    "recommendation":"Use mortgage or Islamic finance","risks":["Requires bank financing"]
  },
  "islamic_finance_score":8.0, "islamic_finance_eligible":true,
  "kt_bank_analysis":{
    "eligible":true,"reason":"Residential in eligible city",
    "estimated_downpayment":"€X–€Y (20–30%)","financing_structure":"Musharaka","term":"20 years",
    "requirements":["Income proof","Property valuation","Clean Schufa"],
    "alternatives":["Cordoba Capital Frankfurt","Guidance Residential Germany"]
  },
  "liveability_score":8.0,
  "neighbourhood_quality":"Description of the neighbourhood",
  "commute_assessment":"Commute to city centre estimate",
  "monthly_costs_estimate":"€X/month total",
  "summary":"2-3 sentences for a home buyer",
  "pros":["..."], "cons":["..."],
  "legal_terms":[{"de":"...","en":"...","explanation":"...","status":"OK"}],
  "transport_analysis":{"overall":"good","summary":"...","connections":[{"type":"S-Bahn","detail":"...","quality":"good"}]},
  "market_outlook":{"short_term":"...","mid_term":"...","long_term":"..."},
  "major_problems":[], "investment_opportunities":["..."],
  "key_questions_to_ask":["..."],
  "estimated_true_value":"€X–€Y",
  "hidden_costs":["Grunderwerbsteuer 3.5–6.5%","Notar 1.5–2%","Makler 3–6% if applicable"]
}
Scores 1–10. Be specific about the neighbourhood and transport links.`;
}
