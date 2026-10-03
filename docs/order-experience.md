# Phase 2.4: Customer Ordering

## Architecture and journey

`/?qr=table-12` resolves cafe, branch, T12 and session through EntryProvider.
The menu's bag links to `/order/cart`, followed by `/order/customer`,
`/order/review` and `/order/success`. `/order/history` provides basic history.
Returning customers with a valid reference skip the form. There is no registration.

CartProvider shares one hydrated cart across routes. OrderProvider owns the short
customer draft, resolved customer, submission lock, pending attempt and active order.
The presentation uses the centralized API client, never raw fetch.
Confirmation resolves the customer belonging to the order, even after details change.

## API and contract changes

OpenAPI changed: YES.

Existing endpoints consumed:

- GET `/api/v1/qr/{token}/resolve`
- GET `/api/v1/cafes/{cafeId}/menu`
- POST `/api/v1/customers`
- GET `/api/v1/customers/{customerId}`
- POST `/api/v1/orders`
- GET `/api/v1/orders/{orderId}`
- GET `/api/v1/customers/{customerId}/orders`

No new endpoint was invented. The existing mock customer endpoints were implemented;
order/history mocks now store actual created records rather than fixed examples.

Contract additions:

- Required `Idempotency-Key` on order creation, with identical-payload replay semantics.
- `Order.items` returns the existing OrderItem schema as server-owned snapshots.
- CreateOrderRequest requires cafeId, branchId, tableId, sessionId, customerId and items.
- At least one item; integer quantities from 1 to 99.
- Documented session relationship validation, authoritative pricing and modifier rejection.

Payload (no client total or price):

```json
{
  "cafeId": "<resolved cafe ID>",
  "branchId": "<resolved branch ID>",
  "tableId": "<resolved table ID>",
  "sessionId": "<resolved session ID>",
  "customerId": "<API customer ID>",
  "items": [{ "menuItemId": "<menu item ID>", "quantity": 2, "modifiers": [] }]
}
```

The mock checks its known active session against cafe/branch/table, requires an
existing customer, validates every item's availability and quantity, and recalculates
subtotal/total from menu prices. It ignores submitted unit prices. No fees, discounts,
tax rules or payment calculations were introduced. Initial status is PENDING, displayed
as Received. IDs and order numbers are generated only by the API.

## Customer information

Name is required (maximum 100 characters). Phone uses a labelled tel input,
autocomplete and inline errors. The contract specifies no Egyptian-only format;
the UI/mock accept a leading plus, digits, spaces, parentheses and hyphens, with
7-15 digits. Formatting is preserved. Invalid fields receive associated errors and
the first invalid field is focused. Customer details can be revisited before review.

## Cart, submission and recovery

Quantity updates, explicit removal and decrement-to-zero removal update totals
immediately. Empty carts cannot submit. Unsupported modifiers are rejected rather
than silently priced incorrectly; the menu has no modifier definitions yet.

A synchronous lock plus disabled loading controls prevent simultaneous requests.
The attempt key and payload are retained before the request. An identical retry
returns the original order. Network timeout/interruption and server errors retain
the attempt; validation failures allow correction with a new attempt. After an
ambiguous response, a changed payload is blocked and the customer is directed to
check with the cafe team rather than risk creating a second order.

The submitted cart is cleared only after a successful API response. The order reference
is retained first. ITEM_UNAVAILABLE, VALIDATION_ERROR, SESSION_EXPIRED, FORBIDDEN,
network and server failures map to customer-facing messages without internal details.

## Persistence

- localStorage: cart and resolved entry context, retained across refresh/navigation.
- sessionStorage: customer ID, active order ID, temporary form draft and pending
  idempotency attempt. Personal information is not deliberately retained across tabs
  or browser sessions. References are re-fetched from the API on refresh.
- React state: resolved customer/order data, validation, loading and screen state.

Storage failures do not crash the UI, but persistence cannot be guaranteed when
browser storage is blocked. The mock stores customer/order/idempotency data in memory:
restarting it loses records, and stale references are reported to the customer.

## Design and accessibility

The spacing root cause was Tailwind 3 directives with a Tailwind 4 toolchain.
The stylesheet now imports Tailwind 4 and generates spacing, height and container
utilities correctly. Removed global main/section spacing overrides.

Order screens use explicit responsive gutters, bounded content widths, stable image
frames, readable totals and a safe-area-aware mobile action bar. Existing warm tokens,
Lucide icons and FadeIn motion utilities are reused. Desktop uses a separate summary
column; mobile uses one column. Menu sheets scroll within 92dvh, have keyboard focus
containment, Escape dismissal and focus restoration. Reduced motion is respected.

## Verification

- API regression: `node --test mock-api/tests/orders.test.mjs`.
- Customer validation/error mapping: `node --test web/tests/order-helpers.test.cjs`.
- TypeScript: `npx tsc --project web/tsconfig.json --noEmit`.
- Clean production build: `npm --workspace web run build`.
- Browser: real QR -> menu -> cart -> customer -> review -> confirmation with T12.
- Three synchronous final-button clicks produced one POST.
- API error, unavailable item and network interruption preserved cart; retry succeeded.
- Refresh restored confirmation/history; returning customer skipped the form.
- Quantity, removal, decrement-to-zero and empty-cart behavior verified.
- Cart/customer/review/success measured at 320, 375, 390, 430, 768 and 1440px:
  no horizontal overflow. Screenshots inspected across mobile/tablet/desktop.
- Long customer name, formatted phone, multiple items and landscape form checked.
- Keyboard trap/Escape/focus restoration and first-invalid-field focus verified.
- Form controls >=44px; contrast ratios: body 15.24, muted 5.80, primary button 5.51,
  error text 4.57. Browser reduced-motion emulation checked.

Final results (2026-09-09):

- Design System Applied: PASS. Visual Rendering: PASS.
- Mobile QA: PASS. Tablet QA: PASS. Desktop QA: PASS.
- Motion QA: PASS. Accessibility QA: PASS for the targeted browser checks above.
- TypeScript: PASS. Clean Build: PASS. Runtime: PASS. Hydration: PASS.
- Console Errors: PASS on the final production happy path (zero captured errors).
- Three automated test cases passed, including the multi-assertion HTTP regression.
- Responsive checks were repeated against measured CSS widths after detecting the
  integrated browser's 80% zoom; all 24 screen/width combinations passed.
- A synthetic long product title and a real long customer name fit at 320 CSS pixels.
- Production QR-to-confirmation and refresh returned NX-1002 for T12 with cart cleared.
- Live preview: `http://localhost:3000/?qr=table-12`; mock API: port 4010.

Expected network/HTTP errors from deliberate failure injection are excluded from the
clean happy-path console result. Existing Tailwind shorthand editor suggestions are
not type/build failures.

## Production requirements and limitations

- Mock recognition is a reference lookup, not authentication or phone ownership proof.
  Changing details creates a new customer because no update/link operation exists;
  history remains tied to the prior customer ID. Cross-device recognition is not provided.
- Production must authorize customer/order/history reads and bind a validated QR to a
  secure session and authorized table. Browser context is not a security boundary.
- Python + SQL must persist orders/items/customer relationships and idempotency keys
  transactionally, enforce inventory at creation time and provide session expiry.
- The mock QR supports the documented table-12 only; it is not a production session service.
- Durable idempotency retention and recovery across service restarts are required.
- Cross-tab cart synchronization, multi-cafe cart partitioning, customer profile editing,
  and real assistive-device testing remain future hardening work.
- No payment, wallet, Kashier, Google Reviews, cashier UI, kitchen display or advanced
  tracking was added. Future payment must use the authoritative order ID/total.
- Browser checks are not a full screen-reader/device certification. Dark mode is not
  part of the existing design system and was not introduced.
- The installed UI skill's search script is absent locally; its supplied checklist was used.
- Dependency installation reported existing audit findings; dependency upgrades need a
  separate compatibility/security pass before production.
