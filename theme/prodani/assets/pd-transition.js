/* ProDani page transition ("Rise"). GENERATED from prodani-motion/theme-src/pd-transition.js
   by prodani-motion/scripts/build-theme.mjs with values from src/motion-tokens.json.
   Do not edit in the theme; edit the source and rebuild.
   Page 1: a real click on an eligible same-origin link plays "In", then navigates.
   Page 2: the <head> script found a fresh flag and added .pd-tr-arrive, so the panel
   already covers at first paint; the stop drop runs from inline CSS; this file waits for
   the page to be ready, then plays "Out". Round 4: the panel shows the Heat and eat field
   (canvas, drawn here) with HEAT AND EAT. in a band; the stop drops on arrival. */
(function () {
  'use strict';
  var C = {"in":320,"holdEnd":360,"out":320,"cap":4000,"fallback":600,"key":"pd-tr","field":{"colsPortrait":13,"colsLandscape":26,"barW":0.42,"stemRatio":2.8,"rowPitch":1.3,"periodMs":1333,"phaseI":0.42,"phaseJ":0.7,"low":0.18,"riseInMs":420,"maxDpr":2},"white":"#FFFFFF"};
  var d = document, h = d.documentElement, root = d.querySelector('.pd-tr');
  if (!root) return;
  var CLASSES = ['pd-tr-leave', 'pd-tr-arrive', 'pd-tr-ready', 'pd-tr-out'];
  var reduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var going = false, timers = [], scripted = [];

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clear() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    timers.forEach(clearTimeout); timers = [];
    scripted.forEach(function (a) { try { a.cancel(); } catch (e) {} }); scripted = [];
    CLASSES.forEach(function (c) { h.classList.remove(c); });
  }
  function q(s) { return root.querySelector(s); }

  /* Back/forward cache: never come back to a covered page. */
  addEventListener('pageshow', function (e) { if (e.persisted) { going = false; clear(); } });

  /* ---------- The field: i-stem bars in a heat wave (round 4, "Heat and eat") ----------
     Drawn on a canvas while the panel shows; the bars rise from the bottom of their row,
     each on its own phase, so the wave runs diagonally across the field. On arrival the
     field rises in from the bottom left (the panel was already covering at first paint). */
  var cv = q('.pd-tr__field'), raf = 0;
  function field(rise) {
    if (raf || !cv || !cv.getContext) return;
    var F = C.field, x = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, F.maxDpr);
    var W = innerWidth, H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = C.white;
    var cols = W > H ? F.colsLandscape : F.colsPortrait, p = W / cols, bw = F.barW * p, bh = bw * F.stemRatio,
      rp = bh * F.rowPitch, rows = Math.ceil(H / rp) + 1, top = (H - rows * rp) / 2, t0 = performance.now();
    function draw(now) {
      var t = now - t0, i, j, k, s, yb;
      x.clearRect(0, 0, W, H);
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
        k = 1;
        if (rise) { k = Math.min(1, Math.max(0, (t - (i + rows - 1 - j) / (cols + rows) * F.riseInMs) / 240)); k = 1 - Math.pow(1 - k, 3); }
        if (k <= 0) continue;
        s = k * (F.low + (1 - F.low) * (0.5 + 0.5 * Math.sin(2 * Math.PI * t / F.periodMs - (i * F.phaseI + j * F.phaseJ))));
        yb = top + (j + 1) * rp;
        x.fillRect((i + 0.5) * p - bw / 2, yb - bh * s, bw, bh * s);
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
  }

  /* ---------- Page 2: arriving ---------- */
  function arrive() {
    // Time since the panel appeared = how far the CSS cap animation has run.
    var cap = root.getAnimations && root.getAnimations()[0];
    var t0 = performance.now() - (cap && cap.currentTime != null ? cap.currentTime : performance.now());
    function age() { return performance.now() - t0; }
    later(clear, Math.max(0, C.cap - age()));
    field(true);
    // The stop drops during the hold (CSS); a slow page goes as soon as it is ready.
    h.classList.add('pd-tr-ready');
    later(out, Math.max(0, C.holdEnd - age()));
  }
  function out() { h.classList.add('pd-tr-out'); later(clear, C.out + 40); }

  if (h.classList.contains('pd-tr-arrive')) {
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', arrive); else arrive();
  }

  /* ---------- Page 1: leaving ---------- */
  var SKIP_PATH = /^(\/[a-z]{2}(-[a-z]{2})?)?\/(cart|checkouts?|account)(\/|$)/i;
  function eligible(target) {
    var a = target && target.closest && target.closest('a[href]');
    if (!a || typeof a.href !== 'string') return null;
    if (a.closest('[data-no-transition]') || a.hasAttribute('download')) return null;
    var t = a.getAttribute('target');
    if (t && t !== '_self') return null;
    var u;
    try { u = new URL(a.href, location.href); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol) || u.origin !== location.origin) return null;
    if (u.pathname === location.pathname && u.search === location.search) return null; // same page or #hash
    if (SKIP_PATH.test(u.pathname)) return null;
    return u;
  }
  function off() { return reduce.matches || (window.Shopify && Shopify.designMode); }

  var fetched = {};
  function prefetch(e) {
    if (off()) return;
    var u = eligible(e.target);
    if (!u || fetched[u.href]) return;
    fetched[u.href] = 1;
    var l = d.createElement('link');
    l.rel = 'prefetch'; l.href = u.href;
    d.head.appendChild(l);
  }
  d.addEventListener('pointerdown', prefetch, { passive: true });
  d.addEventListener('touchstart', prefetch, { passive: true });

  // On window, bubble phase: runs after every element and document handler, so a link
  // that some other script already handled (drawer, quick view) arrives defaultPrevented.
  addEventListener('click', function (e) {
    if (going || e.defaultPrevented || !e.isTrusted || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || off()) return;
    var u = eligible(e.target);
    if (!u) return;
    e.preventDefault();
    going = true;
    var done = false;
    function go() {
      if (done) return;
      done = true;
      try { sessionStorage.setItem(C.key, String(Date.now())); } catch (x) {}
      location.href = u.href;
    }
    try {
      clear();
      h.classList.add('pd-tr-leave');
      field(false);
      later(go, C.in);
    } finally {
      setTimeout(go, C.fallback); // navigation happens even if anything above threw
    }
  });
})();
