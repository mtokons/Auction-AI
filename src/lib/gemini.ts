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
  try {
    const response = await fetch('https://auction-ai-proxy.mhasnainn.workers.dev/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: systemPrompt, userMessage }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      return { error: true, status: response.status, message: data.error || 'Proxy error' };
    }

    return { error: false, text: data.text, keyUsed: data.keyUsed };
  } catch (e) {
    return { error: true, status: 500, message: (e as Error).message };
  }
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
