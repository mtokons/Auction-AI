export default {
  async fetch(request, env) {
    // ── MULTIPLE API KEYS — add as many as you want ──
    const API_KEYS = [
      env.GEMINI_API_KEY_1 || 'AIzaSyDwpq2jHdv_sSPkWjLYxdEvra5kjFrNGWo',
      env.GEMINI_API_KEY_2 || 'AIzaSyAcgtBHfsi_V7LTA32p3Uomdvzr6YeYmIQ',
      env.GEMINI_API_KEY_3 || 'AIzaSyBu63zmT_m5fjLlzWmLtvfgFBaJNQc3O6M',
      // Add more keys here if needed
    ].filter(k => k && !k.includes('YOUR_'));

    const url = new URL(request.url);
    const KV = env.KV || null;
    const CACHE_PREFIX = 'https://auction-cache.fake/';

    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': 'https://mtokons.github.io',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

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
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
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
            if (msg.includes('Quota') || msg.includes('rate') || response.status === 429) {
              lastError = `Key ${i + 1}/${API_KEYS.length} rate limited`;
              continue; // Try next key
            }
            return { error: true, status: response.status, message: msg };
          }

          if (data.error) {
            const msg = data.error.message || JSON.stringify(data.error);
            if (msg.includes('Quota') || msg.includes('rate')) {
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
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
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
          model: 'gemini-2.5-flash',
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