import { NextRequest, NextResponse } from 'next/server';
import { callGemini, extractJSON, getCached, setCache } from '@/lib/gemini';
import { buildSearchPrompt } from '@/lib/prompts';
import type { SearchQuery, SearchListing } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query: SearchQuery = body.query;

    if (!query?.location) {
      return NextResponse.json({ error: 'Search query with location is required' }, { status: 400 });
    }

    // Cache key from query fingerprint
    const cacheKey = `search_${query.location}_${query.propertyType}_${query.budgetMin}_${query.budgetMax}_${query.sources.sort().join(',')}`;
    const cached = getCached(cacheKey);
    if (cached) {
      try {
        return NextResponse.json({ listings: JSON.parse(cached), cached: true });
      } catch { /* stale */ }
    }

    const systemPrompt = `You are a German real estate data aggregator. You generate realistic German property listings based on search criteria. Always return valid JSON arrays only — no markdown, no explanations.`;

    const userMessage = buildSearchPrompt(query);
    const result = await callGemini(systemPrompt, userMessage);

    if (result.error || !result.text) {
      return NextResponse.json({ error: result.message || 'AI search failed' }, { status: 502 });
    }

    // Extract JSON array from response
    const raw = (result.text || '').replace(/```json|```/g, '').trim();
    const si = raw.indexOf('[');
    const ei = raw.lastIndexOf(']');
    if (si === -1 || ei === -1) {
      return NextResponse.json({ error: 'Could not parse search results' }, { status: 502 });
    }

    let listings: SearchListing[];
    try {
      listings = JSON.parse(raw.slice(si, ei + 1));
    } catch {
      return NextResponse.json({ error: 'Invalid JSON from AI search' }, { status: 502 });
    }

    // Validate and sanitize listings
    listings = listings
      .filter((l): l is SearchListing => !!l && typeof l.title === 'string')
      .map((l, i) => ({
        ...l,
        id: l.id || `search-${Date.now()}-${i}`,
        price: Number(l.price) || 0,
        isAuction: Boolean(l.isAuction),
        features: Array.isArray(l.features) ? l.features : [],
        source: l.source || query.sources[i % query.sources.length],
      }));

    setCache(cacheKey, JSON.stringify(listings));
    return NextResponse.json({ listings, cached: false });

  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
