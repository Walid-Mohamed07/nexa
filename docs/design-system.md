# NEXA Café design system

## Design philosophy

The NEXA Café UI should feel warm, premium, modern, and personal. It is designed to feel like a digital café relationship rather than a generic ordering website.

The system prioritizes:

- warmth and hospitality
- premium content presentation
- minimal visual noise
- responsive mobile-first interactions
- calm, polished motion
- accessible contrast and focus states

## Design tokens

The design system is centralized through CSS variables:

- colors
- radii
- shadows
- type scale
- spacing scale

## Color system

The semantic tokens are configured in the global stylesheet and are intended to remain portable for future café branding.

Core tokens include:

- background
- surface
- surface elevated
- primary
- primary hover
- secondary
- text
- text muted
- border
- success
- warning
- error

## Typography

The default direction is a premium sans-serif stack with Manrope as the preferred visual expression when available.

Supporting hierarchy:

- display
- h1
- h2
- h3
- body large
- body
- caption
- label

## Spacing and radius

Use the spacing scale consistently: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.

Use radius tokens with clear intent:

- sm
- md
- lg
- xl

## Motion

The motion system uses subtle transitions optimized for mobile-first interaction.

Timing roles:

- fast: 120–180 ms
- normal: 200–300 ms
- slow: 350–500 ms

Reduced motion is respected using `prefers-reduced-motion`.

## Icon system

NEXA uses Lucide React as the single icon system for the entire frontend.

No emojis are used as UI icons.

## Components

The UI foundation includes:

- buttons
- icon buttons
- inputs
- cards
- badges
- skeletons
- empty states
- error states
- mobile bottom navigation

## Accessibility

The system includes:

- semantic structure
- visible focus states
- touch-friendly interaction areas
- readable contrast
- reduced-motion support
- proper labels for icon-only controls

## Responsive behavior

The UI is treated as mobile-first, with attention to phone ergonomics, safe-area insets, and bottom-navigation coverage.

## Usage rules

- Use tokens instead of raw hex values
- Use a limited number of animation styles
- Use cards only when grouping content is useful
- Keep interactions simple and tactile
- Avoid generic template patterns
- Do not add unnecessary decorative elements
