'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowsOut, MapPin, Motorcycle, Minus, Plus, NavigationArrow } from '@phosphor-icons/react';
import type { Map as MapType, GeoJSONSource, Marker } from 'maplibre-gl';
import type { Place } from '@/data/demo/places';

type Props = { pickup?: Place; destination?: Place; progress?: number };
export function MetroMap({ pickup, destination, progress = 0 }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapType | null>(null);
  const markers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState('illustrative');
  const [zoom, setZoom] = useState(1);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false;
    let instance: MapType | null = null;
    let timer: ReturnType<typeof setTimeout>;
    import('maplibre-gl').then((m) => {
      const maplibregl = (m as unknown as { default?: typeof m }).default || m;
      if (disposed || !container.current) return;
      try {
        // https://maplibre.org/maplibre-gl-js/docs/examples/add-a-raster-tile-source/
        instance = new maplibregl.Map({ container: container.current, center: [121.031, 14.560], zoom: 12.3, minZoom: 9, maxZoom: 18, attributionControl: false,
          style: { version: 8, sources: { osm: { type: 'raster', tiles: [process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors', maxzoom: 19 } }, layers: [{ id: 'base', type: 'background', paint: { 'background-color': '#edf0eb' } }, { id: 'streets', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.85, 'raster-opacity': 0.7 } }] },
        });
        map.current = instance;
        instance!.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-right');
        instance!.scrollZoom.disable();
        instance!.on('load', () => {
          if (disposed || !instance) return;
          clearTimeout(timer);
          instance.addSource('journey', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          instance.addLayer({ id: 'journey-casing', type: 'line', source: 'journey', paint: { 'line-color': '#ffffff', 'line-width': 9 }, layout: { 'line-join': 'round', 'line-cap': 'round' } });
          instance.addLayer({ id: 'journey-line', type: 'line', source: 'journey', paint: { 'line-color': '#14845a', 'line-width': 5, 'line-dasharray': [2, 1] }, layout: { 'line-join': 'round', 'line-cap': 'round' } });
          setReady(true);
        });
        let errors = 0;
        instance!.on('error', () => { if (++errors > 3 && !disposed) setFailed(true); });
        timer = setTimeout(() => { if (!disposed && !instance?.loaded()) setFailed(true); }, 15000);
      } catch { if (!disposed) setFailed(true); }
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; clearTimeout(timer); markers.current.forEach(marker => marker.remove()); markers.current = []; instance?.remove(); map.current = null; };
  }, [retry]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const instance = map.current;
    const controller = new AbortController();
    let disposed = false;
    import('maplibre-gl').then((m) => {
      const maplibregl = (m as unknown as { default?: typeof m }).default || m;
      if (disposed) return;
      markers.current.forEach(marker => marker.remove()); markers.current = [];
      [pickup, destination].forEach((place, index) => {
        if (!place) return;
        const element = document.createElement('div'); element.className = `map-pin ${index ? 'end' : 'start'}`; element.textContent = index ? 'B' : 'A'; element.setAttribute('aria-label', place.name);
        markers.current.push(new maplibregl.Marker({ element }).setLngLat(place.coordinates).addTo(instance));
      });
      const source = instance.getSource('journey') as GeoJSONSource | undefined;
      source?.setData({ type: 'FeatureCollection', features: [] });
      if (pickup && destination) {
        const bounds = new maplibregl.LngLatBounds(pickup.coordinates, pickup.coordinates).extend(destination.coordinates);
        instance.fitBounds(bounds, { padding: { top: 100, bottom: 100, left: 70, right: 70 }, maxZoom: 14, duration: 500 });
        const draw = (coordinates: [number, number][]) => {
          if (disposed) return;
          source?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } });
          if (progress > 0) {
            const position = coordinates[Math.min(coordinates.length - 1, Math.round((coordinates.length - 1) * progress))];
            const element = document.createElement('div'); element.className = 'map-driver'; element.textContent = 'G'; element.title = 'Simulated driver';
            markers.current.push(new maplibregl.Marker({ element }).setLngLat(position).addTo(instance));
          }
        };
        draw([pickup.coordinates, destination.coordinates]);
        fetch(`/api/route-preview?from=${pickup.id}&to=${destination.id}`, { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('Route unavailable'); return response.json(); }).then(data => {
          if (disposed) return;
          setMode(data.mode);
          instance.setPaintProperty('journey-line', 'line-dasharray', data.mode === 'road' ? [1, 0] : [2, 1]);
          // Replace the illustrative driver before drawing the road geometry.
          if (markers.current.length > 2) markers.current.pop()?.remove();
          draw(data.coordinates);
        }).catch(() => {});
      } else if (pickup) instance.easeTo({ center: pickup.coordinates, zoom: 13, duration: 500 });
    });
    return () => { disposed = true; controller.abort(); };
  }, [pickup, destination, ready, progress]);
  const fit = () => { if (pickup && destination && map.current) map.current.fitBounds([pickup.coordinates, destination.coordinates], { padding: 95, maxZoom: 14 }); else map.current?.easeTo({ center: [121.031, 14.560], zoom: 12.3 }); setZoom(1); };
  return <section className="metro-map" aria-label="Metro Manila trip map">
    <div ref={container} className={`map-canvas ${failed ? 'map-hidden' : ''}`} />
    {(!ready || failed) && <div className="map-fallback"><div style={{ transform: `scale(${zoom})` }} className="schematic-map"><svg viewBox="0 0 800 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="blocks" width="95" height="85" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><rect width="95" height="85" fill="#e9ede7" /><rect x="8" y="8" width="79" height="69" rx="5" fill="#f5f6f1" /><path d="M0 0H95M0 0V85" stroke="white" strokeWidth="9" /></pattern></defs><rect width="800" height="640" fill="url(#blocks)" /><path d="M-20 170C150 80 280 260 420 195S650 95 860 225" fill="none" stroke="#cbdedc" strokeWidth="36" /><path d="M80 0L650 640M-40 550L790 205" stroke="#dddcc7" strokeWidth="22" /><path d="M80 0L650 640M-40 550L790 205" stroke="#fffdf0" strokeWidth="15" /><path d="M335 335L410 420L600 327" stroke="white" strokeWidth="13" fill="none" /><path d="M335 335L410 420L600 327" stroke="#168458" strokeWidth="6" strokeDasharray="8 5" fill="none" /><rect x="445" y="230" width="93" height="70" rx="18" fill="#cbdcc5" transform="rotate(-24 445 230)" /><g fill="#92998f" fontSize="18" fontFamily="sans-serif" letterSpacing="2"><text x="140" y="160">MANILA</text><text x="255" y="480">MAKATI</text><text x="590" y="190">PASIG</text><text x="586" y="460">TAGUIG</text><text x="110" y="610">PASAY</text></g><g><circle cx="335" cy="335" r="17" fill="#168458" stroke="white" strokeWidth="5" /><circle cx="600" cy="327" r="17" fill="#273c31" stroke="white" strokeWidth="5" /></g></svg></div><span className="schematic-note">{failed ? 'Offline schematic · not to scale' : 'Loading street map…'}</span></div>}
    <div className="map-top"><span className="map-area"><MapPin weight="fill" size={16} />Metro Manila, Philippines</span><span className="map-demo">Demo map</span></div>
    <div className="map-controls"><button aria-label="Zoom in" onClick={() => { map.current?.zoomIn(); setZoom(v => Math.min(1.6, v + 0.15)); }}><Plus size={20} /></button><button aria-label="Zoom out" onClick={() => { map.current?.zoomOut(); setZoom(v => Math.max(0.7, v - 0.15)); }}><Minus size={20} /></button><span /><button aria-label="Fit trip on map" onClick={fit}><ArrowsOut size={20} /></button></div>
    {pickup && <div className="map-pickup-label"><span className="pickup-beacon"><NavigationArrow weight="fill" size={17} /></span><div><small>Your pickup</small><strong>{pickup.name}</strong></div></div>}
    <div className="map-bottom-card"><span className="map-bike"><Motorcycle size={28} /></span><div><strong>{destination ? 'Your city, connected.' : 'Your next stop starts here.'}</strong><p>{destination ? (mode === 'road' ? 'Car route preview · not motorcycle navigation' : 'Illustrative connection · not a road route') : 'Choose a destination to preview your trip.'}</p></div><span className="map-bottom-dot" /></div>
    {failed && <button className="map-retry" onClick={() => { setFailed(false); setReady(false); setRetry(n => n + 1); }}>Retry street map</button>}
  </section>;
}
