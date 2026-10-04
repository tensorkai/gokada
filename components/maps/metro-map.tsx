'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowsOut, MapPin, Motorcycle, Minus, Plus, NavigationArrow } from '@phosphor-icons/react';
import type { Map as MapType, GeoJSONSource, Marker } from 'maplibre-gl';
import type { Place } from '@/data/demo/places';

type Route = { mode: 'road' | 'fallback'; coordinates: [number, number][]; distanceKm?: number; durationMinutes?: number; routes?: Array<{ coordinates: [number, number][]; distanceKm: number; durationMinutes: number }> };
type SafetyPoint = { id: string; name: string; type: 'cooling' | 'shade' | 'convenience'; coordinates: [number, number]; detail?: string };
type Props = { pickup?: Place; destination?: Place; progress?: number; onPin?: (coordinates: [number, number]) => void; showSafety?: boolean };

export function MetroMap({ pickup, destination, progress = 0, onPin, showSafety = false }: Props) {
  const container = useRef<HTMLDivElement>(null); const map = useRef<MapType | null>(null); const markers = useRef<Marker[]>([]); const route = useRef<Route | null>(null);
  const [ready, setReady] = useState(false); const [failed, setFailed] = useState(false); const [routeInfo, setRouteInfo] = useState<Route | null>(null); const [safetyRisk, setSafetyRisk] = useState<'low' | 'medium' | 'high' | null>(null); const [zoom, setZoom] = useState(1); const [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false; let instance: MapType | null = null; let resizeObserver: ResizeObserver | undefined; let timer: ReturnType<typeof setTimeout>;
    import('maplibre-gl').then((m) => {
      const maplibregl = (m as unknown as { default?: typeof m }).default || m; if (disposed || !container.current) return;
      try {
        maplibregl.setWorkerUrl('/lib/maplibre/maplibre-gl-worker.mjs');
        instance = new maplibregl.Map({ container: container.current, center: [121.031, 14.560], zoom: 12.3, minZoom: 9, maxZoom: 18, attributionControl: false, style: { version: 8, sources: { osm: { type: 'raster', tiles: [process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors', maxzoom: 19 } }, layers: [{ id: 'base', type: 'background', paint: { 'background-color': '#edf0eb' } }, { id: 'streets', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.85, 'raster-opacity': 0.7 } }] } });
        map.current = instance; resizeObserver = new ResizeObserver(() => { if (!disposed) instance?.resize(); }); resizeObserver.observe(container.current); instance.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-right');
        const providerCredit = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION; if (providerCredit) instance.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: providerCredit }), 'bottom-left'); instance.scrollZoom.disable();
        instance.on('load', () => { if (disposed || !instance) return; clearTimeout(timer); instance.addSource('journey-alts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); instance.addLayer({ id: 'journey-alts-line', type: 'line', source: 'journey-alts', paint: { 'line-color': '#92998f', 'line-width': 4, 'line-opacity': 0.6 }, layout: { 'line-join': 'round', 'line-cap': 'round' } }); instance.addSource('journey', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); instance.addLayer({ id: 'journey-casing', type: 'line', source: 'journey', paint: { 'line-color': '#ffffff', 'line-width': 9 }, layout: { 'line-join': 'round', 'line-cap': 'round' } }); instance.addLayer({ id: 'journey-line', type: 'line', source: 'journey', paint: { 'line-color': '#14845a', 'line-width': 5 }, layout: { 'line-join': 'round', 'line-cap': 'round' } }); if (showSafety) { instance.addSource('safety-shade', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); instance.addLayer({ id: 'safety-shade-fill', type: 'fill', source: 'safety-shade', paint: { 'fill-color': '#5f8a4b', 'fill-opacity': 0.25 } }); instance.addSource('safety-hot', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); instance.addLayer({ id: 'safety-hot-fill', type: 'fill', source: 'safety-hot', paint: { 'fill-color': '#e8783d', 'fill-opacity': 0.15 } }); instance.addSource('safety-flood', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); instance.addLayer({ id: 'safety-flood-fill', type: 'fill', source: 'safety-flood', paint: { 'fill-color': '#c65b3d', 'fill-opacity': 0.24, 'fill-outline-color': '#b44b35' } }); } if (onPin) instance.on('click', (event) => onPin([event.lngLat.lng, event.lngLat.lat])); setReady(true); });
        let errors = 0; instance.on('error', () => { if (++errors > 3 && !disposed) setFailed(true); }); timer = setTimeout(() => { if (!disposed && !instance?.loaded()) setFailed(true); }, 15000);
      } catch { if (!disposed) setFailed(true); }
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; clearTimeout(timer); resizeObserver?.disconnect(); markers.current.forEach(marker => marker.remove()); markers.current = []; instance?.remove(); map.current = null; };
  }, [onPin, retry, showSafety]);
  useEffect(() => {
    if (!ready || !map.current) return; const instance = map.current; let disposed = false; markers.current.forEach(marker => marker.remove()); markers.current = []; setSafetyRisk(null);
    import('maplibre-gl').then(async (m) => {
      const maplibregl = (m as unknown as { default?: typeof m }).default || m; if (disposed) return;
      [pickup, destination].forEach((place, index) => { if (!place) return; const element = document.createElement('div'); element.className = `map-pin ${index ? 'end' : 'start'}`; element.textContent = index ? 'B' : 'A'; element.setAttribute('aria-label', place.name); markers.current.push(new maplibregl.Marker({ element }).setLngLat(place.coordinates).addTo(instance)); });
      if (showSafety) {
        try {
          const center = pickup?.coordinates || [121.03, 14.56] as [number, number];
          const destParam = destination ? `&destLat=${destination.coordinates[1]}&destLon=${destination.coordinates[0]}` : '';
          const response = await fetch(`/api/safety-data?lat=${center[1]}&lon=${center[0]}&radius=10000${destParam}`, { signal: AbortSignal.timeout(20000) });
          if (response.ok) {
            const data = await response.json() as {
              places?: SafetyPoint[];
              shadeAreas?: GeoJSON.Feature[];
              hotAreas?: GeoJSON.Feature[];
              flood?: {
                risk: 'low' | 'medium' | 'high';
                hazardAreas?: GeoJSON.Feature[];
                hazardPoints?: GeoJSON.Feature[];
              };
            };
            setSafetyRisk(data.flood?.risk || null);
            if (data.flood?.risk && instance.getLayer('journey-line')) {
              instance.setPaintProperty('journey-line', 'line-color', data.flood.risk === 'high' ? '#c65b3d' : data.flood.risk === 'medium' ? '#c88a35' : '#14845a');
            }
            (instance.getSource('safety-shade') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: data.shadeAreas || [] });
            (instance.getSource('safety-hot') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: data.hotAreas || [] });
            (instance.getSource('safety-flood') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: data.flood?.hazardAreas || [] });
            
            data.places?.forEach((place) => {
              const element = document.createElement('div');
              element.className = `safety-map-marker ${place.type}`;
              element.textContent = place.type === 'cooling' ? 'C' : '•';
              element.title = `${place.name}${place.detail ? ` · ${place.detail}` : ''}`;
              element.setAttribute('aria-label', place.name);
              markers.current.push(new maplibregl.Marker({ element }).setLngLat(place.coordinates).addTo(instance));
            });

            data.flood?.hazardPoints?.forEach((feature) => {
              const geom = feature.geometry as unknown as { coordinates: [number, number] };
              const props = feature.properties as { name?: string; depthCm?: number; label?: string; isImpassable?: boolean };
              if (!geom?.coordinates) return;
              const element = document.createElement('div');
              element.className = `safety-map-marker flood-point ${props?.isImpassable ? 'severe' : ''}`;
              element.textContent = '🌊';
              element.title = `${props?.name || 'Flood Hazard'}: ${props?.depthCm || 0}cm`;
              element.setAttribute('aria-label', props?.label || 'Flood hazard');
              markers.current.push(new maplibregl.Marker({ element }).setLngLat(geom.coordinates).addTo(instance));
            });
          }
        } catch { /* The live safety panel reports source availability. */ }
      }
      const source = instance.getSource('journey') as GeoJSONSource | undefined; source?.setData({ type: 'FeatureCollection', features: [] }); setRouteInfo(null); route.current = null;
      if (!pickup || !destination) { if (pickup) instance.easeTo({ center: pickup.coordinates, zoom: 13, duration: 500 }); return; }
      const bounds = new maplibregl.LngLatBounds(pickup.coordinates, pickup.coordinates).extend(destination.coordinates); instance.fitBounds(bounds, { padding: { top: 100, bottom: 100, left: 70, right: 70 }, maxZoom: 14, duration: 500 });
      try { const response = await fetch(`/api/route-preview?from=${pickup.coordinates.join(',')}&to=${destination.coordinates.join(',')}`, { signal: AbortSignal.timeout(9000) }); const value = await response.json() as Route; if (disposed) return; route.current = value; setRouteInfo(value); } catch { route.current = { mode: 'fallback', coordinates: [pickup.coordinates, destination.coordinates] }; setRouteInfo(route.current); }
      if (!disposed && route.current) { source?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.current.coordinates } }); (instance.getSource('journey-alts') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: (route.current.routes || []).map(r => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: r.coordinates } })) }); if (route.current.mode === 'fallback' && instance.getLayer('journey-line')) instance.setPaintProperty('journey-line', 'line-dasharray', [2, 1]); if (progress > 0) { const coordinates = route.current.coordinates; const index = Math.min(coordinates.length - 1, Math.floor(Math.max(0, Math.min(1, progress)) * (coordinates.length - 1))); const element = document.createElement('div'); element.className = 'map-driver'; element.textContent = 'G'; element.title = 'Simulated driver'; markers.current.push(new maplibregl.Marker({ element }).setLngLat(coordinates[index]).addTo(instance)); } }
    }); return () => { disposed = true; };
  }, [pickup, destination, ready, progress, retry, showSafety]);
  const fit = () => { if (pickup && destination && map.current) map.current.fitBounds([pickup.coordinates, destination.coordinates], { padding: 95, maxZoom: 14 }); else map.current?.easeTo({ center: [121.031, 14.560], zoom: 12.3 }); setZoom(1); };
  const distanceLabel = routeInfo?.distanceKm ? `${routeInfo.distanceKm.toFixed(1)} km by road · ~${routeInfo.durationMinutes} min${showSafety && safetyRisk ? ` · flood ${safetyRisk}` : ''}` : destination ? 'Finding the road route…' : 'Choose a destination to preview your trip.';
  return <section className="metro-map" aria-label="Metro Manila trip map"><div ref={container} className={`map-canvas ${failed ? 'map-hidden' : ''}`} />{(!ready || failed) && <div className="map-fallback"><div style={{ transform: `scale(${zoom})` }} className="schematic-map"><svg viewBox="0 0 800 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="800" height="640" fill="#eef0e9" /><path d="M-20 170C150 80 280 260 420 195S650 95 860 225" fill="none" stroke="#cbdedc" strokeWidth="36" /><path d="M80 0L650 640M-40 550L790 205" stroke="#dddcc7" strokeWidth="22" /><path d="M80 0L650 640M-40 550L790 205" stroke="#fffdf0" strokeWidth="15" /><path d="M335 335L410 420L600 327" stroke="#168458" strokeWidth="6" strokeDasharray="8 5" fill="none" /><g fill="#92998f" fontSize="18" fontFamily="sans-serif" letterSpacing="2"><text x="140" y="160">MANILA</text><text x="255" y="480">MAKATI</text><text x="590" y="190">PASIG</text><text x="586" y="460">TAGUIG</text></g></svg></div><span className="schematic-note">{failed ? 'Offline schematic · not to scale' : 'Loading street map…'}</span></div>}<div className="map-top"><span className="map-area"><MapPin weight="fill" size={16} />Metro Manila, Philippines</span><span className="map-demo">{onPin ? 'Click map to pin' : showSafety ? 'Live safety map' : 'Demo map'}</span></div><div className="map-controls"><button aria-label="Zoom in" onClick={() => { map.current?.zoomIn(); setZoom(v => Math.min(1.6, v + 0.15)); }}><Plus size={20} /></button><button aria-label="Zoom out" onClick={() => { map.current?.zoomOut(); setZoom(v => Math.max(0.7, v - 0.15)); }}><Minus size={20} /></button><span /><button aria-label="Fit trip on map" onClick={fit}><ArrowsOut size={20} /></button></div>{pickup && <div className="map-pickup-label"><span className="pickup-beacon"><NavigationArrow weight="fill" size={17} /></span><div><small>Your pickup</small><strong>{pickup.name}</strong></div></div>}{showSafety && <div className="map-safety-legend" aria-label="Live safety map legend"><span><i className="cooling" />Cooling</span><span><i className="shade" />Shade</span><span><i className="convenience" />Store</span><span><i className="flood" />Flood hazard</span></div>}<div className="map-bottom-card"><span className="map-bike"><Motorcycle size={28} /></span><div><strong>{destination ? 'Road route preview' : 'Pin a location on the map'}</strong><p>{distanceLabel}</p>{onPin && <small className="map-pin-help">Click anywhere on the map to use that point in your booking.</small>}</div><span className="map-bottom-dot" /></div>{failed && <button className="map-retry" onClick={() => { setFailed(false); setReady(false); setRetry(n => n + 1); }}>Retry street map</button>}</section>;
}
