export type RetrievedContext = { source: string; content: string; score: number };

/** Resolve the legacy environment shape without ever exposing a Groq key to the browser. */
export function getGroqConfig() {
  const configured = process.env.GROQ_API_MODEL?.trim();
  const apiKey = process.env.GROQ_API_KEY?.trim() || (configured?.startsWith('gsk_') ? configured : undefined);
  const model = configured && !configured.startsWith('gsk_') ? configured : 'openai/gpt-oss-120b';
  return { apiKey, model };
}

function flatten(value: unknown, prefix = ''): RetrievedContext[] {
  if (value === null || value === undefined) return [];
  if (typeof value !== 'object') return [{ source: prefix || 'live snapshot', content: `${prefix}: ${String(value)}`, score: 0 }];
  if (Array.isArray(value)) return value.flatMap((item, index) => flatten(item, `${prefix}[${index}]`));
  return Object.entries(value).flatMap(([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key));
}

/** Small, deterministic retrieval layer for live safety data and source-grounded answers. */
export function retrieveSafetyContext(query: string, snapshot: unknown, limit = 10) {
  const queryTerms = new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter(term => term.length > 2));
  const documents = flatten(snapshot).map(document => ({ ...document, score: [...queryTerms].reduce((score, term) => score + (document.content.toLowerCase().includes(term) ? 2 : 0) + (document.source.toLowerCase().includes(term) ? 1 : 0), 0) }));
  const selected = documents.sort((a, b) => b.score - a.score).slice(0, limit);
  return selected.length ? selected : [{ source: 'live snapshot', content: 'No matching live data was supplied.', score: 0 }];
}

export function formatRetrievedContext(query: string, snapshot: unknown) {
  return retrieveSafetyContext(query, snapshot).map((item, index) => `[${index + 1}] ${item.source}\n${item.content}`).join('\n');
}
