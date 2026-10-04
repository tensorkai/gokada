'use client';

import { useSyncExternalStore } from 'react';
import { isBooking, type Booking } from './model';
const KEY = 'gokada.bookings.v1';
const empty: Booking[] = [];
let cachedRaw: string | null = null;
let cached: Booking[] = empty;
const event = 'gokada:bookings';
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cachedRaw) return cached;
    const data: unknown = JSON.parse(raw || '[]');
    cached = Array.isArray(data) ? data.filter(isBooking) : empty;
    cachedRaw = raw;
    return cached;
  } catch { cachedRaw = null; cached = empty; return empty; }
}
function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(event, listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener(event, listener); };
}
export const useBookings = () => useSyncExternalStore(subscribe, read, () => empty);
export function saveBooking(booking: Booking) {
  if (!isBooking(booking)) throw new Error('Invalid demo booking. Please try again.');
  const items = read();
  localStorage.setItem(KEY, JSON.stringify([booking, ...items.filter((item) => item.id !== booking.id)].slice(0, 100)));
  window.dispatchEvent(new Event(event));
}
export function clearBookings() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(event));
}

export function updateDriverBooking(id: string, action: 'accept' | 'start' | 'complete' | 'cancel') {
  // Read again at the moment of action: another tab may have cancelled or reset it.
  const items = read();
  const booking = items.find(item => item.id === id);
  if (!booking) throw new Error('This job is no longer available. Choose another request.');
  if (action === 'accept') {
    if (booking.status !== 'confirmed' || booking.acceptedByDemoDriver) throw new Error('This request has changed. Choose another job.');
    const active = items.filter(item => item.acceptedByDemoDriver && ['arriving', 'in-progress'].includes(item.status));
    if (active.length > 0) {
      if (booking.service !== 'delivery' || active.some(item => item.service !== 'delivery')) {
         throw new Error('Finish or cancel your active job before accepting another.');
      }
    }
    saveBooking({ ...booking, acceptedByDemoDriver: true, status: 'arriving' });
    return;
  }
  if (!booking.acceptedByDemoDriver || (action === 'start' && booking.status !== 'arriving') || (action === 'complete' && booking.status !== 'in-progress') || (action === 'cancel' && !['arriving', 'in-progress'].includes(booking.status))) {
    throw new Error('This job has changed. Check its current status before continuing.');
  }
  saveBooking({ ...booking, status: action === 'start' ? 'in-progress' : action === 'complete' ? 'completed' : 'cancelled' });
}
