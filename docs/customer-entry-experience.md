# Phase 2.2: Customer Entry Experience

## Overview

Phase 2.2 implements the first real customer-facing journey: **QR Scan → Table Resolution → Splash → Welcome → Home**.

The customer experience is now:

1. Open the app from a QR code with `?qr=table-12` parameter
2. System resolves the QR to a café, branch, table, and session
3. Show a branded loading splash
4. Display a premium welcome experience with table context
5. Present the home screen as entry to future menu browsing
6. Provide clear error handling and retry capabilities

## Architecture

### State Management

All entry flow state is centralized in `EntryContext` (`web/src/lib/entry-context.tsx`):

```typescript
type EntryState =
  | { status: 'idle' }                    // No QR provided
  | { status: 'loading'; qrToken: string }  // Resolving QR
  | { status: 'resolved'; ... }           // Success - have cafe/table context
  | { status: 'error'; error: string }    // Failed to resolve
```

### API Integration

- All QR resolution goes through `fetchQrResolve(token)` in `web/src/lib/api.ts`
- Response includes cafe, branch, table, and session data
- Mock API endpoint: `GET /api/v1/qr/:token/resolve`
- Error handling for invalid QR codes (`?qr=invalid`)

### Component Structure

```
EntryProvider (web/src/lib/entry-context.tsx)
  └── HomePage (web/src/app/page.tsx)
      └── EntryFlow (web/src/components/entry/entry-flow.tsx)
          ├── EntrySplash (loading state)
          ├── EntryWelcome (successful resolution + table info)
          ├── EntryError (error state + retry)
          └── CafeHome (home screen after welcome)
```

## Routes

### `/` (Index)

- **Purpose**: Entry point for QR resolution
- **Query Parameters**: `?qr=table-12` to trigger QR resolution
- **Without QR**: Shows landing screen with dev testing helper
- **State**: Idle (no QR) → Loading → Resolved/Error

### `/home`

- **Purpose**: Full café home experience
- **Requires**: Resolved entry context (table must be known)
- **Features**: Café header, table badge, "Explore Menu" CTA

### `/menu`

- **Purpose**: Menu navigation route structure
- **Status**: Placeholder for Phase 2.3 implementation
- **Current State**: Shows "Coming Soon" with link back to home

### `/design-system`

- **Purpose**: Component showcase (unchanged from Phase 2.1)
- **Status**: Fully functional reference for design tokens and UI primitives

## Components Created

### `EntrySplash` (entry-splash.tsx)

Loading screen shown while resolving QR. Features:

- Coffee icon in branded badge
- "Preparing your table..." message
- Subtle pulse animation
- Respects `prefers-reduced-motion`

### `EntryWelcome` (entry-welcome.tsx)

Welcome screen after successful QR resolution. Features:

- Time-aware greeting (Good morning/afternoon/evening)
- Café logo and name from resolved data
- Table information badge
- Friendly message and "Continue" CTA
- Staggered entrance animation

### `EntryError` (entry-error.tsx)

Error state for invalid/failed QR. Features:

- Alert icon in error-colored badge
- Customer-friendly error message
- Retry button
- Guidance text
- Staggered entrance animation

### `CafeHome` (cafe-home.tsx)

Main home screen after entry. Features:

- Header with café logo and table badge
- Hero section with café tagline
- "Explore Menu" primary CTA (links to `/menu`)
- "View Recommendations" secondary CTA (placeholder)
- About section with café description
- Responsive mobile-first layout

### `TableBadge` (table-badge.tsx)

Reusable component displaying current table context. Features:

- Shows table name from resolved context
- Subtle background styling using design tokens
- Only renders when table is known

### `EntryFlow` (entry-flow.tsx)

Wrapper component that:

- Handles `useSearchParams()` with Suspense boundary
- Manages QR extraction and resolution
- Routes between splash/welcome/error/home states
- Provides retry functionality

## API Contract

### QR Resolution Endpoint

```
GET /api/v1/qr/:token/resolve
```

**Success Response (200)**:

```json
{
  "data": {
    "cafe": {
      "id": "cafe_nexa",
      "name": "NEXA Café",
      "description": "...",
      "currency": "EGP",
      "timezone": "Africa/Cairo",
      "logo": "https://...",
      "status": "ACTIVE"
    },
    "branch": {
      "id": "branch_1",
      "cafeId": "cafe_nexa",
      "name": "Downtown Branch",
      "address": "...",
      "phone": "...",
      "timezone": "Africa/Cairo"
    },
    "table": {
      "id": "table_12",
      "branchId": "branch_1",
      "name": "T12",
      "capacity": 4,
      "status": "ACTIVE"
    },
    "session": {
      "id": "session_guest_1",
      "status": "ACTIVE",
      "customerId": null,
      "startedAt": "2026-09-08T10:00:00Z",
      "lastActivityAt": "2026-09-08T10:42:00Z",
      "cafeId": "cafe_nexa",
      "branchId": "branch_1",
      "tableId": "table_12"
    }
  },
  "meta": {}
}
```

**Error Response (400)**:

```json
{
  "error": {
    "code": "INVALID_QR",
    "message": "The QR code is invalid or expired.",
    "details": { "token": "invalid" }
  }
}
```

## Testing

### Valid QR Flow

```
Start: http://localhost:3000?qr=table-12
1. Page loads → resolves QR → shows splash
2. Mock API resolves successfully
3. Welcome screen displays with café name and "Table T12"
4. "Continue" button visible
```

### Invalid QR Flow

```
Start: http://localhost:3000?qr=invalid
1. Page loads → resolves QR → shows splash
2. Mock API returns 400 INVALID_QR
3. Error screen displays
4. "Try Again" button triggers retry
```

### No QR (Dev Starting Point)

```
Start: http://localhost:3000
1. No query parameter
2. Shows landing screen with "Scan the QR code at your table"
3. Dev helper displays: ?qr=table-12 example
4. Can manually test by navigating to http://localhost:3000?qr=table-12
```

### Mobile Responsiveness

- Tested at: 320px, 375px, 390px, 430px, tablet, desktop
- All components use mobile-first Tailwind classes
- Safe area spacing added (bottom padding on /home)
- No horizontal overflow

### Keyboard & Accessibility

- All buttons semantic `<button>` or `<Link>`
- Focus states visible
- Error messages descriptive
- Icons have `aria-hidden="true"` where appropriate
- Sufficient color contrast maintained

## Design Language

### Color Palette

- **Primary**: `#8a5c3c` (warm brown)
- **Secondary**: `#d39a68` (warm sand)
- **Background**: `#f6f0ea` (warm cream)
- **Surface**: `#ffffff` (white)
- **Text**: `#1f1a17` (dark brown)
- **Text Muted**: `#6a5a54` (light brown)

### Motion

- **Splash Loading**: Pulse animation on dot indicators
- **Welcome Entry**: Staggered fade + slide up
- **Error Entry**: Staggered fade + slide up
- **All Animations**: Respect `prefers-reduced-motion`

### Typography

- **Display**: 3-5xl, semibold, -0.06em tracking
- **Heading**: 2-3xl, semibold, -0.04em tracking
- **Body**: base/lg, regular, leading-7
- **Label**: xs, uppercase, 0.12-0.16em tracking

## Known Limitations

1. **Welcome → Home Transition**: Currently shows welcome, then home in hidden div. Future phases can add page transition or navigation trigger.

2. **Table Context Persistence**: Entry context resets on page refresh. Production should use session cookies or URL state.

3. **Missing Backend Fields**: If future phases need café branding (colors, fonts), add to OpenAPI contract.

4. **No Customer Identity**: This phase is guest-only. Future phases will add login/account.

5. **Menu Not Implemented**: `/menu` is placeholder. Phase 2.3 will add full menu system.

## Future Phases

### Phase 2.3: Menu Implementation

- Full menu categories and items
- Product images with lazy loading
- Item details page with customization
- Add to cart functionality
- Inventory/availability handling

### Phase 2.4: Ordering & Cart

- Cart state management
- Special requests / customization
- Order summary
- Payment integration placeholder
- Order confirmation

### Phase 2.5+: Customer Accounts

- Login/signup
- Customer profile
- Order history
- Saved favorites
- Loyalty tracking
- AI recommendations

## Development Commands

### Build

```bash
npm --workspace web run build
```

### Dev Server

```bash
npm --workspace web run dev
```

### Mock API (separate terminal)

```bash
npm --workspace mock-api run start
```

### Both Together

```bash
npm run dev
```

## File Changes Summary

### Created Files

- `web/src/lib/entry-context.tsx` - State management for entry flow
- `web/src/lib/api.ts` - Updated with type definitions and improved structure
- `web/src/components/entry/entry-splash.tsx` - Loading screen
- `web/src/components/entry/entry-welcome.tsx` - Welcome experience
- `web/src/components/entry/entry-error.tsx` - Error handling
- `web/src/components/entry/cafe-home.tsx` - Home screen
- `web/src/components/entry/table-badge.tsx` - Table context display
- `web/src/components/entry/entry-flow.tsx` - Entry flow orchestration
- `web/src/app/home/page.tsx` - /home route
- `web/src/app/menu/page.tsx` - /menu route placeholder
- `docs/customer-entry-experience.md` - This documentation

### Modified Files

- `web/src/app/page.tsx` - Now entry point for QR flow
- `web/src/app/layout.tsx` - Wrapped with EntryProvider
- `web/src/lib/api.ts` - Enhanced with types and documentation

## Verification Checklist

- ✅ QR resolution works with `?qr=table-12`
- ✅ Invalid QR shows error with `?qr=invalid`
- ✅ Missing QR shows landing screen gracefully
- ✅ Splash screen displays while loading
- ✅ Welcome shows café name and table info
- ✅ Error screen allows retry
- ✅ Home screen displays with CTA to menu
- ✅ Mobile responsive (320px-1200px)
- ✅ Animations respect `prefers-reduced-motion`
- ✅ No console errors or hydration mismatches
- ✅ TypeScript compiles without errors
- ✅ Production build succeeds
- ✅ All icons use Lucide (no emoji)
- ✅ Design tokens only (no hardcoded colors)
- ✅ API abstraction maintained (no direct fetch in components)

## Conclusion

Phase 2.2 establishes a polished, premium customer entry experience that immediately communicates table awareness and café identity. The QR-driven flow is elegant, error-resilient, and ready for future expansion into menu browsing, ordering, and customer accounts.

The foundation is now ready for Phase 2.3: full menu implementation.
