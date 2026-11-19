// usage: node run.mjs <label> <baseUrl> [runs]
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'node:fs';
const [label, base, runsArg, qs = ""] = process.argv.slice(2);
const runs = Number(runsArg || 3);
const pages = { home: '/', product: '/products/dubai-dream-cake-copy', shop: '/collections/all-products' };
const out = {};
for (const [name, path] of Object.entries(pages)) {
  out[name] = [];
  for (let i = 0; i < runs; i++) {
    const chrome = await chromeLauncher.launch({ chromePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromeFlags: ['--headless=new', '--no-first-run'] });
    try {
      const r = await lighthouse(base + path + qs, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'seo'] });
      const a = r.lhr.audits;
      const row = { perf: Math.round(r.lhr.categories.performance.score * 100), seo: Math.round(r.lhr.categories.seo.score * 100),
        lcp: Math.round(a['largest-contentful-paint'].numericValue), cls: +a['cumulative-layout-shift'].numericValue.toFixed(3),
        tbt: Math.round(a['total-blocking-time'].numericValue), lcpEl: a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.selector || '' };
      out[name].push(row); console.log(label, name, i, JSON.stringify(row));
    } catch (e) { console.log(label, name, i, 'ERR', e.message); }
    finally { await chrome.kill(); }
  }
}
fs.writeFileSync(new URL(`./${label}.json`, import.meta.url), JSON.stringify(out, null, 2));
