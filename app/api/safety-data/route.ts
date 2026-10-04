import { NextResponse } from 'next/server';

const DEFAULT = { latitude: 14.56, longitude: 121.03 };
type Point = { id: string; name: string; type: 'cooling' | 'shade' | 'convenience' | 'flood'; coordinates: [number, number]; detail?: string };

function numberParam(value: string | null, fallback: number, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}

function heatIndexCelsius(temperature: number, humidity: number) {
  const fahrenheit = temperature * 9 / 5 + 32;
  if (fahrenheit < 80) return temperature;
  const hi = -42.379 + 2.04901523 * fahrenheit + 10.14333127 * humidity - 0.22475541 * fahrenheit * humidity - 0.00683783 * fahrenheit ** 2 - 0.05481717 * humidity ** 2 + 0.00122874 * fahrenheit ** 2 * humidity + 0.00085282 * fahrenheit * humidity ** 2 - 0.00000199 * fahrenheit ** 2 * humidity ** 2;
  return Math.round((hi - 32) * 5 / 9 * 10) / 10;
}

function getCenter(element: { lat?: number; lon?: number; center?: { lat: number; lon: number } }) {
  return element.center || (typeof element.lat === 'number' && typeof element.lon === 'number' ? { lat: element.lat, lon: element.lon } : undefined);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const latitude = numberParam(params.get('lat'), DEFAULT.latitude, 14.2, 14.9);
  const longitude = numberParam(params.get('lon'), DEFAULT.longitude, 120.7, 121.3);
  const radius = numberParam(params.get('radius'), 5000, 500, 10000);
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,wind_speed_10m&timezone=Asia%2FManila`;
  const overpassQuery = `[out:json][timeout:20];(nwr[amenity~"^(drinking_water|shelter|library|community_centre)$"](around:${radius},${latitude},${longitude});nwr[shop~"^(convenience|supermarket)$"](around:${radius},${latitude},${longitude});nwr[leisure="park"](around:${radius},${latitude},${longitude});nwr[landuse~"^(forest|recreation_ground)$"](around:${radius},${latitude},${longitude});nwr[natural~"^(wood|tree)$"](around:${radius},${latitude},${longitude}););out center tags;`;
  try {
    const [weatherResult, floodResult, placesResult] = await Promise.allSettled([
      fetch(weatherUrl, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } }),
      fetch('https://www.pagasa.dost.gov.ph/flood', { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } }),
      fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: overpassQuery, headers: { 'Content-Type': 'text/plain', Accept: 'application/json' }, signal: AbortSignal.timeout(20000), next: { revalidate: 900 } }),
    ]);
    if (weatherResult.status === 'rejected') throw weatherResult.reason;
    const weatherResponse = weatherResult.value;
    const floodResponse = floodResult.status === 'fulfilled' ? floodResult.value : undefined;
    const placesResponse = placesResult.status === 'fulfilled' ? placesResult.value : undefined;
    if (!weatherResponse.ok) throw new Error('Weather source unavailable');
    const weather = await weatherResponse.json() as { current?: Record<string, number | string> };
    const current = weather.current;
    if (!current) throw new Error('Current weather unavailable');
    const temperature = Number(current.temperature_2m); const humidity = Number(current.relative_humidity_2m);
    const heatIndex = heatIndexCelsius(temperature, humidity);
    const rainfall = Number(current.precipitation) || 0;
    const floodPage = floodResponse?.ok ? await floodResponse.text() : '';
    const ncrWindow = floodPage.match(/NCR\s*\/\s*Pasig[\s\S]{0,500}/i)?.[0] || '';
    const pagasaWatch = /flood\s+watch/i.test(ncrWindow);
    const floodRisk: 'low' | 'medium' | 'high' = pagasaWatch || rainfall >= 15 ? 'high' : rainfall >= 5 ? 'medium' : 'low';
    const elements = placesResponse?.ok ? (await placesResponse.json() as { elements?: Array<{ id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> }).elements || [] : [];
    const places: Point[] = elements.flatMap((element) => { const center = getCenter(element); if (!center) return []; const tags = element.tags || {}; const type: Point['type'] = tags.shop === 'convenience' || tags.shop === 'supermarket' ? 'convenience' : tags.amenity === 'drinking_water' || tags.amenity === 'shelter' || tags.amenity === 'library' || tags.amenity === 'community_centre' ? 'cooling' : 'shade'; return [{ id: `osm-${element.type}-${element.id}`, name: tags.name || (type === 'convenience' ? 'Mapped convenience store' : type === 'cooling' ? 'Mapped cooling stop' : 'Mapped shaded area'), type, coordinates: [center.lon, center.lat], detail: tags.opening_hours || undefined }]; });
    const fetchedAt = new Date().toISOString();
    return NextResponse.json({ fetchedAt, location: { latitude, longitude }, weather: { temperatureC: temperature, humidity, heatIndexC: heatIndex, apparentTemperatureC: Number(current.apparent_temperature), precipitationMm: rainfall, rainMm: Number(current.rain) || 0, showersMm: Number(current.showers) || 0, windKph: Number(current.wind_speed_10m) || 0, weatherCode: Number(current.weather_code) }, flood: { risk: floodRisk, pagasaWatch, source: floodResponse?.ok ? 'PAGASA' : 'PAGASA unavailable', note: pagasaWatch ? 'PAGASA reports a flood watch for the NCR/Pasig-Marikina-Laguna de Bay basin.' : floodResponse?.ok ? 'PAGASA did not report a flood watch for the basin at refresh time; local flooding can still occur.' : 'PAGASA could not be reached at refresh time; rainfall risk is shown from Open-Meteo.' }, places, sources: ['Open-Meteo current weather', 'PAGASA flood monitoring', 'OpenStreetMap via Overpass'] }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } });
  } catch {
    return NextResponse.json({ error: 'Live safety sources are temporarily unavailable. Try refresh again.' }, { status: 503 });
  }
}
