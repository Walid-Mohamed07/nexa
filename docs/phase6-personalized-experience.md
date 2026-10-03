# Phase 6 — Personalized Café Experience

## Scope

Phase 6 extends the Phase 5 web experience using its existing entry, visit, customer, order, preference, discovery, and recommendation contracts. The experience remains deterministic and uses only explicit preferences and configured café content. It does not introduce AI, machine learning, behavior inference, a new identity provider, a new recommendation engine, or a new Home API.

## Architecture

- `EntryProvider` remains the source of resolved QR, cafe, branch, table, session, and visit context.
- `OrderProvider` restores the current customer context and existing order state. Account and Home only render customer-owned order data returned for that current customer ID.
- Home composes the existing welcome/discovery experience with returning-customer recognition, an active-order link, deterministic recommendations, and Order Again when customer order history exists.
- The existing `/cafes/{cafeId}/home`, `/cafes/{cafeId}/recommendations`, `/customers/{customerId}/preferences`, `/customers/{customerId}/orders`, and menu endpoints are reused. Phase 6 adds authorization requirements to existing customer-specific OpenAPI operations; it adds no API paths or production authentication flow.
- Guest browsing remains available without customer identity. Customer details are collected only in the existing checkout flow.

## Home composition

A guest sees the existing welcome, featured/popular/seasonal/occasion discovery, categories, and menu entry point. A recognized customer sees the welcome-back greeting and can also see explicit-preference/recent-order recommendations and a recent Order Again action. An active order appears only when it belongs to the recognized customer and its status is not `COMPLETED` or `CANCELLED`. The displayed status is the status already returned by the order API; no real-time status is implied.

Occasion is not inferred from behavior or personal attributes. The web client does not send a hard-coded occasion to recommendations. Time context continues to come from the deterministic time resolver; configured discovery sections continue to come from the existing cafe Home response.

## Order Again

Order Again reads historical item IDs, names, quantities, and snapshot prices, fetches the current menu, and creates a fresh cart from current available menu records. Current prices and current item details are used. Removed or unavailable items are omitted and reported. Price changes and unavailable items are announced in the cart using an accessible live status. When no historical item remains available, the action reports the unavailable item names and does not replace the cart.

The historical order is only read. Its ID, status, payment (not part of this mock), prices, and snapshots are not reused for the new cart. Checkout subsequently uses the current QR table/session context and existing order creation flow.

## Preferences and recommendations

Preference choices are saved with source `EXPLICIT`. Deselecting one category clears and restores the other selected explicit preferences because the existing API only supports clearing the full preference list. Recommendations continue to use the Phase 5 deterministic recommendation foundation, filtering unavailable and invalid items and preserving source/reason metadata. No behavioral preference inference is performed.

## Mock-only assumptions

The mock API seeds `customer_walid`, an active order, and a completed historical order. The historical fixture includes an item whose current price differs from its snapshot and a currently unavailable item so the web flow can exercise reconciliation. The mock holds customer, order, and preference data in memory; it is not a production data model or authorization service.

## Security and production requirements

A customer ID in browser storage or a URL is not authentication. The mock API's customer endpoints support UI development only and must not be treated as proof that the caller owns that customer. The production Python/SQL service must authenticate or otherwise establish the customer's identity server-side, authorize reads and writes for that identity, scope order history/preferences to the authorized customer, validate cafe/branch/session/table relationships, and avoid exposing private data after context changes. Clearing browser context is a UI privacy action, not server-side revocation.

## Authorization contract

Customer-specific profile, order, preference, favorite, and order-detail operations require an authenticated identity and server-side ownership checks. Customer IDs and order IDs are resource selectors, not credentials. Requests without identity receive `401`; an authenticated identity requesting another customer's data receives `403`. Recommendations and visit resolution remain usable for guests when `customerId` is omitted; including it requires authorization as that customer.

The mock simulates this boundary with `X-Mock-Identity`, mapped server-side to a single customer and issued for newly created mock customers. This header is deliberately absent from the production OpenAPI contract and is not production authentication. The OpenAPI Bearer scheme is the existing authenticated contract; the Python/SQL backend owns real identity, token/session validation, authentication, authorization, and customer/order/preference ownership enforcement. The browser must never establish identity merely by sending `customerId`.

Automated validation uses the web helper tests, mock API tests, TypeScript checks, production build, and OpenAPI YAML parsing. Browser regression checks remain required; automated tests alone do not establish full Phase 6 completion.
