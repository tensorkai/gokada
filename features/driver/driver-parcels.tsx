'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { ArrowRight, CheckCircle, Package, MapPin, Power, Lightning } from '@phosphor-icons/react';
import { MetroMap } from '@/components/maps/metro-map';
import { Dialog } from '@/components/ui/dialog';
import { places, findPlace } from '@/data/demo/places';
import { resolvePlace } from '@/features/bookings/model';
import { currency, isBooking, type Booking } from '@/features/bookings/model';
import { saveBooking, updateDriverBooking, useBookings } from '@/features/bookings/store';
import { SafetyDesk } from './safety-desk';

const subscribe = () => () => {};

export function DriverParcels() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const bookings = useBookings();
  const [online, setOnline] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [skipped, setSkipped] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [safeOrderIds, setSafeOrderIds] = useState<string[]>([]);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [demoPickupId, setDemoPickupId] = useState('ayala');
  const [demoDestinationId, setDemoDestinationId] = useState('capitol');
  
  const activeJobs = bookings.filter(job => job.acceptedByDemoDriver && ['arriving', 'in-progress'].includes(job.status) && job.service === 'delivery');
  const requests = bookings.filter(job => job.status === 'confirmed' && !job.acceptedByDemoDriver && !skipped.includes(job.id) && job.service === 'delivery');
  const orderedRequests = safeOrderIds.length ? [...requests].sort((a, b) => safeOrderIds.indexOf(a.id) - safeOrderIds.indexOf(b.id)) : requests;
  const selected = activeJobs.find(job => job.id === selectedId) || orderedRequests.find(job => job.id === selectedId) || activeJobs[0] || orderedRequests[0];
  const completed = bookings.filter(job => job.acceptedByDemoDriver && job.status === 'completed' && job.service === 'delivery');
  const fareTotal = completed.reduce((sum, job) => sum + job.quote.total, 0);

  function act(id: string, action: 'accept' | 'start' | 'complete' | 'cancel') {
    if (action === 'accept' && !online) { setError('Go online to accept a demo job.'); return; }
    try {
      updateDriverBooking(id, action);
      setError('');
      setCancelId(null);
      setNotice(action === 'complete' ? 'Demo delivery completed. Fares updated.' : action === 'cancel' ? 'Demo job cancelled.' : action === 'accept' ? 'Job accepted.' : 'Journey started.');
    } catch (err) {
      setError(err instanceof Error && !(err instanceof DOMException) ? err.message : 'Could not save update.');
      setCancelId(null);
    }
  }

  async function addDemoJob() {
    if (pending) return;
    setPending(true); setError(''); setNotice('');
    const pickupId = demoPickupId;
    let destinationId = demoDestinationId;
    if (pickupId === destinationId) {
      destinationId = pickupId === 'ayala' ? 'capitol' : 'ayala';
    }
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          service: 'delivery',
          pickupId,
          destinationId,
          recipient: 'Demo Recipient',
          phone: '09123456789',
          parcel: 'small',
          notes: 'Sample parcel job.',
        }),
      });
      const data = await response.json();
      if (!response.ok || !isBooking(data.booking)) throw new Error(data.error || 'Could not create a sample job. Try again.');
      try { saveBooking(data.booking); } catch { throw new Error('Could not save the sample job. Enable browser storage and try again.'); }
      setSelectedId(data.booking.id);
      setNotice(`Demo delivery request added. Go online to accept requests.`);
    } catch (err) { setError(err instanceof Error && err.name !== 'TimeoutError' ? err.message : 'The request timed out. Try adding the sample job again.'); }
    finally { setPending(false); }
  }

  if (!hydrated) return <div className="content-page"><p className="loading-block" role="status">Loading driver workspace…</p></div>;

  return <div className="content-page driver-page">
    <div className="page-intro"><div><div className="welcome-line"><Lightning size={20} />Batch Parcels</div><h1>Multiple Orders.</h1><p>Optimize your route for heat and floods with AI.</p></div></div>
    <p className="demo-notice">Driver demo: batch orders are simulated in this browser.</p>
    <div className="driver-shift">
      <div><span className={`driver-availability ${online ? 'online' : ''}`} /><strong>{online ? 'Online for demo requests' : 'You’re offline'}</strong><p>Go online when you’re ready to accept batch deliveries.</p></div>
      <button className={online ? 'secondary-button' : 'primary-button'} aria-pressed={online} onClick={() => { setOnline(!online); setError(''); }}><Power size={19} />{online ? 'Go offline' : 'Go online'}</button>
    </div>
    
    <div className="driver-summary" aria-label="Driver demo totals"><div><strong>{completed.length}</strong><span>Completed deliveries</span></div><div><strong>{currency(fareTotal)}</strong><span>Completed demo fares</span></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <p className="driver-feedback" role="status">{notice}</p>
    
    <SafetyDesk orders={requests} onApplyOrder={setSafeOrderIds} />
    
    <div className="driver-workspace">
      <section className="driver-jobs" aria-label={activeJobs.length ? 'Active deliveries' : 'Job requests'}>
        {activeJobs.length > 0 && <>
          <div className="driver-section-title"><h2>Your active deliveries</h2><span className="demo-tag">{activeJobs.length} Accepted</span></div>
          <div className="driver-request-list">{activeJobs.map(job => <button key={job.id} className="driver-request" aria-pressed={selected?.id === job.id} onClick={() => setSelectedId(job.id)}><Package size={24} /><span><small>{job.status}</small><strong>{findPlace(job.destinationId)?.name}</strong></span><b>{currency(job.quote.total)}</b></button>)}</div>
        </>}
        
        {(!activeJobs.length || requests.length > 0) && <>
          <div className="driver-section-title"><h2>Delivery requests</h2><span>{requests.length} available</span></div>
          {requests.length ? <div className="driver-request-list">{orderedRequests.map(job => <button key={job.id} className="driver-request" aria-pressed={selected?.id === job.id} onClick={() => setSelectedId(job.id)}><Package size={24} /><span><small>Parcel delivery</small><strong>{findPlace(job.destinationId)?.name}</strong></span><b>{currency(job.quote.total)}</b></button>)}</div> : <div className="driver-empty"><MapPin size={32} /><h3>No requests to show</h3><p>Add a sample job below.</p></div>}
        </>}
        
        {selected && <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--line)'}}>
          <JobDetails job={selected} />
          {selected.acceptedByDemoDriver ? (
             <>
               <button className="primary-button driver-action" onClick={() => act(selected.id, selected.status === 'arriving' ? 'start' : 'complete')}>{selected.status === 'arriving' ? 'Collect parcel' : 'Complete delivery'}<ArrowRight size={19} /></button>
               <button className="cancel-booking" onClick={() => setCancelId(selected.id)}>Cancel active job</button>
             </>
          ) : (
             <>
               <button className="primary-button driver-action" disabled={!online || pending} onClick={() => act(selected.id, 'accept')}>Accept delivery<ArrowRight size={19} /></button>
               {!online && <p className="small muted">Go online above to accept this request.</p>}
               <button className="cancel-booking" onClick={() => { setSkipped(items => [...items, selected.id]); setNotice('Request skipped.'); }}>Skip this request</button>
             </>
          )}
        </div>}
        
        <div className="driver-demo-tools">
          <h3>Try the batch demo</h3>
          <div className="demo-location-config">
            <div className="demo-location-heading">
              <label><strong>Configure demo parcel locations</strong></label>
              <span className="demo-tag">Configurable</span>
            </div>
            <div className="demo-location-fields">
              <div className="field">
                <label htmlFor="parcel-pickup-select">Parcel Pickup</label>
                <select
                  id="parcel-pickup-select"
                  aria-label="Demo parcel pickup"
                  value={demoPickupId}
                  onChange={e => setDemoPickupId(e.target.value)}
                >
                  {places.map(place => (
                    <option key={place.id} value={place.id}>{place.name} ({place.city})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="parcel-dest-select">Parcel Drop-off</label>
                <select
                  id="parcel-dest-select"
                  aria-label="Demo parcel drop-off"
                  value={demoDestinationId}
                  onChange={e => setDemoDestinationId(e.target.value)}
                >
                  {places.map(place => (
                    <option key={place.id} value={place.id}>{place.name} ({place.city})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="demo-presets-row">
              <span className="small muted">Presets:</span>
              <button
                type="button"
                className="demo-preset-chip"
                onClick={() => { setDemoPickupId('ayala'); setDemoDestinationId('capitol'); }}
              >
                Ayala → Capitol
              </button>
              <button
                type="button"
                className="demo-preset-chip"
                onClick={() => { setDemoPickupId('eastwood'); setDemoDestinationId('megamall'); }}
              >
                Eastwood → Megamall
              </button>
              <button
                type="button"
                className="demo-preset-chip"
                onClick={() => { setDemoPickupId('alabang'); setDemoDestinationId('laspinas'); }}
              >
                Alabang → Las Piñas
              </button>
            </div>
          </div>
          <div className="button-row">
            <button className="secondary-button" disabled={pending} onClick={() => addDemoJob()}>Add demo delivery</button>
          </div>
        </div>
      </section>
      <div className="driver-map"><MetroMap pickup={selected ? resolvePlace(selected.pickupId, selected.pickupPlace) : undefined} destination={selected ? resolvePlace(selected.destinationId, selected.destinationPlace) : undefined} progress={selected?.status === 'in-progress' ? 0.5 : 0} showSafety /><p>Road route preview with live mapped cooling, shade, and convenience stops.</p></div>
    </div>
    
    <section className="driver-completed"><div className="driver-section-title"><h2>Completed by you</h2><CheckCircle size={24} /></div>{completed.length ? completed.map(job => <Link className="driver-completed-row" href={`/bookings/${job.id}`} key={job.id}><span><strong>{findPlace(job.destinationId)?.name}</strong><small>Parcel delivery · {job.id.slice(0, 11)}</small></span><b>{currency(job.quote.total)}</b></Link>) : <p>Complete an accepted job to see it here.</p>}</section>
    
    <Dialog open={cancelId !== null} title="Cancel this demo job?" onClose={() => setCancelId(null)}><p>This also cancels the customer’s booking.</p><div className="button-row"><button className="secondary-button" onClick={() => setCancelId(null)}>Keep active job</button><button className="danger-button" onClick={() => cancelId && act(cancelId, 'cancel')}>Cancel demo job</button></div></Dialog>
  </div>;
}

function JobDetails({ job }: { job: Booking }) {
  const pickup = resolvePlace(job.pickupId, job.pickupPlace);
  const destination = resolvePlace(job.destinationId, job.destinationPlace);
  return <div className="driver-job-details">
    <div className="driver-job-fare"><span>Parcel delivery<small>{job.quote.distance} km · ~{job.quote.minutes} min</small></span><strong>{currency(job.quote.total)}</strong></div>
    <div className="review-route">
      <div><span className="route-letter">A</span><span><small>Pickup</small><strong>{pickup?.name}</strong><p>{pickup?.address}</p></span></div>
      <div><span className="route-letter dark">B</span><span><small>Drop-off</small><strong>{destination?.name}</strong><p>{destination?.address}</p></span></div>
    </div>
    {job.service === 'delivery' && <div className="driver-recipient"><strong>{job.recipient}</strong><p>{job.phone} · {job.parcel === 'small' ? 'Small parcel, up to 3 kg' : 'Medium parcel, up to 5 kg'}</p></div>}
    {job.notes && <p className="driver-note">Customer note: {job.notes}</p>}
  </div>;
}
