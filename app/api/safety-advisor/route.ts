import { NextResponse } from 'next/server';

type AdvisorRequest = {
  orders?: Array<{ id: string; service: 'ride' | 'delivery'; destination: string; etaMinutes: number }>;
  conditions?: { heatIndexC: number; floodRisk: 'low' | 'medium' | 'high' };
};

function localAdvice(input: AdvisorRequest) {
  const heatIndexC = input.conditions?.heatIndexC ?? 37;
  const floodRisk = input.conditions?.floodRisk ?? 'medium';
  const orders = input.orders ?? [];
  const sortedOrders = [...orders].sort((a, b) => {
    const score = (order: typeof a) => (order.service === 'delivery' ? 0 : 1) + order.etaMinutes / 100;
    return score(a) - score(b);
  });
  const caution = floodRisk === 'high' ? 'Avoid low-lying streets and pause new pickups if water rises.' : heatIndexC >= 38 ? 'Take a shaded break after this sequence and carry water.' : 'Conditions are manageable. Keep the safer sequence below.';
  return {
    source: 'local-demo',
    summary: caution,
    route: floodRisk === 'high' ? 'Use elevated main roads and avoid creek crossings.' : 'Stay on the marked main-road corridor for the next leg.',
    sortedOrderIds: sortedOrders.map(order => order.id),
  };
}

export async function POST(request: Request) {
  let input: AdvisorRequest;
  try {
    input = await request.json() as AdvisorRequest;
  } catch {
    return NextResponse.json({ error: 'Send a valid safety brief.' }, { status: 400 });
  }

  const endpoint = process.env.VERCEL_AI_ADVISOR_URL;
  if (!endpoint) return NextResponse.json(localAdvice(input));

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, app: 'gokada-driver-demo', version: 'safety-desk-v1' }),
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) throw new Error('Advisor returned an error.');
    const data = await response.json();
    return NextResponse.json({ ...data, source: 'vercel-ai' });
  } catch {
    return NextResponse.json({ ...localAdvice(input), source: 'local-fallback' });
  }
}
