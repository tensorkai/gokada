import { findPlace } from '@/data/demo/places';

function coordinates(value: string | null) {
  if (!value) return undefined;
  const [longitude, latitude] = value.split(',').map(Number);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return undefined;
  return [longitude, latitude] as [number, number];
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const start = coordinates(params.get('from')) || findPlace(params.get('from') || '')?.coordinates;
  const end = coordinates(params.get('to')) || findPlace(params.get('to') || '')?.coordinates;
  if (!start || !end || (!coordinates(params.get('from')) && params.get('from') === params.get('to'))) return Response.json({ error: 'Select different demo destinations.' }, { status: 400 });
  // Keep the original landmark response stable for existing demo API consumers.
  if (!coordinates(params.get('from')) && !coordinates(params.get('to'))) return Response.json({ mode: 'illustrative', coordinates: [start, end] });
  const fallback = { mode: 'fallback', coordinates: [start, end] };
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) return Response.json(fallback);
    const data = await response.json() as { routes?: Array<{ distance: number; duration: number; geometry?: { coordinates?: [number, number][] } }> };
    const route = data.routes?.[0];
    if (!route?.geometry?.coordinates?.length) return Response.json(fallback);
    return Response.json({ mode: 'road', coordinates: route.geometry.coordinates, distanceKm: Math.round(route.distance / 100) / 10, durationMinutes: Math.max(1, Math.round(route.duration / 60)) });
  } catch {
    return Response.json(fallback);
  }
}
