# Customer Identity and Account

## Customer Model

The customer identity is the API-owned `Customer` returned by the existing `POST /customers` and `GET /customers/{customerId}` operations in [the OpenAPI contract](api/openapi.yaml). The web app stores the returned customer reference in session storage and restores the current profile through the API. The customer name and phone remain in the existing order provider; there is no parallel account store.

The customer reference is a client-side convenience, not proof of identity. It is not an authentication credential and must not authorize access to customer or order data.

## Context Boundaries

- Café context comes from QR resolution and contains the café, branch, table, and session.
- Customer context comes from the customer API and contains the customer ID, name, and phone.
- Order context contains the cart and the current order; order history uses the existing customer-orders endpoint and page.

The customer reference is not written into the QR-resolved session context by the web app. Order creation associates the existing customer ID with the café, branch, table, and session already supplied by the entry context.

## New Customer Flow

When no valid customer reference is stored, checkout collects a name and phone number. It calls the existing customer-create operation before moving to order review. The resulting API customer reference is stored for the current browser session and used by order creation. API failures remain visible with the form available for retry.

## Returning Customer Flow

When a stored customer reference exists, the app fetches it through the API. A successful response restores the customer's name and phone and skips repeated form entry at checkout. The home and checkout screens use a brief returning-customer greeting. A failed restore can be retried or cleared to continue as a new customer.

The mock API seeds `customer_walid` with an active and a completed order for repeatable browser checks. New-customer testing starts without `nexa-customer-id`; creating a customer and order exercises the normal API path. The seed is development-only and is not production business data.

## Account Behavior

`/account` displays the restored customer name and a masked phone number. Order history links to the existing `/order/history` experience. When the restored order is active, the account links to the existing `/order/active` experience. Clearing customer context removes the browser's customer and current-order references but does not delete server records or clear the cart.

The six-item customer navigation reuses the existing navigation component and points to Home, Menu, Cart, Active Order, Orders, and Account. The order-history page remains the only history implementation.

## API and Mock Behavior

Customer creation, profile, order history, order details, preferences, and favorites use the existing API operations. Customer-scoped reads and writes require authenticated identity and ownership authorization in the OpenAPI contract. Personalized recommendations and visit resolution require that identity whenever `customerId` is supplied; guest calls remain public when it is omitted.

The mock uses a development-only `X-Mock-Identity` opaque context header, mapped server-side to one customer. The seeded Walid fixture has a known test context; newly created mock customers receive a random context in the response header. It supports deterministic 401/403 ownership tests only. It is not a production credential and is intentionally excluded from the backend-agnostic OpenAPI contract.

## Security and Production Expectations

Local storage, session storage, URL values, customer IDs, and order IDs are untrusted references, not production authentication. The mock header only simulates a resolved identity context; it does not make the mock a secure identity provider. Phone numbers are masked in customer-facing account and order-review views.

The production Python/SQL backend owns real identity and must implement authentication, authorization, customer ownership checks, order ownership checks, preference ownership checks, session/token validation, and server-side access control before disclosing or changing private data. It must never trust a browser-supplied `customerId` as identity. The existing OpenAPI Bearer scheme describes the authenticated boundary; issuance, validation, and implementation are backend-owned. Any account recovery mechanism must also be server-owned. No payment, loyalty, or marketing behavior is introduced here.
