# OG share cards

`node scripts/og/build.mjs` (from `theme/`) renders `prodani/assets/og-<handle>.jpg` (1200x630, ~60-110KB) plus `og-home.jpg`
through headless Chrome. Flavor names, colours, cutouts, prices and macros live in `card.html` (mirror of
`snippets/prodani-flavor-map.liquid` + the shop cards). Rebuild after a price, macro or flavor change, then
add any new handle to the list in `snippets/meta-tags.liquid`. Pass handles' indexes or `home` to build a subset.
