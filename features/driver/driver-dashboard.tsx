'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { ArrowRight, CheckCircle, Motorcycle, Package, MapPin, Power } from '@phosphor-icons/react';
import { MetroMap } from '@/components/maps/metro-map';
import { Dialog } from '@/components/ui/dialog';
import { findPlace } from '@/data/demo/places';
import { currency, isBooking, type Booking, type Service } from '@/features/bookings/model';
import { saveBooking, updateDriverBooking, useBookings } from '@/features/bookings/store';
import { SafetyDesk } from './safety-desk';

const subscribe = () => () => {};

export function DriverDashboard() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const bookings = useBookings();
  const [online, setOnline] = useState(false);
  const [filter, setFilter] = useState<'all' | Service>('all');
  const [selectedId, setSelectedId] = useState('');
  const [skipped, setSkipped] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [safeOrderIds, setSafeOrderIds] = useState<string[]>([]);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const active = bookings.find(job => job.acceptedByDemoDriver && ['arriving', 'in-progress'].includes(job.status));
  const requests = bookings.filter(job => job.status === 'confirmed' && !job.acceptedByDemoDriver && !skipped.includes(job.id) && (filter === 'all' || job.service === filter));
  const orderedRequests = safeOrderIds.length ? [...requests].sort((a, b) => safeOrderIds.indexOf(a.id) - safeOrderIds.indexOf(b.id)) : requests;
  const selected = active || orderedRequests.find(job => job.id === selectedId) || orderedRequests[0];
  const completed = bookings.filter(job => job.acceptedByDemoDriver && job.status === 'completed');
  const fareTotal = completed.reduce((sum, job) => sum + job.quote.total, 0);

  function act(id: string, action: 'accept' | 'start' | 'complete' | 'cancel') {
    if (action === 'accept' && !online) { setError('Go online to accept a demo job.'); return; }
    try {
      updateDriverBooking(id, action);
      setError('');
      setCancelId(null);
      setNotice(action === 'complete' ? 'Demo job completed. Your completed fares have been updated.' : action === 'cancel' ? 'Demo job cancelled. The customer booking has been updated.' : action === 'accept' ? 'Job accepted. Head to the pickup in this simulation.' : 'Demo journey started.');
    } catch (err) {
      setError(err instanceof Error && !(err instanceof DOMException) ? err.message : 'Could not save this update. Enable browser storage and try again.');
      setCancelId(null);
    }
  }

  async function addDemoJob(service: Service) {
    if (pending) return;
    setPending(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(12000),
        body: JSON.stringify({ service, pickupId: 'ayala', destinationId: service === 'ride' ? 'bgc' : 'capitol', recipient: service === 'delivery' ? 'Demo Recipient' : '', phone: service === 'delivery' ? '09123456789' : '', parcel: 'small', notes: 'Sample job for the driver demo. Meet at the landmark entrance.' }),
      });
      const data = await response.json();
      if (!response.ok || !isBooking(data.booking)) throw new Error(data.error || 'Could not create a sample job. Try again.');
      try { saveBooking(data.booking); } catch { throw new Error('Could not save the sample job. Enable browser storage and try again.'); }
      setSelectedId(data.booking.id); setFilter('all');
      setNotice(`Demo ${service} request added. Go online to accept requests.`);
    } catch (err) { setError(err instanceof Error && err.name !== 'TimeoutError' ? err.message : 'The request timed out. Try adding the sample job again.'); }
    finally { setPending(false); }
  }

  if (!hydrated) return <div className="content-page"><p className="loading-block" role="status">Loading driver workspace…</p></div>;

  return <div className="content-page driver-page">
    <div className="page-intro"><div><div className="welcome-line"><Motorcycle size={20} />Driver workspace</div><h1>Your next job, your call.</h1><p>Review the trip. Know the fare. Take one job at a time.</p></div></div>
    <p className="demo-notice">Driver demo: requests and progress are simulated in this browser. No real dispatch, navigation, or payouts.</p>
    <div className="driver-shift">
      <div><span className={`driver-availability ${online ? 'online' : ''}`} /><strong>{online ? 'Online for demo requests' : 'You’re offline'}</strong><p>{active ? 'Your active job stays available when you go offline.' : 'Go online when you’re ready to accept a job.'}</p></div>
      <button className={online ? 'secondary-button' : 'primary-button'} aria-pressed={online} onClick={() => { setOnline(!online); setError(''); }}><Power size={19} />{online ? 'Go offline' : 'Go online'}</button>
    </div>
    <div className="driver-summary" aria-label="Driver demo totals"><div><strong>{completed.length}</strong><span>Completed jobs</span></div><div><strong>{currency(fareTotal)}</strong><span>Completed demo fares</span></div><p>Totals from your saved jobs in this browser. Gross sample fares, not take-home earnings or money paid.</p></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <p className="driver-feedback" role="status">{notice}</p>
    <SafetyDesk orders={requests} onApplyOrder={setSafeOrderIds} />
    <div className="driver-workspace">
      <section className="driver-jobs" aria-label={active ? 'Active job' : 'Job requests'}>
        {active ? <><div className="driver-section-title"><h2>Your active job</h2><span className="demo-tag">Accepted</span></div><JobDetails job={active} />
          <div className="driver-next-step"><small>Next step</small><h3>{active.status === 'arriving' ? (active.service === 'ride' ? 'Meet your passenger' : 'Collect the parcel') : (active.service === 'ride' ? 'Take your passenger to drop-off' : 'Deliver to the recipient')}</h3><p>{active.status === 'arriving' ? 'Confirm the pickup before starting the simulated journey.' : 'Confirm arrival before completing the simulated job.'}</p></div>
          <button className="primary-button driver-action" onClick={() => act(active.id, active.status === 'arriving' ? 'start' : 'complete')}>{active.status === 'arriving' ? (active.service === 'ride' ? 'Pick up passenger' : 'Collect parcel') : (active.service === 'ride' ? 'Complete ride' : 'Complete delivery')}<ArrowRight size={19} /></button>
          <button className="cancel-booking" onClick={() => setCancelId(active.id)}>Cancel active job</button>
          <Link className="driver-customer-link" href={`/bookings/${active.id}`}>View customer booking</Link>
        </> : <>
          <div className="driver-section-title"><h2>Job requests</h2><span>{requests.length} available</span></div>
          <div className="driver-filters" role="group" aria-label="Filter job requests">{(['all', 'ride', 'delivery'] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? 'All jobs' : value === 'ride' ? 'Rides' : 'Deliveries'}</button>)}</div>
          {requests.length ? <div className="driver-request-list">{orderedRequests.map(job => <button key={job.id} className="driver-request" aria-pressed={selected?.id === job.id} onClick={() => setSelectedId(job.id)}>{job.service === 'ride' ? <Motorcycle size={24} /> : <Package size={24} />}<span><small>{job.service === 'ride' ? 'Passenger ride' : 'Parcel delivery'}</small><strong>{findPlace(job.destinationId)?.name}</strong></span><b>{currency(job.quote.total)}</b></button>)}</div> : <div className="driver-empty"><MapPin size={32} /><h3>No requests to show</h3><p>Add a sample job below, change the filter, or create a booking from the customer view.</p></div>}
          {selected && <><JobDetails job={selected} /><button className="primary-button driver-action" disabled={!online || pending} onClick={() => act(selected.id, 'accept')}>Accept {selected.service === 'ride' ? 'ride' : 'delivery'}<ArrowRight size={19} /></button>{!online && <p className="small muted">Go online above to accept this request.</p>}<button className="cancel-booking" onClick={() => { setSkipped(items => [...items, selected.id]); setNotice('Request skipped for this visit. The customer booking is unchanged.'); }}>Skip this request</button></>}
          {skipped.length > 0 && <button className="secondary-button" onClick={() => setSkipped([])}>Show skipped requests</button>}
        </>}
        <div className="driver-demo-tools"><h3>Try the driver demo</h3><p>Add a fictional request, or <Link href="/ride">create a customer booking</Link>. Both views share the same saved jobs.</p><div className="button-row"><button className="secondary-button" disabled={pending} onClick={() => addDemoJob('ride')}>Add demo ride</button><button className="secondary-button" disabled={pending} onClick={() => addDemoJob('delivery')}>Add demo delivery</button></div>{pending && <p role="status">Adding sample job…</p>}</div>
      </section>
      <div className="driver-map"><MetroMap pickup={selected ? findPlace(selected.pickupId) : undefined} destination={selected ? findPlace(selected.destinationId) : undefined} progress={active ? (active.status === 'arriving' ? 0 : 0.5) : 0} /><p>Illustrative connection only. This map does not provide turn-by-turn directions.</p></div>
    </div>
    <section className="driver-completed"><div className="driver-section-title"><h2>Completed by you</h2><CheckCircle size={24} /></div>{completed.length ? completed.map(job => <Link className="driver-completed-row" href={`/bookings/${job.id}`} key={job.id}><span><strong>{findPlace(job.destinationId)?.name}</strong><small>{job.service === 'ride' ? 'Passenger ride' : 'Parcel delivery'} · {job.id.slice(0, 11)}</small></span><b>{currency(job.quote.total)}</b></Link>) : <p>Complete an accepted job to see it here. Cancelled jobs do not count toward your totals.</p>}</section>
    <Dialog open={cancelId !== null} title="Cancel this demo job?" onClose={() => setCancelId(null)}><p>This also cancels the customer’s booking in this browser. No fee is charged.</p><div className="button-row"><button className="secondary-button" onClick={() => setCancelId(null)}>Keep active job</button><button className="danger-button" onClick={() => cancelId && act(cancelId, 'cancel')}>Cancel demo job</button></div></Dialog>
  </div>;
}

function JobDetails({ job }: { job: Booking }) {
  const pickup = findPlace(job.pickupId), destination = findPlace(job.destinationId);
  return <div className="driver-job-details"><div className="driver-job-fare"><span>{job.service === 'ride' ? 'Passenger ride' : 'Parcel delivery'}<small>{job.quote.distance} km · ~{job.quote.minutes} min, illustrative</small></span><strong>{currency(job.quote.total)}</strong></div><div className="review-route"><div><span className="route-letter">A</span><span><small>Pickup</small><strong>{pickup?.name}</strong><p>{pickup?.address}</p></span></div><div><span className="route-letter dark">B</span><span><small>Drop-off</small><strong>{destination?.name}</strong><p>{destination?.address}</p></span></div></div>{job.service === 'delivery' && <div className="driver-recipient"><strong>{job.recipient}</strong><p>{job.phone} · {job.parcel === 'small' ? 'Small parcel, up to 3 kg' : 'Medium parcel, up to 5 kg'}</p></div>}{job.notes && <p className="driver-note">Customer note: {job.notes}</p>}<p className="small muted">Demo cash fare. No payment is collected.</p></div>;
}
