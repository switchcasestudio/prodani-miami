/* Adds "there's more" cues to horizontal carousels marked [data-pd-rail]: a count
   ("2 / 7": how far along you are), a progress bar, prev/next arrows, and a single
   nudge the first time the row comes into view. The cues stay hidden while a row
   fits its width, which covers every desktop grid. */
(function () {
  if (window.__pdRail) return;
  window.__pdRail = true;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var uid = 0;
  // The site's own long arrow (as in "Shop all cakes"); CSS mirrors it for "back".
  var arrow = '<svg viewBox="0 0 22 12" fill="none" aria-hidden="true"><path d="M21.53 6.53a.75.75 0 0 0 0-1.06L16.76.7a.75.75 0 1 0-1.06 1.06L19.94 6l-4.24 4.24a.75.75 0 1 0 1.06 1.06l4.77-4.77ZM0 6.75h21v-1.5H0v1.5Z" fill="currentColor"/></svg>';
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };

  function items(rail) {
    return Array.prototype.filter.call(rail.children, function (el) {
      return el.getClientRects().length > 0;
    });
  }

  function enhance(rail) {
    if (rail.dataset.pdRailReady) return;
    rail.dataset.pdRailReady = '1';
    if (!rail.id) rail.id = 'pd-rail-' + (++uid);

    var ui = document.createElement('div');
    ui.className = 'pd-rail';
    ui.hidden = true;
    ui.innerHTML =
      '<span class="pd-rail__count" aria-hidden="true"></span>' +
      '<span class="pd-rail__track" aria-hidden="true"><span class="pd-rail__thumb"></span></span>' +
      '<span class="pd-rail__nav">' +
      '<button type="button" class="pd-rail__btn" data-dir="-1" aria-label="Scroll back" aria-controls="' + rail.id + '">' + arrow + '</button>' +
      '<button type="button" class="pd-rail__btn" data-dir="1" aria-label="Scroll for more" aria-controls="' + rail.id + '">' + arrow + '</button>' +
      '</span>';
    rail.insertAdjacentElement('afterend', ui);

    var count = ui.querySelector('.pd-rail__count');
    var thumb = ui.querySelector('.pd-rail__thumb');
    var prev = ui.querySelector('[data-dir="-1"]');
    var next = ui.querySelector('[data-dir="1"]');
    var queued = false;

    function update() {
      queued = false;
      var max = rail.scrollWidth - rail.clientWidth;
      ui.hidden = max < 4;
      if (ui.hidden) return;
      var list = items(rail);
      var right = rail.getBoundingClientRect().right;
      var seen = 0;
      list.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.left + r.width * 0.6 <= right + 1) seen++;
      });
      count.textContent = pad(Math.max(1, seen)) + ' / ' + pad(list.length);
      var share = rail.clientWidth / rail.scrollWidth;
      thumb.style.width = (share * 100).toFixed(2) + '%';
      thumb.style.left = ((rail.scrollLeft / max) * (1 - share) * 100).toFixed(2) + '%';
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= max - 2;
    }
    function queue() {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }

    rail.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    if ('ResizeObserver' in window) new ResizeObserver(queue).observe(rail);
    // Arrows jump to a card's start: iOS Safari doesn't re-snap after a scripted
    // scroll, so a plain scrollBy stopped halfway through a card.
    function stops() {
      var box = rail.getBoundingClientRect();
      var pad = parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0;
      var seen = {};
      return items(rail).map(function (el) {
        return Math.round(el.getBoundingClientRect().left - box.left + rail.scrollLeft - pad);
      }).filter(function (x) {
        if (seen[x]) return false;
        seen[x] = true;
        return true;
      }).sort(function (a, b) { return a - b; });
    }
    ui.addEventListener('click', function (e) {
      var btn = e.target.closest('.pd-rail__btn');
      if (!btn || btn.disabled) return;
      var at = rail.scrollLeft;
      var page = rail.clientWidth * 1.05;   // one screenful, so a 2-up grid moves two columns
      var list = stops();
      var target;
      if (btn.dataset.dir === '1') {
        target = list.filter(function (x) { return x > at + 4 && x <= at + page; }).pop();
        if (target === undefined) target = list.filter(function (x) { return x > at + 4; })[0];
      } else {
        target = list.filter(function (x) { return x < at - 4 && x >= at - page; })[0];
        if (target === undefined) target = list.filter(function (x) { return x < at - 4; }).pop();
      }
      if (target === undefined) return;
      rail.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    });
    update();

    if (!reduce && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting || ui.hidden || rail.scrollLeft > 4) return;
          io.disconnect();
          rail.classList.add('pd-rail-nudge');
          setTimeout(function () { rail.classList.remove('pd-rail-nudge'); }, 1500);
        });
      }, { threshold: 0.6 });
      io.observe(rail);
    }
  }

  function init() {
    document.querySelectorAll('[data-pd-rail]').forEach(enhance);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
  document.addEventListener('shopify:section:load', init);
})();
