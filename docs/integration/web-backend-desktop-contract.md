# Web, backend, and desktop integration contract

## 1. System architecture

The shared platform is built around a contract-first model. The OpenAPI document is the source of truth for client apps and the backend team. The SQL schema documents the domain model. The mock API enables UI work before the production backend exists.

## 2. Shared entities

The web app, backend, and desktop app must use the same terms for:

- Café
- Branch
- Table
- CustomerSession
- Customer
- MenuCategory
- MenuItem
- Order
- OrderItem
- Payment
- Favorite
- Review

## 3. Shared enums

All apps must use the same exact values for order status, payment status, and payment method.

## 4. QR flow

The QR code resolves to a café, branch, table, and session context. The web app must not rely on manual table entry. Instead, it calls the QR resolution contract and derives the active context from the response.

## 5. Session flow

Guest sessions are supported by default. A customer can browse and order without an account. If the customer later registers or is linked to a profile, the session may be updated to attach the customer identity.

## 6. Customer lifecycle

A customer may begin anonymous, become a guest session, and then optionally become a registered customer after meaningful checkout or identity confirmation. This matters for future personalization without forcing login early.

## 7. Order lifecycle

Orders move through:

PENDING -> CONFIRMED -> PREPARING -> READY -> SERVED -> COMPLETED

A cancellation is allowed only from PENDING to CANCELLED.

## 8. API conventions

- Base namespace: `/api/v1`
- Success envelope: `{ data, meta }`
- Collection envelope: `{ data: [], meta: { page, pageSize, total, totalPages } }`
- Error envelope: `{ error: { code, message, details, status } }`

## 9. Error conventions

Standard error codes include:

- VALIDATION_ERROR
- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- INVALID_QR
- SESSION_EXPIRED
- ITEM_UNAVAILABLE
- ORDER_NOT_FOUND
- INVALID_ORDER_STATUS
- INTERNAL_ERROR

## 10. Pagination

All collection endpoints implement the same pagination contract, even when no pagination is required in the simplest implementation.

## 11. Real-time events

The same event names must be used across all clients:

- ORDER_CREATED
- ORDER_CONFIRMED
- ORDER_PREPARING
- ORDER_READY
- ORDER_SERVED
- ORDER_COMPLETED
- ORDER_CANCELLED

## 12. Authentication concepts

- Guest sessions require no password
- Customer accounts may exist without forcing login before browsing
- Staff/admin applications require separate authentication, handled by the backend team

## 13. Google review concept

Internal reviews are owned by NEXA. Google reviews are external and should be surfaced via CTA only. The app may link to Google Maps or a place page after an order is completed and a feedback event occurs, but the backend does not synchronise Google reviews into the internal database.

## 14. What the web app expects

- QR resolution before menu rendering
- Session creation or restoration
- Menu fetching from API
- Order creation from cart
- Order tracking state from API or events
- Guest or returning customer experience without assuming a login state

## 15. What the desktop app expects

- shared order lifecycle
- shared customer/session model
- same event names
- same error and response envelope
- same café/branch/table structure

## 16. What the backend must provide

- fully aligned API contract
- data validation and pricing enforcement on the server
- correct handling of session and QR state
- order state transitions and event emission
- error handling consistent with the shared contract
