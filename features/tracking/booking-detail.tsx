'use client';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Motorcycle, Package, Star, Wallet, CheckCircle, XCircle } from '@phosphor-icons/react';
import { MetroMap } from '@/components/maps/metro-map';
import { Dialog } from '@/components/ui/dialog';
import { findPlace } from '@/data/demo/places';
import { useBookings, saveBooking } from '@/features/bookings/store';
import { currency, nextStatus, statusLabel, type BookingStatus } from '@/features/bookings/model';
const subscribe = () => () => {};
const stages: BookingStatus[] = ['confirmed', 'arriving', 'in-progress', 'completed'];

export function BookingDetail({ id }: { id: string }) {
  const bookings = useBookings();
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const booking = bookings.find(item => item.id === id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState('');
  if (!ready) return <div className="content-page"><div className="loading-block" role="status">Loading your booking…</div></div>;
  if (!booking) return <div className="content-page empty-state"><XCircle size={45} /><h1>Booking not found</h1><p>This demo booking may be on another browser or may have been cleared.</p><Link className="primary-button" href="/bookings">Back to my bookings<ArrowRight size={18} /></Link></div>;
  const pickup = findPlace(booking.pickupId), destination = findPlace(booking.destinationId);
  const finished = booking.status === 'completed' || booking.status === 'cancelled';
  const stage = stages.indexOf(booking.status);
  const update = (status: BookingStatus) => { try { saveBooking({ ...booking, status }); setError(''); setCancelOpen(false); } catch { setError('Could not save this update. Enable browser storage and try again.'); } };
  return <div className="content-page detail-page"><Link className="back-link" href="/bookings"><ArrowLeft size={18} />My bookings</Link><div className="page-intro"><div><div className="welcome-line"><span className="tiny-dot" />Demo {booking.service === 'ride' ? 'ride' : 'delivery'} · {booking.id.slice(0, 11).toUpperCase()}</div><h1>{statusLabel(booking.status, booking.service)}</h1><p>{booking.status === 'completed' ? 'One more thing off your list. Thanks for going with Gokada.' : booking.status === 'cancelled' ? 'Plans change. Your demo booking has been cancelled at no charge.' : 'You’re all set. Follow your journey right here.'}</p></div><span className={`status-badge ${booking.status}`}>{finished ? 'Demo finished' : 'Simulated journey'}</span></div>
    <div className="booking-workspace"><div className="tracking-panel">
      {finished ? <div className="completion-message">{booking.status === 'completed' ? <CheckCircle size={62} weight="duotone" /> : <XCircle size={62} weight="duotone" />}<h2>{booking.status === 'completed' ? (booking.service === 'ride' ? 'You’ve arrived.' : 'Parcel delivered.') : 'Booking cancelled.'}</h2><p>{booking.status === 'completed' ? 'This demo journey is complete. No payment was collected.' : 'No cancellation fee or payment was collected.'}</p></div> : <><div className="driver-card"><span className="driver-avatar">MR</span><div><h2>Miguel Reyes</h2><p><Star size={13} weight="fill" />4.9 <span>· Demo driver</span></p><small>Green motorcycle · DEMO 01</small></div><ShieldCheck size={24} className="driver-shield" /></div><ol className="journey-steps">{stages.map((status, index) => <li className={index <= stage ? 'done' : ''} key={status}><span>{index < stage ? <Check size={13} weight="bold" /> : <i />}</span><div><strong>{statusLabel(status, booking.service)}</strong>{index === stage && <small>{['Your request is ready for the demo driver.', 'Miguel is heading to your pickup.', booking.service === 'ride' ? 'Enjoy the simulated journey.' : 'Your demo parcel has been collected.', 'All done.'][index]}</small>}</div></li>)}</ol></>}
      <div className="trip-receipt"><h3>Trip details</h3><div className="review-route"><div><span className="route-letter">A</span><span><small>Pickup</small><strong>{pickup?.name}</strong><p>{pickup?.city}</p></span></div><div><span className="route-letter dark">B</span><span><small>Drop-off</small><strong>{destination?.name}</strong><p>{destination?.city}</p></span></div></div>{booking.service === 'delivery' && <div className="recipient-summary"><Package size={20} /><span>{booking.recipient}<small>{booking.phone} · {booking.parcel} parcel</small></span></div>}{booking.notes && <p className="driver-note">Driver note: {booking.notes}</p>}<div className="receipt-total"><span><Wallet size={19} />Demo cash fare</span><strong>{currency(booking.quote.total)}</strong></div><p className="small muted">{booking.quote.distance} km · ~{booking.quote.minutes} min · illustrative estimates</p></div>
      {error && <p role="alert" className="form-error">{error}</p>}
      {!finished ? <div className="demo-controls"><div><span className="demo-tag">Demo controls</span><p>You’re in control. Advance each stage to present the journey.</p></div><button className="primary-button" onClick={() => update(nextStatus(booking.status))}>{booking.status === 'confirmed' ? 'Simulate driver arrival' : booking.status === 'arriving' ? (booking.service === 'ride' ? 'Start demo ride' : 'Collect demo parcel') : (booking.service === 'ride' ? 'Complete demo ride' : 'Complete demo delivery')}<ArrowRight size={18} /></button><button className="cancel-booking" onClick={() => setCancelOpen(true)}>Cancel demo booking</button></div> : <Link className="primary-button" href={booking.service === 'ride' ? '/ride' : '/delivery'}>{booking.service === 'ride' ? <Motorcycle size={21} /> : <Package size={21} />}Book another {booking.service === 'ride' ? 'ride' : 'delivery'}</Link>}
    </div><MetroMap pickup={pickup} destination={destination} progress={booking.status === 'cancelled' ? 0 : stage / 3} /></div>
    <Dialog title="Cancel this booking?" open={cancelOpen} onClose={() => setCancelOpen(false)}><p className="muted">This ends the simulated journey. There is no cancellation fee.</p><div className="button-row"><button className="secondary-button" onClick={() => setCancelOpen(false)}>Keep booking</button><button className="danger-button" onClick={() => update('cancelled')}>Yes, cancel booking</button></div></Dialog>
  </div>;
}
