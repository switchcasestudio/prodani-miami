# Case study status — ProDani Miami → switchcasestudio.com

updated 2026-10-27 (consolidation of the Aug 23 `HANDOFF.md` brief; facts last verified: as recorded in sources, not re-verified).

## Current state

- The package in this folder has been complete and upload-ready since **2026-08-23** (commits `111007b`, `39e4113`). It documents the v1 rebuild (Minimog → bespoke Dawn 16 theme, live 23 August 2026).
- `data/metrics-v2-2026-10-14.json` is a later snapshot taken after the v2 theme went live (2026-10-08). `copy.md`, `metrics.csv` and `page/` are still generated from `data/metrics-post-launch.json` (the v1 run) and have not been regenerated from the v2 data.
- Whether the case study has been published on switchcasestudio.com is not recorded in this repo (open).
- What each file is, which page file to use, and how to regenerate everything: `README.md` in this folder.

## Pointers (sources of truth)

| Need | File |
| --- | --- |
| Words | `copy.md` — generated, do not retype figures from anywhere else |
| Numbers | `metrics.csv` — one row per page per measurement; four rows carry notes (the figures that got worse) |
| Raw data | `data/metrics-post-launch.json` (published run) · `data/metrics-pre-launch.json` · `data/metrics-v2-2026-10-14.json` |
| Page markup | `page/index.html` (uses `../images/`) or `page/self-contained.html` (one file) |
| Images | `images/cover-1200x630.jpg` (card) · `images/pairs/*.jpg` (before/after, 2324×1076) · `images/{before,after}/*-1150.jpg` · `*-fullpage.jpg` (very tall; scrolling frame) |

Suggested alt text: "The ProDani Miami homepage on the old theme" / "…on the rebuilt theme"; pairs: "…before and after the rebuild, both at 1150 pixels wide".

## Editorial rules for whoever publishes it

**The angle is "measured, not estimated".** Lead with it. The method section is what makes the numbers quotable — if it has to be cut, cut the numbers with it. Method in one breath: 1150 × 1000 CSS px pinned at DPR 1; five interleaved runs per page per theme, cache disabled, median reported; headless Chrome over the DevTools protocol with PerformanceObserver hooks installed before first byte; one catalogue, two themes; measured before and after publishing so the Shopify page-cache bias ran both ways. Published figures are from the post-launch run against the live site.

**What got worse stays in** (homepage taller and heavier in elements by design; product page slightly heavier; contact page finishes loading later because of the embedded map; ~150 scripts on both sides are Shopify apps and pixels outside the theme). Every figure being green would read as an advertisement; the four red ones make the rest credible.

**Do not claim:**

- any conversion, revenue, traffic or sales outcome — none was measured;
- a Lighthouse or PageSpeed score — none was run; figures come from Navigation Timing and PerformanceObserver directly;
- a Core Web Vitals "pass" — lab data at one viewport is not field data;
- a migration or replatform — it was a theme publish; store data was never touched;
- a rescue from a broken site, or anything pejorative about Minimog — bespoke beats generic is the story;
- quotes, testimonials or opinions attributed to the client — invent nothing.

**Suggested order:** cover with the headline four → the project in two sentences → the angle → stat block → method (four or five bullets) → page by page with its pair image (`copy.md` has a paragraph each) → beyond the numbers (reviews, fonts, contrast, structure) → what got worse, as its own section → credit and link. Short-form minimum: angle, four numbers, two-line method note, one pair image, what got worse.

## Credits

- Client: ProDani Miami — https://prodanimiami.com · Studio: Switch Case Studio — https://switchcasestudio.com
- Launched 23 August 2026 · Shopify, custom theme on Dawn 16 · previous theme Minimog (OS 2.0)

## Caveat

The "before" side exists only behind `?preview_theme_id=154419691830`. If that theme is ever deleted, the comparison becomes unreproducible and `images/before/` + `data/` are the record.
