/* Prodani PDP: the order form one step at a time (Moses 2026-11-19: "one screen at a time
   for the orders ... smooth and user-friendly").
   The three steps already exist as blocks in the buy column: 1 Size (.pd-size-step),
   2 One-time or subscribe (.pd-sub), 3 How many packs (the quantity label, the quantity
   field and the buy buttons). This script shows one at a time, with a progress line on top
   (Step 1 of 3, a Back button) and a Continue button under steps 1 and 2. Without the
   script every step shows, as before. Nothing here touches the cart form: the fields keep
   their values while hidden, and Add to cart is Dawn's own button.
   While the steps are on screen the phone's sticky Add to cart bar steps aside, so the
   page offers one next action at a time. */
(function () {
  'use strict';

  function init(box) {
    if (!box || box.hasAttribute('data-pd-steps')) return;
    var kids = Array.prototype.slice.call(box.children);
    var size = box.querySelector(':scope > .pd-size-step');
    var sub = box.querySelector(':scope > .pd-sub');
    var qtyLabel = box.querySelector(':scope > .pd-step-label--qty');
    var qty = box.querySelector(':scope > .product-form__quantity');
    var buy = kids.filter(function (el) { return el.querySelector && el.querySelector('product-form, .product-form'); })[0];
    if (!qtyLabel || !qty || !buy) return;

    var steps = [];
    if (size) steps.push({ name: 'Size', els: [size] });
    if (sub) steps.push({ name: 'Purchase', els: [sub] });
    steps.push({ name: 'Quantity', els: [qtyLabel, qty, buy] });
    if (steps.length < 2) return;
    box.setAttribute('data-pd-steps', '');

    var first = steps[0].els[0];
    var total = steps.length;
    var cur = 0;

    // Progress line: "Step 1 of 3 · Size", one bar per step, Back on the right.
    var bar = document.createElement('div');
    bar.className = 'pd-steps__bar';
    bar.innerHTML =
      '<p class="pd-steps__where" aria-live="polite"></p>' +
      '<button type="button" class="pd-steps__back"><span aria-hidden="true">&larr;</span> Back</button>' +
      '<ol class="pd-steps__track" aria-hidden="true">' +
      steps.map(function () { return '<li></li>'; }).join('') + '</ol>';
    box.insertBefore(bar, first);
    bar.style.order = getComputedStyle(first).order;
    var where = bar.querySelector('.pd-steps__where');
    var back = bar.querySelector('.pd-steps__back');
    var segs = bar.querySelectorAll('.pd-steps__track li');

    // Continue under every step but the last.
    steps.forEach(function (s, i) {
      if (i === total - 1) return;
      var nav = document.createElement('div');
      nav.className = 'pd-steps__nav';
      var next = steps[i + 1].name.toLowerCase();
      nav.innerHTML = '<button type="button" class="pd-btn pd-steps__next">' +
        (i === 0 && s.els[0] === size ? continueLabel() : 'Continue to ' + next) +
        ' <span aria-hidden="true">&rarr;</span></button>';
      var last = s.els[s.els.length - 1];
      last.parentNode.insertBefore(nav, last.nextSibling);
      nav.style.order = getComputedStyle(last).order; // the buy column orders its blocks with flex order
      s.els.push(nav);
      nav.querySelector('button').addEventListener('click', function () { go(i + 1, true); });
    });

    function continueLabel() {
      var t = size && size.querySelector('.pd-size__opt.is-on .pd-size__t');
      return t ? 'Continue with ' + t.textContent.trim() : 'Continue';
    }

    // The chosen pack card is a shortcut to the next step too.
    var on = size && size.querySelector('.pd-size__opt.is-on');
    if (on) {
      on.setAttribute('role', 'button');
      on.setAttribute('tabindex', '0');
      on.addEventListener('click', function () { go(1, true); });
      on.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(1, true); }
      });
    }

    back.addEventListener('click', function () { go(cur - 1, true); });

    function go(n, user) {
      n = Math.max(0, Math.min(total - 1, n));
      cur = n;
      steps.forEach(function (s, i) {
        s.els.forEach(function (el) {
          el.classList.toggle('pd-steps-off', i !== n);
          if (i === n && user) {
            el.classList.remove('pd-steps-in');
            void el.offsetWidth; // restart the entrance
            el.classList.add('pd-steps-in');
          }
        });
      });
      segs.forEach(function (li, i) { li.classList.toggle('is-done', i <= n); });
      where.textContent = 'Step ' + (n + 1) + ' of ' + total + ' · ' + steps[n].name;
      back.hidden = n === 0;
      box.setAttribute('data-pd-step', String(n + 1));
      if (!user) return;
      // Keep the progress line in view and move focus to the new step's heading.
      var r = bar.getBoundingClientRect();
      var navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pd-nav-h')) || 64;
      if (r.top < navH || r.top > window.innerHeight * 0.6) {
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: r.top + window.scrollY - navH - 12, behavior: reduce ? 'auto' : 'smooth' });
      }
      var head = steps[n].els[0].matches('.pd-step-label') ? steps[n].els[0] : steps[n].els[0].querySelector('.pd-step-label, legend');
      if (head) {
        head.setAttribute('tabindex', '-1');
        head.focus({ preventScroll: true });
      }
    }
    go(0, false);

    // The sticky bar on phones steps aside while the steps are on screen.
    if ('IntersectionObserver' in window) {
      var seen = new Set();
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
        document.documentElement.classList.toggle('pd-steps-in-view', seen.size > 0);
      }, { threshold: 0 });
      io.observe(bar);
      steps.forEach(function (s) { s.els.forEach(function (el) { io.observe(el); }); });
    }
  }

  function start() {
    document.querySelectorAll('product-info .product__info-container').forEach(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
