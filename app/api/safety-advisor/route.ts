import { NextResponse } from 'next/server';
import { formatRetrievedContext, getGroqConfig } from '@/lib/rag';

type AdvisorRequest = {
  orders?: Array<{ id: string; service: 'ride' | 'delivery'; destination: string; etaMinutes: number }>;
  conditions?: { heatIndexC: number; floodRisk: 'low' | 'medium' | 'high'; rainfallMm?: number; activeFloodHotspots?: string[] };
};

function localAdvice(input: AdvisorRequest) {
  const heatIndexC = input.conditions?.heatIndexC ?? 37;
  const floodRisk = input.conditions?.floodRisk ?? 'low';
  const rainfallMm = input.conditions?.rainfallMm ?? 0;
  const orders = input.orders ?? [];
  const floodKeywords = ['espana', 'taft', 'caloocan', 'malabon', 'navotas', 'marikina', 'talayan', 'maysilo'];
  
  const sortedOrders = [...orders].sort((a, b) => {
    // If rain / flood risk is present, heavily penalize destinations known to flood
    const aIsFloodProne = floodKeywords.some(kw => a.destination.toLowerCase().includes(kw));
    const bIsFloodProne = floodKeywords.some(kw => b.destination.toLowerCase().includes(kw));
    if (floodRisk !== 'low') {
      if (aIsFloodProne && !bIsFloodProne) return 1;
      if (!aIsFloodProne && bIsFloodProne) return -1;
    }
    const score = (order: typeof a) => (order.service === 'delivery' ? 0 : 1) + order.etaMinutes / 100;
    return score(a) - score(b);
  });

  const caution = floodRisk === 'high'
    ? `Torrential rain (${rainfallMm.toFixed(1)} mm/h). Critical street flooding active. Avoid low-lying river basins and underpasses.`
    : floodRisk === 'medium'
    ? `Rainfall at ${rainfallMm.toFixed(1)} mm/h. Gutter-deep ponding reported at flood-prone points. Drive safely.`
    : heatIndexC >= 38
    ? 'High heat index. Take shaded rest breaks and carry extra water.'
    : 'Roads are clear and dry. Manageable conditions for all demo routes.';

  const routeAdvice = floodRisk === 'high'
    ? 'Re-route away from España, Taft, and Marikina riverbanks. Use elevated bypass corridors (C-5 / EDSA).'
    : floodRisk === 'medium'
    ? 'Watch for standing water at notorious underpasses and outer lanes. Stick to well-drained avenues.'
    : 'Direct road routes are clear. Proceed via normal navigation.';

  return {
    source: 'local-demo',
    summary: caution,
    route: routeAdvice,
    sortedOrderIds: sortedOrders.map(order => order.id),
  };
}

async function groqAdvice(input: AdvisorRequest) {
  const { apiKey, model } = getGroqConfig();
  if (!apiKey) return undefined;
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.1, max_tokens: 250, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'You are a safety dispatcher running on Groq GPT OSS for Metro Manila motorcycle and delivery work. Return only JSON with summary, route, and sortedOrderIds. Use only the retrieved context. Never invent closures or live observations. Keep guidance practical and mention PAGASA when flood risk is high.' }, { role: 'user', content: `Retrieved safety context:\n${formatRetrievedContext('route order flood heat', input)}\n\nRequest:\n${JSON.stringify(input)}` }] }), signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Groq advisor unavailable');
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq advisor returned no content');
  const advice = JSON.parse(content) as { summary?: string; route?: string; sortedOrderIds?: string[] };
  if (typeof advice.summary !== 'string' || typeof advice.route !== 'string' || !Array.isArray(advice.sortedOrderIds)) throw new Error('Groq advisor returned invalid advice');
  const validIds = new Set((input.orders || []).map(order => order.id));
  return { source: 'groq-gpt-oss', summary: advice.summary, route: advice.route, sortedOrderIds: advice.sortedOrderIds.filter(id => validIds.has(id)) };
}

export async function POST(request: Request) {
  let input: AdvisorRequest;
  try {
    input = await request.json() as AdvisorRequest;
  } catch {
    return NextResponse.json({ error: 'Send a valid safety brief.' }, { status: 400 });
  }

  try {
    const advice = await groqAdvice(input);
    if (advice) return NextResponse.json(advice);
  } catch { /* Continue to the configured bridge or deterministic fallback. */ }

  // This endpoint remains a bridge for deployments that already use a separate AI app:
  // the Gokada app and the external AI safety assistant app.
  const endpoint = process.env.AI_ASSISTANT_APP_URL || process.env.VERCEL_AI_ADVISOR_URL;
  if (!endpoint) return NextResponse.json(localAdvice(input));

  try {
    const requestUrl = new URL(request.url);
    const mainAppUrl = process.env.GOKADA_APP_URL || requestUrl.origin;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'safety-advice',
        ...input,
        sourceApp: { name: 'Gokada main app', url: mainAppUrl },
        callback: { safetyAdviceUrl: `${mainAppUrl}/api/safety-advisor` },
        version: 'safety-desk-v1',
      }),
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) throw new Error('Advisor returned an error.');
    const data = await response.json();
    return NextResponse.json({ ...data, source: 'vercel-ai' });
  } catch {
    return NextResponse.json({ ...localAdvice(input), source: 'local-fallback' });
  }
}
