# The Sports Shed Co. — landing page

A static landing page for an authenticated sports memorabilia house. No build
step, no dependencies: open `index.html`, or serve the folder with any static
host.

```
index.html            markup for all eight sections
assets/css/styles.css design tokens + all component styles
assets/js/main.js     mobile menu, lot rail (tabs + scroll), drop signup
```

## Design system

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#0A1729` | vault ground — hero, rail, footer |
| `--navy` | `#16294E` | brand navy from the mark; cards, ticker |
| `--cream` | `#F3EEE3` | gallery ground — categories, authentication, newsletter |
| `--crimson` | `#C13230` | the chevron accent; primary CTA, step rules |
| `--brass` / `--brass-lite` | `#C0983F` / `#E6CD8E` | foil hairlines, seals, lot numbers |
| `--mist` / `--slate` | `#A8B6CE` / `#55637C` | body text on dark / on cream |

Type is three roles: **Bodoni Moda** for display (auction-catalogue register),
**Barlow Condensed** for lot numbers, labels and UI (it matches the condensed
caps in the logo lockup), **Barlow** for body copy.

Two structural rules the page sticks to:

- **Dark plinths everywhere.** Product art sits on a dark radial ground even
  inside the cream bands, so goods always read as lit objects in a case.
- **Lot numbers, not decoration.** Every item carries a `Lot 0000` reference
  because each piece is a unique lot — the numbering encodes something true
  rather than ornamenting the layout.

The page commits to a single visual theme (the brand is navy/cream), so it
paints every colour explicitly rather than inheriting a host background.

## Placeholder content to replace before launch

- **Authentication partners** (Veritas, Meridian, Hallmark, Holograph) are
  invented marks standing in for real third-party authenticators. Swap them for
  your actual partners' names and licensed logos.
- **Athletes, lots and prices** are fictional. Real names must not appear
  against listings that don't exist.
- Product art is inline SVG in the `<symbol>` sprite at the top of `index.html`.
  Replace `<use href="#i-…">` references with real photography when it's shot;
  the plinth styling is built to sit behind cut-out product shots.
- The newsletter form validates and confirms client-side only — wire
  `assets/js/main.js` to your list provider.

## Accessibility notes

Skip link, visible focus rings, `aria-expanded` on the menu, `role="status"` on
the signup response, and a `prefers-reduced-motion` block that disables the hero
lift. Crimson is used for large text and fills only — it doesn't carry small
body copy on the navy ground.
