'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, CloudRain, Drop, Fire, Sparkle, Warning } from '@phosphor-icons/react';
import { findPlace } from '@/data/demo/places';
import { currency, type Booking } from '@/features/bookings/model';

type Props = { orders: Booking[]; onApplyOrder: (ids: string[]) => void };
type Advice = { source: 'vercel-ai' | 'local-demo' | 'local-fallback'; summary: string; route: string; sortedOrderIds: string[] };

export function SafetyDesk({ orders, onApplyOrder }: Props) {
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [loading, setLoading] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const heatIndexC = 37;
  const floodRisk = 'medium' as const;
  const visibleOrders = useMemo(() => {
    if (!ordered || !advice) return orders;
    const rank = new Map(advice.sortedOrderIds.map((id, index) => [id, index]));
    return [...orders].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  }, [advice, orders, ordered]);

  async function refreshAdvice() {
    setLoading(true);
    try {
      const response = await fetch('/api/safety-advisor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions: { heatIndexC, floodRisk }, orders: orders.map(order => ({ id: order.id, service: order.service, destination: findPlace(order.destinationId)?.name ?? 'Unknown stop', etaMinutes: order.quote.minutes })) }),
      });
      if (!response.ok) throw new Error('Could not reach the advisor.');
      const data = await response.json() as Advice;
      setAdvice(data); setOrdered(false);
    } catch { setAdvice({ source: 'local-fallback', summary: 'The advisor is unavailable. Keep the shorter delivery sequence first and avoid flooded streets.', route: 'Use elevated main roads and avoid creek crossings.', sortedOrderIds: orders.map(order => order.id) }); }
    finally { setLoading(false); }
  }

  return <section className="safety-desk" aria-labelledby="safety-desk-title">
    <div className="safety-desk-heading"><div><div className="safety-kicker"><Sparkle size={15} weight="fill" />Connected safety assistant</div><h2 id="safety-desk-title">Heat and flood watch</h2><p>Advice for this demo shift, with order sequencing to reduce exposure.</p></div><span className={`advisor-status ${advice?.source === 'vercel-ai' ? 'connected' : ''}`}><span />{advice?.source === 'vercel-ai' ? 'Vercel AI connected' : 'Demo sensor feed'}</span></div>
    <div className="safety-metrics"><div className="safety-metric heat"><Fire size={20} weight="fill" /><span><small>Heat index</small><strong>{heatIndexC}°C</strong><em>Elevated</em></span></div><div className="safety-metric flood"><CloudRain size={20} weight="fill" /><span><small>Flood exposure</small><strong>{floodRisk === 'medium' ? 'Watch' : floodRisk}</strong><em>Check low roads</em></span></div><div className="safety-metric"><Drop size={20} weight="fill" /><span><small>Shift guidance</small><strong>{orders.length} requests</strong><em>{orders.length ? 'Ready to sequence' : 'Add a request'}</em></span></div></div>
    <div className="safety-desk-actions"><button className="primary-button" onClick={refreshAdvice} disabled={loading}>{loading ? 'Checking conditions…' : advice ? 'Refresh safety brief' : 'Ask safety assistant'}<ArrowUpRight size={18} /></button>{advice && <button className="secondary-button" onClick={() => { setOrdered(true); onApplyOrder(advice.sortedOrderIds); }}>Apply safer order</button>}</div>
    {advice ? <div className="safety-recommendation" role="status"><div className="recommendation-icon"><Warning size={20} weight="fill" /></div><div><strong>{advice.summary}</strong><p>{advice.route}</p><small>{advice.source === 'vercel-ai' ? 'Returned by the connected Vercel AI demo.' : 'Using the built-in demo advisor. Connect a Vercel endpoint for live model output.'}</small></div></div> : <p className="safety-empty">Ask the assistant to combine current conditions with your open requests.</p>}
    {ordered && <p className="safety-applied" role="status">Safer order applied to the request list below.</p>}
    {ordered && visibleOrders.length > 0 && <div className="safety-order-preview"><strong>Recommended sequence</strong>{visibleOrders.slice(0, 3).map((order, index) => <span key={order.id}><b>{index + 1}</b>{order.service === 'ride' ? 'Passenger ride' : 'Parcel delivery'} to {findPlace(order.destinationId)?.name}<em>{currency(order.quote.total)}</em></span>)}</div>}
  </section>;
}
