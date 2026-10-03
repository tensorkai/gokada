'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, ArrowsDownUp, Motorcycle, Package, Crosshair, Clock, ShieldCheck, MapPin, CaretRight, Wallet, Check, Leaf, Lightning, ArrowUpRight, Info } from '@phosphor-icons/react';
import { PlaceSearch } from '@/components/ui/place-search';
import { MetroMap } from '@/components/maps/metro-map';
import { places, findPlace, type Place } from '@/data/demo/places';
import { currency, distanceKm, getQuote, validateBooking, type Service, type BookingInput } from './model';
import { saveBooking, useBookings } from './store';

export function BookingApp({ initialService = 'ride' }: { initialService?: Service }) {
  const router = useRouter();
  const [service, setService] = useState<Service>(initialService);
  const [pickup, setPickup] = useState<Place | undefined>(places[0]);
  const [destination, setDestination] = useState<Place>();
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [parcel, setParcel] = useState<'small' | 'medium'>('small');
  const [notes, setNotes] = useState('');
  const [review, setReview] = useState(false);
  const [pending, setPending] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [locationNotice, setLocationNotice] = useState('');
  const [fareInfo, setFareInfo] = useState(false);
  const bookings = useBookings();
  const input: BookingInput = { service, pickupId: pickup?.id || '', destinationId: destination?.id || '', recipient, phone, parcel, notes };
  const quote = pickup && destination && pickup.id !== destination.id ? getQuote(input) : null;
  const changeService = (next: Service) => { setService(next); setReview(false); setError(''); window.history.replaceState(null, '', next === 'ride' ? '/ride' : '/delivery'); };
  const locate = () => {
    if (!navigator.geolocation) { setError('Location is unavailable in this browser. Choose a pickup landmark.'); return; }
    setLocating(true); setError('');
    navigator.geolocation.getCurrentPosition(position => {
      const current: Place = { id: 'current', name: '', city: '', address: '', coordinates: [position.coords.longitude, position.coords.latitude] };
      const nearest = [...places].sort((a, b) => distanceKm(current, a) - distanceKm(current, b))[0];
      if (distanceKm(current, nearest) > 12) setError('You seem to be outside the Metro Manila demo area. Choose a pickup landmark to explore.');
      else { setPickup(nearest); setLocationNotice(`Nearest demo pickup: ${nearest.name}. This is not your exact location.`); }
      setLocating(false);
    }, () => { setError('We couldn’t access your location. Allow location access or choose a pickup landmark.'); setLocating(false); }, { timeout: 10000, maximumAge: 60000 });
  };
  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valid = validateBooking(input);
    if (!valid.input) { setError(valid.error || 'Check your booking details.'); return; }
    setError('');
    if (!review) { setReview(true); return; }
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(12000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create your booking. Try again.');
      try { saveBooking(data.booking); } catch { throw new Error('Your browser could not save this demo booking. Enable site storage and try again.'); }
      router.push(`/bookings/${data.booking.id}`);
    } catch (err) { setError(err instanceof Error && err.name !== 'TimeoutError' ? err.message : 'The connection timed out. Please try again.'); setPending(false); }
  };
  return <div className="booking-page">
    <div className="page-intro"><div><div className="welcome-line"><span className="tiny-dot" />Good things are just a ride away</div><h1>Where are we going?</h1><p>A ride for you. A delivery for them. Let’s get moving.</p></div><div className="intro-note"><ShieldCheck size={21} weight="duotone" /><span>Built for your<br /><strong>everyday journeys</strong></span></div></div>
    <div className="booking-workspace">
      <div className="booking-panel">
        <div className="service-tabs" role="tablist" aria-label="Choose service"><button role="tab" aria-selected={service === 'ride'} className={service === 'ride' ? 'service-tab selected' : 'service-tab'} onClick={() => changeService('ride')}><Motorcycle size={30} weight="duotone" /><span>Book a ride<small>Beat the city rush</small></span>{service === 'ride' && <span className="tab-check"><Check size={12} weight="bold" /></span>}</button><button role="tab" aria-selected={service === 'delivery'} className={service === 'delivery' ? 'service-tab selected' : 'service-tab'} onClick={() => changeService('delivery')}><Package size={29} weight="duotone" /><span>Send a parcel<small>A little door-to-door</small></span>{service === 'delivery' && <span className="tab-check"><Check size={12} weight="bold" /></span>}</button></div>
        <form onSubmit={submit} className="booking-form">
          <div className="panel-heading">{review ? <button type="button" className="back-button" onClick={() => { setReview(false); setError(''); }}><ArrowLeft size={18} />Edit trip</button> : <h2>{service === 'ride' ? 'Let’s plan your ride' : 'Let’s send your parcel'}</h2>}<span className="leave-now"><Clock size={15} />{review ? 'Fare review' : 'Leave now'}</span></div>
          {!review ? <>
            <div className="locations"><PlaceSearch label="Pickup location" kind="pickup" value={pickup} onChange={place => { setPickup(place); setError(''); }} /><span className="location-connector" /><button className="swap-button" type="button" aria-label="Swap pickup and drop-off" onClick={() => { setPickup(destination); setDestination(pickup); }}><ArrowsDownUp size={19} /></button><PlaceSearch label="Drop-off location" kind="destination" value={destination} onChange={place => { setDestination(place); setError(''); }} /></div>
            <button className="current-location" type="button" onClick={locate} disabled={locating}><Crosshair size={17} />{locating ? 'Finding a nearby landmark…' : 'Use my current location'}</button>
            {locationNotice && <p className="small muted" role="status">{locationNotice}</p>}
            {service === 'delivery' && <div className="delivery-fields"><div className="field"><label htmlFor="recipient">Recipient name</label><input id="recipient" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Who’s receiving it?" maxLength={80} required autoComplete="off" /></div><div className="field"><label htmlFor="phone">Recipient mobile number</label><input id="phone" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09XX XXX XXXX" maxLength={16} required autoComplete="off" /></div><fieldset className="parcel-field"><legend>Parcel size</legend><label className={parcel === 'small' ? 'parcel-option selected' : 'parcel-option'}><input type="radio" name="parcel" value="small" checked={parcel === 'small'} onChange={() => setParcel('small')} /><span>Small<small>Up to 3 kg</small></span><Package size={23} /></label><label className={parcel === 'medium' ? 'parcel-option selected' : 'parcel-option'}><input type="radio" name="parcel" value="medium" checked={parcel === 'medium'} onChange={() => setParcel('medium')} /><span>Medium<small>Up to 5 kg · +₱20</small></span><Package size={29} /></label></fieldset><p className="small muted">Demo parcel limits. Use fictional recipient details.</p></div>}
            <div className="field note-field"><label htmlFor="notes">Note for your driver <span>Optional</span></label><input id="notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={300} placeholder="A landmark, entrance, or anything helpful" /></div>
          </> : <div className="review-details"><h2>One last look.</h2><p className="muted">Check your details before booking.</p><div className="review-route"><div><span className="route-letter">A</span><span><small>Pickup</small><strong>{pickup?.name}</strong><p>{pickup?.city}</p></span></div><div><span className="route-letter dark">B</span><span><small>Drop-off</small><strong>{destination?.name}</strong><p>{destination?.city}</p></span></div></div>{service === 'delivery' && <div className="recipient-summary"><Package size={20} /><span>{recipient} · {phone}<small>{parcel === 'small' ? 'Small parcel · up to 3 kg' : 'Medium parcel · up to 5 kg'}</small></span></div>}{notes && <p className="driver-note">Note: {notes}</p>}</div>}
          {quote && <div className="quote-card"><div className="quote-service"><span className="quote-icon">{service === 'ride' ? <Motorcycle size={30} /> : <Package size={30} />}</span><span><strong>{service === 'ride' ? 'Gokada Moto' : 'Gokada Delivery'}</strong><small>{quote.distance} km · ~{quote.minutes} min, estimated</small></span><strong className="quote-price">{currency(quote.total)}</strong></div><button type="button" className="fare-toggle" onClick={() => setFareInfo(v => !v)} aria-expanded={fareInfo}><Info size={14} />Demo fare breakdown<CaretRight size={14} className={fareInfo ? 'rotated' : ''} /></button>{fareInfo && <dl className="fare-breakdown"><div><dt>Base fare</dt><dd>{currency(quote.base)}</dd></div><div><dt>Estimated distance</dt><dd>{currency(quote.distanceFee)}</dd></div>{quote.parcelFee > 0 && <div><dt>Medium parcel</dt><dd>{currency(quote.parcelFee)}</dd></div>}<p>Illustrative fare and timing, not a live road or traffic quote.</p></dl>}</div>}
          {review && <div className="payment-row"><Wallet size={22} /><span>Cash on {service === 'ride' ? 'arrival' : 'delivery'}<small>Demo only · no payment collected</small></span><Check size={19} /></div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button book-button" type="submit" disabled={pending}>{pending ? 'Creating your demo booking…' : review ? `Confirm demo ${service === 'ride' ? 'ride' : 'delivery'}` : service === 'ride' ? 'See ride fare' : 'See delivery fare'}{!pending && <ArrowRight size={20} />}</button>
          <p className="booking-disclaimer">{review ? 'This booking simulates a trip. No real driver is dispatched.' : <><ShieldCheck size={14} />Know your fare before you go. No surprises.</>}</p>
        </form>
      </div>
      <MetroMap pickup={pickup} destination={destination} />
    </div>
    <div className="below-booking"><section className="popular-section"><div className="section-heading"><h2>Places to be</h2><span>Popular demo stops</span></div><div className="destination-list">{places.slice(1, 4).map((place, index) => <button className="destination-row" key={place.id} onClick={() => { setDestination(place); setReview(false); setError(''); window.scrollTo({ top: 120, behavior: 'smooth' }); }}><span className={`destination-icon destination-${index}`}><MapPin size={20} weight="duotone" /></span><span><strong>{place.name}</strong><small>{place.city}</small></span><ArrowUpRight size={18} /></button>)}</div></section><section className="everyday-card"><div><span className="everyday-icon"><Leaf size={23} /></span><h2>Small errands.<br />Big time back.</h2><p>Forgotten keys, a thoughtful gift, the little things that can’t wait.</p><button onClick={() => { changeService('delivery'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Send something good<ArrowUpRight size={17} /></button></div><div className="parcel-art" aria-hidden="true"><div className="parcel-orbit orbit-one" /><div className="parcel-orbit orbit-two" /><Package size={114} weight="duotone" /><span className="parcel-spark"><Lightning size={23} weight="fill" /></span></div></section></div>
    {bookings.length > 0 && <section className="recent-strip"><div><Clock size={20} /><span>Your latest trip<strong>{findPlace(bookings[0].destinationId)?.name}</strong></span></div><Link href={`/bookings/${bookings[0].id}`}>View booking<ArrowRight size={18} /></Link></section>}
  </div>;
}
