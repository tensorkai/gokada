# Gokada

Gokada is a delivery and motorcycle taxi app being built for our hackathon project. It is intended to let customers request a delivery or book a motorcycle ride, with clear pickup and destination details and booking progress.

## Current status

The repository implements a fully functional front-end demo of both the motorcycle taxi and delivery booking flows. It uses simulated server data and local storage to provide a realistic booking experience without requiring a backend.

| Area | Status |
| --- | --- |
| Web foundation | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, and ESLint configured |
| Project organization | Route, feature, shared UI, integration, demo data, and test folders implemented |
| Delivery and motorcycle taxi booking | **Implemented** (Simulated client flows) |
| Driver assignment and trip progress | **Implemented** (Simulated status transitions) |
| Maps, address search, routes, and ETA | **Implemented** (MapLibre GL JS with OpenStreetMap) |
| Authentication, database, and backend | **Simulated** (Uses `localStorage` and dummy API routes) |
| Payments and notifications | Not integrated (Demo fares shown) |
| Automated application tests | **Implemented** (Playwright E2E suite configured) |
| Deployment | Ready for Next.js hosting |

Installed agent skills include mapping guidance; they do not constitute an application integration.

## Proposed hackathon MVP

The following is an initial implementation target, not a list of working features. Detailed scope and service rules still need to be agreed by the team.

### Motorcycle taxi

1. Select the motorcycle taxi service.
2. Enter a pickup point and destination.
3. Review the route, estimated fare, and estimated pickup time.
4. Confirm the booking and see driver assignment and arrival progress.
5. Follow trip progress through completion and view a trip summary.

### Delivery

1. Select the delivery service.
2. Enter pickup and drop-off details, sender and recipient contact details, and parcel information.
3. Review the estimated delivery fee and timing.
4. Confirm the request and follow driver assignment, collection, and delivery progress.
5. View delivery confirmation and a summary.

### Shared experience

- Use clear terms: **customer** books a service, **passenger** takes a motorcycle taxi trip, **driver** operates the motorcycle, and **recipient** receives a delivery.
- Make the core booking flow usable on a phone, with labeled controls, readable status updates, and useful loading, empty, and error states.
- Allow customers to review and correct details before confirming a request.
- Explain unavailable routes, missing location permission, and cases where no driver is available.
- Define cancellation rules and status transitions before implementing them.
- Label simulated drivers, locations, fares, payments, and status updates as demo data wherever used. A simulated booking must not appear to dispatch a real driver.

Start with a complete customer flow for each service. A separate driver interface, admin dashboard, live dispatch, and real payment collection remain scope decisions.

## Local development

### Requirements

- Node.js 20.9 or newer, as required by the bundled Next.js installation guide.
- npm; this repository includes `package-lock.json`.

From the repository root:

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). At present, this displays the Next.js starter page. Edit `app/page.tsx` to begin implementing the application.

On Windows PowerShell, use `npm.cmd` instead of `npm` if execution policy blocks the npm PowerShell shim.

### Available commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the committed lockfile |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Create a production build and run Next.js build checks |
| `npm run start` | Serve the production build after a successful build |
| `npx playwright test` | Run the end-to-end test suite |

Run lint, build, and tests before handing off application changes. Next.js does not run ESLint automatically during the build.

The root layout loads Geist fonts through `next/font/google`; builds may require network access to download them.

### Configuration

No application-specific environment variables or API credentials are required by the current starter. No backend, map provider, payment provider, or authentication service has been selected in application code.

When an integration is added, document its required environment variable names, where they are used, and how to obtain development credentials. Keep local secrets in `.env.local`, which is ignored by Git. Never commit credentials or expose server secrets through client code or `NEXT_PUBLIC_` variables. Browser map credentials, if required by the selected provider, must use that provider's application and API restrictions.

## Repository structure

```text
app/
  page.tsx                 Home route; currently the starter screen
  layout.tsx               Root layout, fonts, and page metadata
  globals.css              Tailwind import and global styles
  favicon.ico              Current application icon
  ride/                    Motorcycle taxi booking route placeholder
  delivery/                Delivery booking route placeholder
  bookings/[bookingId]/    Booking progress and summary route placeholder
  api/bookings/            Booking API route placeholder
components/
  ui/                      Shared controls
  layout/                  App shell and navigation
  maps/                    Map and location UI
features/
  rides/                   Motorcycle taxi forms and logic
  delivery/                Parcel and recipient forms and logic
  bookings/                Shared booking models and rules
  tracking/                Driver and booking progress
lib/
  maps/                    Browser-safe map adapters and helpers
  server/                  Server-side service integrations
  utils/                   Shared utility functions
data/demo/                 Synthetic demo data
tests/
  unit/                    Isolated behavior test placeholder
  e2e/                     Browser flow test placeholder
docs/                      Architecture and implementation guides
public/
  images/                  Public image assets
  icons/                   Public icon assets
AGENTS.md                  Shared instructions for coding agents
CLAUDE.md                  Claude entry point for the shared instructions
eslint.config.mjs          ESLint configuration
next.config.ts             Next.js configuration
package.json               Dependencies and development scripts
package-lock.json          Locked npm dependency versions
postcss.config.mjs         Tailwind/PostCSS configuration
tsconfig.json              TypeScript configuration and @/* import alias
```

New folders contain `.gitkeep` placeholders so Git retains them. They do not implement features or expose new routes. Existing starter assets remain in `public/`. See [Project structure](docs/architecture.md) for folder responsibilities, future route URLs, and placement guidance.

The declared stack is Next.js 16.3.8, React 19.2.8, TypeScript 5, Tailwind CSS 4, and ESLint 9. Consult `package.json` and `package-lock.json` for dependency versions as the project evolves.

## Implementation and handoff

Before writing Next.js code, read the relevant version-specific guide in `node_modules/next/dist/docs/`. Shared repository guidance is in [AGENTS.md](AGENTS.md); [CLAUDE.md](CLAUDE.md) imports it for Claude.

Suggested delivery order:

1. Replace starter branding and build the service selection and booking forms.
2. Complete both booking flows using clearly labeled demo data and deterministic status updates.
3. Add agreed map, persistence, authentication, and dispatch integrations, updating setup instructions with each change.
4. Verify both service flows on mobile and desktop, including validation failures, location denial, unavailable service, cancellation, and completion.
5. Prepare a reproducible demo with sample inputs, a reset path, documented limitations, and a verified deployment URL when available.

For every handoff, describe what works, what is simulated, how it was checked, and any remaining setup. Update the status table when a feature becomes usable.

## Decisions still open

- Hackathon requirements, deadline, and acceptance criteria.
- Service area, currency, fare calculation, and delivery parcel limits.
- Whether the demo needs customer, driver, and administrator roles.
- Map and routing provider, backend storage, and authentication approach.
- Which actions use real services and which are simulated for the demo.
- Payment approach, cancellation rules, delivery confirmation, and notification channels.
- Deployment provider and team ownership of external service accounts.

These decisions should be recorded here as they are made; the project name alone does not establish a service region, operating policy, or affiliation.
