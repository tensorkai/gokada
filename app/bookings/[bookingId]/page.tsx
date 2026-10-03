import { BookingDetail } from '@/features/tracking/booking-detail';
export default async function BookingPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <BookingDetail id={bookingId} />;
}
