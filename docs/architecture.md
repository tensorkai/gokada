# Project structure

This scaffold supports the delivery and motorcycle taxi hackathon MVP. The folders reserve places for future implementation; they do not add booking behavior, API endpoints, provider integrations, or a test runner. The existing starter home page is still the only application page.

## Routes

Keep route composition in `app/` and reusable feature implementation in `features/`.

| Folder | Intended responsibility | Future URL |
| --- | --- | --- |
| `app/ride/` | Motorcycle taxi booking page | `/ride` |
| `app/delivery/` | Delivery booking page | `/delivery` |
| `app/bookings/` | Booking list or history page when implemented | `/bookings` |
| `app/bookings/[bookingId]/` | A booking's progress and summary | `/bookings/:bookingId` |
| `app/api/bookings/` | Booking request handlers when backend behavior is implemented | `/api/bookings` |

These URLs are planned. Under the installed Next.js App Router conventions, a folder alone does not expose a route: add `page.tsx` for a page or `route.ts` for an HTTP handler. Keep `app/page.tsx` as the home route and `app/layout.tsx` as the root layout. Add loading, error, and nested layout files when the relevant flow needs them.

## Features and shared UI

| Folder | Intended responsibility |
| --- | --- |
| `features/rides/` | Passenger booking forms and ride-specific validation and logic |
| `features/delivery/` | Parcel and recipient forms and delivery-specific validation and logic |
| `features/bookings/` | Shared booking models, confirmation, cancellation, and status rules |
| `features/tracking/` | Driver arrival and trip or delivery progress presentation |
| `components/ui/` | Reusable controls such as buttons, inputs, dialogs, and status badges |
| `components/layout/` | Shared app shell, headers, and navigation |
| `components/maps/` | Map display, location selection, and route presentation components |

Keep feature-specific components, hooks, types, and validation with their feature. Extract shared code only when another feature needs it. Shared UI should receive data and callbacks rather than owning service-specific booking rules.

## Integrations and data

| Folder | Intended responsibility |
| --- | --- |
| `lib/maps/` | Shared map types, coordinate helpers, and browser-safe provider adapters |
| `lib/server/` | Server-side persistence, authentication, dispatch, and external service adapters as selected |
| `lib/utils/` | Small, shared helpers such as formatting functions |
| `data/demo/` | Clearly identified synthetic bookings, drivers, locations, and demo scenarios |
| `public/images/` | Public image assets |
| `public/icons/` | Public icon assets |

No map, database, authentication, or payment provider is selected by this structure. Put credential-bearing service calls in server code. The name `lib/server/` does not itself enforce a server boundary: use Next.js's documented server-only module protection when implementing these modules, and never import them into client components. Files in `public/` are public assets and must not contain private data.

Keep simulated service behavior explicit and distinguishable from real integrations. Use synthetic personal and location data for demos. Add provider-specific subfolders, configuration, and environment variable documentation when an integration is actually introduced.

## Tests and documentation

| Folder | Intended responsibility |
| --- | --- |
| `tests/unit/` | Booking state rules, validation, fare calculations, and other isolated behavior |
| `tests/e2e/` | Browser checks of complete ride and delivery flows |
| `docs/` | Architecture notes and future integration or demo guides |

Test directories are placeholders. Choose and configure test tools when tests are added; no new test command is available yet. Keep setup and feature status in the root [README](../README.md), and shared contributor instructions in [AGENTS.md](../AGENTS.md).

## Working with the scaffold

- `.gitkeep` files retain otherwise empty folders in Git. Remove a placeholder when its folder contains implementation files.
- Use the existing `@/*` alias for imports from the repository root.
- Read the relevant guide in `node_modules/next/dist/docs/` before adding Next.js code. This structure follows the bundled project structure guide.
- Keep installed skill directories separate from application code.
- Add driver, administrator, account, payment, or notification areas when those features enter the agreed scope.
