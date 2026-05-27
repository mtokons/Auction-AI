// ── Gemini AI client with key rotation ──

const getApiKeys = (): string[] =>
  [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter((k): k is string => !!k && k.trim() !== '' && !k.includes('YOUR_'));

// Simple in-memory cache (per server instance)
const serverCache = new Map<string, string>();

export function getCached(key: string): string | null {
  return serverCache.get(key) ?? null;
}

export function setCache(key: string, value: string): void {
  serverCache.set(key, value);
}

interface GeminiResult {
  error: boolean;
  text?: string;
  status?: number;
  message?: string;
  keyUsed?: number;
}

export async function callGemini(
  systemPrompt: string,
  userMessage: string,
): Promise<GeminiResult> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    return { error: true, status: 500, message: 'No Gemini API keys configured' };
  }

  let lastError = '';

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok && data.error) {
        const msg = data.error.message || '';
        if (msg.includes('Quota') || msg.includes('rate limit') || response.status === 429) {
          lastError = `Key ${i + 1}/${keys.length} rate limited`;
          continue;
        }
        return { error: true, status: response.status, message: msg };
      }

      if (data.error) {
        const msg = data.error.message || JSON.stringify(data.error);
        if (msg.includes('Quota') || msg.includes('rate limit')) {
          lastError = `Key ${i + 1}/${keys.length} rate limited`;
          continue;
        }
        return { error: true, status: 400, message: msg };
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { error: false, text, keyUsed: i + 1 };
    } catch (e) {
      lastError = `Key ${i + 1} error: ${(e as Error).message}`;
      continue;
    }
  }

  return {
    error: true,
    status: 429,
    message: `All ${keys.length} keys exhausted. ${lastError}. Please wait 1 minute.`,
  };
}

export function extractJSON(raw: string): string | null {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const si = cleaned.indexOf('{');
  const ei = cleaned.lastIndexOf('}');
  if (si === -1 || ei === -1) return null;
  return cleaned.slice(si, ei + 1);
}

export function cleanHtml(html: string): string {
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

export function detectSiteType(url: string): string {
  if (url.includes('kleinanzeigen.de') || url.includes('ebay-kleinanzeigen.de')) return 'kleinanzeigen';
  if (url.includes('immobilienscout24.de')) return 'immoscout';
  if (url.includes('immowelt.de')) return 'immowelt';
  if (url.includes('diia.de') || url.includes('ndga.de') || url.includes('zvg-portal.de')) return 'auction';
  return 'unknown';
}
