# 420 Fades Barber Co.

A dark, editorial single-page site for a barbershop. Static HTML/CSS/JS — no framework,
no build step, no runtime dependencies. Deploys to Cloudflare Pages as-is.

> **420 Fades is a fictional business.** The address, phone number, staff and reviews are
> invented for portfolio purposes. Photography and logo supplied by the client.

## Design direction — "Night Shift"

Near-black canvas, generous whitespace, oversized condensed display type over full-bleed
photography, and a single flat gold accent. The intent was that restraint reads as
expensive, where density reads as amateur.

| Token | Value | Notes |
|---|---|---|
| Canvas | `#08090A` | Three elevated surfaces above it (`#0D0F11`, `#131619`, `#1B1F23`) |
| Text | `#F2EFE9` | Warm bone rather than pure white — pure white on near-black glares |
| Accent | `#F0C030` | **Sampled from the shop badge** (hue 43°, S 0.87). 11.7:1 on the canvas |
| Display | Big Shoulders Display | Condensed industrial — reads as signage |
| Body | Chivo | Humanist grotesque, pairs against the condensed display |

The badge is used small and sparingly — nav, footer, favicon. Its gold-chrome gradient is
deliberately **not** echoed into buttons, rules or headings; only the flat gold is pulled
out. Repeating an ornate gradient across a UI is what makes a site read as clip-art.

## Art direction on the photography

The supplied images came from visibly different shoots — several warm, dark and
practical-lit, three bright and daylit. A single unified grade is **baked** into every
image at build time (warm shadow lift, mild desaturation, gentle S-curve; the three
bright outliers get a heavier pass) so the set reads as one shoot rather than seven
stock photos.

The hero video is a 1280×720 source, verified as a genuine resolution increase over the
original 850×480 file rather than an upscale (1.33× the high-frequency detail of the old
file resampled to the same size, with a non-zero residual). It's still treated with a
heavy gradient scrim, page-wide film grain and two drifting smoke layers, which is what
lets it sit behind large type without competing with it.

## Engineering notes

**Images** — every photo ships at 500/900/1600px in WebP with `srcset` + `sizes`, and
`width`/`height` on every tag so nothing shifts during load (CLS).

**Video** — the hero video is not in the markup. It's attached after `load` and only when
the visitor isn't on `save-data`, a 2G connection, or `prefers-reduced-motion`. Everyone
gets the poster frame immediately; the video is an enhancement.

Four encodes ship: VP9/WebM and H.264/MP4, each at 720p and 480p. Format is chosen by
`canPlayType` (VP9 where supported, MP4 for Safari) and resolution by CSS viewport width
— a phone renders the video at ~390 CSS px, so it gains nothing from the desktop file.
Audio is stripped (it's muted anyway), a light `hqdn3d` denoise removes source grain that
would otherwise eat bitrate invisibly under the scrim, and MP4s carry `+faststart`.

| | 720p | 480p |
|---|---|---|
| VP9 / WebM | 612 KB | 334 KB |
| H.264 / MP4 | 758 KB | 514 KB |

At matched visual quality VP9 measured **higher** PSNR against the source than H.264
(34.2 vs 33.9) at 19% smaller, so it's the preferred path rather than a fallback.

**Smoke** — a single 62 KB texture generated offline with domain-warped fractal noise
(isotropic noise reads as cloud blotches, not smoke). Animated with composited
`transform` only — no per-frame layout, no canvas, no WebGL. Removed entirely under
`prefers-reduced-motion`.

**Fonts** — self-hosted WOFF2 (84 KB, five faces), preloaded, `font-display: swap`.
No third-party request, so no render-blocking dependency on a CDN and no GDPR question.

**No-JS** — scroll-reveal styles are gated behind a `.js` class set inline in `<head>`.
With JavaScript disabled or failed, the page renders complete rather than blank.

**Security** — CSP, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`
are set in `_headers`. The CSP is strict `default-src 'self'`; the one inline script is
allowed by sha256 hash rather than `'unsafe-inline'`, so no other inline script can run.

**Caching** — images, fonts and video are immutable for a year. CSS and JS use
`no-cache`: they keep stable filenames, so a long max-age would serve stale code to
returning visitors after a deploy. `no-cache` still caches — it just revalidates, and an
unchanged file costs a ~200 byte 304. Fingerprinted filenames plus a build step would
allow immutable caching there too, and are the upgrade path if this grows.

## Verified, not assumed

Every claim below was measured in headless Chromium against the built site.

| Check | Result |
|---|---|
| axe-core — page, booking modal, lightbox | **0 violations** at moderate/serious/critical |
| Colour contrast, every text token on every surface | **≥ 4.96:1** (AA normal text) |
| Horizontal overflow at 390 / 820 / 1440 | none |
| Console errors / page errors | none |
| Keyboard: focus enters dialog, is trapped, returns to opener | pass |
| Keyboard: skip link is first stop and becomes visible | pass |
| `prefers-reduced-motion`: smoke removed, video never fetched | pass |
| Hero video plays; correct format and resolution per viewport | pass |
| JavaScript disabled: all content visible | pass |
| Booking flow: 4 steps, validation, confirmation | pass |
| Booking hours match the Visit section on all 7 days | pass |
| No slot offered in the past, or outside that day's hours | pass (5 simulated date/times) |

Two bugs this pass caught that would otherwise have shipped:

1. `.modal`/`.lb`/`.drawer` set `display:grid|flex`, which overrides the browser's
   `[hidden] { display:none }`. The invisible overlays sat on top of the page and
   swallowed every click — the entire site was unclickable.
2. `width`/`height` attributes (present for CLS) set a literal CSS height, making
   `aspect-ratio` inert. Two images rendered at their raw attribute height — the
   storefront cropped to a portrait slice of the door, the team photo showing 2 of 6 barbers.
3. `script-src 'self'` blocked the inline JS-detection script, so every scroll-reveal
   was dead **in production only** — the no-JS fallback kept content visible, so it
   looked fine locally. Fixed with a sha256 hash rather than `'unsafe-inline'`.
4. The booking widget offered a flat 10:00–19:30 on every day and never checked the
   clock, so it contradicted the opening hours in the Visit section and offered slots
   that had already passed. Hours are now keyed by weekday from one source, with a
   60-minute lead time; a day drops off once its last slot is gone.
5. CSS and JS were cached for a week behind stable filenames, so a deploy would not
   reach returning visitors. Caught when a verified-good deploy kept serving the old
   bundle to the test browser.

## Structure

```
index.html            single page, ~27 KB
assets/css/site.css   design tokens + all layout
assets/js/site.js     ~19 KB, vanilla, no dependencies
assets/img/           graded WebP at 3 widths, smoke + grain textures, video
assets/fonts/         self-hosted WOFF2 subsets
_headers              CSP + cache policy (Cloudflare Pages)
robots.txt sitemap.xml site.webmanifest
```

## Running it

No build step. Serve the directory:

```bash
python3 -m http.server 8099
```

## Deploying to Cloudflare Pages

Connect the repository, then:

- **Build command:** *(leave empty)*
- **Build output directory:** `/`

`_headers` is applied automatically.

## Credits

Photography, logo and animated logo supplied by the client. Fonts: Big Shoulders Display
and Chivo (SIL Open Font License), self-hosted via Fontsource.
