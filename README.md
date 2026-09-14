# Panda Sports Memorabilia

A **pre-launch** site for Panda Sports Memorabilia. The shop isn't open, so
there is no catalogue, no cart and no checkout — the homepage exists to
explain the proposition and collect email addresses, which it now does for
real (see "Email signups" below). The pages themselves are still plain
static HTML with no build step — open `index.html` directly, or serve the
folder with any static host, and everything renders. The one thing that
needs Vercel specifically is the signup form's *backend*: `npm install`
(Vercel runs this automatically on deploy) pulls in the `resend` package for
`api/subscribe.js`. Browsing the site elsewhere works fine; submitting a
signup form only reaches Resend when it's actually running on Vercel (or
via `vercel dev` locally).

```
index.html             pre-launch homepage — hero, why, how, what's coming, signup
about.html             origin story, vault, team, philosophy, figures
faq.html               authentication, shipping, returns, payment
privacy.html           what we collect, cookies, your rights
refunds.html           the authenticity guarantee, returns, damaged parcels
terms.html             the rules for using the site and buying from us
assets/css/styles.css  design tokens + every component style
assets/js/main.js      mobile menu, email signups, FAQ accordions
assets/img/            favicon
api/subscribe.js       serverless function: signup -> Resend audience
package.json           declares the one dependency (resend) + Node version
.env.example           the environment variables api/subscribe.js needs
tools/sync-chrome.py   keeps the header/footer identical across pages
vercel.json            clean URLs + cache headers
```

There is no build step, so the header and footer are duplicated into each
page between `CHROME:TOP` / `CHROME:FOOT` comment markers. Edit them in
`index.html` only, then:

```
python3 tools/sync-chrome.py          # push the change to the other pages
python3 tools/sync-chrome.py --check  # exit 1 if any page is stale (CI)
```

## Email signups

Both "Notify me" forms POST to `api/subscribe.js`, a Vercel serverless
function that adds the address to a Resend audience (a real, exportable
contact list — not just a notification) and, best-effort, emails
`support@pandasportsmemorabilia.com` (from `info@pandasportsmemorabilia.com`
— the automated-sender address) so someone sees each signup happen. A
hidden honeypot field on both forms catches simple bots server-side.

**To make it actually work, someone needs to:**

1. Create a free account at [resend.com](https://resend.com).
2. Add and verify `pandasportsmemorabilia.com` as a sending domain (Resend
   gives you a few DNS records — SPF/DKIM — to add wherever the domain's DNS
   is managed; this is what lets Resend send *from* that domain instead of
   landing in spam). Takes a few minutes to propagate.
3. Create an audience (Resend has been renaming these "Segments" in newer
   dashboards — same feature, either name) and copy its ID.
4. Create an API key at [resend.com/api-keys](https://resend.com/api-keys).
5. In the Vercel project's Settings → Environment Variables, add:
   - `RESEND_API_KEY` — the key from step 4.
   - `RESEND_AUDIENCE_ID` — the ID from step 3.
   - `RESEND_NOTIFY_TO` and `RESEND_FROM` are optional — see `.env.example`
     for what they default to if you skip them.
6. Redeploy (Vercel picks up new environment variables on the next deploy,
   not the running one).

Until that's done, the form fails closed: `api/subscribe.js` checks for
`RESEND_API_KEY`/`RESEND_AUDIENCE_ID` and returns a clear error asking the
visitor to email `support@` directly, rather than silently pretending to
succeed. Test it end-to-end (a real signup, then check it landed in the
Resend audience and the notification email arrived) before pointing real
traffic at the site.

**One thing I couldn't verify from here:** exactly how Resend's API reports
a duplicate signup (someone submitting an email already on the list).
`api/subscribe.js` guesses from the error message ("already exists" /
"duplicate") and treats that case as a success rather than an error — worth
confirming once real signups are flowing, since if Resend's actual wording
differs, a repeat signup would show a (harmless but unnecessary) error
message instead of the normal success one.

## Design system

The mark is black, white and one green, so the site is too.

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#0F0F10` | the brand's dark background — matches the icon PNG's own ground exactly |
| `--black` | `#0B0B0C` | brand ink; text on paper, and lettering on green fills |
| `--ink-2` / `--char` / `--char-2` | `#161618` `#1F2023` `#2A2B2F` | graphite steps for panels and plinths |
| `--paper` / `--paper-2` | `#F4F4F1` `#E6E6E1` | the light bands |
| `--green` | `#40B75B` | brand green, straight from the logo handoff |
| `--green-lite` | `#7BDC96` | accent text and links on dark |
| `--green-deep` | `#15773B` | accent text on paper — `--green` is only 2.3:1 there and fails |
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

- **Nothing is shown that doesn't exist.** There are no product cards, no
  prices and no inventory counts, because there is no inventory yet. The
  "what we'll be stocking" section lists categories and says plainly that
  there's nothing to browse.
- **The hero is typographic.** No illustration, no mocked-up product. The
  green rules from the logo are the layout system.

The site commits to a single visual theme, so it paints every colour
explicitly rather than inheriting a host background.

## Placeholder content to replace before launch

- **Authentication partners** (Veritas, Meridian, Hallmark, Holograph) are
  invented marks standing in for real third-party authenticators. Swap them for
  your actual partners' names and licensed logos.
- **Unsettled policies read "Coming soon"** (`.tbd` pill) rather than carrying
  an invented number — shipping rates, returns window, payment methods and so
  on, now spanning the FAQ and the three legal pages too (registered business
  name and address, governing law, currency, retention periods). Search the
  HTML for `class="tbd"` to find every one. Replace them as each is decided;
  all of them must be real before the first order.
- **Privacy, Refunds and Terms are a drafted starting point, not a legally
  reviewed set of documents.** Each carries a small note box at the top saying
  so. Before relying on them: confirm the registered business name and
  address, the governing law / jurisdiction, and have someone who does this
  professionally read all three. They're internally consistent with each
  other and with the FAQ's existing claims (the authenticity guarantee, no
  buyer's premium) — don't let a future edit to one contradict the others.
- **There are two live addresses, split by who's sending, not by topic:**
  `support@pandasportsmemorabilia.com` is the one shown to people — the
  footer's email icon on every page, the FAQ contact block, the homepage
  "Who we are" line, every contact point on the Refund Policy, and the two
  legal pages. `info@pandasportsmemorabilia.com` is the *From* address on
  anything the system sends automatically without a human typing it — right
  now just `api/subscribe.js`'s signup notification (see below), later any
  order-confirmation or launch-announcement email. Replies to those still
  land in `support@`, since that's the `to` address. Both mailboxes need to
  actually exist and be monitored before launch — these are the only
  contact routes on the site, so a bounce on either means a lost customer
  with no trace.
  If that split doesn't match how the two inboxes are actually set up,
  search each file for the address that's wrong rather than assuming a
  single find-and-replace fixes it — they're deliberately not identical
  across the site.
- **Jake is the one who reads and answers all of it** — not "one of the
  four of us" on rotation, which the copy claimed before this was
  corrected. His About bio and role label reflect this; if that ever
  changes, update both plus the four inline mentions of his name
  (`grep -n "Jake reads\|Jake answers"`).
- **The brand renamed from "Panda Sports Collectibles" to "Panda Sports
  Memorabilia"** after launch prep began — every occurrence of the old
  name, the old lockup text, and the old email domain has been swept and
  replaced. The one place that did *not* get renamed is the GitHub repo
  itself, which is called `pandasportscollectables` (note:
  "collect**a**bles", a third, unrelated spelling) — that's a
  repo-hosting detail, not brand copy, and renaming it is a GitHub
  Settings action outside this codebase; do it there if it bothers you.
- **The family is Josh, Jake, Nolan and Liam Twohig** — it is family-run, and
  the site says that and no more. Do not reintroduce the family structure,
  the fact that it runs alongside other jobs, or anything else that frames
  the shop as small or part-time: it reads as a disclaimer, not as candour,
  and it costs more trust than the honesty buys.
- **No authenticator is named anywhere**, because it isn't known yet whether
  stock carries third-party authentication and, if so, from whom. The copy is
  written to hold either way: we don't write our own certificates, and the
  listing states what documentation a piece carries. If that changes, the copy
  can get stronger — but don't strengthen it before you know.
- **The social icons point nowhere.** They link to the signup until real
  profiles exist; a `CONFIRM` comment marks the spot.
- Product art is inline SVG in the `<symbol>` sprite at the top of each page.
  Replace `<use href="#i-…">` references with real photography when it's shot;
  the plinth styling is built to sit behind cut-out product shots.

## Brand assets

`assets/brand/` holds the real logo files from the brand handoff — not
redrawn, not traced.

- `panda-icon.png` — the header and footer mark. Cropped from
  `panda-icon-512-dark.png` to the artwork's own bounds (the source has ~40px
  of dead margin) and resized to 180×121, which covers the 58×39 display slot
  at 3x.
- `favicon-16.png`, `favicon-32.png`, `apple-touch-icon-180.png` — shipped as
  supplied, linked per the handoff's markup.

**Use the `-dark` icon on dark grounds, never the transparent one.** The
transparent artwork is solid black with no keyline, so on a near-black header
the ears and shoulders vanish and only the face floats. The `-dark` version has
a white keyline drawn for exactly this. Its background is `#0F0F10`, which is
why `--ink` is that value and why the masthead is opaque rather than
translucent — the icon's own ground has to match the bar it sits on.

The wordmark is set live in **Anton**, at the proportions from
`panda-wordmark.svg`: PANDA 150 / SPORTS 54 / (third line) 54, letter-spacing
-3 / +10 / +8 at that scale. That source file still literally says
"COLLECTIBLES" — it's a reference asset from the original brand handoff, kept
for its type-scale measurements, not shipped or rendered anywhere in the
repo. The third line now reads "MEMORABILIA" (11 letters instead of 12);
the same letter-spacing carries over fine, but it was tuned by eye for the
old word, so nudge it if it ever looks loose or tight against the panda
mark. Anton is headline and wordmark only, per the handoff — never body
copy. Archivo still sets the hero and section headings.

## A note on caching

`vercel.json` sets `/assets/*` to `max-age=0, must-revalidate`. Do **not**
change this to `immutable` with a long max-age unless the filenames become
content-hashed (`styles.a1b2c3.css`). These are plain paths, so an immutable
header makes browsers serve a stale stylesheet against fresh HTML — the page
renders with new markup and old CSS, which looks like the site is broken
rather than cached. That happened once already; the `?v=2` on the stylesheet
and script links is what flushed it.

## Claims the copy makes

The site states, as fact: that stock is bought through auction houses and
dealers rather than direct from athletes; that every item arrives here before
it is listed and is checked against whatever documentation came with it; that
we never write our own certificates; that no buyer's premium or auction fee is
added at checkout; and that anything sold and later shown not to be genuine is
refunded in full. Each of those is load-bearing — if any stops being true,
change the copy the same day.

Everything else about the shop is written in the future tense on purpose. The
site says what Panda intends to do, because Panda hasn't done it yet.

No supplier is named anywhere, by choice. Where stock comes from is nobody
else's business; describing it inaccurately would be a different matter.

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
