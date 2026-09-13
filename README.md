# The Sports Shed Co. — landing page

A static landing page for an authenticated sports memorabilia house. No build
step, no dependencies: open `index.html`, or serve the folder with any static
host.

```
index.html            landing page — all eight sections
about.html            origin story, vault, team, philosophy, figures
faq.html              authentication, shipping, returns, payment
consign.html          consignment process, declines, rates, submission form
assets/css/styles.css design tokens + every component style
assets/js/main.js     mobile menu, lot rail, drop signup, consignment form
assets/img/           favicon
tools/sync-chrome.py  keeps the header/footer identical across pages
vercel.json           clean URLs + asset caching
```

There is no build step, so the header and footer are duplicated into each
page between `CHROME:TOP` / `CHROME:FOOT` comment markers. Edit them in
`index.html` only, then:

```
python3 tools/sync-chrome.py          # push the change to the other pages
python3 tools/sync-chrome.py --check  # exit 1 if any page is stale (CI)
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

Two structural rules the pages stick to:

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
- **Both forms are client-side only.** The Thursday-drop signup and the
  consignment submission validate and confirm in the browser and send nothing.
  Wire them to a handler (Formspree, a Vercel function, your CRM) before
  launch — see the TODO in `consign.html`. Until then the `mailto:` fallback in
  the consignment fine print is the only route that reaches anyone.
- **Everything on the About page is invented**: the founder and team, the 2009
  jersey, the addresses, the phone number, and every figure. The numbers are at
  least self-consistent — 5,061 inspected, 4,218 listed, 843 returned, which is
  the one-in-six rejection rate quoted on the consignment page — so if you
  change one, change all three.
- **Commission bands, shipping thresholds and the returns window** are
  plausible placeholders, not your terms. The FAQ and consignment pages state
  them as fact; check every number against what you actually offer.
- The **pricing claim** in the hero and trust bar ("14% below retail") is
  unverified. It is a comparative advertising claim and needs a substantiated
  basis before it goes near a real storefront.

## Accessibility notes

Skip link, visible focus rings, `aria-expanded` on the menu, `role="status"` on
the signup response, and a `prefers-reduced-motion` block that disables the hero
lift. Crimson is used for large text and fills only — it doesn't carry small
body copy on the navy ground.
