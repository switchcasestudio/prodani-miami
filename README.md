# Prodani Miami — Shopify theme

Theme source and tooling for the **Prodani Miami** storefront (high-protein cakes, Miami).
Design and build: Switchcase Studio.

> **This repo is public.** No credentials, tokens, store admin URLs, client documents or customer data belong here. `.gitignore` is deliberately over-broad. If you are unsure whether a file is safe, do not commit it.

## Structure

```
.
├── theme/
│   ├── prodani/          # The Shopify theme (Online Store 2.0, Dawn 16 base) — what gets pushed to the store
│   ├── scripts/          # preflight checks, publish, OG share cards, nutrition labels, QA helpers
│   ├── prodani-motion/   # Remotion project: brand motion, page transition tokens, promo clips
│   └── package.json      # npm scripts (dev, push:staging, push:live, preflight, ...)
├── blog/                 # Journal articles (source text and images)
└── PRODUCT.md
```

## Theme workflow

Requires [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) and Node 20+. The store token lives in `theme/.env` (git-ignored).

```bash
cd theme
npm install
npm run dev            # local preview with hot reload
npm run push:staging   # push to the unpublished staging theme
npm run preflight      # automated checks against a preview theme
```

Work on a branch off `main`, push to staging, run preflight, review, then merge.
Only the store owner's approval puts a change on the live theme (`npm run push:live`).

## Motion

```bash
cd theme/prodani-motion
npm install
npm run build:theme    # regenerate the page-transition assets from src/motion-tokens.json
npm run studio         # preview compositions
```
