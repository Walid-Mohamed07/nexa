# API contract

The API is defined in OpenAPI 3.x and is the primary source of truth for frontend, backend, and desktop teams.

## Contract responsibilities

- Shared request/response shapes
- Shared enums and error format
- Collection conventions and pagination
- QR and session flows
- Menu and checkout flows
- Order lifecycle and review flows

## Contract source

- OpenAPI file: `docs/api/openapi.yaml`

## Important conventions

- Use versioned namespace `/api/v1`
- Use a consistent success envelope: `data` + `meta`
- Use a single error envelope: `error.code`, `error.message`, `error.details`
- Avoid sending internal DB IDs directly to clients when a stable public ID is preferable
- Price validation must occur on the server in production

## Customer authorization

Customer IDs and order IDs select resources; they do not authenticate callers. Customer profiles, preferences, favorites, order history, order details, and order reviews require an authenticated customer identity and server-side ownership checks. The OpenAPI contract uses its existing Bearer security scheme and documents `401` for missing/invalid identity and `403` for a valid identity that does not own the requested resource.

Guest recommendations and visit resolution remain available without identity only when `customerId` is omitted. Supplying a `customerId` requires authorization as that customer.

The mock API uses a development-only `X-Mock-Identity` context header to exercise ownership behavior. It is not the production authentication mechanism and is intentionally not an OpenAPI security scheme. The Python/SQL backend owns real identity, token/session validation, authentication, authorization, and customer/order/preference ownership enforcement. Never trust browser-supplied IDs as proof of identity.
