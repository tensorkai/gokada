import { NextResponse } from 'next/server';
import {
  generateRainDependentFloodFeatures,
  assessPointFlood,
} from '@/lib/flood-management';

const DEFAULT = { latitude: 14.56, longitude: 121.03 };
type Point = { id: string; name: string; type: 'cooling' | 'convenience'; coordinates: [number, number]; detail?: string };
type ShadeArea = { type: 'Feature'; properties: { id: string; name: string }; geometry: { type: 'Polygon'; coordinates: [number, number][][] } };

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
  const radius = numberParam(params.get('radius'), 8000, 500, 25000);
  
  // Optional destination coordinates for point-to-point trip assessment
  const destLatParam = params.get('destLat');
  const destLonParam = params.get('destLon');
  const destLat = destLatParam ? numberParam(destLatParam, latitude, 14.2, 14.9) : undefined;
  const destLon = destLonParam ? numberParam(destLonParam, longitude, 120.7, 121.3) : undefined;

  // Optional manual/simulated rainfall (mm/h) override for testing or demo scenarios
  const customRain = params.get('rain') ?? params.get('rainfall');
  const manualRainMm = customRain !== null ? Math.max(0, Math.min(100, Number(customRain) || 0)) : undefined;

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,wind_speed_10m&timezone=Asia%2FManila`;
  const overpassQuery = `[out:json][timeout:20];(nwr[amenity~"^(drinking_water|shelter|library|community_centre)$"](around:${radius},${latitude},${longitude});nwr[shop~"^(convenience|supermarket)$"](around:${radius},${latitude},${longitude}););out center tags;way[leisure="park"](around:${radius},${latitude},${longitude});way[landuse~"^(forest|recreation_ground)$"](around:${radius},${latitude},${longitude});way[natural~"^(wood|scrub)$"](around:${radius},${latitude},${longitude});way[landuse~"^(commercial|industrial|retail)$"](around:${radius},${latitude},${longitude});out geom tags;`;
  
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
    
    // Live rainfall from Open-Meteo or explicit manual override
    const liveRainfall = Number(current.precipitation) || Number(current.rain) || 0;
    const effectiveRainfall = manualRainMm !== undefined ? manualRainMm : liveRainfall;
    
    const floodPage = floodResponse?.ok ? await floodResponse.text() : '';
    const ncrWindow = floodPage.match(/NCR\s*\/\s*Pasig[\s\S]{0,500}/i)?.[0] || '';
    const pagasaWatch = /flood\s+watch/i.test(ncrWindow);

    // Point-accurate, rain-dependent flood modeling
    const floodFeatures = generateRainDependentFloodFeatures({
      centerLat: latitude,
      centerLon: longitude,
      radiusMeters: radius,
      rainfallMm: effectiveRainfall,
    });

    const pointAssessment = assessPointFlood([longitude, latitude], effectiveRainfall);
    const destinationAssessment = destLat && destLon ? assessPointFlood([destLon, destLat], effectiveRainfall) : undefined;

    // Overall flood risk: high if PAGASA watch active, point is flooded, or overall rain triggers severe hazard
    const floodRisk: 'low' | 'medium' | 'high' =
      pagasaWatch || pointAssessment.risk === 'high' || destinationAssessment?.risk === 'high' || floodFeatures.risk === 'high'
        ? 'high'
        : pointAssessment.risk === 'medium' || destinationAssessment?.risk === 'medium' || floodFeatures.risk === 'medium'
        ? 'medium'
        : 'low';

    const elements = placesResponse?.ok ? (await placesResponse.json() as { elements?: Array<{ id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; geometry?: Array<{ lat: number; lon: number }>; tags?: Record<string, string> }> }).elements || [] : [];
    const places: Point[] = elements.flatMap((element) => { const center = getCenter(element); const tags = element.tags || {}; if (!center || (!tags.shop && !tags.amenity)) return []; const type: Point['type'] = tags.shop === 'convenience' || tags.shop === 'supermarket' ? 'convenience' : 'cooling'; return [{ id: `osm-${element.type}-${element.id}`, name: tags.name || (type === 'convenience' ? 'Mapped convenience store' : 'Mapped cooling stop'), type, coordinates: [center.lon, center.lat], detail: tags.opening_hours || undefined }]; });
    const shadeAreas: ShadeArea[] = elements.flatMap((element) => { if (element.type !== 'way' || !element.geometry || element.geometry.length < 4 || !element.tags || !element.tags.leisure && !element.tags.landuse && !element.tags.natural) return []; if (element.tags.landuse && ['commercial', 'industrial', 'retail'].includes(element.tags.landuse)) return []; const ring = element.geometry.map(point => [point.lon, point.lat] as [number, number]); if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]); return [{ type: 'Feature', properties: { id: `osm-way-${element.id}`, name: element.tags.name || 'Mapped green or shaded area' }, geometry: { type: 'Polygon', coordinates: [ring] } }]; });
    const hotAreas: ShadeArea[] = elements.flatMap((element) => { if (element.type !== 'way' || !element.geometry || element.geometry.length < 4 || !element.tags || !element.tags.landuse || !['commercial', 'industrial', 'retail'].includes(element.tags.landuse)) return []; const ring = element.geometry.map(point => [point.lon, point.lat] as [number, number]); if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]); return [{ type: 'Feature', properties: { id: `osm-way-${element.id}`, name: element.tags.name || 'Mapped urban heat area' }, geometry: { type: 'Polygon', coordinates: [ring] } }]; });

    const note = effectiveRainfall <= 0.5
      ? 'Dry weather: no standing flood water detected on road networks.'
      : pagasaWatch
      ? `PAGASA flood watch active. Rainfall: ${effectiveRainfall.toFixed(1)} mm/h. ${pointAssessment.advisory}`
      : `Rainfall: ${effectiveRainfall.toFixed(1)} mm/h. ${pointAssessment.advisory}`;

    const fetchedAt = new Date().toISOString();
    return NextResponse.json({
      fetchedAt,
      location: { latitude, longitude },
      weather: {
        temperatureC: temperature,
        humidity,
        heatIndexC: heatIndex,
        apparentTemperatureC: Number(current.apparent_temperature),
        precipitationMm: effectiveRainfall,
        rainMm: Number(current.rain) || 0,
        showersMm: Number(current.showers) || 0,
        windKph: Number(current.wind_speed_10m) || 0,
        weatherCode: Number(current.weather_code),
        isManualOverride: manualRainMm !== undefined,
      },
      flood: {
        risk: floodRisk,
        rainfallMm: effectiveRainfall,
        pagasaWatch,
        source: floodResponse?.ok ? 'PAGASA & Rain-Calibrated Model' : 'Rain-Calibrated Flood Model',
        note,
        hazardType: 'Point-accurate and rain-dependent flood model',
        hazardAreas: floodFeatures.hazardAreas,
        hazardPoints: floodFeatures.hazardPoints,
        activeHotspotsCount: floodFeatures.activeCount,
        pointAssessment,
        destinationAssessment,
        summary: floodFeatures.summary,
      },
      places,
      shadeAreas,
      hotAreas,
      sources: ['Open-Meteo current weather', 'PAGASA flood monitoring', 'OpenStreetMap via Overpass', 'MMDA & Project NOAH rain-dependent flood model'],
    }, {
      headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json({ error: 'Live safety sources are temporarily unavailable. Try refresh again.' }, { status: 503 });
  }
}
