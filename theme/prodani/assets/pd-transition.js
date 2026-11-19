/* ProDani page transition ("Rise"). GENERATED from prodani-motion/theme-src/pd-transition.js
   by prodani-motion/scripts/build-theme.mjs with values from src/motion-tokens.json.
   Do not edit in the theme; edit the source and rebuild.
   Page 1: a real click on an eligible same-origin link plays "In", then navigates.
   Page 2: the <head> script found a fresh flag and added .pd-tr-arrive, so the panel
   already covers at first paint; the stop drop runs from inline CSS; this file waits for
   the page to be ready, then plays "Out" (or the slow-page fill first). */
(function () {
  'use strict';
  var C = {"in":320,"holdEnd":360,"out":320,"cap":4000,"fallback":600,"key":"pd-tr","drop":144,"from":-64,"dropEase":"cubic-bezier(0.6,0,0.9,0.4)","fill":180,"fillEase":"cubic-bezier(0.3,0.6,0.2,1)"};
  var d = document, h = d.documentElement, root = d.querySelector('.pd-tr');
  if (!root) return;
  var CLASSES = ['pd-tr-leave', 'pd-tr-arrive', 'pd-tr-ready', 'pd-tr-out'];
  var reduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var going = false, timers = [], scripted = [];

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clear() {
    timers.forEach(clearTimeout); timers = [];
    scripted.forEach(function (a) { try { a.cancel(); } catch (e) {} }); scripted = [];
    CLASSES.forEach(function (c) { h.classList.remove(c); });
  }
  function q(s) { return root.querySelector(s); }
  function play(el, frames, ms, ease) {
    if (el && el.animate) scripted.push(el.animate(frames, { duration: ms, easing: ease, fill: 'forwards' }));
  }

  /* Back/forward cache: never come back to a covered page. */
  addEventListener('pageshow', function (e) { if (e.persisted) { going = false; clear(); } });

  /* ---------- Page 2: arriving ---------- */
  function arrive() {
    // Time since the panel appeared = how far the CSS cap animation has run.
    var cap = root.getAnimations && root.getAnimations()[0];
    var t0 = performance.now() - (cap && cap.currentTime != null ? cap.currentTime : performance.now());
    function age() { return performance.now() - t0; }
    later(clear, Math.max(0, C.cap - age()));
    var wait = C.holdEnd - age();
    if (wait > 0) { h.classList.add('pd-tr-ready'); later(out, wait); return; }
    // Slow page: the stem has been filling since the hold ended. Finish the fill,
    // drop the i's dot, then leave. If the hard cap is too close, just leave.
    if (C.cap - age() < C.fill + C.drop + C.out) { out(); return; }
    var fill = q('.pd-tr__fill'), m = /matrix\(([^)]+)\)/.exec(getComputedStyle(fill).transform);
    var s = m ? parseFloat(m[1].split(',')[3]) || 0 : 0;
    play(fill, [{ transform: 'scaleY(' + s + ')' }, { transform: 'scaleY(1)' }], C.fill, C.fillEase);
    later(function () {
      play(q('.pd-tr__dot'), [
        { transform: 'translateY(' + C.from + 'px)', opacity: 1 },
        { transform: 'none', opacity: 1 }
      ], C.drop, C.dropEase);
      later(out, C.drop);
    }, C.fill);
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
      later(go, C.in);
    } finally {
      setTimeout(go, C.fallback); // navigation happens even if anything above threw
    }
  });
})();
