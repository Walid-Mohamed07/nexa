# NEXA Café Platform — Phase 1

This repository establishes the Phase 1 foundation for the NEXA Café platform: shared product vision, domain model, API contract, mock environment, and a minimal customer web app connected to that mock environment.

## Repository audit summary

The repository started empty. No existing app, stack, or reusable components were present, so the implementation was created from scratch with a simple contract-first structure:

- Web app: Next.js customer experience
- Mock server: Express API with realistic café data
- Shared contract: OpenAPI 3.x specification
- Shared docs: product, architecture, database, and integration guidance

## Recommended Phase 1 structure

- `web/` — customer-facing Next.js app
- `mock-api/` — mock backend that follows the OpenAPI contract
- `docs/` — product, architecture, API, database, and integration documentation
- `docs/api/openapi.yaml` — source of truth for API contract

## Run locally

1. Install dependencies:
   npm install
2. Copy `web/.env.example` to `web/.env.local`. Set `NEXT_PUBLIC_API_URL` to
   the API origin (for local development, `http://localhost:4010`; do not add
   `/api/v1`).
3. Start the mock API and Web app:
   npm run dev
4. Open the app at: http://localhost:3000

`NEXT_PUBLIC_API_URL` is required and public routing configuration; production
must use an HTTPS origin. Do not put credentials, API keys, or tokens in
`NEXT_PUBLIC_*` variables. See
[the Phase 8 backend integration handoff](docs/integration/phase-8-backend-handoff.md)
for API, authentication, error, and deployment details.

## Contract-first flow

- Product and UX requirements are documented in `docs/product/`
- API contract lives in `docs/api/openapi.yaml`
- Mock server implements the same contract for UI development
- Backend and desktop developers can consume the same contract without guessing
- Café Home discovery behavior is documented in `docs/cafe-discovery.md`
