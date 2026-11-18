/* Flavor spotlight. The stage is pinned by CSS (position:sticky inside a tall section);
   this script only works out which flavor the scroll position belongs to and marks every
   slide before / on / after. The CSS transitions do the moving, so a fast scroll simply
   retargets them. No library needed, and nothing here runs in the theme editor. */
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

  var active = -1, ticking = false, near = false;

  function pad(i) { return (i < 10 ? '0' : '') + i; }

  function set(i) {
    if (i === active) return;
    active = i;
    slides.forEach(function (s, k) {
      s.setAttribute('data-pos', k < i ? 'before' : k > i ? 'after' : 'on');
      if (k === i) s.removeAttribute('inert'); else s.setAttribute('inert', '');
      // the next tray is needed the moment the scroll gets there
      if (k === i + 1 || k === i) { var img = s.querySelector('img[loading="lazy"]'); if (img) img.loading = 'eager'; }
    });
    stage.style.setProperty('--tint', slides[i].getAttribute('data-tint'));
    gos.forEach(function (g, k) { if (k === i) g.setAttribute('aria-current', 'true'); else g.removeAttribute('aria-current'); });
    if (nEl) nEl.textContent = pad(i + 1);
  }

  // How far the section has travelled behind the pinned stage, 0 to 1.
  function travel() { return Math.max(1, root.offsetHeight - stage.offsetHeight); }
  function pinTop() { return parseFloat(getComputedStyle(stage).top) || 0; }
  function measure() {
    ticking = false;
    var p = (pinTop() - root.getBoundingClientRect().top) / travel();
    p = Math.min(1, Math.max(0, p));
    set(Math.round(p * (n - 1)));
  }
  function onScroll() { if (!near || ticking) return; ticking = true; requestAnimationFrame(measure); }

  function goTo(i) {
    var top = root.getBoundingClientRect().top + window.pageYOffset - pinTop() + travel() * (i / (n - 1));
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.round(top), behavior: calm ? 'auto' : 'smooth' });
  }
  gos.forEach(function (g, i) { g.addEventListener('click', function () { goTo(i); }); });

  // "Add to a box": hand the flavor to the box builder on this page, if there is one.
  root.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-pd-flv-add]') : null;
    if (!a || !document.querySelector('[data-pd-box]')) return;
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('pd:box:add', { detail: { key: a.getAttribute('data-pd-flv-add') } }));
  });

  root.classList.add('is-live');
  set(0);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      near = es[0].isIntersecting;
      if (near) measure();
    }, { rootMargin: '200px 0px' }).observe(root);
  } else { near = true; }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  measure();
  // The section just grew: tell the scroll-reveal layer to re-measure what sits below it.
  window.addEventListener('load', function () { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); });
})();
