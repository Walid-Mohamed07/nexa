# Café Discovery and Home Experience

## Home Experience

After QR resolution, Home preserves the café, branch, and table context; welcomes a returning customer by first name when the existing customer provider has restored one; and keeps **Explore Menu** as the primary action. The page adds café-controlled featured, popular, new, seasonal, and occasion sections, followed by category discovery and the existing café description.

The content is deterministic. Labels such as "Popular at NEXA" and "Afternoon favorites" describe café-curated content; they are not generated from customer behavior or sensitive attributes.

## Discovery Model

The mock stores each content section with a stable content ID, type, title, description, image reference, active status, priority, optional start/end timestamps, branch scope, linked menu item IDs or category ID, and optional CTA label. The café is scoped by the API path. The current model intentionally omits a generic metadata bag and CMS administration fields.

Supported content types are `FEATURED`, `POPULAR`, `NEW`, `SEASONAL`, and `OCCASION`. The mock service filters inactive, not-yet-started, expired, and other-branch entries, then orders the remaining entries by priority. Only active presentation fields are returned to the web app; the client does not implement schedule or activation rules.

Images are supplied by discovery content and reuse menu image references. Home falls back to the locally served `web/public/images/nexa-cafe-still-life.svg` when a mock image URL is unavailable; the web components do not embed remote image URLs.

## Seasonal and Occasion Content

The seeded seasonal section is date-bounded and links to the existing Iced Hibiscus Tea menu item. The afternoon section is a static café-curated occasion and links to existing dessert content. Neither section infers time-sensitive personal behavior, customer characteristics, or location beyond the resolved branch context.

## Featured Items and Categories

Content links to existing menu item IDs and category IDs. Home item links navigate to `/menu?item={itemId}`; the existing `MenuPage` resolves that item from the menu response and opens its existing accessible detail drawer. Category links navigate to `/menu?category={categoryId}` and select the existing category filter. No duplicate product or item-detail experience is introduced.

Categories are returned from the established menu category model and also included by the existing café menu response. If discovery fails, Home falls back to that menu response for categories, retains the menu CTA, displays a retry state, and remains useful if the fallback request also fails. An empty active-content response still includes categories; Home shows an empty state instead of a blank section.

## API Contract

`GET /cafes/{cafeId}/home?branchId={branchId}` returns active presentation sections and canonical menu categories. Each section contains its presentation fields and resolved, currently available menu items. The service owns schedule, branch, and item-availability filtering. The OpenAPI source of truth is [openapi.yaml](api/openapi.yaml).

The Web app calls this through the existing API abstraction. It makes one Home discovery request per resolved Home visit and only requests the menu separately as a fallback after discovery fails. No customer ID, phone number, customer history, or customer-specific scoring is included in the Home request or response.

## Mock Data and Tests

The mock seeds one featured item, a popular row, a new item, a seasonal section, and an occasion section, all linked to current menu IDs and the `branch_1` context. The data is development-only. Discovery behavior is covered by `node --test mock-api/tests/home.test.mjs`, including active-window filtering, inactive/future/expired exclusion, priority ordering, branch filtering, available item references, category references, endpoint shape, and empty-content category fallback.

## Production Backend Expectations

The production Python/SQL service should assemble this customer-facing response from café/branch configuration, active content, and the canonical menu/category records. It must validate café and branch scope, evaluate active windows server-side, omit unavailable and unauthorized content, and return no sensitive customer attributes. Client-provided IDs remain untrusted references, not authorization. No admin CMS, personalization engine, analytics, loyalty, payment, or campaign system is introduced in this phase.
