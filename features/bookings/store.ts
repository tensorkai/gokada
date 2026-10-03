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
    cachedRaw = raw;
    const data: unknown = JSON.parse(raw || '[]');
    cached = Array.isArray(data) ? data.filter(isBooking) : empty;
    return cached;
  } catch { return empty; }
}
function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(event, listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener(event, listener); };
}
export const useBookings = () => useSyncExternalStore(subscribe, read, () => empty);
export function saveBooking(booking: Booking) {
  const items = read();
  localStorage.setItem(KEY, JSON.stringify([booking, ...items.filter((item) => item.id !== booking.id)].slice(0, 100)));
  window.dispatchEvent(new Event(event));
}
export function clearBookings() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(event));
}
