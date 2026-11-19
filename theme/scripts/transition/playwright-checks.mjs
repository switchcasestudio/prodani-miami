// Playwright checks for the Rise page transition. usage: node pw-transition.mjs <baseUrl>
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://127.0.0.1:9494';
const LINK = 'a.pd-nav__link[href="/collections/all-products"]';
const results = [];
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Frame log on every document: time, transition classes, panel visibility/opacity, panel transform.
const PROBE = () => {
  window.__log = [];
  const tick = () => {
    const h = document.documentElement, el = document.querySelector('.pd-tr');
    if (h && el) {
      const cs = getComputedStyle(el), p = getComputedStyle(el.firstElementChild);
      const fill = el.querySelector('.pd-tr__fill'), stem = el.querySelector('.pd-tr__stem');
      window.__log.push({ t: Math.round(performance.now()), cls: (h.className.match(/pd-tr-[a-z]+/g) || []).join(' '),
        shown: cs.visibility === 'visible' && cs.opacity !== '0', tf: p.transform,
        fill: getComputedStyle(fill).transform, stemOp: getComputedStyle(stem).fillOpacity });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const ty = (tf) => { const m = /matrix\(([^)]+)\)/.exec(tf || ''); return m ? +m[1].split(',')[5] : 0; };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function ctx(opts = {}) {
  const c = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts });
  await c.addInitScript(PROBE);
  return c;
}
async function ready(page, path = '/') { await page.goto(BASE + path, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800); }

/* (1) JavaScript disabled */
{
  const c = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await c.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const s = await page.evaluate(() => {
    const el = document.querySelector('.pd-tr'), m = document.querySelector('main');
    const ms = getComputedStyle(m), b = getComputedStyle(document.body);
    return { panel: el ? getComputedStyle(el).visibility : 'missing', mainOp: ms.opacity, mainVis: ms.visibility, bodyOp: b.opacity,
      h1: !!document.querySelector('h1') && getComputedStyle(document.querySelector('h1')).visibility };
  });
  ok('1a no-JS: panel hidden, main/body visible', s.panel === 'hidden' && s.mainOp === '1' && s.mainVis === 'visible' && s.bodyOp === '1', JSON.stringify(s));
  await page.click(LINK);
  await page.waitForURL('**/collections/all-products', { timeout: 15000 });
  const s2 = await page.evaluate(() => ({ panel: getComputedStyle(document.querySelector('.pd-tr')).visibility, mainOp: getComputedStyle(document.querySelector('main')).opacity, cards: document.querySelectorAll('.pd-card').length }));
  ok('1b no-JS: menu link navigates, content visible', s2.panel === 'hidden' && s2.mainOp === '1' && s2.cards > 0, JSON.stringify(s2));
  await c.close();
}

/* (2) JS on, no click: panel never visible (also after scroll and an untrusted .click()) */
{
  const c = await ctx(); const page = await c.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 }).catch(() => {});
  await page.mouse.wheel(0, 1500); await page.waitForTimeout(1500);
  let log = await page.evaluate(() => window.__log);
  ok('2a JS on, no click: panel never shown', log.length > 20 && log.every((f) => !f.shown && !f.cls), `${log.length} frames`);
  // An untrusted click (what a script or bot could do) must not start it; the browser navigates normally.
  await page.evaluate((sel) => document.querySelector(sel).click(), LINK);
  await page.waitForURL('**/collections/all-products', { timeout: 15000 });
  await page.waitForTimeout(500);
  log = await page.evaluate(() => window.__log);
  ok('2b untrusted click: plain navigation, panel never shown', log.every((f) => !f.shown && !f.cls), `${log.length} frames on page 2`);
  await c.close();
}

/* (3) Real click on a menu link: In on page 1, Out on page 2 */
let page2Timeline;
{
  const c = await ctx(); const page = await c.newPage();
  await ready(page);
  const t0 = Date.now();
  const nav = page.waitForURL('**/collections/all-products', { timeout: 15000 });
  await page.click(LINK);
  // Sample page 1 during "In" (before it unloads)
  const mid = await page.evaluate(() => new Promise((r) => setTimeout(() => {
    const el = document.querySelector('.pd-tr'); r({ cls: document.documentElement.className.match(/pd-tr-[a-z]+/g), vis: getComputedStyle(el).visibility, tf: getComputedStyle(el.firstElementChild).transform, stop: getComputedStyle(el.querySelector('.pd-tr__stop')).opacity });
  }, 160))).catch((e) => ({ err: e.message }));
  ok('3a click: page 1 panel rising (In), no stop yet', !!mid.cls && mid.cls.includes('pd-tr-leave') && mid.vis === 'visible' && mid.stop === '0', JSON.stringify(mid));
  await nav;
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({ log: window.__log, nav: performance.getEntriesByType('navigation')[0].toJSON(), flag: sessionStorage.getItem('pd-tr') }));
  const shown = r.log.filter((f) => f.shown);
  const first = r.log[0], lastShown = shown[shown.length - 1], dcl = Math.round(r.nav.domContentLoadedEventEnd);
  const hidden = r.log.find((f) => lastShown && f.t > lastShown.t);
  page2Timeline = { firstFrame: first && first.t, firstShown: shown[0] && shown[0].t, lastShown: lastShown && lastShown.t, dcl, frames: r.log.length, clickToNav2: Date.now() - t0 };
  ok('3b page 2 arrives covered at first frame', !!first && first.shown && first.cls.includes('pd-tr-arrive') && Math.abs(ty(first.tf)) < 1, JSON.stringify(first));
  const revealBy = Math.max(dcl, first.t + 360) + 320 + 80; // ready (DCL or hold end) + Out + a frame or so
  ok('3c page 2 revealed within T plus load time', !!hidden && !hidden.shown && hidden.t <= revealBy, `last covered frame ${lastShown && lastShown.t}ms, DCL ${dcl}ms, limit ${revealBy}ms`);
  ok('3d flag cleared, classes cleared', r.flag === null && r.log[r.log.length - 1].cls === '', `flag=${r.flag} cls="${r.log[r.log.length - 1].cls}"`);

  /* (4) Back button: no stuck panel */
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const back = await page.evaluate(() => ({ cls: document.documentElement.className.match(/pd-tr-[a-z]+/g), vis: getComputedStyle(document.querySelector('.pd-tr')).visibility, url: location.pathname }));
  ok('4a Back: page 1 not covered', !back.cls && back.vis === 'hidden' && back.url === '/', JSON.stringify(back));
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const fwd = await page.evaluate(() => ({ cls: document.documentElement.className.match(/pd-tr-[a-z]+/g), vis: getComputedStyle(document.querySelector('.pd-tr')).visibility }));
  ok('4b Forward: page 2 not covered', !fwd.cls && fwd.vis === 'hidden', JSON.stringify(fwd));
  await c.close();
}

/* (4c) Back from a bfcache restore: simulate the pageshow persisted path directly */
{
  const c = await ctx(); const page = await c.newPage();
  await ready(page);
  const s = await page.evaluate(() => { document.documentElement.classList.add('pd-tr-leave'); dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    return { cls: document.documentElement.className.match(/pd-tr-[a-z]+/g), vis: getComputedStyle(document.querySelector('.pd-tr')).visibility }; });
  ok('4c pageshow persisted clears a covering panel', !s.cls && s.vis === 'hidden', JSON.stringify(s));
  await c.close();
}

/* (5) reduced motion: plain navigation */
{
  const c = await ctx({ reducedMotion: 'reduce' }); const page = await c.newPage();
  await ready(page);
  await page.click(LINK);
  await page.waitForURL('**/collections/all-products', { timeout: 15000 });
  await page.waitForTimeout(600);
  const log = await page.evaluate(() => ({ log: window.__log, flag: sessionStorage.getItem('pd-tr') }));
  ok('5 reduced motion: plain navigation, panel never shown', log.log.every((f) => !f.shown && !f.cls) && log.flag === null, `${log.log.length} frames`);
  await c.close();
}

/* (6) JS file blocked on page 2 with the flag set: CSS cap clears the panel by 4 s */
{
  const c = await ctx(); const page = await c.newPage();
  await ready(page);
  await page.route('**/pd-transition.js*', (r) => r.abort());
  await page.evaluate(() => sessionStorage.setItem('pd-tr', String(Date.now())));
  await page.goto(BASE + '/collections/all-products', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4600);
  const log = await page.evaluate(() => window.__log);
  const shown = log.filter((f) => f.shown);
  const after = log.filter((f) => f.t > (shown.at(-1)?.t ?? 0));
  ok('6 JS blocked + flag: panel covers, then clears itself within 4 s', shown.length > 0 && log[0].shown && shown.at(-1).t - log[0].t <= 4050 && after.length > 0 && after.every((f) => !f.shown),
    `first frame ${log[0]?.t}ms, last covered ${shown.at(-1)?.t}ms, stop/dot visible after cap: ${after.some((f) => f.shown)}`);
  await c.close();
}

/* (7) Slow page: page 2's JS is late, so the stem fills, the dot drops, then Out; hard cap holds */
{
  const c = await ctx(); const page = await c.newPage();
  await ready(page);
  await page.route('**/pd-transition.js*', async (r) => { await sleep(1600); r.continue(); });
  await page.click(LINK);
  await page.waitForURL('**/collections/all-products', { timeout: 15000 });
  await page.waitForTimeout(3000);
  const log = await page.evaluate(() => window.__log);
  const t0 = log[0].t;
  const dim = log.find((f) => f.t - t0 > 500 && f.t - t0 < 1300);
  const shown = log.filter((f) => f.shown);
  ok('7a slow page: stem dims to 22% and fills from the bottom while waiting', !!dim && Math.abs(+dim.stemOp - 0.22) < 0.01 && /matrix/.test(dim.fill) && +/matrix\(([^)]+)\)/.exec(dim.fill)[1].split(',')[3] > 0.05, JSON.stringify(dim));
  ok('7b slow page: panel leaves after the late JS, before the 4 s cap', shown.at(-1).t - t0 < 4000 && !log.at(-1).shown, `covered for ${shown.at(-1).t - t0}ms`);
  await page.unroute('**/pd-transition.js*');
  await c.close();
}

/* (8) Exclusions: no panel, no preventDefault */
{
  const c = await ctx(); const page = await c.newPage();
  await ready(page);
  const leaves = async () => page.evaluate(() => document.documentElement.classList.contains('pd-tr-leave'));
  const inject = (html) => page.evaluate((h) => { const d = document.createElement('div'); d.id = 'pdx'; d.style.cssText = 'position:fixed;top:120px;left:20px;z-index:2147483647;background:#fff;padding:8px'; d.innerHTML = h; document.getElementById('pdx')?.remove(); document.body.appendChild(d); }, html);
  const cases = [
    ['data-no-transition', '<a id="x" data-no-transition href="/collections/all-products">x</a>'],
    ['target=_blank', '<a id="x" target="_blank" href="/collections/all-products">x</a>'],
    ['download', '<a id="x" download href="/collections/all-products">x</a>'],
    ['#hash same page', '<a id="x" href="#MainContent">x</a>'],
    ['/cart', '<a id="x" href="/cart">x</a>'],
    ['/account', '<a id="x" href="/account">x</a>'],
    ['other origin', '<a id="x" href="https://example.com/">x</a>'],
    ['mailto', '<a id="x" href="mailto:a@b.c">x</a>'],
  ];
  for (const [name, html] of cases) {
    await inject(html);
    const p = page.evaluate(() => new Promise((r) => addEventListener('click', (e) => { setTimeout(() => r({ prevented: e.defaultPrevented, leave: document.documentElement.classList.contains('pd-tr-leave') }), 0); e.preventDefault && 0; }, { once: true })));
    await page.click('#x', { noWaitAfter: true }).catch(() => {});
    const res = await Promise.race([p, sleep(1000).then(() => ({ timeout: true }))]);
    const left = await leaves().catch(() => false);
    ok(`8 exclusion: ${name}`, !left, JSON.stringify(res));
    if (!page.url().startsWith(BASE + '/') || new URL(page.url()).pathname !== '/') await ready(page);
    for (const p2 of c.pages().slice(1)) await p2.close();
  }
  // modifier click (cmd/ctrl) on the real menu link
  await ready(page);
  await page.click(LINK, { modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'], noWaitAfter: true });
  await page.waitForTimeout(200);
  ok('8 exclusion: modifier click', !(await leaves()), '');
  await c.close();
}

await browser.close();
console.log('\nTIMELINE page 2 (click test):', JSON.stringify(page2Timeline));
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
import('node:fs').then((fs) => fs.writeFileSync(new URL('./pw-results.json', import.meta.url), JSON.stringify({ results, page2Timeline }, null, 2)));
