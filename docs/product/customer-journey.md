# Customer journey

## Phase 1 customer flow

1. QR scan
2. Splash screen
3. Welcome screen
4. Home screen
5. Menu / category browsing
6. Product details
7. Cart review
8. Checkout
9. Customer information capture when necessary
10. Order confirmation
11. Order tracking
12. Order history
13. Feedback
14. Google review CTA

## Guest flow

A guest enters through a QR table code and lands on a café-branded splash screen. They are then shown a welcome experience, can browse the menu, and add items to cart without needing to register. At checkout, they may be asked for name and phone when necessary, but they are not blocked from browsing.

## Returning customer flow

If the customer has a prior booking or session, the app can show a personalized home view with recommended and previously ordered items. This requires a session/customer identity model without forcing a login step before browsing the menu.

## Key product behaviors

- Menu is table-aware and café-aware
- Cart retains table context and session context
- Orders are created against a customer session, not arbitrary browser state
- Order tracking is designed for eventual real-time updates
- Feedback and review completion happen after an order is served or completed
