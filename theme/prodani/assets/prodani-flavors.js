/* Flavor spotlight. The stage is pinned by CSS (position:sticky inside a tall section);
   this script works out which flavor the scroll position belongs to and marks every
   slide before / on / after. The CSS transitions do the moving.

   One flavor per gesture (Moses 2026-11-18: a quick trackpad swipe skipped two flavors,
   and the last one, Cinnamon Apple, was skipped most of the time):
   - Every flavor owns the same stretch of scroll (the old rounding gave the first and the
     last only half a stretch, so the last one flashed by).
   - While the stage is pinned, a wheel/trackpad gesture moves exactly one flavor and the
     rest of that gesture (the trackpad's glide) is swallowed. A new swipe moves the next one.
   - At the first and the last flavor the glide is swallowed too, so the section is left
     only by a fresh swipe: nobody slides past the last flavor without seeing it.
   - Keys (arrows, Page Up/Down, Space) step one flavor the same way.
   - Touch and the scrollbar scroll natively; when they come to rest between two flavors
     the page eases to the nearest one. A touch swipe moves one flavor: a glide that
     would carry past the next flavor is brought back to it.
   - A phone on its side (landscape, under 520px tall) gets the plain stacked list.
   The wheel listener has to be non-passive to stop the glide, so it is only attached while
   the section is near the screen. Nothing here runs in the theme editor. */
(function () {
  'use strict';
  var root = document.querySelector('[data-pd-flv]');
  if (!root) return;
  if (window.Shopify && window.Shopify.designMode) return;

  var stage = root.querySelector('.pd-flv__stage');
  var slides = Array.prototype.slice.call(root.querySelectorAll('[data-pd-flv-slide]'));
  var gos = Array.prototype.slice.call(root.querySelectorAll('[data-pd-flv-go]'));
  var nEl = root.querySelector('[data-pd-flv-n]');
  var n = slides.length;
  if (!stage || n < 2) return;

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var active = -1, ticking = false, near = false;

  function pad(i) { return (i < 10 ? '0' : '') + i; }

  function set(i) {
    if (i === active) return;
    active = i;
    slides.forEach(function (s, k) {
      s.setAttribute('data-pos', k < i ? 'before' : k > i ? 'after' : 'on');
      if (k === i) s.removeAttribute('inert'); else s.setAttribute('inert', '');
      // the neighbours' trays are needed the moment the scroll gets there
      if (Math.abs(k - i) <= 1) { var img = s.querySelector('img[loading="lazy"]'); if (img) img.loading = 'eager'; }
    });
    stage.style.setProperty('--tint', slides[i].getAttribute('data-tint'));
    gos.forEach(function (g, k) { if (k === i) g.setAttribute('aria-current', 'true'); else g.removeAttribute('aria-current'); });
    if (nEl) nEl.textContent = pad(i + 1);
  }

  /* ---- geometry: the section travels `travel` px behind the pinned stage; flavor i owns
     [i*step, (i+1)*step) of it and sits at rest in the middle of its stretch. ---- */
  function travel() { return Math.max(1, root.offsetHeight - stage.offsetHeight); }
  function step() { return travel() / n; }
  function pinTop() { return parseFloat(getComputedStyle(stage).top) || 0; }
  function pos() { return pinTop() - root.getBoundingClientRect().top; }       // px travelled
  function centre(i) { return (i + 0.5) * step(); }                             // in travel px
  function toY(p) { return Math.round(window.pageYOffset + (p - pos())); }      // travel px -> page Y
  function inside(p) { return p >= -2 && p <= travel() + 2; }
  function nearest(p) { return Math.min(n - 1, Math.max(0, Math.round(p / step() - 0.5))); }

  function measure() {
    ticking = false;
    if (off) return;
    var p = Math.min(travel() - 1, Math.max(0, pos()));
    set(Math.min(n - 1, Math.floor(p / step())));
  }
  function onScroll() { if (!near || ticking) return; ticking = true; requestAnimationFrame(measure); }

  var aimY = null, aimUntil = 0;
  function go(i) {
    aimY = toY(centre(i));
    aimUntil = performance.now() + 900;
    window.scrollTo({ top: aimY, behavior: calm.matches ? 'auto' : 'smooth' });
  }
  function moving() { return aimY !== null && performance.now() < aimUntil && Math.abs(window.pageYOffset - aimY) > 2; }

  /* The next resting point past the current position in direction d, or -1 at either end. */
  function next(p, d) {
    for (var k = d > 0 ? 0 : n - 1; k >= 0 && k < n; k += d) {
      if (d > 0 ? centre(k) > p + 6 : centre(k) < p - 6) return k;
    }
    return -1;
  }

  /* ---- wheel and trackpad: one flavor per gesture ---- */
  var lastT = 0, lastMag = 0, lockUntil = 0, leaving = false;
  var GAP = 180;       // ms without wheel events = the gesture (and its glide) is over
  var LOCK = 650;      // ms after a step before a new swipe can step again

  function onWheel(e) {
    if (off) return;
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || !e.deltaY) return;
    var p = pos();
    if (!inside(p)) { leaving = false; return; }
    var now = performance.now();
    var mag = Math.abs(e.deltaY);
    var fresh = now - lastT > GAP;
    // a new swipe during the glide shows up as a sudden rise in speed
    var rising = mag > lastMag + 15 && mag > 24;
    lastT = now; lastMag = mag;

    if (leaving && !fresh) return;      // the swipe that leaves the section keeps going
    leaving = false;

    var d = e.deltaY > 0 ? 1 : -1;
    var k = next(p, d);
    if (now > lockUntil && (fresh || rising)) {
      if (k < 0) { leaving = true; return; }   // past the first or last flavor: let the page go
      e.preventDefault();
      go(k);
      lockUntil = now + LOCK;
      return;
    }
    // Still the same gesture: swallow it. If it carried the page in between two flavors
    // (it arrived from above or below), settle on the nearest one.
    e.preventDefault();
    if (!moving()) {
      var c = nearest(p);
      if (Math.abs(centre(c) - p) > 6) { go(c); lockUntil = now + LOCK; }
    }
  }

  /* ---- keys: one flavor per press ---- */
  function onKey(e) {
    if (off || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return;
    var d = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) d = 1;
    if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) d = -1;
    if (!d) return;
    var p = pos();
    if (!inside(p)) return;
    var k = next(p, d);
    if (k < 0) return;
    e.preventDefault();
    go(k);
  }

  /* ---- touch and scrollbar: rest on a flavor, never between two ---- */
  var restTimer = 0, touching = false;
  /* One flavor per swipe on touch too (mobile audit 2026-11-18: one ordinary flick on an
     iPhone went from 01 to 04). When the finger lifts, the next flavor in the swipe's
     direction becomes the catch point; if the glide carries the page past it, the page is
     brought back to it. Swiping on from the first or the last flavor leaves the section. */
  var tY0 = 0, tY = 0, catchK = -1, catchD = 0, catchUntil = 0;
  function onTouchStart(e) {
    touching = true; catchK = -1;
    tY0 = tY = e.touches && e.touches[0] ? e.touches[0].clientY : 0;
  }
  function onTouchMove(e) { if (e.touches && e.touches[0]) tY = e.touches[0].clientY; }
  function onTouchEnd() {
    touching = false;
    if (!near || off) return;
    var dy = tY0 - tY;                                   // finger up = page moves down
    if (Math.abs(dy) > 12) {
      var p = pos(), d = dy > 0 ? 1 : -1;
      var lo = -stage.offsetHeight, hi = travel() + stage.offsetHeight;
      var k = p > lo && p < hi ? next(p, d) : -1;
      if (k >= 0) { catchK = k; catchD = d; catchUntil = performance.now() + 2500; }
    }
    onRest();
  }
  function catchGlide() {
    if (catchK < 0 || touching) return;
    if (performance.now() > catchUntil) { catchK = -1; return; }
    var over = (pos() - centre(catchK)) * catchD;        // how far past the catch point
    if (over > step() * 0.15) { var k = catchK; catchK = -1; go(k); }
  }
  function settle() {
    if (touching || moving() || off) return;
    var p = pos();
    if (p <= centre(0) || p >= centre(n - 1)) return;    // the way in and out stays free
    var c = nearest(p);
    if (Math.abs(centre(c) - p) > 6) go(c);
  }
  function onRest() { clearTimeout(restTimer); restTimer = setTimeout(settle, 140); }

  /* ---- index buttons ---- */
  gos.forEach(function (g, i) { g.addEventListener('click', function () { go(i); }); });

  // "Add to a box": hand the flavor to the box builder on this page, if there is one.
  root.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-pd-flv-add]') : null;
    if (!a || !document.querySelector('[data-pd-box]')) return;
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('pd:box:add', { detail: { key: a.getAttribute('data-pd-flv-add') } }));
  });

  /* A phone on its side has too little height for the pinned stage: the tray vanished and
     the buttons were cut off (mobile audit 2026-11-18). There the section is the plain
     stacked list (the rules not under .is-live), and it switches back when turned upright. */
  var short = window.matchMedia('(orientation: landscape) and (max-height: 520px)');
  var off = false;
  function mode() {
    off = short.matches;
    if (off) {
      root.classList.remove('is-live');
      slides.forEach(function (s) {
        s.removeAttribute('inert');
        var img = s.querySelector('img[loading="lazy"]'); if (img) img.loading = 'eager';
      });
      stage.style.removeProperty('--tint');
      active = -1;
    } else {
      root.classList.add('is-live');
      active = -1;
      measure();
    }
  }
  if (short.addEventListener) short.addEventListener('change', mode); else if (short.addListener) short.addListener(mode);

  var wheelOpts = { passive: false };
  function attach(on) {
    if (on) { window.addEventListener('wheel', onWheel, wheelOpts); window.addEventListener('keydown', onKey); }
    else { window.removeEventListener('wheel', onWheel, wheelOpts); window.removeEventListener('keydown', onKey); }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var was = near;
      near = es[0].isIntersecting;
      if (near !== was) attach(near);
      if (near) measure();
    }, { rootMargin: '200px 0px' }).observe(root);
  } else { near = true; attach(true); }

  window.addEventListener('scroll', function () { onScroll(); if (near && !off) { catchGlide(); onRest(); } }, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  mode();
  // The section just grew: tell the scroll-reveal layer to re-measure what sits below it.
  window.addEventListener('load', function () { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); });
})();
