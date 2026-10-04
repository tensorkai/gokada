import { findPlace, type Place } from '@/data/demo/places';

export type Service = 'ride' | 'delivery';
export type BookingStatus = 'confirmed' | 'arriving' | 'in-progress' | 'completed' | 'cancelled';
export type BookingInput = {
  service: Service; pickupId: string; destinationId: string;
  pickupPlace?: Place; destinationPlace?: Place;
  recipient: string; phone: string; parcel: 'small' | 'medium'; notes: string;
};
export type Quote = { distance: number; minutes: number; base: number; distanceFee: number; parcelFee: number; total: number };
export type Booking = BookingInput & { id: string; createdAt: string; status: BookingStatus; quote: Quote; demo: true; acceptedByDemoDriver?: true };
export const currency = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);
export function distanceKm(a: Place, b: Place) {
  const radians = (n: number) => n * Math.PI / 180;
  const dLat = radians(b.coordinates[1] - a.coordinates[1]);
  const dLng = radians(b.coordinates[0] - a.coordinates[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.coordinates[1])) * Math.cos(radians(b.coordinates[1])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false;
  const place = value as Partial<Place>;
  return typeof place.id === 'string' && typeof place.name === 'string' && typeof place.city === 'string' && typeof place.address === 'string' && Array.isArray(place.coordinates) && place.coordinates.length === 2 && place.coordinates.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate));
}
export function resolvePlace(id: string, pinned?: Place) {
  return pinned && pinned.id === id ? pinned : findPlace(id);
}
export function getQuote(input: BookingInput): Quote {
  const pickup = resolvePlace(input.pickupId, input.pickupPlace), destination = resolvePlace(input.destinationId, input.destinationPlace);
  if (!pickup || !destination || pickup.id === destination.id) throw new Error('Choose two different demo destinations.');
  // The fare remains a demo estimate. The map requests the actual road geometry separately.
  const distance = Math.max(1, Math.round(distanceKm(pickup, destination) * 1.35 * 10) / 10);
  const base = input.service === 'ride' ? 40 : 55;
  const distanceFee = Math.round(distance * 10);
  const parcelFee = input.service === 'delivery' && input.parcel === 'medium' ? 20 : 0;
  return { distance, minutes: Math.max(5, Math.round(distance * 3.2)), base, distanceFee, parcelFee, total: base + distanceFee + parcelFee };
}
export function validateBooking(value: unknown): { input?: BookingInput; error?: string } {
  if (!value || typeof value !== 'object') return { error: 'Enter your booking details.' };
  const data = value as Record<string, unknown>;
  if (data.service !== 'ride' && data.service !== 'delivery') return { error: 'Choose a ride or delivery.' };
  if (typeof data.pickupId !== 'string' || (!findPlace(data.pickupId) && !isPlace(data.pickupPlace))) return { error: 'Choose a pickup or pin it on the map.' };
  if (typeof data.destinationId !== 'string' || (!findPlace(data.destinationId) && !isPlace(data.destinationPlace))) return { error: 'Choose a drop-off or pin it on the map.' };
  if (data.pickupId === data.destinationId) return { error: 'Pickup and drop-off must be different.' };
  if (typeof data.notes !== 'string' || data.notes.length > 300) return { error: 'Keep your driver note under 300 characters.' };
  if (data.parcel !== 'small' && data.parcel !== 'medium') return { error: 'Choose a parcel size.' };
  if (typeof data.recipient !== 'string' || typeof data.phone !== 'string') return { error: 'Enter the recipient details.' };
  if (data.service === 'delivery' && (data.recipient.trim().length < 2 || data.recipient.length > 80)) return { error: 'Enter a recipient name between 2 and 80 characters.' };
  if (data.service === 'delivery' && !/^(?:09\d{9}|\+639\d{9})$/.test(data.phone.replace(/[\s-]/g, ''))) return { error: 'Enter a Philippine mobile number, such as 09XX XXX XXXX.' };
  return { input: { service: data.service, pickupId: data.pickupId, destinationId: data.destinationId, pickupPlace: isPlace(data.pickupPlace) ? data.pickupPlace : undefined, destinationPlace: isPlace(data.destinationPlace) ? data.destinationPlace : undefined, recipient: data.recipient.trim(), phone: data.phone.replace(/[\s-]/g, ''), parcel: data.parcel, notes: data.notes.trim() } };
}
export function nextStatus(status: BookingStatus): BookingStatus {
  return ({ confirmed: 'arriving', arriving: 'in-progress', 'in-progress': 'completed', completed: 'completed', cancelled: 'cancelled' } as const)[status];
}
export function statusLabel(status: BookingStatus, service: Service) {
  return { confirmed: 'Booking confirmed', arriving: 'Driver on the way', 'in-progress': service === 'ride' ? 'On your way' : 'Parcel on the way', completed: service === 'ride' ? 'Ride completed' : 'Delivered', cancelled: 'Cancelled' }[status];
}
export function isBooking(value: unknown): value is Booking {
  const data = value as Booking | null;
  if (!data || !validateBooking(data).input || typeof data.id !== 'string' || !/^GK-[a-z0-9-]+$/i.test(data.id) || typeof data.createdAt !== 'string' || !Number.isFinite(Date.parse(data.createdAt)) || data.demo !== true) return false;
  if (!['confirmed', 'arriving', 'in-progress', 'completed', 'cancelled'].includes(data.status)) return false;
  if (data.acceptedByDemoDriver !== undefined && data.acceptedByDemoDriver !== true) return false;
  const expected = getQuote(data);
  return !!data.quote && Object.keys(expected).every((key) => data.quote[key as keyof Quote] === expected[key as keyof Quote]);
}
