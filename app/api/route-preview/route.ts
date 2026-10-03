import { findPlace } from '@/data/demo/places';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const start = findPlace(params.get('from') || ''), end = findPlace(params.get('to') || '');
  if (!start || !end || start.id === end.id) return Response.json({ error: 'Select different demo destinations.' }, { status: 400 });
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) return Response.json({ mode: 'illustrative', coordinates: [start.coordinates, end.coordinates] });
  try {
    // https://docs.mapbox.com/api/navigation/directions/ — automotive preview, not motorcycle navigation.
    const coordinates = `${start.coordinates.join(',')};${end.coordinates.join(',')}`;
    const query = new URLSearchParams({ access_token: token, geometries: 'geojson', overview: 'full', exclude: 'motorway,ferry' });
    const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?${query}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
    if (!response.ok) throw new Error('Routing unavailable');
    const data = await response.json();
    if (!data.routes?.[0]?.geometry?.coordinates?.length) throw new Error('No road route');
    return Response.json({ mode: 'road', coordinates: data.routes[0].geometry.coordinates });
  } catch {
    return Response.json({ mode: 'illustrative', coordinates: [start.coordinates, end.coordinates], notice: 'Road preview is unavailable. Showing an illustrative connection.' });
  }
}
