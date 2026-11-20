/* The hero fan, the interactive part (2026-11-19, Moses round 2). CSS does the entrance,
   the lift and the name tag; this file adds two things for a mouse only:
     1. the lean: when a tray is hovered, the trays on either side lean away from it
        (--push on each tray), so the hovered cake shows more of itself;
     2. the tilt: the whole fan turns a degree or two toward the pointer (--tilt).
   Touch gets the press lift from CSS and the tap opens the flavor. Nothing runs under
   reduced motion or in the theme editor. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  function bind(fan) {
    if (!fan || fan.dataset.pdBound) return;
    fan.dataset.pdBound = '1';
    var trays = Array.prototype.slice.call(fan.querySelectorAll('.pd-fh__tray'));
    var LEAN = 3.2;                                            // degrees, nearest neighbour

    function lean(hot) {
      var kh = hot ? parseFloat(hot.dataset.k) : 0;
      trays.forEach(function (t) {
        if (!hot || t === hot) { t.style.removeProperty('--push'); return; }
        var k = parseFloat(t.dataset.k);
        var gap = Math.abs(k - kh);
        // Neighbours lean most, the far ones a little: the fan opens around the hovered tray.
        t.style.setProperty('--push', (k > kh ? 1 : -1) * LEAN / Math.max(1, gap * .75) + 'deg');
      });
    }
    trays.forEach(function (t) {
      t.addEventListener('pointerenter', function () { lean(t); });
      t.addEventListener('focus', function () { lean(t); });
      t.addEventListener('blur', function () { lean(null); });
    });
    fan.addEventListener('pointerleave', function () { lean(null); });

    var hero = fan.closest('.pd-fh') || fan;
    var raf = 0, x = 0;
    hero.addEventListener('pointermove', function (e) {
      x = e.clientX;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var r = fan.getBoundingClientRect();
        var mid = r.left + r.width / 2;
        var t = Math.max(-1, Math.min(1, (x - mid) / (window.innerWidth / 2)));
        fan.style.setProperty('--tilt', (t * 2.2).toFixed(2) + 'deg');
      });
    });
    hero.addEventListener('pointerleave', function () { fan.style.setProperty('--tilt', '0deg'); });
  }

  function init() {
    if (window.Shopify && window.Shopify.designMode) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-pd-fan]'), bind);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
