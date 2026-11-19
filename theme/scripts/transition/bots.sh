#!/bin/sh
# Fetch home, a product and the shop page as a normal browser and as Googlebot, GPTBot,
# ClaudeBot and PerplexityBot; compare the HTML with Shopify's per-request ids normalised.
# usage: sh bots.sh <preview_theme_id>   (omit the id to check the live storefront)
set -eu
T=${1:-}; D=$(mktemp -d); cd "$D"
Q=""; [ -n "$T" ] && Q="?preview_theme_id=$T" && curl -s -L -c cj -b cj -o /dev/null "https://prodanimiami.com/$Q"
UA_normal='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
UA_googlebot='Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
UA_gptbot='Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot'
UA_claudebot='Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'
UA_perplexitybot='Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)'
norm() { sed -E 's/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-[0-9]+)?/REQID/g; s/"u":"[0-9a-f]{12}"/"u":"U"/g' "$1"; }
for pg in home:/ product:/products/dubai-dream-cake-copy shop:/collections/all-products; do
  n=${pg%%:*}; p=${pg#*:}
  for w in normal googlebot gptbot claudebot perplexitybot; do
    eval ua=\$UA_$w; touch cj; curl -s -b cj -A "$ua" -o "$n-$w.html" "https://prodanimiami.com$p"
  done
  for w in googlebot gptbot claudebot perplexitybot; do
    if norm "$n-normal.html" | cmp -s - "$(norm "$n-$w.html" > "$n-$w.norm"; echo "$n-$w.norm")"; then r=IDENTICAL; else r=DIFFERENT; fi
    echo "$n $w $r"
  done
  # Hidden state = no transition class on <html> (only the head script adds one, from a flag).
  if grep -o '<html[^>]*>' "$n-normal.html" | grep -q 'pd-tr' || ! grep -q '<div class="pd-tr" aria-hidden="true">' "$n-normal.html"; then echo "$n PANEL NOT IN HIDDEN STATE"; else echo "$n panel served in its hidden state"; fi
done
