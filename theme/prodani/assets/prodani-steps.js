/* Prodani PDP: the order box, one step at a time, all inside one container.
   Round 3 (Moses 2026-11-19): "one screen at a time for the orders".
   Round 4 (Moses 2026-11-19): "help the user understand it ... step 1, select your size
   (in big), and after it's been selected change screen to step two, in the same
   container (no outside navigation). These two are competing each other, and the CTA is
   actually the 'continue'."
   So:
   - the three steps (1 Size .pd-size-step, 2 One-time or subscribe .pd-sub, 3 How many:
     the quantity label, the quantity field and the buy buttons) move into one bordered
     box, .pd-order, with its own head: "Step 1 of 3", progress bars, Back, and the
     step's question in big type;
   - choosing IS the action: tapping the pack card goes to step 2, tapping "One-time
     purchase" goes to step 3. There is no separate Continue button, except where a
     choice needs more input (several sizes in Dawn's picker; Subscribe with its
     delivery frequency);
   - "Build a box" stays a way out, styled as a quieter link under the pack card.
   Without this script every step shows in the buy column, as before. Nothing here
   touches the cart form: Dawn's elements are moved, not rebuilt, and keep their values.
   While the box is on screen the phone's sticky Add to cart bar steps aside. */
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

    var packCard = size && size.querySelector('.pd-size__opt.is-on');
    var steps = [];
    if (size) steps.push({ key: 'size', name: 'Size', q: 'Choose your size', els: [size] });
    if (sub) steps.push({ key: 'sub', name: 'Purchase', q: 'How would you like it?', els: [sub] });
    steps.push({ key: 'qty', name: 'Quantity', q: qtyLabel.textContent.replace(/^\s*\d+\s*/, '').trim() || 'How many?', els: [qtyLabel, qty, buy] });
    if (steps.length < 2) return;
    box.setAttribute('data-pd-steps', '');

    var first = steps[0].els[0];
    var total = steps.length;
    var cur = 0;

    // The container and its head.
    var order = document.createElement('div');
    order.className = 'pd-order';
    order.style.order = getComputedStyle(first).order; // the buy column orders its blocks with flex order
    order.innerHTML =
      '<div class="pd-order__head">' +
        '<p class="pd-order__where"></p>' +
        '<button type="button" class="pd-order__back"><span aria-hidden="true">&larr;</span> Back</button>' +
        '<ol class="pd-order__track" aria-hidden="true">' + steps.map(function () { return '<li></li>'; }).join('') + '</ol>' +
        '<h2 class="pd-order__q" tabindex="-1" aria-live="polite"></h2>' +
      '</div>';
    box.insertBefore(order, first);
    var where = order.querySelector('.pd-order__where');
    var back = order.querySelector('.pd-order__back');
    var q = order.querySelector('.pd-order__q');
    var segs = order.querySelectorAll('.pd-order__track li');

    // Move the steps in, in order. A Continue button only where a choice needs more input.
    steps.forEach(function (s, i) {
      s.els.forEach(function (el) { order.appendChild(el); });
      if (i === total - 1) return;
      var needsButton = (s.key === 'size' && !packCard) || s.key === 'sub';
      if (!needsButton) return;
      var nav = document.createElement('div');
      nav.className = 'pd-order__nav';
      if (s.key === 'sub') nav.setAttribute('data-pd-sub-next', '');
      nav.innerHTML = '<button type="button" class="pd-btn pd-order__next">Continue <span aria-hidden="true">&rarr;</span></button>';
      order.appendChild(nav);
      s.els.push(nav);
      nav.querySelector('button').addEventListener('click', function () { go(i + 1, true); });
    });

    // Step 1: the pack card is the action.
    if (packCard) {
      packCard.setAttribute('role', 'button');
      packCard.setAttribute('tabindex', '0');
      var t = packCard.querySelector('.pd-size__t');
      packCard.setAttribute('aria-label', 'Choose ' + (t ? t.textContent.trim() : 'this size') + ' and continue');
      var arrow = document.createElement('span');
      arrow.className = 'pd-size__go';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = '&rarr;';
      packCard.appendChild(arrow);
      var pick = function () { packCard.classList.add('is-picked'); setTimeout(function () { go(1, true); }, 160); };
      packCard.addEventListener('click', pick);
      packCard.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    }

    // Step 2: one-time purchase moves on; subscribe stays for its frequency and shows Continue.
    if (sub) {
      var subIdx = steps.map(function (s) { return s.key; }).indexOf('sub');
      var syncSub = function () {
        var subOn = sub.querySelector('[data-pd-sub-subscribe]:checked');
        order.classList.toggle('is-sub', !!subOn);
      };
      sub.addEventListener('change', syncSub);
      sub.querySelectorAll('.pd-sub__opt').forEach(function (opt) {
        opt.addEventListener('click', function () {
          setTimeout(function () {
            syncSub();
            var once = sub.querySelector('[data-pd-sub-onetime]');
            if (once && once.checked && opt.contains(once) && cur === subIdx) go(subIdx + 1, true);
          }, 140);
        });
      });
      syncSub();
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
      if (packCard) packCard.classList.remove('is-picked');
      segs.forEach(function (li, i) { li.classList.toggle('is-done', i <= n); });
      where.textContent = 'Step ' + (n + 1) + ' of ' + total;
      q.textContent = steps[n].q;
      back.hidden = n === 0;
      order.setAttribute('data-step', steps[n].key);
      box.setAttribute('data-pd-step', String(n + 1));
      if (!user) return;
      // Keep the box's head in view; focus moves to the new question.
      var r = order.getBoundingClientRect();
      var navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pd-nav-h')) || 64;
      if (r.top < navH || r.top > window.innerHeight * 0.6) {
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: r.top + window.scrollY - navH - 12, behavior: reduce ? 'auto' : 'smooth' });
      }
      q.focus({ preventScroll: true });
    }
    go(0, false);

    // The sticky bar on phones steps aside while the box is on screen.
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { document.documentElement.classList.toggle('pd-steps-in-view', e.isIntersecting); });
      }, { threshold: 0 });
      io.observe(order);
    }
  }

  function start() {
    document.querySelectorAll('product-info .product__info-container').forEach(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
