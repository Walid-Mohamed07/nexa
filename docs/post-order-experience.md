# Phase 2.5: Post-Order Customer Experience

## Goal

The customer relationship should not end after "Order placed." The app now keeps the relationship active from order confirmation through active status, history, reorder, feedback, and a public Google review journey while keeping the original contract-first order architecture intact.

## Architecture

The post-order flow uses the same server-owned order model that was already established in Phase 2.4:

- Entry resolution remains the source of cafe, branch, table and session context.
- Order creation stays in the API contract and mock backend.
- The frontend reads order status and history from the same `/orders` and `/customers/{customerId}/orders` endpoints.
- Cart logic remains client-owned for the current draft, while historical order snapshots are never treated as the live cart.
- The UI adds post-order states without inventing duplicate route namespaces or a second order lifecycle.

This keeps the customer experience aligned with the contract and preserves idempotency, customer resolution and pricing integrity.

## Customer journey

The flow is:

- successful order confirmation
- active order view
- order detail / order history screen
- optional reorder against the current menu
- optional feedback card for completed orders
- optional Google review CTA that stays separate from private NEXA feedback

Customer-facing status labels are derived centrally from API state, not hardcoded in the view layer:

- PENDING → "Order received"
- CONFIRMED → "Confirmed"
- PREPARING → "Being prepared"
- READY → "Ready"
- SERVED → "Served"
- COMPLETED → "Completed"
- CANCELLED → "Cancelled"
- unknown → "In progress"

## Contract and API behavior

The app reuses the server-owned order snapshot from the API contract and adds a review submit endpoint for customer feedback:

- GET `/api/v1/orders/{orderId}`
- GET `/api/v1/customers/{customerId}/orders`
- POST `/api/v1/orders/{orderId}/review`

The mock backend returns populated order records with status, snapshot items and customer metadata. Feedback is a separate operation from the public Google review CTA so the app can keep private service feedback and public reputation-building distinct.

## Reorder safety

Reorder is intentionally conservative:

- it reads the current menu from the cafe catalog
- it validates each historical item against the current menu
- it keeps the current menu pricing authoritative
- it flags unavailable items instead of silently inventing a fake cart
- it creates a new cart from the current catalog without mutating the historical order snapshot

The reorder flow therefore avoids the common failure mode where a historical order is reused as a live cart and priced incorrectly after menu changes.

## Feedback and Google review

The app separates two actions:

1. Internal service feedback: ask the authenticated customer how the completed order felt.
2. Public review: after feedback is saved, offer the café's configured Google review URL as a separate external action.

Feedback eligibility is exact: an order is eligible only when its existing status is `COMPLETED`. `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `SERVED`, and `CANCELLED` are ineligible. The client derives this from the existing order status; it does not create another lifecycle state. A completed order can have one immutable feedback record containing its feedback ID, customer ID, optional visit ID, order ID, café ID, branch ID, rating (1-5), optional comment (up to 1000 characters), and creation time.

The existing `POST /orders/{orderId}/review` endpoint persists private feedback. `GET /customers/{customerId}/feedback` returns only the authenticated customer's feedback. Both use the existing customer identity authorization boundary. The API derives the customer/café/branch from the owned order; a body or path customer ID is never accepted as proof of identity.

Submission requires an `Idempotency-Key`. A retry with the same key and payload returns the original feedback. Reusing the key with another payload returns `409`; a second key for an order that already has feedback returns the existing record without creating a duplicate. Rating and comment validation is server-side.

The optional dismissal is presentation state stored in the current browser session by customer/order pair. It suppresses the detail-page prompt on refresh and navigation; the customer may explicitly reopen it from Account or Order History. Clearing customer context removes dismissal and retry keys. Dismissal is not a feedback record and is not synced across devices.

The café payload's `googleReviewUrl` is the only destination used. The CTA opens Google externally only after NEXA feedback is saved. The UI explicitly says NEXA cannot confirm submission; clicking the link is not recorded as a completed Google review. No sentiment analysis, preference inference, or recommendation changes are derived from feedback.

The mock stores feedback in memory and uses the development-only `X-Mock-Identity` header. It is not production authentication. The Python/SQL backend must validate real identity/session credentials, enforce customer and order ownership, enforce one feedback record per order, and persist the feedback constraints server-side.

## Persistence and UX

The post-order experience uses the same persistent pattern as the earlier order flow:

- current cart remains in localStorage
- minimal customer/order references and attempt state stay in sessionStorage
- order detail and active-order reads are refreshed from the API rather than trusting stale browser state
- route transitions use real app routes rather than fake modal-only state

For mobile use, the customer can move between home, menu and order history via the bottom navigation without duplicating route logic.

## Phase 7 verification

Automated checks on the final implementation:

- `node --test mock-api/tests/phase5.test.mjs mock-api/tests/home.test.mjs mock-api/tests/orders.test.mjs web/tests/order-helpers.test.cjs web/tests/menu-helpers.test.mjs` — 22 passed.
- `npm --workspace web run build` — passed with no lint or type warnings.
- OpenAPI YAML parse and feedback authorization/idempotency audit — passed.

Browser checks:

- Guest QR-to-order flow created NX-1002 at T12 using the existing customer/order flow.
- Completed order NX-0999 showed the optional feedback form; dismissal persisted through reload and could be explicitly reopened from Order History.
- Rating/comment submission persisted and appeared in Order Details, Account, and Order History. Repeated submission returned the existing record.
- Active order NX-1000 and pending order NX-1002 did not show feedback actions.
- Anonymous feedback reads/submissions returned 401; own customer reads succeeded; another mock identity received 403.
- Clearing customer context removed the feedback UI, customer ID, and mock identity from the browser; guest Home/Menu remained available.
- Home, Account, Order History, feedback details, and Cart had no horizontal overflow at 320, 375, 390, 430, 768, 1024, and 1440 CSS pixels.
- Warm local Home navigation measured 57 ms DOMContentLoaded and 121 ms load; transfer size was served from cache and not measurable in that run.
- Accessible names, labels, `aria-live` feedback state, and reduced-motion preference were inspected. Fresh application navigation had no console errors, page errors, or failing localhost responses.
- The Google CTA points to the configured `googleReviewUrl`, opens in a new tab, and explicitly says NEXA cannot confirm a Google submission. Direct navigation reached Google's automated-traffic challenge page; no external review was claimed or verified.

**Remaining QA limitation:** the integrated browser keyboard tools did not dispatch key events to the focused rating buttons or move focus with Tab. The rating controls are native labelled buttons with visible focus styling, but keyboard activation could not be browser-verified in this environment. The browser also did not surface the external `_blank` popup event, although the configured destination and target were inspected directly. Phase 7 sign-off remains incomplete until keyboard interaction is verified in a browser that accepts keyboard input.

## Production notes

This is still the mock/customer-facing layer, not a secure production identity system. A real implementation must still enforce authorization, valid session ownership and server-side review enforcement. The UI should never be treated as the source of truth for order ownership or review eligibility.
