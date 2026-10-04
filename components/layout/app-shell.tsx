'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ArrowUpRight, Compass, MapPin, ClockCounterClockwise, Question, ShieldCheck, UserCircle, Trash, Motorcycle, Package } from '@phosphor-icons/react';
import { Dialog } from '@/components/ui/dialog';
import { clearBookings } from '@/features/bookings/store';
import { places } from '@/data/demo/places';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [dialog, setDialog] = useState<'help' | 'area' | 'profile' | null>(null);
  const [reset, setReset] = useState(false);
  const [message, setMessage] = useState('');
  return <div className="app-shell">
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="Gokada home"><span className="brand-symbol"><ArrowUpRight weight="bold" size={26} /></span>gokada<span className="brand-period">.</span></Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link href="/" className={!pathname.startsWith('/bookings') && !pathname.startsWith('/driver') ? 'nav-link active' : 'nav-link'}><Compass size={19} />Book a trip</Link>
        <Link href="/bookings" className={pathname.startsWith('/bookings') ? 'nav-link active' : 'nav-link'}><ClockCounterClockwise size={19} />My bookings</Link>
        <Link href="/driver" className={pathname === '/driver' ? 'nav-link active' : 'nav-link'} aria-current={pathname === '/driver' ? 'page' : undefined}><Motorcycle size={19} />Driver view</Link>
        <Link href="/driver/parcels" className={pathname === '/driver/parcels' ? 'nav-link active' : 'nav-link'} aria-current={pathname === '/driver/parcels' ? 'page' : undefined}><Package size={19} />Batch Parcels</Link>
      </nav>
      <div className="header-actions"><button className="area-button" onClick={() => setDialog('area')}><MapPin size={18} weight="fill" />Metro Manila<span className="tiny-dot" /></button><button className="icon-button help-button" aria-label="Help and demo guide" onClick={() => setDialog('help')}><Question size={23} /></button><button className="avatar-button" aria-label="Guest profile" onClick={() => setDialog('profile')}>G</button></div>
    </header>
    <main id="main-content">{children}</main>
    <footer className="site-footer"><span><span className="footer-brand">gokada.</span> A little less traffic. A little more life.</span><span className="footer-demo"><span className="tiny-dot" />Hackathon demo · No real rides or charges</span></footer>
    <Dialog open={dialog === 'help'} onClose={() => setDialog(null)} title="Let’s get you moving">
      <div className="help-item"><Motorcycle size={28} /><div><h3>Book a motorcycle ride</h3><p>Choose two demo destinations, review your fare, and confirm. Advance the driver journey from your booking page.</p></div></div>
      <div className="help-item"><Package size={28} /><div><h3>Send a parcel</h3><p>Add the recipient and parcel size before reviewing your delivery. Use fictional contact details for this demo.</p></div></div>
      <div className="help-item"><Motorcycle size={28} /><div><h3>Try the driver view</h3><p>Go online, accept a saved or sample request, then pick up and complete the job. The customer view updates in this browser. Completed fares are illustrative, not payouts.</p></div></div>
      <div className="help-item"><ShieldCheck size={28} /><div><h3>A demo you control</h3><p>Drivers, fares, and progress are simulated. Your bookings stay in this browser. There is no real dispatch, payment, or emergency assistance.</p></div></div>
      <p className="muted small">Landmarks use approximate coordinates. Check pickup entrances before any real-world use. Map tiles require an internet connection.</p>
      <button className="primary-button" onClick={() => setDialog(null)}>Got it</button>
    </Dialog>
    <Dialog open={dialog === 'area'} onClose={() => setDialog(null)} title="Around Metro Manila">
      <p className="muted">Explore sample destinations across all 16 cities and Pateros. These are sample locations for this demo, not a confirmed operating area.</p>
      <div className="city-grid">{places.map(place => <span key={place.id}><MapPin size={15} />{place.city}</span>)}</div>
      <p className="small muted">Search currently covers the curated landmarks, not every street address.</p>
    </Dialog>
    <Dialog open={dialog === 'profile'} onClose={() => { setDialog(null); setReset(false); }} title="Your demo space">
      <div className="profile-card"><UserCircle size={52} weight="duotone" /><div><h3>Guest explorer</h3><p>No account needed for this demo</p></div></div>
      <p className="muted">Booking history is saved on this device only. Use fictional recipient details. Clear your history when you finish on a shared device.</p>
      {reset ? <div className="notice"><p>Delete all bookings from this browser? This cannot be undone.</p><div className="button-row"><button className="secondary-button" onClick={() => setReset(false)}>Keep bookings</button><button className="danger-button" onClick={() => { try { clearBookings(); setMessage('Demo bookings cleared.'); setReset(false); } catch { setMessage('Storage is unavailable. Clear this site’s data in browser settings.'); } }}>Delete bookings</button></div></div> : <button className="secondary-button" onClick={() => setReset(true)}><Trash size={18} />Reset booking history</button>}
      <p role="status" className="small">{message}</p>
    </Dialog>
  </div>;
}
