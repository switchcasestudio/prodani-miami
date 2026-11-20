/* ProDani page transition ("Rise"). GENERATED from prodani-motion/theme-src/pd-transition.js
   by prodani-motion/scripts/build-theme.mjs with values from src/motion-tokens.json.
   Do not edit in the theme; edit the source and rebuild.
   Page 1: a real click on an eligible same-origin link plays "In", then navigates.
   Page 2: the <head> script found a fresh flag and added .pd-tr-arrive, so the panel
   already covers at first paint; the stop drop runs from inline CSS; this file waits for
   the page to be ready, then plays "Out". Tweaks 5 (Moses 2026-11-19: "way too much, only
   HEAT AND EAT."): the panel shows only the line; the stop drops on arrival. */
(function () {
  'use strict';
  var C = __CONFIG__;
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

  /* Back/forward cache: never come back to a covered page. */
  addEventListener('pageshow', function (e) { if (e.persisted) { going = false; clear(); } });

  /* ---------- Page 2: arriving ---------- */
  function arrive() {
    // Time since the panel appeared = how far the CSS cap animation has run.
    var cap = root.getAnimations && root.getAnimations()[0];
    var t0 = performance.now() - (cap && cap.currentTime != null ? cap.currentTime : performance.now());
    function age() { return performance.now() - t0; }
    later(clear, Math.max(0, C.cap - age()));
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
      later(go, C.in);
    } finally {
      setTimeout(go, C.fallback); // navigation happens even if anything above threw
    }
  });
})();
