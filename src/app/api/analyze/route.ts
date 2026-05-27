import { NextRequest, NextResponse } from 'next/server';
import { callGemini, extractJSON, getCached, setCache } from '@/lib/gemini';
import { buildAnalysisPrompt } from '@/lib/prompts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, userMessage } = body;

    // Check server cache
    if (propertyId) {
      const cached = getCached(propertyId);
      if (cached) {
        return NextResponse.json({ text: cached, cached: true });
      }
    }

    const systemPrompt = buildAnalysisPrompt();
    const result = await callGemini(systemPrompt, userMessage);

    if (result.error) {
      return NextResponse.json(
        { error: result.message },
        { status: result.status || 500 },
      );
    }

    if (!result.text) {
      return NextResponse.json(
        { error: 'Empty response from Gemini' },
        { status: 502 },
      );
    }

    // Cache the raw response
    if (propertyId) {
      setCache(propertyId, result.text);
    }

    return NextResponse.json({ text: result.text, keyUsed: result.keyUsed });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
