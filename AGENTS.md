# Gokada contributor instructions

## Project context

Gokada is a delivery and motorcycle taxi app for an actual hackathon project. Build toward usable booking flows for both services. See [README.md](README.md) for the current implementation status, proposed MVP, setup, and unresolved product decisions.

The application implements browser-local demo booking flows and maps. Do not describe authentication, payments, real dispatch, or other planned features as implemented until the repository supports them.

## Product guidance

- Treat delivery and motorcycle taxi as distinct services with shared pickup, destination, pricing, and progress concepts.
- Use customer, passenger, driver, and recipient consistently. Avoid using "rider" for both the passenger and the driver.
- Prioritize phone usability, accessible forms, clear booking confirmation, and useful error recovery.
- Keep demo data and simulated actions visibly identified. Do not imply that a simulated booking dispatches a real driver or that a simulated payment charges money.
- Do not infer the service area, currency, fare rules, parcel limits, or operating policies from the project name. Record agreed decisions in the README.

## Development guidance

- Use the existing Next.js App Router, TypeScript, Tailwind CSS, and npm setup. Keep dependencies and `package-lock.json` consistent.
- Read the relevant bundled Next.js documentation before writing code, as required by the managed instructions below.
- Inspect existing code before describing architecture or introducing new patterns. Add abstractions and dependencies when a concrete feature needs them.
- Keep credentials out of source control and server secrets out of browser code. Document environment variable names and setup when adding integrations.
- Preserve unrelated user changes, installed skill documentation, and the managed Next.js instructions below.
- Keep README setup, implementation status, and demo limitations accurate as features are added.

## Verification and handoff

- For application changes, run `npm run lint` and `npm run build` where possible. These are separate checks; the build does not run ESLint.
- Playwright browser and API tests run with `npm test`. Add meaningful tests as behavior warrants them; do not report tests that were not run.
- For booking changes, verify both affected service flows and relevant validation, unavailable-service, cancellation, and completion states. Check phone layouts and keyboard access.
- For documentation-only changes, check factual claims against repository files, relative links, and the diff; a production build is not required.
- Report implemented behavior, validation performed, simulations, and any blocking setup clearly at handoff.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
