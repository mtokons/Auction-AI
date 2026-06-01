export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runSync(env));
  },

  async fetch(request, env, ctx) {
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
          // Skip array lists keys
          if (key.name === 'active_listings' || key.name === 'archived_listings') continue;
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

    // ── LISTINGS ENDPOINT ──
    if (request.method === 'GET' && url.pathname === '/listings') {
      let active = [];
      if (KV) {
        active = await KV.get('active_listings', 'json') || [];
      }
      if (active.length === 0) {
        // Fallback to static properties to ensure page loads with sample listings
        active = DEFAULT_PROPERTIES_SEED;
      }
      return new Response(JSON.stringify(active), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    // ── ARCHIVE ENDPOINT ──
    if (request.method === 'GET' && url.pathname === '/archive') {
      let archived = [];
      if (KV) {
        archived = await KV.get('archived_listings', 'json') || [];
      }
      return new Response(JSON.stringify(archived), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    // ── TRIGGER MANUAL SYNC ──
    if (request.method === 'GET' && url.pathname === '/sync') {
      if (!KV) {
        return new Response(JSON.stringify({ error: 'KV store is not bound' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
      ctx.waitUntil(runSync(env));
      return new Response(JSON.stringify({ message: 'Periodical sync triggered in background' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
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

        const sys = `You are Auction AI, an expert German real estate analyst specializing in Islamic finance compliance and investment analysis.

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

            // Also dynamically add it to active listings if not present
            if (KV) {
              let active = await KV.get('active_listings', 'json') || [];
              if (!active.some(p => p.id === parsed.property.id)) {
                active.push({
                  id: parsed.property.id,
                  lot: parsed.property.lot || 'CUSTOM',
                  title: parsed.property.title,
                  titleDE: parsed.property.titleDE || parsed.property.title,
                  addr: parsed.property.addr || '',
                  size: parsed.property.size || '',
                  startPrice: parsed.property.startPrice || 0,
                  highBid: null,
                  bids: 0,
                  type: parsed.property.type || 'residential',
                  diiaUrl: parsed.property.diiaUrl || targetUrl,
                  isAuction: false
                });
                await KV.put('active_listings', JSON.stringify(active));
              }
            }
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

// ── PERIODICAL SYNCHRONIZER ──
async function runSync(env) {
  const KV = env.KV;
  if (!KV) {
    console.error('KV store is missing. Cannot perform sync.');
    return { success: false, error: 'KV missing' };
  }

  console.log('--- Nightly DIIA Sync Started ---');
  let diiaActiveIds = [];
  let scrapeSuccess = false;

  try {
    const res = await fetch('https://www.diia.de/?thema=auctions', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8'
      }
    });
    if (res.ok) {
      const html1 = await res.text();
      const cookies = res.headers.getSetCookie 
        ? res.headers.getSetCookie().join('; ')
        : (res.headers.get('set-cookie') || '');
      
      // Extract CSRF token
      const csrfMatch = html1.match(/name="csrfToken"\s+value="([^"]+)"/);
      const csrfToken = csrfMatch ? csrfMatch[1] : '';
      
      const ids = new Set();
      const regex = /loadObjectId=(\d+)/g;
      let match;
      while ((match = regex.exec(html1)) !== null) {
        ids.add(match[1]);
      }
      
      // Fetch next pages using offset pagination (offset 20 and 40)
      const offsets = [20, 40];
      for (const offset of offsets) {
        try {
          const postRes = await fetch('https://www.diia.de/?thema=auctions', {
            method: 'POST',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8',
              'Cookie': cookies,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `csrfToken=${encodeURIComponent(csrfToken)}&sectionsObjectListRunning_estate%3A%3ApagerOffset=${offset}`
          });
          if (postRes.ok) {
            const htmlOffset = await postRes.text();
            let offsetMatch;
            regex.lastIndex = 0; // Reset regex
            while ((offsetMatch = regex.exec(htmlOffset)) !== null) {
              ids.add(offsetMatch[1]);
            }
          }
        } catch (postErr) {
          console.error(`Failed to scrape offset ${offset}:`, postErr.message);
        }
      }
      
      diiaActiveIds = Array.from(ids);
      scrapeSuccess = diiaActiveIds.length > 0;
      console.log(`Scraped DIIA Active IDs (Across All Pages): ${diiaActiveIds.length}`);
    } else {
      console.error(`DIIA index scrape failed with status ${res.status}`);
    }
  } catch (e) {
    console.error('Failed to scrape DIIA active list:', e.message);
  }


  // Load existing lists from KV
  let active = await KV.get('active_listings', 'json') || [];
  let archived = await KV.get('archived_listings', 'json') || [];

  // Seed default properties if KV is empty to ensure smooth initial launch
  if (active.length === 0 && archived.length === 0) {
    console.log('Seeding default listings list in KV database');
    active = DEFAULT_PROPERTIES_SEED;
  }

  // Identify new properties (IDs from scrape not in active or archived)
  const newIds = diiaActiveIds.filter(id => !active.some(p => p.id === id) && !archived.some(p => p.id === id));
  console.log(`New properties to analyze: ${newIds.length}`);

  const addedProperties = [];
  const errors = [];

  for (let i = 0; i < newIds.length; i++) {
    const id = newIds[i];
    const targetUrl = `https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=${id}&loadObjectType=estate`;
    console.log(`[Queue ${i + 1}/${newIds.length}] Fetching new listing: ${targetUrl}`);

    try {
      const detailsRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      if (!detailsRes.ok) {
        errors.push(`Details fetch failed for ${id}: HTTP ${detailsRes.status}`);
        continue;
      }
      const rawHtml = await detailsRes.text();
      
      // Clean HTML
      const cleaned = rawHtml
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, '')
        .replace(/<\/?[^>]+(>|$)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Setup Gemini call
      const sysPrompt = `You are Auction AI, an expert German real estate analyst specializing in Islamic finance compliance and investment analysis.
Analyze the listing and return ONLY valid JSON (no markdown blocks, no formatting fences):
{
  "property": {
    "id": "${id}",
    "lot": "...",
    "title": "...",
    "titleDE": "...",
    "addr": "...",
    "size": "...",
    "startPrice": 10000,
    "type": "residential/land/forest/wine/agri/splitter",
    "diiaUrl": "${targetUrl}"
  },
  "analysis": {
    "title_en": "...",
    "location": "...",
    "property_type": "...",
    "decision": "BUY/CAUTION/AVOID",
    "decision_reason": "one sentence max 15 words",
    "investment_score": 8.0,
    "transport_score": 7.0,
    "legal_score": 9.0,
    "market_score": 8.0,
    "islamic_finance_score": 9.0,
    "islamic_finance_eligible": true,
    "kt_bank_analysis": {
      "eligible": true,
      "reason": "...",
      "estimated_downpayment": "...",
      "financing_structure": "Musharaka or Murabaha",
      "term": "15-20 years typical",
      "requirements": ["Clean title", "Income verification"],
      "alternatives": ["Cordoba Capital"]
    },
    "summary": "...",
    "pros": ["..."],
    "cons": ["..."],
    "legal_terms": [{"de": "Grundbuch", "en": "Land Registry", "explanation": "...", "status": "OK"}],
    "transport_analysis": {"overall": "good", "summary": "...", "connections": []},
    "market_outlook": {"short_term": "...", "mid_term": "...", "long_term": "..."},
    "major_problems": [],
    "investment_opportunities": [],
    "key_questions_to_ask": [],
    "estimated_true_value": "...",
    "hidden_costs": []
  }
}`;

      const userMsg = `Extract details and analyze this listing:\n\n${cleaned.slice(0, 15000)}`;

      // Gemini Key Rotation
      const API_KEYS = [
        env.GEMINI_API_KEY_1,
        env.GEMINI_API_KEY_2,
        env.GEMINI_API_KEY_3,
      ].filter(k => k && typeof k === 'string' && k.trim() !== '' && !k.includes('YOUR_'));

      let geminiText = null;
      let lastErr = '';
      for (const key of API_KEYS) {
        try {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: sysPrompt }] },
                contents: [{ role: 'user', parts: [{ text: userMsg }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
              })
            }
          );
          const data = await resp.json();
          if (resp.ok && !data.error) {
            geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            break;
          } else {
            lastErr = data?.error?.message || 'Error response';
          }
        } catch (e) {
          lastErr = e.message;
        }
      }

      // If gemini-2.0-flash URL failed, fallback to 1.5 URL
      if (!geminiText) {
        for (const key of API_KEYS) {
          try {
            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  system_instruction: { parts: [{ text: sysPrompt }] },
                  contents: [{ role: 'user', parts: [{ text: userMsg }] }],
                  generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
                })
              }
            );
            const data = await resp.json();
            if (resp.ok && !data.error) {
              geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              break;
            } else {
              lastErr = data?.error?.message || 'Error response';
            }
          } catch (e) {
            lastErr = e.message;
          }
        }
      }

      if (!geminiText) {
        errors.push(`Gemini API failed for ${id}: ${lastErr}`);
        continue;
      }

      const raw = geminiText.replace(/```json|```/g, '').trim();
      const si = raw.indexOf('{'), ei = raw.lastIndexOf('}');
      if (si === -1 || ei === -1) {
        errors.push(`Invalid JSON returned from Gemini for ${id}`);
        continue;
      }

      const parsed = JSON.parse(raw.slice(si, ei + 1));
      if (parsed.property && parsed.analysis) {
        // Save analysis to KV
        await KV.put(parsed.property.id, JSON.stringify(parsed.analysis));
        
        // Add listing to active
        const pObj = {
          id: parsed.property.id,
          lot: parsed.property.lot || `DIIA-${id}`,
          title: parsed.property.title,
          titleDE: parsed.property.titleDE || parsed.property.title,
          addr: parsed.property.addr || 'Germany',
          size: parsed.property.size || 'N/A',
          startPrice: parsed.property.startPrice || 0,
          highBid: null,
          bids: 0,
          type: parsed.property.type || 'residential',
          diiaUrl: parsed.property.diiaUrl || targetUrl,
          isAuction: true
        };
        active.push(pObj);
        addedProperties.push(pObj);
        console.log(`[Success] Analyzed & Saved property: ${pObj.title}`);
      }

    } catch (err) {
      console.error(`Error processing ${id}:`, err.message);
      errors.push(`Error on ${id}: ${err.message}`);
    }

    // Comply with free tier limits: 10s sequential pause between tasks
    if (i < newIds.length - 1) {
      console.log('Sleeping 10 seconds to respect Gemini Free Tier API rate limits...');
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  // Archive outdated listings (listings no longer returned by scrape, but were active diia listings)
  if (scrapeSuccess) {
    const diiaListings = active.filter(p => p.diiaUrl && p.diiaUrl.includes('diia.de'));
    const outdated = diiaListings.filter(p => !diiaActiveIds.includes(p.id));

    if (outdated.length > 0) {
      console.log(`Moving ${outdated.length} outdated listings to history archive...`);
      active = active.filter(p => !outdated.some(o => o.id === p.id));
      for (const o of outdated) {
        if (!archived.some(a => a.id === o.id)) {
          archived.push(o);
        }
      }
    }
  }

  // Persist updated listing states back to KV
  await KV.put('active_listings', JSON.stringify(active));
  await KV.put('archived_listings', JSON.stringify(archived));

  console.log(`--- Nightly DIIA Sync Completed. Added: ${addedProperties.length}, Errors: ${errors.length} ---`);
  return { success: true, added: addedProperties.length, errors };
}

// ── DEFAULT PROPERTIES SEED ──
const DEFAULT_PROPERTIES_SEED = [
  {id:"ndga-hh-24",lot:"NDGA-0024",title:"Idyllic residential development plot near the Alster river, Hamburg-Suhrenkamp",titleDE:"Idyllisches Wohnbaugrundstück nahe der Alster, Hamburg-Suhrenkamp",addr:"Suhrenkamp 54, 22335 Hamburg",size:"850 m²",startPrice:120000,highBid:null,bids:0,type:"land",isAuction:true,diiaUrl:"https://www.ndga.de/auktionen/objekt/hamburg-suhrenkamp-24"},
  {id:"zvg-hb-12k",lot:"ZVG-HB-12K",title:"Forested leisure plot with potential for agricultural use, Bremen-Nord (Aumund-Hammersbeck)",titleDE:"Wald- und Freizeitgrundstück mit landwirtschaftlichem Nutzungspotenzial, Bremen-Nord",addr:"Aumunder Feldweg, 28757 Bremen",size:"4,120 m²",startPrice:15000,highBid:null,bids:0,type:"forest",isAuction:true,diiaUrl:"https://www.zvg-portal.de/bremen-aumund-12k"},
  {id:"ndga-hb-42",lot:"NDGA-0042",title:"Agricultural grazing land and pasture in Bremen-Blockland, legally protected landscape area",titleDE:"Landwirtschaftliche Weide- und Grünlandfläche im Bremen-Blockland, Landschaftsschutzgebiet",addr:"Niederblockland 18, 28219 Bremen",size:"15,800 m²",startPrice:35000,highBid:null,bids:0,type:"agri",isAuction:true,diiaUrl:"https://www.ndga.de/auktionen/objekt/bremen-blockland-42"},
  {id:"ndga-hh-12",lot:"NDGA-0012",title:"Commercial splitter plot with overgrown greenery near Hamburg Port boundary",titleDE:"Gewerbliche Splitterfläche mit Wildwuchs nahe der Hamburger Hafengrenze",addr:"Finkenwerder Straße, 21129 Hamburg",size:"1,200 m²",startPrice:8500,highBid:null,bids:0,type:"splitter",isAuction:true,diiaUrl:"https://www.ndga.de/auktionen/objekt/hamburg-finkenwerder-12"},
  {id:"43798",lot:"473-0001",title:"Contract-free, natural plot at the 'Schachtloch' pond in Döllnitz, near Halle (Saale) city border",titleDE:"Vertragsfreies, naturbelassenes Grundstück am Weiher 'Schachtloch' in Döllnitz nahe der Stadtgrenze von Halle (Saale)",addr:"Berliner Straße, 06258 Schkopau OT Döllnitz, Sachsen-Anhalt",size:"1,764 m²",startPrice:9000,highBid:null,bids:0,type:"land",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43798&loadObjectType=estate"},
  {id:"43790",lot:"473-0002",title:"Garden plot with small wooden garden cabin in holiday resort Kleinschmalkalden, Thüringer Wald",titleDE:"Gartengrundstück mit kleinem Holzgartenhäuschen im Erholungsort Kleinschmalkalden im Thüringer Wald",addr:"Ortsstraße 113, 98593 Floh-Seligenthal OT Kleinschmalkalden, Thüringen",size:"260 m²",startPrice:1500,highBid:null,bids:0,type:"land",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43790&loadObjectType=estate"},
  {id:"43800",lot:"473-0003",title:"Large plot next to residential buildings — idyllic location on the edge of the Southern Black Forest, ~30km from Basel",titleDE:"Großes Grundstück neben Wohnbebauung, idyllische Lage am Rande des Südschwarzwaldes, ca. 30 km von Basel entfernt",addr:"Oberdorf (nb. Nr. 15), 79429 Malsburg-Marzell, Baden-Württemberg",size:"3,906 m²",startPrice:4600,highBid:4600,bids:1,type:"land",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43800&loadObjectType=estate"},
  {id:"43826",lot:"473-0004",title:"Contract-free corner plot overgrown with shrubs opposite residential buildings in Märkisch-Oderland district",titleDE:"Vertragsfreies mit Gehölzen bewachsenes Eckgrundstück gegenüber von Wohnbebauung im Landkreis Märkisch-Oderland",addr:"Rudolf-Breitscheid-Straße, 15306 Lindendorf OT Sachsendorf, Brandenburg",size:"2,461 m²",startPrice:2400,highBid:2400,bids:1,type:"land",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43826&loadObjectType=estate"},
  {id:"43828",lot:"473-0005",title:"Plot in the health resort Hinterzarten in the Black Forest, ~27km from Freiburg — contract-free green space",titleDE:"Grundstück im Kurort Hinterzarten im Schwarzwald ca. 27 km von Freiburg (Breisgau) entfernt, vertragsfreie Grünfläche",addr:"Martin-Gremminger-Weg (hinter den Hausnummern 6-12), 79856 Hinterzarten, Baden-Württemberg",size:"3,160 m²",startPrice:11000,highBid:null,bids:0,type:"land",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43828&loadObjectType=estate"},
  {id:"43758",lot:"473-0006",title:"Scattered plots totalling over 2.2 ha in the Altmark region — partially leased until 30 Sept 2029",titleDE:"Splitterflächen in Streulage mit insgesamt über 2,2 ha in der Altmark, teilweise bis 30.09.2029 verpachtet",addr:"29410 Hansestadt Salzwedel OS Chüden OT Ritze, Sachsen-Anhalt",size:"22,072 m²",startPrice:14000,highBid:null,bids:0,type:"agri",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43758&loadObjectType=estate"},
  {id:"43820",lot:"473-0007",title:"Vineyard with 'Dornfelder' grape variety in the 'Kloster Stuben' area — direct from the winemaker",titleDE:"Weinberg mit der Rebsorte 'Dornfelder' im Bereich 'Kloster Stuben', direkt vom Weinbauern",addr:"56814 Bremm (Mosel), Rheinland-Pfalz",size:"1,181 m²",startPrice:1000,highBid:1000,bids:1,type:"wine",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43820&loadObjectType=estate"},
  {id:"43822",lot:"473-0008",title:"Vineyard with 'Phoenix' grape variety in the 'Kloster Stuben' area — direct from the winemaker",titleDE:"Weinberg mit der Rebsorte 'Phoenix' im Bereich 'Kloster Stuben', direkt vom Weinbauern",addr:"56814 Bremm (Mosel), Rheinland-Pfalz",size:"1,189 m²",startPrice:1000,highBid:1400,bids:3,type:"wine",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43822&loadObjectType=estate"},
  {id:"43808",lot:"473-0009",title:"Contract-free forest area above the Mosel river — in the wine village of Zell",titleDE:"Vertragsfreie Waldfläche oberhalb der Mosel, in der Weinbaugemeinde Zell",addr:"Oberhalb der Jakobstraße, 56856 Zell (Mosel), Rheinland-Pfalz",size:"1,657 m²",startPrice:1300,highBid:1300,bids:1,type:"forest",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43808&loadObjectType=estate"},
  {id:"43804",lot:"473-0010",title:"Fallow vineyard in the wine village Wolf on a Mosel river bend, near 'Mühlental' viewpoint",titleDE:"Brachliegende Weinanbaufläche im Weinort Wolf in einer Moselschleife nahe dem 'Aussichtspunkt Mühlental'",addr:"Nahe Faulbrücksweg, 56841 Traben-Trarbach ST Wolf, Rheinland-Pfalz",size:"555 m²",startPrice:300,highBid:300,bids:1,type:"wine",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43804&loadObjectType=estate"},
  {id:"43746",lot:"473-0011",title:"2 forest plots in the 'Klinkumer Busch' woodland area — close to the Dutch border",titleDE:"2 Waldflächen im Waldgebiet 'Klinkumer Busch', unweit der niederländischen Landesgrenze",addr:"41844 Wegberg OT Arsbeck, Nordrhein-Westfalen",size:"3,162 m²",startPrice:2000,highBid:2000,bids:1,type:"forest",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43746&loadObjectType=estate"},
  {id:"43802",lot:"473-0012",title:"½ co-ownership share of a leased agricultural plot northeast of the hamlet of Hetzeberg",titleDE:"1/2 Miteigentumsanteil an einer verpachteten Landwirtschaftsfläche nordöstlich der Kleinsiedlung Hetzeberg",addr:"Verlängerung der Straße 'Hetzeberg', 36469 Bad Salzungen OT Ettenhausen, Thüringen",size:"5,000 m²",startPrice:1800,highBid:null,bids:0,type:"agri",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43802&loadObjectType=estate"},
  {id:"43806",lot:"473-0013",title:"Contract-free grassland with shrub growth on the periphery — Gröbzig, Saxony-Anhalt",titleDE:"Vertragsfreie Grünlandfläche mit Gehölzbewuchs im Randbereich",addr:"L147, 06388 Südliches Anhalt OT Gröbzig, Sachsen-Anhalt",size:"1,503 m²",startPrice:800,highBid:1000,bids:2,type:"land",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43806&loadObjectType=estate"},
  {id:"43792",lot:"473-0014",title:"Strip of land (path + forest) near the ruins of Schauenforst Castle — Thüringen",titleDE:"Grundstücksstreifen (Wege- und Waldfläche) nahe der Burgruine Schauenforst",addr:"07407 Uhlstädt-Kirchhasel OT Engerda, Thüringen",size:"3,460 m²",startPrice:400,highBid:null,bids:0,type:"forest",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43792&loadObjectType=estate"},
  {id:"43796",lot:"473-0015",title:"Scattered plots (paths, green areas, forest) — partly near the Bavarian state border, Thüringen",titleDE:"Splitterflächen (Wege-, Grün- und Waldflächen) in Streulage, teilweise nahe der Bayerischen Landesgrenze",addr:"98673 Eisfeld OT Heid und 98666 Masserberg, Thüringen",size:"1,094 m²",startPrice:300,highBid:null,bids:0,type:"splitter",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43796&loadObjectType=estate"},
  {id:"43830",lot:"473-0016",title:"Small strip of forest in the 'Dübener Heide' nature area — Saxony-Anhalt",titleDE:"Kleiner Waldstreifen in der 'Dübener Heide'",addr:"L129, 06905 Bad Schmiedeberg OS Priesitz, Sachsen-Anhalt",size:"644 m²",startPrice:150,highBid:300,bids:4,type:"forest",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43830&loadObjectType=estate"},
  {id:"43810",lot:"473-0017",title:"Natural shrub-land plot along federal road B48 — Winnweiler, Rhineland-Palatinate",titleDE:"Naturbelassene Gehölzfläche an der B48",addr:"B48, 67722 Winnweiler, Rheinland-Pfalz",size:"2,541 m²",startPrice:100,highBid:null,bids:0,type:"land",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43810&loadObjectType=estate"},
  {id:"43812",lot:"473-0018",title:"Grassland with shrub growth in Winnweiler — near B48",titleDE:"Grünlandfläche mit Gehölzbewuchs in Winnweiler",addr:"Nahe B48, 67722 Winnweiler, Rheinland-Pfalz",size:"337 m²",startPrice:10,highBid:10,bids:1,type:"land",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43812&loadObjectType=estate"},
  {id:"43814",lot:"473-0019",title:"Contract-free shrub plot on a hillside in Winnweiler, Northern Palatinate Highlands",titleDE:"Vertragsfreie Gehölzfläche in Hanglage in Winnweiler im Nordpfälzer Bergland",addr:"Nahe Alsenzstraße, 67722 Winnweiler, Rheinland-Pfalz",size:"666 m²",startPrice:20,highBid:null,bids:0,type:"land",isAuction:true,diiaUrl:"https://www.diia.de/?thema=auctions&page=auctionObjectDetail&loadObjectId=43814&loadObjectType=estate"},
];