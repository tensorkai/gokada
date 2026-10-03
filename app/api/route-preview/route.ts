import { findPlace } from '@/data/demo/places';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const start = findPlace(params.get('from') || ''), end = findPlace(params.get('to') || '');
  if (!start || !end || start.id === end.id) return Response.json({ error: 'Select different demo destinations.' }, { status: 400 });
  // Deterministic demo geometry: no routing account, token, or external request.
  return Response.json({ mode: 'illustrative', coordinates: [start.coordinates, end.coordinates] });
}
