# Application structure

- `app/`: Next.js pages for home, ride, delivery, history, and booking detail; shared layout and styles.
- `app/api/bookings/route.ts`: validates requests, recalculates demo quotes, and returns bookings. No server persistence or dispatch.
- `app/api/route-preview/route.ts`: validates landmark IDs and returns illustrative geometry without external services. The map draws the same direct connection locally.
- `features/bookings/model.ts`: input validation, fares, status labels, and stored-record validation.
- `features/bookings/store.ts`: localStorage and React external-store subscription; malformed records are discarded.
- `features/bookings/booking-app.tsx`: both forms, review, unavailable-driver scenario, and booking creation.
- `features/bookings/booking-history.tsx`: history and service filters.
- `features/tracking/booking-detail.tsx`: demo progress, cancellation, and receipt.
- `app/driver/page.tsx` and `features/driver/driver-dashboard.tsx`: driver availability, request review, sample-job creation, active work, and completed fare totals. Uses the same local booking store as customers.
- `updateDriverBooking` in the booking store re-reads saved data, checks allowed transitions, and limits the demo driver to one active accepted job. Optional `acceptedByDemoDriver` metadata preserves compatibility with existing bookings; it is not an authentication or dispatch mechanism.
- `components/`: app shell, native dialogs, keyboard landmark search, and MapLibre map with fallback.
- `data/demo/places.ts`: approximate landmark fixtures.
- `scripts/prepare-map-assets.mjs`: copies matching browser worker assets and license notices before dev/build.
- `tests/e2e/`: Playwright browser and API regression checks.

Pages render client components where browser state is needed. The server validates creation; the client saves the returned record and advances simulated progress locally. A booking link resolves only in a browser containing that record. No account, database, or real driver service is implied.

Future real operations require persistent bookings, identity and authorization, dispatch, verified routing and fares, and payment integration. Keep secrets in server routes and document configuration in the [README](../README.md).
