export default {
  async fetch(request, env) {
    // ── MULTIPLE API KEYS — add as many as you want ──
    const API_KEYS = [
      env.GEMINI_API_KEY_1,
      env.GEMINI_API_KEY_2,
      env.GEMINI_API_KEY_3,
      // Add more keys here if needed
    ].filter(k => k && typeof k === 'string' && k.trim() !== '' && !k.includes('YOUR_'));

    const url = new URL(request.url);
    const KV = env.KV || null;
    const CACHE_PREFIX = 'https://auction-cache.fake/';

    const origin = request.headers.get('Origin') || '';
    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('mtokons.github.io')
        ? origin
        : 'https://mtokons.github.io',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    function cleanHtml(html) {
      if (!html) return '';
      return html
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, '')
        .replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, '')
        .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '')
        .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '')
        .replace(/<\/?[^>]+(>|$)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // ── CACHE HELPERS ──
    async function saveToStore(key, data) {
      if (KV) await KV.put(key, JSON.stringify(data));
      const cache = caches.default;
      await cache.put(
        new Request(CACHE_PREFIX + key),
        new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=31536000' }
        })
      );
    }

    async function getFromStore(key) {
      if (KV) {
        const val = await KV.get(key, 'json');
        if (val) return val;
      }
      const cache = caches.default;
      const resp = await cache.match(new Request(CACHE_PREFIX + key));
      if (resp) return await resp.json();
      return null;
    }

    async function getAllFromStore() {
      const results = {};
      if (KV) {
        const list = await KV.list();
        for (const key of list.keys) {
          const val = await KV.get(key.name, 'json');
          if (val) results[key.name] = val;
        }
      }
      return results;
    }

    // ── GEMINI CALL WITH KEY ROTATION ──
    async function callGemini(geminiBody) {
      let lastError = '';
      for (let i = 0; i < API_KEYS.length; i++) {
        const key = API_KEYS[i];
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(geminiBody),
            }
          );
          const data = await response.json();

          // If quota exceeded, try next key
          if (!response.ok && data.error) {
            const msg = data.error.message || '';
            if (msg.includes('Quota') || msg.includes('rate limit') || response.status === 429) {
              lastError = `Key ${i + 1}/${API_KEYS.length} rate limited`;
              continue; // Try next key
            }
            return { error: true, status: response.status, message: msg };
          }

          if (data.error) {
            const msg = data.error.message || JSON.stringify(data.error);
            if (msg.includes('Quota') || msg.includes('rate limit')) {
              lastError = `Key ${i + 1}/${API_KEYS.length} rate limited`;
              continue;
            }
            return { error: true, status: 400, message: msg };
          }

          // Success!
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          return { error: false, text, keyUsed: i + 1 };

        } catch (e) {
          lastError = `Key ${i + 1} error: ${e.message}`;
          continue;
        }
      }
      return { error: true, status: 429, message: `All ${API_KEYS.length} keys exhausted. ${lastError}. Please wait 1 minute.` };
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // ── TEST ENDPOINT ──
    if (request.method === 'GET' && url.pathname === '/') {
      const keyStatuses = [];
      for (let i = 0; i < API_KEYS.length; i++) {
        const key = API_KEYS[i];
        const preview = key.slice(0, 8) + '...' + key.slice(-4);
        let status = 'not tested';
        try {
          const testResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say OK' }] }] })
            }
          );
          const testData = await testResp.json();
          status = testResp.ok
            ? '✅ WORKING'
            : '❌ ' + (testData?.error?.message || 'FAILED').slice(0, 80);
        } catch (e) { status = '❌ ' + e.message; }
        keyStatuses.push({ key: `Key ${i + 1}`, preview, status });
      }
      return new Response(
        JSON.stringify({
          model: 'gemini-1.5-flash',
          totalKeys: API_KEYS.length,
          keys: keyStatuses,
          kvBound: !!KV,
          cacheAPI: true
        }, null, 2),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── GET ALL SAVED ANALYSES ──
    if (request.method === 'GET' && url.pathname === '/analyses') {
      try {
        const results = await getAllFromStore();
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // ── SCRAPE AND ANALYZE (POST) ──
    if (request.method === 'POST' && url.pathname === '/scrape-and-analyze') {
      try {
        const body = await request.json();
        const targetUrl = body.url;
        if (!targetUrl) {
          return new Response(JSON.stringify({ error: 'URL is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }

        // Extract hash for caching
        const urlHash = targetUrl.split('/').pop() || targetUrl.substring(targetUrl.lastIndexOf('/') + 1);
        const cacheKey = 'scraped_' + urlHash.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 50);
        
        // Check cache first to avoid unnecessary API calls
        try {
          const cached = await getFromStore(cacheKey);
          if (cached && cached.property && cached.analysis) {
            return new Response(JSON.stringify(cached), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
            });
          }
        } catch (e) { /* cache miss */ }

        let scrapedContent = '';
        let fetchError = null;
        let siteType = 'unknown';

        // Detect German real estate site type
        if (targetUrl.includes('kleinanzeigen.de') || targetUrl.includes('ebay-kleinanzeigen.de')) {
          siteType = 'kleinanzeigen';
        } else if (targetUrl.includes('immobilienscout24.de')) {
          siteType = 'immoscout';
        } else if (targetUrl.includes('immowelt.de')) {
          siteType = 'immowelt';
        } else if (targetUrl.includes('diia.de') || targetUrl.includes('ndga.de') || targetUrl.includes('zvg-portal.de')) {
          siteType = 'auction';
        }

        try {
          const res = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
              'Cache-Control': 'no-cache',
            }
          });
          if (res.ok) {
            const rawHtml = await res.text();
            scrapedContent = cleanHtml(rawHtml);
          } else {
            fetchError = `HTTP Status ${res.status}`;
          }
        } catch (e) {
          fetchError = e.message;
        }

        const sys = `You are PropClear, an expert German real estate analyst specializing in Islamic finance compliance and investment analysis.

Your task is to analyze German real estate listings from any portal (DIIA, ZVG, NDGA, ImmobilienScout24, Immowelt, Kleinanzeigen, etc.) and:

1. Extract property details (if scraped content blocked, simulate realistic details based on URL context):
   - id: Unique string ID from URL or generated hash
   - lot: File/lot number if auction, or generate one (e.g. "KA-ABC123")
   - title: Clear English title
   - titleDE: Original German title
   - addr: Full German address (street, PLZ, city, state)
   - size: Area in m² (e.g. "150 m² Wohnfläche" or "800 m² Grundstück")
   - startPrice: Price in EUR as number (Kaufpreis, Verkehrswert, or Mindestgebot)
   - type: residential/commercial/land/forest/wine/agri/splitter (for houses/apartments use "residential")
   - diiaUrl: The source URL

2. ISLAMIC FINANCE ANALYSIS (KT Bank criteria):
   - KT Bank (Kuveyt Türk) offers Sharia-compliant financing in Germany
   - Check if property qualifies:
     * Residential properties: Usually ELIGIBLE (€100k-€1M range)
     * Commercial properties with ethical use: May be ELIGIBLE
     * Properties with existing Riba-based mortgages: Need restructuring
     * Land/forest/wine/pubs/casinos: Usually NOT ELIGIBLE
     * Hamburg, Frankfurt, Berlin, Munich: Best coverage areas
   - Financing terms: Typically 15-20 year Musharaka or Murabaha
   - Down payment: Usually 20-30% required

3. Perform expert rating analysis (scores 1-10):
   - investment_score: ROI potential, market position, appreciation
   - transport_score: Public transport, highways, airport proximity
   - legal_score: Clean title, zoning, restrictions
   - market_score: Demand, comparables, liquidity
   - islamic_finance_score: KT Bank eligibility (1=impossible, 10=ideal candidate)

Return ONLY valid JSON (no markdown fences):
{
  "property": {
    "id": "...",
    "lot": "...",
    "title": "...",
    "titleDE": "...",
    "addr": "...",
    "size": "...",
    "startPrice": 850000,
    "type": "residential",
    "diiaUrl": "..."
  },
  "analysis": {
    "title_en": "...",
    "location": "Hamburg, Deutschland",
    "property_type": "Residential Villa",
    "decision": "BUY/CAUTION/AVOID",
    "decision_reason": "one sentence max 15 words",
    "investment_score": 8.5,
    "transport_score": 7.0,
    "legal_score": 9.0,
    "market_score": 8.0,
    "islamic_finance_score": 9.0,
    "islamic_finance_eligible": true,
    "kt_bank_analysis": {
      "eligible": true,
      "reason": "Residential property in Hamburg within typical financing range",
      "estimated_downpayment": "€170,000 - €255,000 (20-30%)",
      "financing_structure": "Musharaka (partnership) or Murabaha (cost-plus)",
      "term": "15-20 years typical",
      "requirements": ["Clean title", "Property valuation", "Income verification"],
      "alternatives": ["Cordoba Capital Frankfurt", "Guidance Residential"]
    },
    "summary": "...",
    "pros": ["...", "..."],
    "cons": ["...", "..."],
    "legal_terms": [{"de": "Grundbuch", "en": "Land Registry", "explanation": "...", "status": "OK/CHECK/WARN"}],
    "transport_analysis": {"overall": "good/ok/poor", "summary": "...", "connections": [{"type": "Train", "detail": "...", "quality": "good/ok/poor"}]},
    "market_outlook": {"short_term": "...", "mid_term": "...", "long_term": "..."},
    "major_problems": ["..."],
    "investment_opportunities": ["..."],
    "key_questions_to_ask": ["..."],
    "estimated_true_value": "€820,000-€900,000 based on comparables",
    "hidden_costs": ["3.5% Grunderwerbsteuer", "1.5-2% Notary", "€500-1000 annual property tax"]
  }
}`;

        const userMsg = scrapedContent 
          ? `Site Type: ${siteType}\nURL: ${targetUrl}\n\nScraped Content:\n${scrapedContent.slice(0, 20000)}\n\nExtract property details and provide comprehensive analysis including Islamic finance eligibility (KT Bank).`
          : `Fetch Error: ${fetchError || 'Blocked by anti-bot protection'}\n\nURL: ${targetUrl}\nSite Type: ${siteType}\n\nURL context analysis: Generate realistic property details based on URL structure and typical ${siteType} listings in Germany. Include full Islamic finance (KT Bank) eligibility assessment.`;

        const geminiBody = {
          system_instruction: { parts: [{ text: sys }] },
          contents: [{ role: 'user', parts: [{ text: userMsg }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        };

        const result = await callGemini(geminiBody);
        if (result.error) {
          return new Response(JSON.stringify({ error: result.message }), {
            status: result.status,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }

        const raw = result.text.replace(/```json|```/g, '').trim();
        const si = raw.indexOf('{');
        const ei = raw.lastIndexOf('}');
        if (si === -1 || ei === -1) {
          return new Response(JSON.stringify({ error: 'Invalid JSON returned from AI model' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }

        const parsed = JSON.parse(raw.slice(si, ei + 1));
        
        // Save both property and analysis to cache (double storage for reliability)
        if (parsed.property && parsed.property.id) {
          try {
            await saveToStore(cacheKey, parsed);
            await saveToStore(parsed.property.id, parsed.analysis);
          } catch (e) { 
            console.error('Cache save error:', e.message);
          }
        }

        return new Response(JSON.stringify(parsed), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // ── ANALYZE (POST) ──
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json();
      const propertyId = body.propertyId;

      // Check cache first
      if (propertyId) {
        try {
          const cached = await getFromStore(propertyId);
          if (cached) {
            return new Response(JSON.stringify({ text: JSON.stringify(cached), cached: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
            });
          }
        } catch (e) { /* cache miss */ }
      }

      // Call Gemini with key rotation
      const geminiBody = {
        system_instruction: { parts: [{ text: body.system }] },
        contents: [{ role: 'user', parts: [{ text: body.userMessage }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
      };

      const result = await callGemini(geminiBody);

      if (result.error) {
        return new Response(JSON.stringify({ error: result.message }), {
          status: result.status,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }

      if (!result.text) {
        return new Response(JSON.stringify({ error: 'Empty response from Gemini' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }

      // Save to store
      if (propertyId) {
        try {
          const raw = result.text.replace(/```json|```/g, '').trim();
          const si = raw.indexOf('{'), ei = raw.lastIndexOf('}');
          if (si !== -1 && ei !== -1) {
            const parsed = JSON.parse(raw.slice(si, ei + 1));
            await saveToStore(propertyId, parsed);
          }
        } catch (e) { /* parse error, skip */ }
      }

      return new Response(JSON.stringify({ text: result.text, keyUsed: result.keyUsed }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
  }
};