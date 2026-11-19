# Page transition "Rise": test report

Branch `feature/pd-transition` (off `main` 9d7677a), checked 2026-11-18.
Test theme: unpublished "Prodani - pd-transition dev" **190757732662** (`theme dev --theme 190757732662 --port 9494`). Live theme 190435262774 and staging were not touched. Nothing was pushed to GitHub.

## What changed in the theme

- New: `snippets/pd-transition.liquid`, `assets/pd-transition.css`, `assets/pd-transition.js`. All three are **generated** from `prodani-motion/src/motion-tokens.json` by `prodani-motion/scripts/build-theme.mjs` (`npm run build:theme`, `npm run check:theme` fails if they are stale).
- `layout/theme.liquid`:
  - `{% render 'pd-transition', part: 'head' %}` near the top of `<head>`: inline arrival CSS, the 234-byte flag script, the async `pd-transition.css` and the deferred `pd-transition.js`.
  - `{% render 'pd-transition' %}` right after `<body>`: the panel. It is `aria-hidden`, holds only the SVG and has no text, links or headings.
- Removed, with Moses's go:
  - the cross-document view-transition fade (`prodani-motion.css` §2);
  - the page entrance that held `<main>` at `opacity:0` until a script ran (§4 + two inline scripts). It broke the "never hide content waiting for JS" rule.
  - `prodani-motion.js` now reads `.pd-tr-arrive` instead of the old `pdArrival` promise.
- Deviation from the file list: the arrival CSS (1.8 KB) is **inline** in the head snippet. As a separate `<link>` it would either block rendering (forbidden by rule 8) or arrive after first paint on page 2 (the page would flash before the panel). `assets/pd-transition.css` holds only the page-1 "In" styles. They are needed only after a click, so that file loads without blocking.
- The flag is removed by the head script as soon as it is read, so a reload or Back never covers a page a second time.

## Budgets (from the build)

| Item | Limit | Actual |
|---|---|---|
| Inline head script | < 300 B | 234 B |
| `pd-transition.js` | < 3 KB gzip | 2,378 B gzip (5,422 B raw), no dependencies, `defer` |
| Render-blocking requests added | 0 | 0 (Lighthouse `render-blocking-resources` never lists a pd-transition file) |
| Inline CSS | — | 1,787 B |

## Lighthouse (mobile, default throttling)

**A/B, interleaved.** Base = `main` 9d7677a served by the :9393 dev server. After = this branch on :9494. Runs alternate base/after, so network drift hits both equally. Values are medians; there were 5 runs per side on home and 4 on product and shop.

| Page | Performance | TBT ms | LCP ms | CLS | LCP element |
|---|---|---|---|---|---|
| Home | 55 → **61** | 324 → **147** | 8,374 → **8,196** | 0 → 0 | `img.pd-fh__cake` (same) |
| Product (Dubai Dream) | 51.5 → **55** | 486 → **322** | 8,030 → 8,294 (ranges 7,444–8,906 vs 7,231–8,626) | 0 → 0 | `img.pd-gal__cut` (same) |
| Shop (/collections/all-products) | 57 → **63.5** | 383 → **205** | 12,197 → **7,769** | 0 → 0 | `img.pd-card__cut` (same) |

**SEO** (CDN preview runs below): home 92 → 92, product 92 → 92, shop 100 → 100. The scores are identical before and after. I did not look into why home and product score 92.

**CDN preview, sequential.** The same theme 190757732662 through `prodanimiami.com/?preview_theme_id=…`, before (base files) and after (branch files). Medians of 5:

| Page | Perf | LCP ms | TBT ms | CLS |
|---|---|---|---|---|
| Home | 53 → 55 | 6,349 → 4,995 | 654 → 1,002 | 0 → 0 |
| Product | 54 → 59 | 10,138 → 5,317 | 611 → 646 | 0 → 0 |
| Shop | 58 → 64 | 11,703 → 6,837 | 516 → 373 | 0 → 0 |

The sequential home TBT (654 → 1,002, runs 481–1,336) was followed up with the interleaved A/B above, which shows 324 → 147. The jump came from network drift between the two sequential sessions, not from the theme. `pd-transition.js` never appears in Lighthouse's script bootup list or long-task list.

**INP:** lab Lighthouse cannot measure INP, so TBT stands in for it. There is no field data for an unpublished theme. The click handler does no layout work: it adds one class and sets two timers.

**Product LCP:** the median moved +264 ms (3%), inside fully overlapping ranges. The CDN pass on the same page went 10,138 → 5,317. The LCP element did not change and nothing new blocks rendering. I read this as noise, not a regression, but it is the one number that did not improve.

## Bots and crawlers (`scripts/transition/bots.sh 190757732662`)

Home, product and shop were fetched as a normal Chrome UA and as Googlebot, GPTBot, ClaudeBot and PerplexityBot. All 12 bot fetches are **byte-identical** to the normal fetch once Shopify's per-request ids are normalised (`reqid`/`requestId` UUIDs and `"u"`). All got HTTP 200 with equal sizes. In every page the panel is served in its hidden state: no class on `<html>`, `<div class="pd-tr" aria-hidden="true">`, SVG only, no text. The code does no user-agent sniffing. Canonical, meta robots, JSON-LD, robots.txt and the sitemap are not in the diff. The served pages carry canonical 1, robots meta 0, and JSON-LD 0/2/1 for home/product/shop.

## Playwright (`scripts/transition/playwright-checks.mjs`, Chrome, against :9494): 24/24 pass

| # | Check | Result |
|---|---|---|
| 1 | JS disabled: panel hidden; `main` and `body` at opacity 1, visible; menu link navigates; shop shows 7 cards | PASS |
| 2 | JS on, no click, scroll: panel never shown (95 frames). An untrusted `.click()` from script does a plain navigation, and the panel never shows | PASS |
| 3 | Real click on the Shop menu link: page 1 panel rising with no stop. Page 2 is covered at its first frame, then revealed 678 ms after DOMContentLoaded (hold remainder + Out), inside the T + load-time limit. Flag and classes cleared | PASS |
| 4 | Back and Forward after a transition: no covering panel. A `pageshow` with `persisted:true` clears a covering panel | PASS |
| 5 | `prefers-reduced-motion: reduce`: plain navigation, panel never shown | PASS |
| 6 | `pd-transition.js` blocked on page 2 with a fresh flag: the panel covers, then the pure-CSS cap removes it 4.0 s after first paint. The stop and dot do not linger | PASS |
| 7 | Slow page (page 2 JS delayed 1.6 s): the stem dims to 22% and fills from the bottom. When the page is ready the fill completes, the dot drops and the panel leaves, after 2.15 s (inside the 4 s cap) | PASS |
| 8 | Exclusions: `data-no-transition`, `target=_blank`, `download`, same-page `#hash`, `/cart`, `/account`, other origin, `mailto:`, cmd-click: none start the panel | PASS |

Also: project preflight on 190757732662 passed 89, failed 0, warned 0. `shopify theme check` reports no new offenses in the changed files.

## Not verified

- Real iPhone Safari (the MacBook simulator rig was not used). Phone layout was checked in Playwright's iPhone 13 emulation only.
- Field INP and CrUX: these need the theme live.
- `/checkout` links: covered by the same path rule as `/cart`, but not clicked (checkout is on Shopify's domain anyway).
- Add-to-cart and form submits: these are buttons and forms, not links, and the handler only looks at `<a href>`. The PDP add-to-cart was not clicked in this run.
- `rel=prefetch` is ignored by Safari. There the destination is not prefetched, and the transition still works.

## Rerun

```sh
cd theme/prodani-motion && npm run check:theme           # tokens -> theme files in sync, budgets
cd theme && PREVIEW_THEME_ID=190757732662 npm run preflight
sh theme/scripts/transition/bots.sh 190757732662
# Playwright + Lighthouse need `npm i playwright lighthouse` somewhere first:
node theme/scripts/transition/playwright-checks.mjs http://127.0.0.1:9494
node theme/scripts/transition/lighthouse.mjs after https://prodanimiami.com 5 "?preview_theme_id=190757732662"
```
