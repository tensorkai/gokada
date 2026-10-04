'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, ChatCircle, CloudRain, Drop, Fire, PaperPlaneRight, Sparkle, Warning } from '@phosphor-icons/react';
import { resolvePlace } from '@/features/bookings/model';
import { currency, type Booking } from '@/features/bookings/model';

type Safety = {
  fetchedAt: string;
  weather: {
    temperatureC: number;
    humidity: number;
    heatIndexC: number;
    apparentTemperatureC: number;
    precipitationMm: number;
    rainMm: number;
    windKph: number;
    isManualOverride?: boolean;
  };
  flood: {
    risk: 'low' | 'medium' | 'high';
    rainfallMm: number;
    pagasaWatch: boolean;
    source: string;
    note: string;
    hazardType?: string;
    activeHotspotsCount?: number;
    hazardPoints?: Array<{ properties?: { name?: string; depthCm?: number; label?: string; isImpassable?: boolean } }>;
    pointAssessment?: {
      depthCm: number;
      status: string;
      risk: string;
      impassableForMotorcycle: boolean;
      activeHotspotName?: string;
      advisory: string;
    };
    summary?: string;
  };
  places: Array<{ id: string; name: string; type: 'cooling' | 'shade' | 'convenience'; detail?: string }>;
};
type Advice = { source: string; summary: string; route: string; sortedOrderIds: string[] };
type Props = { orders: Booking[]; onApplyOrder: (ids: string[]) => void };

export function SafetyDesk({ orders, onApplyOrder }: Props) {
  const [safety, setSafety] = useState<Safety | null>(null);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [loading, setLoading] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<Array<{ role: 'assistant' | 'user'; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [rainOption, setRainOption] = useState<'live' | '0' | '10' | '24' | '40'>('live');

  const visibleOrders = useMemo(() => {
    if (!ordered || !advice) return orders;
    const rank = new Map(advice.sortedOrderIds.map((id, index) => [id, index]));
    return [...orders].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  }, [advice, orders, ordered]);

  async function refreshAdvice(selectedRain = rainOption) {
    setLoading(true);
    try {
      const rainQuery = selectedRain !== 'live' ? `?rain=${selectedRain}` : '';
      const liveResponse = await fetch(`/api/safety-data${rainQuery}`);
      if (!liveResponse.ok) throw new Error('Live safety sources unavailable');
      const live = await liveResponse.json() as Safety;
      setSafety(live);

      const hotspots = (live.flood.hazardPoints || []).map(p => p.properties?.name || '').filter(Boolean);
      const response = await fetch('/api/safety-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditions: {
            heatIndexC: live.weather.heatIndexC,
            floodRisk: live.flood.risk,
            rainfallMm: live.flood.rainfallMm,
            activeFloodHotspots: hotspots,
          },
          orders: orders.map(order => ({
            id: order.id,
            service: order.service,
            destination: resolvePlace(order.destinationId, order.destinationPlace)?.name ?? 'Unknown stop',
            etaMinutes: order.quote.minutes,
          })),
        }),
      });
      if (!response.ok) throw new Error('Could not reach the advisor.');
      const data = await response.json() as Advice;
      setAdvice(data);
      setOrdered(false);
    } catch {
      setAdvice({
        source: 'local-fallback',
        summary: 'Live safety sources are unavailable. Refresh before moving and avoid low crossings.',
        route: 'Use the marked route only after checking PAGASA flood monitoring.',
        sortedOrderIds: orders.map(order => order.id),
      });
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || chatLoading) return;
    setMessage('');
    setChat(items => [...items, { role: 'user', content: text }]);
    setChatLoading(true);
    try {
      const response = await fetch('/api/safety-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, safety }),
      });
      const data = await response.json();
      setChat(items => [...items, { role: 'assistant', content: response.ok ? data.reply : 'The safety chat is unavailable. Refresh the live brief and check PAGASA.' }]);
    } catch {
      setChat(items => [...items, { role: 'assistant', content: 'The safety chat is unavailable. Refresh the live brief and check PAGASA.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  const heat = safety?.weather.heatIndexC;
  const flood = safety?.flood.risk;
  const rain = safety?.flood.rainfallMm;
  const activePoints = safety?.flood.hazardPoints || [];

  return (
    <section className="safety-desk" aria-labelledby="safety-desk-title">
      <div className="safety-desk-heading">
        <div>
          <div className="safety-kicker"><Sparkle size={15} weight="fill" />Live safety feed</div>
          <h2 id="safety-desk-title">Heat and flood watch</h2>
          <p>Point-accurate flood risk & rain-dependent monitoring with PAGASA status.</p>
        </div>
        <span className={`advisor-status ${safety ? 'connected' : ''}`}>
          <span />
          {safety ? `Updated ${new Date(safety.fetchedAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}` : 'Not refreshed'}
        </span>
      </div>

      <div className="flood-rain-selector" role="group" aria-label="Rain-dependent flood simulation">
        <span className="small muted">Rainfall setting:</span>
        {(['live', '0', '10', '24', '40'] as const).map(option => (
          <button
            key={option}
            type="button"
            className={`rain-chip ${rainOption === option ? 'selected' : ''}`}
            aria-pressed={rainOption === option}
            onClick={() => {
              setRainOption(option);
              refreshAdvice(option);
            }}
          >
            {option === 'live' ? 'Live (Meteo/PAGASA)' : option === '0' ? 'Dry (0 mm/h)' : option === '10' ? 'Moderate (10 mm/h)' : option === '24' ? 'Heavy (24 mm/h)' : 'Storm (40 mm/h)'}
          </button>
        ))}
      </div>

      <div className="safety-metrics">
        <div className="safety-metric heat">
          <Fire size={20} weight="fill" />
          <span>
            <small>Heat index</small>
            <strong>{heat === undefined ? '—' : `${heat}°C`}</strong>
            <em>{heat === undefined ? 'Refresh to check' : heat >= 42 ? 'Danger' : heat >= 33 ? 'Caution' : 'Lower risk'}</em>
          </span>
        </div>

        <div className="safety-metric flood">
          <CloudRain size={20} weight="fill" />
          <span>
            <small>Flood exposure</small>
            <strong>{flood ? flood[0].toUpperCase() + flood.slice(1) : '—'}</strong>
            <em>{rain !== undefined ? `${rain.toFixed(1)} mm/h (${rain <= 0.5 ? 'Dry roads' : activePoints.length ? `${activePoints.length} flood points` : 'No ponding'})` : safety?.flood.pagasaWatch ? 'PAGASA flood watch' : 'PAGASA checked'}</em>
          </span>
        </div>

        <div className="safety-metric">
          <Drop size={20} weight="fill" />
          <span>
            <small>Mapped stops</small>
            <strong>{safety ? safety.places.length : '—'}</strong>
            <em>Cooling, shade, stores</em>
          </span>
        </div>
      </div>

      {activePoints.length > 0 && (
        <div className="active-flood-points">
          <strong>Active flooded points ({activePoints.length}):</strong>
          <div className="flood-points-list">
            {activePoints.map((pt, idx) => (
              <span key={idx} className={`flood-tag ${pt.properties?.isImpassable ? 'severe' : ''}`}>
                {pt.properties?.label || pt.properties?.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {safety && <p className="safety-source-note">{safety.flood.note} Sources: Open-Meteo, PAGASA, and OpenStreetMap. Rain-calibrated point flood model.</p>}

      <div className="safety-desk-actions">
        <button className="primary-button" onClick={() => refreshAdvice()} disabled={loading}>
          {loading ? 'Refreshing live conditions…' : safety ? 'Refresh safety brief' : 'Get live safety brief'}
          <ArrowUpRight size={18} />
        </button>
        {advice && (
          <button className="secondary-button" onClick={() => { setOrdered(true); onApplyOrder(advice.sortedOrderIds); }}>
            Apply safer order
          </button>
        )}
      </div>

      {advice && (
        <div className="safety-recommendation" role="status">
          <div className="recommendation-icon"><Warning size={20} weight="fill" /></div>
          <div>
            <strong>{advice.summary}</strong>
            <p>{advice.route}</p>
            <small>{advice.source === 'local-fallback' ? 'Fallback guidance. Live source refresh failed.' : advice.source === 'groq-gpt-oss' ? 'Generated by Groq GPT OSS with retrieved safety context.' : 'Generated from the current safety brief.'}</small>
          </div>
        </div>
      )}

      {ordered && <p className="safety-applied" role="status">Safer order applied to the request list below.</p>}
      {ordered && visibleOrders.length > 0 && (
        <div className="safety-order-preview">
          <strong>Recommended sequence</strong>
          {visibleOrders.slice(0, 3).map((order, index) => (
            <span key={order.id}>
              <b>{index + 1}</b>
              {order.service === 'ride' ? 'Passenger ride' : 'Parcel delivery'} to {resolvePlace(order.destinationId, order.destinationPlace)?.name}
              <em>{currency(order.quote.total)}</em>
            </span>
          ))}
        </div>
      )}

      <div className="safety-chat">
        <div className="safety-chat-heading">
          <span><ChatCircle size={20} /><strong>Safety chat</strong></span>
          <small>Ask about the live brief</small>
        </div>
        <div className="safety-chat-messages" aria-live="polite">
          {chat.length === 0 && <p className="safety-chat-empty">Ask “Is it safe to take this job?” or “Where can I cool down?”</p>}
          {chat.map((item, index) => <p className={`safety-chat-message ${item.role}`} key={`${item.role}-${index}`}>{item.content}</p>)}
          {chatLoading && <p className="safety-chat-message assistant">Checking the latest safety brief…</p>}
        </div>
        <form onSubmit={sendMessage} className="safety-chat-form">
          <input value={message} onChange={event => setMessage(event.target.value)} placeholder="Ask about heat, flooding, or stops" aria-label="Safety chat message" maxLength={500} />
          <button type="submit" aria-label="Send safety chat message" disabled={chatLoading || !message.trim()}><PaperPlaneRight size={17} /></button>
        </form>
      </div>
    </section>
  );
}
