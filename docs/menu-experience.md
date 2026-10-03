# Phase 2.3: Menu Experience

## Status

Passed final visual QA and runtime validation.

The customer-facing café menu is implemented as a table-aware, contract-driven experience that preserves the QR/table context from the entry flow and supports browsing, searching, item details, and cart interactions.

## Scope

- Real `/menu` route for the NEXA café experience
- Table context-aware menu access and ordering flow
- Category navigation, search filtering, and item detail drawer
- Quantity selection and cart drawer with subtotal and local persistence
- Premium café styling aligned with the brand design direction

## Key Files

- [web/src/app/menu/page.tsx](../web/src/app/menu/page.tsx) — route entry for the menu experience
- [web/src/components/menu/menu-page.tsx](../web/src/components/menu/menu-page.tsx) — primary menu UI and interactions
- [web/src/lib/api.ts](../web/src/lib/api.ts) — typed menu contract and API access layer
- [web/src/lib/menu-helpers.ts](../web/src/lib/menu-helpers.ts) — menu grouping, filtering, and pricing utilities
- [web/src/lib/cart.ts](../web/src/lib/cart.ts) — local cart state and persistence
- [web/src/lib/entry-context.tsx](../web/src/lib/entry-context.tsx) — QR/table context passed into the menu flow

## Behavior

### Menu browsing

- The page loads the menu from the contract-backed API for the resolved cafe ID.
- Category chips are derived from the fetched menu data.
- Users can browse by category or use the search box to filter dishes.
- Empty and error states are shown when the menu is unavailable or no results match.

### Item detail flow

- Selecting an item opens a full-height detail drawer.
- The item includes image, description, availability, and price.
- Quantity controls are available before adding to the cart.
- A customer can add the item directly to the cart from the item detail panel.

### Cart experience

- The cart drawer lists selected items and quantities.
- Each line item can be incremented or decremented.
- The subtotal is calculated from the order contents.
- Cart state persists locally in browser storage.

## Validation

### Runtime verification

Verified using the live application with the QR context preserved:

- URL: `http://localhost:3000/menu?qr=table-12`
- Resolved table: `T12`
- Cafe name: `NEXA Café`

### QA checks passed

- Menu route loads without the placeholder state.
- Table context appears correctly in the header.
- Search input renders and filters results.
- Category navigation renders and switches sections.
- Product cards display name, description, price, and availability.
- Item detail modal opens and allows quantity selection.
- Add to cart succeeds from the menu item detail view.
- Cart drawer displays the added item and subtotal.
- Premium café styling remains consistent with the project design system.

## Notes

The implementation intentionally keeps the ordering flow lightweight for this phase, while preserving the structure for future expansion such as add-ons, customizations, and checkout.

## Recommendation

Phase 2.4 may proceed now that the actual rendered menu experience has passed visual QA and runtime verification.
