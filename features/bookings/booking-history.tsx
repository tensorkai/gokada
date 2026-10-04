'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Motorcycle, Package, ClockCounterClockwise } from '@phosphor-icons/react';
import { resolvePlace } from '@/features/bookings/model';
import { useBookings } from './store';
import { currency, statusLabel } from './model';

export function BookingHistory() {
  const bookings = useBookings();
  const [filter, setFilter] = useState('all');
  const visible = bookings.filter(booking => filter === 'all' || booking.service === filter);
  return <div className="content-page"><div className="page-intro"><div><div className="welcome-line"><ClockCounterClockwise size={17} />Your everyday journeys</div><h1>My bookings</h1><p>Your rides and deliveries, all in one place.</p></div><Link className="secondary-button" href="/">Book a trip<ArrowUpRight size={18} /></Link></div><div className="history-tabs" aria-label="Filter bookings">{[['all', 'All bookings'], ['ride', 'Rides'], ['delivery', 'Deliveries']].map(([key, label]) => <button aria-pressed={filter === key} className={filter === key ? 'selected' : ''} onClick={() => setFilter(key)} key={key}>{label}{key === 'all' && <span>{bookings.length}</span>}</button>)}</div>{visible.length ? <div className="history-list">{visible.map(booking => { const pickup = resolvePlace(booking.pickupId, booking.pickupPlace); const destination = resolvePlace(booking.destinationId, booking.destinationPlace); return <Link href={`/bookings/${booking.id}`} className="history-row" key={booking.id}><span className="history-icon">{booking.service === 'ride' ? <Motorcycle size={30} /> : <Package size={30} />}</span><div className="history-destination"><small>{booking.service === 'ride' ? 'Motorcycle ride' : 'Parcel delivery'} · {new Date(booking.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })}</small><h3>{destination?.name}</h3><p>From {pickup?.name}</p></div><span className={`status-badge ${booking.status}`}>{statusLabel(booking.status, booking.service)}</span><strong>{currency(booking.quote.total)}</strong><ArrowRight size={20} /></Link>; })}</div> : <div className="empty-state"><span><ClockCounterClockwise size={45} weight="duotone" /></span><h2>{filter === 'all' ? 'Your first journey starts here.' : `No ${filter === 'ride' ? 'rides' : 'deliveries'} just yet.`}</h2><p>Book a ride or send a parcel. You’ll find its progress and details right here.</p><Link className="primary-button" href={filter === 'delivery' ? '/delivery' : '/ride'}>Let’s get moving<ArrowRight size={19} /></Link></div>}<p className="history-note">Demo bookings are stored in this browser only. Clear them from your guest profile.</p></div>;
}
