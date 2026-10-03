# Phase 8 — Python Backend Integration Handoff

This document describes the customer Web application's current integration
boundary. [OpenAPI](../api/openapi.yaml) is the shared contract. The Web client
does not depend on Python, SQL, or a database-specific identifier format.

## API integration map

All requests are made through `web/src/lib/api.ts`. The configured
`NEXT_PUBLIC_API_URL` is the API origin; the client appends `/api/v1`. Requests
use JSON envelopes (`{ "data": ... }`), `Accept: application/json`,
`cache: no-store`, a 15-second timeout, and an `X-Request-ID` when
`crypto.randomUUID` is available.

| Web feature | Endpoint and method | Authentication boundary | Request and response |
| --- | --- | --- | --- |
| QR entry | `GET /qr/{token}/resolve` | Public | Encoded QR token; returns café, branch, table, and session in `data`. |
| Visit context | `GET /visits/resolve` | Public for guest context; Bearer when customer context is supplied | `cafeId`, `branchId`, `tableId`, optional `customerId` and `sessionId`; returns a visit in `data`. |
| Café home | `GET /cafes/{cafeId}/home` | Public | `branchId` query; returns discovery sections and categories in `data`. |
| Menu | `GET /cafes/{cafeId}/menu` | Public | Returns categories and menu items in `data`. |
| Recommendations | `GET /cafes/{cafeId}/recommendations` | Public without `customerId`; Bearer if personalized customer context is used | `branchId`, optional `customerId`, `visitId`, `timeContext`, and `occasion`; returns recommendations in `data`. |
| Customer creation | `POST /customers` | Public by current contract | `{ name, phone }`; returns customer in `data`. Production identity issuance/association must be designed by the backend and must not trust the returned customer ID by itself. |
| Account/profile restore | `GET /customers/{customerId}` | Bearer; caller must own customer | Returns customer profile in `data`. |
| Preference read | `GET /customers/{customerId}/preferences` | Bearer; caller must own customer | Returns preferences in `data`. |
| Preference save | `POST /customers/{customerId}/preferences` | Bearer; caller must own customer | `{ preferenceType, value, source? }`; returns saved preference in `data`. |
| Preference clear | `DELETE /customers/{customerId}/preferences` | Bearer; caller must own customer | Returns the cleared preference list in `data`. |
| Place order | `POST /orders` | Bearer; caller must own `customerId` | `CreateOrderRequest` plus `Idempotency-Key`; server validates customer/session/table/items and calculates prices; returns order in `data`. |
| Active/order details | `GET /orders/{orderId}` | Bearer; caller must own order | Returns order in `data`. |
| Order history | `GET /customers/{customerId}/orders` | Bearer; caller must own customer | Returns orders in `data`. |
| Feedback history | `GET /customers/{customerId}/feedback` | Bearer; caller must own customer | Returns the caller's feedback list in `data`. |
| Submit feedback | `POST /orders/{orderId}/review` | Bearer; caller must own order | `{ rating, comment?, visitId? }` plus `Idempotency-Key`; completed orders only. `201` creates; `200` returns an idempotent/duplicate record; `409` is a conflict. |
| Google Review CTA | No submission endpoint | N/A | The configured `cafe.googleReviewUrl` from QR resolution is rendered as an external link after private NEXA feedback. Google owns the review experience; NEXA does not report submission. |

The contract also defines session creation/read, café/branch, category/item,
and favorites endpoints. These are not currently called by the customer Web
application; QR resolution currently supplies the session, and favorites have
no current customer Web UI.

## Authentication and ownership boundary

- Public Web flows use QR resolution, café home, menu, and guest recommendations.
- Customer creation is public under the current contract.
- Customer profile, preferences, order creation/read/history, and feedback
  require authenticated identity and server-side ownership authorization.
- Personalized visit/recommendation requests require authentication when
  `customerId` is supplied; guest requests omit it.
- IDs (`customerId`, `orderId`, `visitId`, `sessionId`, `cafeId`, `branchId`,
  `tableId`, and menu IDs) select resources or provide context. They are not
  credentials and must never prove ownership.
- The mock API's `X-Mock-Identity` header and seeded mock identity exist only in
  development. The Web client only emits that header in development; it is
  absent from production browser bundles.
- The API client exposes an in-memory access-token provider hook for a future
  auth integration. It does not implement login, refresh, token persistence, or
  production auth state.
- The current order flow collects a name and phone and creates a customer
  record before order placement. The production identity/session mechanism that
  makes this flow satisfy the contract's Bearer and ownership requirements is
  an integration blocker for the Python backend/auth owner. Do not accept
  `customerId` alone as authentication.

## Error contract and Web behavior

The API client throws `ApiError` with a stable `code`, `kind`, optional HTTP
`status`, and correlation `requestId`. Backend messages and stack/database
details are not copied to `Error.message`.

| Condition | Client kind / typical code | Web expectation |
| --- | --- | --- |
| Missing/invalid API origin | `configuration` / `API_CONFIGURATION_ERROR` | Surface configuration failure; do not fall back to mock data. |
| Network failure | `network` / `NETWORK_ERROR` | Recoverable connection state and retry. |
| Request deadline | `timeout` / `TIMEOUT` | Recoverable timeout; keep idempotency key for ambiguous writes. |
| `400` | `validation` / backend code or `VALIDATION_ERROR` | Keep the user's cart/form values and show actionable validation feedback. |
| `401` | `unauthenticated` / backend code or `UNAUTHORIZED` | Re-establish customer/session context; do not expose protected data. |
| `403` | `forbidden` / backend code or `FORBIDDEN` | Do not render protected response data; explain access/context failure safely. |
| `404` | `not-found` / backend code or `NOT_FOUND` | Show resource unavailable state; do not substitute fixture data. |
| `409` | `conflict` / backend code or `CONFLICT` | Preserve values and resolve the conflict; do not silently create another write. |
| `429` | `rate-limited` / backend code or `RATE_LIMITED` | Ask the customer to wait before retrying. |
| `5xx` | `server` / backend code or `SERVER_ERROR` | Recoverable server error and retry where safe. |
| Invalid JSON or missing `data` envelope on success | `malformed-response` / `MALFORMED_RESPONSE` | Treat as an integration/server failure, not empty successful data. |

The frontend sends `X-Request-ID` when available and reads an echoed
`X-Request-ID` or `Request-ID`. Configure CORS to allow the request header and
expose the response correlation header. The client does not log request
payloads, access tokens, phone numbers, or backend response messages.

## Data and context contract

- IDs are opaque strings; the UI encodes path-segment values and does not infer
  database type or format.
- Times use ISO 8601 strings; currency is supplied by the café/menu/order
  contract. Prices are numeric values in the contract's currency unit.
- The API is the authority for café/branch/table/session/visit relationships,
  menu availability, prices, order status, and ownership.
- `nexa-entry-state` persists the last resolved QR context for navigation and
  refresh continuity. It is untrusted cache, not authorization; the server
  must revalidate context on visit/order requests.
- Visit context is nested in the entry state and exposed through the existing
  `VisitProvider`; it is distinct from customer context.
- Cart and customer/order pointers are browser-side continuity state, not
  proof of ownership. Do not return protected data solely because those IDs
  were sent.
- Customer drafts currently persist name/phone in `sessionStorage` to retain
  checkout progress. This is personal data, not an auth secret; deploy with
  appropriate browser/device expectations and clear it when customer context
  is cleared. Do not move it to long-lived storage.

## Environment configuration

Copy `web/.env.example` to a local environment file and set
`NEXT_PUBLIC_API_URL` to the API origin (without `/api/v1`). The Web application
requires it; there is no hardcoded localhost fallback. Production requires an
HTTPS API origin.

`NEXT_PUBLIC_API_URL` is public routing configuration and is compiled into the
browser bundle. Never place credentials, API keys, passwords, or tokens in
`NEXT_PUBLIC_*`. Future auth credentials must be supplied at runtime through
the in-memory API token provider, backed by a separately agreed auth design.

## OpenAPI audit notes

- The Web's called paths and methods match the current OpenAPI paths; the
  endpoint map above lists the customer Web calls.
- The Web expects the documented `{ data: ... }` response envelope and now
  rejects successful responses that are invalid JSON or lack `data`.
- Core response schemas now declare the required identity/context/menu/order
  fields consumed by the Web. `Order.customerId` remains required but nullable,
  matching the OpenAPI property; the Web response type handles null explicitly.
- QR response IDs and session/visit context are treated as opaque server
  values. QR tokens and path IDs are URL-encoded.
- Feedback replay behavior (`200` for replay/duplicate, `201` for creation)
  is represented in the current contract.
- The OpenAPI server is now the relative `/api/v1` path. The Web's configured
  API origin supplies the host in each environment; endpoint, schema, and
  authentication semantics are unchanged.
- The OpenAPI description documents optional `X-Request-ID` request/response
  correlation metadata. It does not alter endpoint payloads or authentication
  semantics.
- The client classifies `429` and `5xx` responses, but not every operation
  currently declares those operational responses in OpenAPI. Before the
  production backend emits rate-limit/server-error responses, add explicit
  `429` and `5xx` response references (or a documented `default`) to the
  affected operations and use the common `ErrorResponse` envelope.
- **Proposed schema alignment, recorded before application:** several current
  response schemas omit `required` fields that the Web relies on; the `Order`
  schema also permits a missing `customerId` at the property level while the
  Web previously typed it as non-null. Make the common response envelopes and
  required entity properties explicit, and let the Web's order response type
  correctly represent a nullable customer. No endpoint or business behavior
  changes are intended.

## Frontend security review

- No `dangerouslySetInnerHTML`, direct `innerHTML`, `eval`, or dynamic
  `Function` usage was found in application source. API-provided text is
  rendered as React text; external images use `next/image` and the configured
  remote-host allowlist.
- Application API requests are centralized in `web/src/lib/api.ts`; feature
  components do not construct API origins or call `fetch` directly.
- In-app navigation uses fixed local routes or encoded menu IDs. The Google
  URL is a configured café value rendered as a native external anchor with
  `noopener`/`noreferrer` protection; it is not an application redirect.
- No application console logging of tokens, phone numbers, customer/order
  payloads, or raw API errors was found.
- The only environment key is public API routing configuration; no secret
  `NEXT_PUBLIC_*` variable is defined by the Web project. Production HTTPS
  is enforced by the client configuration check.
- Customer/order/session/visit IDs and QR context are stored for UX continuity
  in browser storage. They are not credentials, and backend ownership and
  context checks remain mandatory.
- A name/phone checkout draft is persisted in `sessionStorage` to survive
  refresh during checkout. This is personal data and should remain short-lived;
  it is not an authentication secret. The customer context clear action removes
  it.
- The mock identity header and seeded mock identity are gated to development.
  No production request emits `X-Mock-Identity`; the header/seed literals are
  absent from production browser bundles. No production login, token storage,
  or authorization mechanism exists in this Web application.

## Integration checklist

- [ ] Deploy endpoints and schemas from the OpenAPI contract; keep response
  envelopes and status behavior stable.
- [ ] Configure production `NEXT_PUBLIC_API_URL` as an HTTPS origin and
  configure CORS for JSON, `Authorization`, `Idempotency-Key`, and
  `X-Request-ID`; expose the correlation response header.
- [ ] Agree and implement the production customer authentication/session
  exchange for customer creation and subsequent ownership-protected requests.
- [ ] Derive customer identity from authenticated credentials, never from the
  request's customer ID alone.
- [ ] Revalidate QR, visit, session, branch, and table relationships server-side.
- [ ] Recalculate item prices and verify availability/quantities server-side.
- [ ] Enforce idempotency for order and feedback writes, including the documented
  replay/conflict responses.
- [ ] Enforce feedback eligibility and one feedback record per order.
- [ ] Return safe structured error envelopes without stack traces or database
  details; support the documented status codes.
- [ ] Return opaque string IDs, ISO 8601 timestamps, numeric prices, currency,
  and order statuses defined in OpenAPI.
- [ ] Add backend contract/integration tests for unauthenticated, own-resource,
  cross-customer, replay, invalid-context, and unavailable-item cases.
- [ ] Verify guest ordering, returning-customer restoration, feedback ownership,
  and the Google URL configuration against the deployed service.

## Out of scope

The Web integration work does not implement production authentication or the
Python/SQL backend. Production token issuance, session lifecycle, identity
binding, authorization, ownership checks, persistence, rate limiting, and
operational monitoring remain backend/platform responsibilities.
