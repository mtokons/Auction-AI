import { NextRequest, NextResponse } from 'next/server';
import {
  callGemini,
  extractJSON,
  cleanHtml,
  detectSiteType,
  getCached,
  setCache,
} from '@/lib/gemini';
import { buildScrapePrompt } from '@/lib/prompts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const targetUrl: string | undefined = body.url;

    if (!targetUrl) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Build a stable cache key from URL
    const urlSlug = targetUrl
      .split('/')
      .pop()
      ?.replace(/[^a-zA-Z0-9-]/g, '')
      .substring(0, 50) || 'unknown';
    const cacheKey = `scrape_${urlSlug}`;

    // Check server cache first
    const cached = getCached(cacheKey);
    if (cached) {
      try {
        return NextResponse.json(JSON.parse(cached));
      } catch {
        /* cache miss / corrupt */
      }
    }

    const siteType = detectSiteType(targetUrl);

    // Attempt to fetch the page
    let scrapedContent = '';
    let fetchError: string | null = null;

    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
        },
      });

      if (res.ok) {
        const rawHtml = await res.text();
        scrapedContent = cleanHtml(rawHtml);
      } else {
        fetchError = `HTTP ${res.status}`;
      }
    } catch (e) {
      fetchError = (e as Error).message;
    }

    const systemPrompt = buildScrapePrompt(targetUrl);

    const userMsg = scrapedContent
      ? `Site Type: ${siteType}\nURL: ${targetUrl}\n\nScraped Content:\n${scrapedContent.slice(0, 20000)}\n\nExtract property details and provide comprehensive analysis including Islamic finance eligibility (KT Bank).`
      : `Fetch Error: ${fetchError || 'Blocked by anti-bot protection'}\n\nURL: ${targetUrl}\nSite Type: ${siteType}\n\nGenerate realistic property details based on URL structure and typical ${siteType} listings in Germany. Include full Islamic finance (KT Bank) eligibility assessment.`;

    const result = await callGemini(systemPrompt, userMsg);

    if (result.error) {
      return NextResponse.json(
        { error: result.message },
        { status: result.status || 500 },
      );
    }

    const jsonStr = extractJSON(result.text || '');
    if (!jsonStr) {
      return NextResponse.json(
        { error: 'Invalid JSON returned from AI' },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(jsonStr);

    if (parsed.property && !parsed.property.diiaUrl) {
      parsed.property.diiaUrl = targetUrl;
    }

    // Cache the full result
    setCache(cacheKey, JSON.stringify(parsed));
    if (parsed.property?.id) {
      setCache(parsed.property.id, JSON.stringify(parsed.analysis));
    }

    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
