import { NextResponse } from 'next/server';
import { formatRetrievedContext, getGroqConfig } from '@/lib/rag';

type ChatRequest = { message?: string; safety?: unknown };
const fallback = (message: string) => `I can help with the live heat and flood brief. Based on the latest refresh, ${message.toLowerCase().includes('heat') ? 'take a shaded break, drink water, and use a mapped cooling stop.' : message.toLowerCase().includes('flood') ? 'follow the marked road route, avoid low crossings, and check PAGASA before moving.' : 'check the live cards and map markers before accepting a job.'}`;

export async function POST(request: Request) {
  let input: ChatRequest;
  try { input = await request.json() as ChatRequest; } catch { return NextResponse.json({ error: 'Send a valid chat message.' }, { status: 400 }); }
  const message = typeof input.message === 'string' ? input.message.trim().slice(0, 500) : '';
  if (!message) return NextResponse.json({ error: 'Type a message first.' }, { status: 400 });
  const { apiKey, model } = getGroqConfig();
  if (!apiKey) return NextResponse.json({ reply: fallback(message), source: 'local-fallback' });
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.2, max_tokens: 300, messages: [{ role: 'system', content: 'You are Gokada Safety Chat running on Groq GPT OSS. Answer in short, practical sentences for a motorcycle taxi and delivery driver in Metro Manila. Use only the retrieved context. Never invent a flood closure, cooling station, shade, or route. Say when a source is unavailable. Recommend checking PAGASA for official emergency warnings. This is safety guidance, not emergency dispatch.' }, { role: 'user', content: `Retrieved safety context:\n${formatRetrievedContext(message, input.safety)}\n\nDriver question:\n${message}` }] }), signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Groq unavailable');
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Empty Groq response');
    return NextResponse.json({ reply, source: 'groq-gpt-oss', model });
  } catch { return NextResponse.json({ reply: fallback(message), source: 'local-fallback' }); }
}
