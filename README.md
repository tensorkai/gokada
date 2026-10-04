# Gokada hackathon demo

A reusable delivery and motorcycle taxi demo built with Next.js App Router, React, TypeScript, Tailwind CSS, and MapLibre GL JS. Project code is available under the [MIT license](LICENSE). This is an independent hackathon prototype, with no claimed affiliation with a transport operator.

## Run locally

Use Node.js 20.9 or newer and npm:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. On Windows, use `npm.cmd` if PowerShell blocks the npm shim. Startup and build copy the installed MapLibre worker, shared module, and license into `public/lib/maplibre`.

No account, API key, database, or payment setup is required for the booking demo. Internet access is needed to install dependencies and load street-map tiles. If tiles or WebGL are unavailable, a labeled schematic remains available; booking still works. The Next.js server must remain running.

## Implemented behavior

- Separate motorcycle taxi and delivery forms, curated landmark search, keyboard selection, pickup/drop-off swapping, and optional nearest-landmark geolocation.
- Delivery recipient and phone validation, parcel size, driver notes, editable review, and illustrative fare breakdown.
- Server-validated booking creation with fares recalculated on the server.
- Browser-local history, service filters, refresh persistence, and reset in Guest profile.
- Simulated driver progress, cancellation, ride completion, and delivery completion.
- An unavailable-driver scenario that can be turned off to retry.
- Responsive layouts, dialogs, map retry, and errors for invalid requests or unavailable browser storage.
- Driver workspace at `/driver`: online/offline availability, ride/delivery requests, sample jobs, accept/skip, pickup, completion, cancellation, and completed-job fare totals shared with the customer view in this browser.
- Driver Safety Desk at `/driver`: a clearly labeled demo heat index and flood watch, a safer-route suggestion, and AI-assisted order sequencing. The Gokada deployment sends the shift to a separate Vercel AI deployment through a server-side bridge; without that connection it uses a deterministic local demo response.

Bookings, drivers, availability, fares, payment choices, and progress are simulated. No real driver is dispatched and no money is collected. There is no authentication, shared database, live tracking, dispatch system, payment processing, delivery proof, or production driver/admin app. History is limited to the latest 100 bookings in this browser; use fictional contact details.

## Present the demo

1. Open **Book a ride**, choose a drop-off such as Bonifacio High Street, and select **See ride fare**.
2. Review the route and price, confirm the demo ride, and advance each stage to completion.
3. Open **Send a parcel**, choose a different destination, enter `Demo Recipient` and `09123456789`, then choose a parcel size and confirm.
4. Advance collection and delivery, or cancel and inspect the saved booking in **My bookings**.
5. Select **Simulate unavailable drivers** to show failure and recovery. Turn it off and retry.
6. Use **Guest profile > Reset booking history** before the next presentation.

### Driver presentation

1. Open **Driver view** from the navigation, then **Add demo ride** or **Add demo delivery**. Customer-created bookings also appear here while their status is confirmed.
2. Select **Go online**, review pickup, drop-off, notes, parcel details, and the sample fare, then accept a request. Only one accepted job can be active at a time.
3. Choose **Pick up passenger** or **Collect parcel**, then complete the job. **View customer booking** shows the same progress; tabs at the same origin share updates through browser storage.
4. Completed jobs contribute their gross sample fare to **Completed demo fares**. These are not earnings after costs or commission, and no payouts occur. Cancelled jobs are excluded.
5. Going offline pauses new acceptance while leaving the active job accessible. Refresh preserves accepted jobs but starts availability offline. Skipped requests are hidden only for the current visit; **Show skipped requests** restores them without changing the customer booking.

This is one simulated driver using browser-local data, not authenticated assignment or multi-driver dispatch. Cancelling from either view updates the same booking; resetting history clears driver jobs and totals too. Customer demo controls remain available for presentations. Sample-job creation needs the local Next.js server, but no external account or keys. Configuration stays in `.env.local`.

## Demo fixtures, not operating policies

The existing implementation uses Metro Manila landmarks, PHP prices, and Philippine mobile-number validation. These are sample fixtures, not an agreed service area or commercial policy. Ride base fare is 40, delivery base is 55, and estimated distance costs 10 per kilometer. Distance is straight-line distance multiplied by 1.35 (minimum 1 km); estimated minutes are distance multiplied by 3.2 (minimum 5). Small parcels are displayed as up to 3 kg; medium parcels as up to 5 kg with an extra 20. Cancellation is simulated without a fee, including during a journey.

Change fixtures in [places.ts](data/demo/places.ts), validation and pricing in [model.ts](features/bookings/model.ts), and matching form copy in [booking-app.tsx](features/bookings/booking-app.tsx). Actual region, currency, parcel limits, cancellation policy, and fare rules still require team decisions.

## Maps and optional configuration

The open-source MapLibre GL JS renderer displays OpenStreetMap tiles by default, with attribution. No paid map service, account, or API key is used. Address search uses local landmarks, not geocoding. Route lines are illustrative connections, not road navigation. Simulated driver positions interpolate along those connections. The fallback schematic is decorative and not geographically accurate.

The public OpenStreetMap tile service is community-funded and has no availability guarantee. Follow its [tile usage policy](https://operations.osmfoundation.org/policies/tiles/): retain attribution, allow normal browser caching and referrers, and do not bulk-download or prefetch tiles for offline use. For heavier use, configure a suitable tile provider or self-host tiles. Offline booking remains available through the labeled schematic, not an offline street map.

Optional variables belong in your existing `.env.local`. No environment variables are required for the default open-source map. Restart the dev server after changing these values; rebuild when using production mode.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_MAP_TILE_URL` | Browser-visible XYZ raster tile template; configure an appropriate provider for deployment. |
| `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` | Additional plain-text credit required by a custom tile provider; OpenStreetMap attribution remains visible. |
| `PLAYWRIGHT_CHANNEL` | Browser channel override for tests; Windows defaults to installed Microsoft Edge. |
| `GOKADA_APP_URL` | Public URL of the deployed Gokada main app, sent to the separate AI deployment as its source and callback URL. |
| `AI_ASSISTANT_APP_URL` | Public POST URL of the separate Vercel AI assistant deployment. It receives `type`, `conditions`, `orders`, `sourceApp`, and `callback`; it should return `summary`, `route`, and `sortedOrderIds`. |
| `VERCEL_AI_ADVISOR_URL` | Backward-compatible alias for `AI_ASSISTANT_APP_URL`; use `AI_ASSISTANT_APP_URL` for the two-deployment setup. |

The route-preview API returns deterministic illustrative geometry without an external routing request. Pricing and ETA remain illustrative. Never commit credentials.

## Verification

```sh
npm run lint
npm run build
npm test
```

Playwright starts a local server on port 3100. Install Chromium with `npx playwright install chromium` on platforms without a configured browser. Tests block community tile requests and cover booking, validation, persistence, cancellation, completion, keyboard access, and responsive layouts. Map checks use a local test tile to exercise rendering and retry without calling community servers. Build and lint are separate checks. Production startup uses `npm run start` after a successful build. System fonts avoid external font downloads at build time.

For reproducible presentation checks without development compilation delays, run against a completed production build: `PLAYWRIGHT_USE_BUILD=1 npm test` (PowerShell: `$env:PLAYWRIGHT_USE_BUILD='1'; npm.cmd test`). Stop any existing server on port 3100 first so Playwright tests the intended build.

## Source and integration

See [architecture](docs/architecture.md) for module boundaries. Run this as a standalone web demo or adapt its components for your main hackathon project. The booking API returns validated demo records but does not store them on the server; real operations need persistent storage and authorization.

Third-party dependencies retain their own licenses. Redistributed MapLibre files include their [license notice](public/lib/maplibre/LICENSE.txt). The project MIT license does not relicense dependencies, installed agent skills, map data, or external services. No public repository or deployed URL has been created by this change.
