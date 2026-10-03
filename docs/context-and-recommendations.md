# NEXA Café — Context & Recommendation Foundation

Phase 5 uses deterministic recommendations only.

## 1. Visit model

A visit represents the customer’s current café interaction. It is separate from the long-lived customer profile and from any order transaction.

- cafeId
- branchId
- tableId
- customerId when available
- sessionId
- startedAt
- state

The supported lifecycle is intentionally small:

- ACTIVE
- COMPLETED
- EXPIRED

The visit layer is the single place where the customer app resolves QR and table context before the experience continues to home, menu, cart, and checkout.

## 2. Time, day, and occasion context

The application uses a central resolver so time-based recommendations are deterministic and easy to explain.

- morning
- afternoon
- evening
- weekday
- weekend

Occasion is optional and must come from explicit customer choice or café configuration. It is never inferred from personal behavior or demographics.

Examples:

- breakfast
- study
- work
- friends
- family
- evening

## 3. Preference model

Customer preferences are kept minimal and explicit.

CustomerPreference

- customerId
- preferenceType
- value
- source
- createdAt
- updatedAt

Allowed source values:

- EXPLICIT
- SYSTEM_DEFAULT

For phase 5, customer-facing preference data remains EXPLICIT only unless the café intentionally seeds defaults in a future release.

## 4. Recent order signals

The app may surface explicitly safe and explainable recent-order signals:

- recently ordered item
- recently ordered category
- order frequency at a high level

These signals are only used when the underlying data is real and still available in the current menu. Items that are unavailable or removed are filtered out before they appear in a recommendation.

## 5. Recommendation contract

Recommendation

- id
- itemId
- title
- reason
- source
- priority

Allowed source values:

- FEATURED
- POPULAR
- SEASONAL
- OCCASION
- RECENT
- EXPLICIT_PREFERENCE

No AI source is included in phase 5.

## 6. Deterministic strategy

The recommendation strategy is deliberately simple and transparent:

1. explicit preference
2. recent order
3. current occasion
4. seasonal
5. popular
6. featured

This list is an implementation strategy, not a hidden customer-value score. The app never displays a numeric score or a ranking of personal worth.

## 7. Availability and deduplication

Recommendations are generated only from currently available menu items. Stale or unavailable items are dropped before the UI sees them.

If the same item qualifies from multiple sources, the system keeps the strongest explanation and deduplicates to a single card.

## 8. Privacy and security

The recommendation layer follows strict minimization:

- no inferred sensitive attributes
- no health data
- no behavior profile
- no hidden scoring
- no assumptions about customer identity beyond trusted session or customer data

The browser is never treated as an authorization source. Customer identity, visit identity, and café context remain backend-trusted.

## 9. Home and account integration

The Home experience can show a calm, editorial recommendation strip such as:

- Recommended for you
- From your recent orders
- For this afternoon

The Account page offers an optional, lightweight preference entry point without turning the page into a large settings dashboard.

## 10. Future AI extension points

This foundation keeps the app ready for future AI or personalization work without implementing it in phase 5. The clean boundary is:

Customer + Visit Context + Order History + Explicit Preferences + Café Context + Time Context

→ Recommendation Context

→ Recommendation Strategy

→ Customer-facing Recommendations

The future AI layer can consume the same structured context without needing to invent ad hoc data collection or hidden profiling.
