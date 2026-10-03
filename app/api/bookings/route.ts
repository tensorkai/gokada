import { getQuote, validateBooking, type Booking } from '@/features/bookings/model';

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 4096) return Response.json({ error: 'Booking details are too long.' }, { status: 413 });
    const { input, error } = validateBooking(JSON.parse(text));
    if (!input) return Response.json({ error }, { status: 400 });
    const booking: Booking = { ...input, id: `GK-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), status: 'confirmed', quote: getQuote(input), demo: true };
    // Demo only: the client persists this response. No real dispatch or charge occurs.
    return Response.json({ booking }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Send valid booking details and try again.' }, { status: 400 }); }
}
