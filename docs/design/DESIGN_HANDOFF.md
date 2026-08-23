# Sprint 1 Login Design Handoff

## Design reference

The files in `design/penpot/` define the Sprint 1 login design. The React login
page uses the same layout, copy, colors, spacing, and responsive behavior.

## Design files

- `design/penpot/login-wireframe-desktop.svg` — 1440 × 900 desktop board
- `design/penpot/login-wireframe-mobile.svg` — 390 × 844 mobile board
- `design/penpot/design-tokens.json` — reusable colors, spacing, and radii in
  W3C Design Tokens Community Group format

The SVGs are editable vector references and use named groups for the board,
brand lockup, form fields, primary button, and annotations. The token file uses
the same values as `src/index.css`.

## Visual direction

- **Purpose:** secure, focused team operations—not a marketing landing page.
- **Tone:** professional, energetic, calm, and easy to scan.
- **Palette:** deep navy base, electric blue actions, green progress
  accent, white controls, and restrained neutral text.
- **Typography:** Inter when available, with Arial/system sans-serif fallback.
- **Desktop:** two-panel layout with the brand story on the left and form card
  on the right.
- **Mobile:** brand header above an overlapping form card; all controls remain
  at least 52 px tall for touch use.

## Component specifications

| Component | Desktop | Mobile | Behavior |
| --- | ---: | ---: | --- |
| Login card | 470 × 560 px | 358 × 544 px | White surface, 1 px border, soft shadow |
| Text input | 386 × 52 px | 310 × 52 px | Focus ring uses blue at 20% opacity |
| Primary button | 386 × 54 px | 310 × 54 px | Blue default, darker blue hover |
| Card radius | 20 px | 18 px | Consistent rounded surface |
| Control radius | 11 px | 10 px | Inputs and button |

## Required states

The React implementation includes these states even though only the default
state is shown on the boards:

1. Empty/default form.
2. Focused input with visible keyboard focus.
3. Required identifier error.
4. Required or too-short password error.
5. Submitting state with disabled button.
6. Invalid-credentials or service-error message.
7. Successful authentication leading to the protected dashboard.

## Accessibility decisions

- Every input has a programmatic label.
- Validation messages use `role="alert"` and are connected with
  `aria-describedby`.
- Password visibility is a real button with an accessible label.
- Colors are not the only error signal; messages accompany error borders.
- Reduced-motion preferences disable nonessential transitions.
- Desktop and mobile layouts preserve logical keyboard and screen-reader order.

## Change-control rule

If the Penpot wireframe changes after this handoff, update these three sources
together:

1. the desktop/mobile SVG boards;
2. `design/penpot/design-tokens.json`; and
3. `src/index.css` and the affected React component.

That rule prevents the design file and implemented UI from drifting apart.
