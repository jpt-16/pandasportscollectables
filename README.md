# Panda Sports Collectibles

A static storefront for authenticated sports memorabilia. No build step, no
dependencies: open `index.html`, or serve the folder with any static host.

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

The mark is black, white and one green, so the site is too.

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#0A0B0C` | panda black — the primary ground |
| `--ink-2` / `--char` / `--char-2` | `#131416` `#1C1E21` `#24272C` | graphite steps for panels and plinths |
| `--paper` / `--paper-2` | `#F4F4F1` `#E6E6E1` | panda white — the light bands |
| `--green` | `#1FAE4D` | the accent from the wordmark rules; button fills, seals, lot numbers |
| `--green-lite` | `#5BD983` | accent text and links on dark |
| `--green-deep` | `#0E6B30` | accent text on paper, where `--green` fails contrast |
| `--warn` | `#E0453A` | **negative states only** — declined items, invalid fields. Never decoration. |
| `--steel` / `--slate` | `#8E9398` `#585D63` | body text on dark / on paper |

**Green never carries white text.** Buttons are a green fill with `--ink`
lettering, which is both the higher-contrast pairing and the one that matches
the mark.

Type is three roles: **Archivo** for display — the weight and width axes carry
the wordmark's condensed oblique, so headlines set `font-stretch` rather than
relying on stroke contrast; **Barlow Condensed** for lot numbers, labels and
UI; **Barlow** for body copy.

Two structural rules the pages stick to:

- **Dark plinths everywhere.** Product art sits on a neutral graphite radial
  even inside the paper bands, so goods always read as lit objects in a case.
- **Lot numbers, not decoration.** Every item carries a `Lot 0000` reference
  because each piece is a unique lot — the numbering encodes something true
  rather than ornamenting the layout.

The site commits to a single visual theme, so it paints every colour
explicitly rather than inheriting a host background.

## Placeholder content to replace before launch

- **Authentication partners** (Veritas, Meridian, Hallmark, Holograph) are
  invented marks standing in for real third-party authenticators. Swap them for
  your actual partners' names and licensed logos.
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
- **Athletes, lots and prices** are fictional. Real names must not appear
  against listings that don't exist.
- Product art is inline SVG in the `<symbol>` sprite at the top of each page.
  Replace `<use href="#i-…">` references with real photography when it's shot;
  the plinth styling is built to sit behind cut-out product shots.
- The panda mark is a simplified geometric reading of the logo, drawn to stay
  legible at 40px in the header. Swap in the real artwork as SVG when you have
  it — replace `.lockup__mark` in `index.html` and re-run `sync-chrome.py`.

## Still carrying the old name

The git repository, its directory, and the Vercel project are all still
`thesportshedco`. Nothing in the site depends on them, but renaming the Vercel
project (and pointing a `pandasports` domain at it) is worth doing before this
is shared.

## Accessibility notes

Skip link, visible focus rings, `aria-expanded` on the menu, `role="status"` on
form responses, and a `prefers-reduced-motion` block that disables the hero
lift. Every accent pairing is checked: `--green-lite` on ink, `--green-deep` on
paper, and `--ink` on green fills all clear 4.5:1.
