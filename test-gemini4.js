const fs = require('fs');

async function test() {
  const url = "https://www.kleinanzeigen.de/s-anzeige/auf-parkaehnlichem-grundstueck-repraesentative-villa-in-bestlage-/3379022918-208-9502";
  
  let scrapedContent = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();
    scrapedContent = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  } catch (e) {
    console.log("Fetch failed", e);
  }

  const systemPrompt = `You are Auction AI, an expert German real estate analyst.

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
    "type": "residential", "diiaUrl": "${url}"
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

  const userMsg = `Site Type: KLEINANZEIGEN\nURL: ${url}\n\nScraped Content:\n${scrapedContent.slice(0, 20000)}\n\nExtract property details and provide comprehensive analysis including Islamic finance eligibility (KT Bank).`;

  const resp = await fetch('https://auction-ai-proxy.mhasnainn.workers.dev/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: systemPrompt, userMessage: userMsg })
  });

  const text = await resp.text();
  fs.writeFileSync('proxy_raw4.txt', text);
  
  try {
    const data = JSON.parse(text);
    const geminiText = data.text;
    
    const cleaned = geminiText.replace(/```json|```/g, '').trim();
    const si = cleaned.indexOf('{');
    const ei = cleaned.lastIndexOf('}');
    const jsonStr = cleaned.slice(si, ei + 1);
    
    fs.writeFileSync('proxy_json4.txt', jsonStr);
    JSON.parse(jsonStr);
    console.log("JSON parsed successfully");
  } catch (e) {
    console.log("JSON parse error:", e.message);
  }
}
test();
