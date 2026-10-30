/* Catering inquiry, guided four-step flow.
   Progressive enhancement: the markup is four stacked fieldsets that post as one
   Shopify contact form. This script adds the stepping (one fieldset at a time, Back /
   Continue, a step list that fills with summaries), the minimum-quantity message, the
   flavor tally and the +/- buttons. If it fails to load, everything is simply visible
   and the form still posts. After a server-side error (data-errors) all steps stay
   visible so nothing hides behind "Continue". */
(function () {
  var form = document.querySelector('[data-pd-catering]');
  if (!form) return;
  var grid = form.querySelector('.pd-cat__grid');
  if (!grid) return;                                   // success state, nothing to step

  var min = parseInt(form.getAttribute('data-min'), 10) || 70;
  var steps = Array.prototype.slice.call(form.querySelectorAll('.pd-cat__step'));
  var navItems = Array.prototype.slice.call(form.querySelectorAll('[data-pd-nav] li'));
  var qty = form.querySelector('[data-pd-qty]');
  var flavors = Array.prototype.slice.call(form.querySelectorAll('[data-pd-flavor]'));
  var tally = form.querySelector('[data-pd-tally]');
  var mix = form.querySelector('[data-pd-mix]');
  var flavorWrap = form.querySelector('[data-pd-flavors]');
  var prev = form.querySelector('[data-prev]');
  var next = form.querySelector('[data-next]');
  var submit = form.querySelector('[data-submit]');
  var bar = form.querySelector('[data-pd-bar]');
  var count = form.querySelector('[data-pd-count]');
  var wizard = !grid.hasAttribute('data-errors') && steps.length === 4;
  var current = 1;

  /* ---- minimum ---- */
  function checkMin() {
    if (!qty) return;
    var v = parseInt(qty.value, 10);
    if (qty.value !== '' && (isNaN(v) || v < min)) {
      qty.setCustomValidity(qty.getAttribute('data-min-msg') || ('The minimum order is ' + min + ' cakes.'));
    } else {
      qty.setCustomValidity('');
    }
  }
  function bump(delta) {
    if (!qty) return;
    var v = parseInt(qty.value, 10);
    if (isNaN(v)) v = min - (delta > 0 ? 10 : 0);
    v = Math.max(min, Math.round((v + delta) / 10) * 10);
    qty.value = v;
    qty.dispatchEvent(new Event('input', { bubbles: true }));
  }
  var dec = form.querySelector('[data-qty-dec]'), inc = form.querySelector('[data-qty-inc]');
  if (dec) dec.addEventListener('click', function () { bump(-10); });
  if (inc) inc.addEventListener('click', function () { bump(10); });

  /* ---- tally ---- */
  function updateTally() {
    if (!tally || !flavors.length) return;
    var sum = 0, any = false;
    flavors.forEach(function (f) { var n = parseInt(f.value, 10); if (!isNaN(n) && n > 0) { sum += n; any = true; } });
    var total = qty ? parseInt(qty.value, 10) : NaN;
    if (!any) { tally.hidden = true; tally.removeAttribute('data-state'); return; }
    tally.hidden = false;
    if (isNaN(total)) { tally.textContent = sum + ' cakes chosen so far.'; tally.removeAttribute('data-state'); }
    else if (sum === total) { tally.textContent = 'All ' + total + ' cakes assigned.'; tally.setAttribute('data-state', 'ok'); }
    else if (sum < total) { tally.textContent = sum + ' of ' + total + ' assigned. ' + (total - sum) + ' still open, or leave the rest to us.'; tally.setAttribute('data-state', 'under'); }
    else { tally.textContent = sum + ' chosen, ' + (sum - total) + ' more than your total. Fine if you want extras.'; tally.setAttribute('data-state', 'over'); }
  }
  if (mix && flavorWrap) {
    var syncMix = function () { flavorWrap.classList.toggle('is-mix', mix.checked); };
    mix.addEventListener('change', function () { syncMix(); summarize(); });
    syncMix();
  }

  /* ---- summaries in the step list ---- */
  function text(sel) { var el = form.querySelector(sel); return el ? el.value.trim() : ''; }
  function summarize() {
    var s = {};
    var q = qty && qty.value ? parseInt(qty.value, 10) : NaN;
    s[1] = !isNaN(q) ? q + ' cakes' : '';
    var parts = [];
    if (mix && mix.checked) parts.push('Mix suggested by us');
    else {
      var chosen = flavors.filter(function (f) { return parseInt(f.value, 10) > 0; });
      if (chosen.length) parts.push(chosen.length === 1 ? chosen[0].name.replace(/^contact\[|\]$/g, '') : chosen.length + ' flavors');
    }
    var pres = form.querySelector('input[name="contact[Presentation]"]:checked');
    if (pres) parts.push(pres.value);
    s[2] = parts.join(' · ');
    var d = text('[data-summary-date]');
    var dateTxt = '';
    if (d) { var dt = new Date(d + 'T12:00:00'); if (!isNaN(dt)) dateTxt = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
    var del = form.querySelector('[data-summary-delivery]');
    /* Delivery has a default value, so it only joins the summary once a date is set. */
    s[3] = dateTxt ? [dateTxt, del && del.value !== 'Not sure yet' ? del.value : ''].filter(Boolean).join(' · ') : '';
    s[4] = text('[data-summary-name]');
    navItems.forEach(function (li) {
      var n = li.getAttribute('data-step'); var out = li.querySelector('[data-summary]');
      if (out) out.textContent = s[n] || '';
    });
  }

  /* ---- stepping ---- */
  function show(n, focus) {
    current = Math.min(4, Math.max(1, n));
    steps.forEach(function (fs) { fs.hidden = parseInt(fs.getAttribute('data-step'), 10) !== current; });
    navItems.forEach(function (li) {
      var k = parseInt(li.getAttribute('data-step'), 10);
      li.classList.toggle('is-current', k === current);
      li.classList.toggle('is-done', k < current);
      var b = li.querySelector('button'); if (b) b.setAttribute('aria-current', k === current ? 'step' : 'false');
    });
    if (prev) prev.hidden = current === 1;
    if (next) next.hidden = current === 4;
    if (submit) submit.hidden = current !== 4;
    if (bar) bar.style.width = (current / 4 * 100) + '%';
    if (count) {
      var title = navItems[current - 1] && navItems[current - 1].querySelector('b');
      count.textContent = 'Step ' + current + ' of 4' + (title ? ' · ' + title.textContent : '');
    }
    if (focus) {
      var card = form.querySelector('.pd-cat__card');
      var top = card.getBoundingClientRect().top + window.scrollY - 100;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' });
      var first = steps[current - 1].querySelector('input, select, textarea, button');
      if (first && window.matchMedia('(min-width: 861px)').matches) { try { first.focus({ preventScroll: true }); } catch (e) {} }
    }
  }
  function valid(n) {
    var fs = steps[n - 1]; var ok = true;
    var fields = fs.querySelectorAll('input, select, textarea');
    for (var i = 0; i < fields.length; i++) {
      if (!fields[i].checkValidity()) { fields[i].reportValidity(); ok = false; break; }
    }
    return ok;
  }

  if (qty) {
    qty.addEventListener('input', function () { checkMin(); updateTally(); summarize(); });
    checkMin();
  }
  flavors.forEach(function (f) { f.addEventListener('input', function () { updateTally(); summarize(); }); });
  form.addEventListener('change', summarize);
  form.addEventListener('input', summarize);

  if (wizard) {
    grid.classList.add('is-wizard');
    if (prev) prev.addEventListener('click', function () { show(current - 1, true); });
    if (next) next.addEventListener('click', function () { if (valid(current)) show(current + 1, true); });
    navItems.forEach(function (li) {
      var b = li.querySelector('[data-goto]'); if (!b) return;
      b.addEventListener('click', function () {
        var target = parseInt(b.getAttribute('data-goto'), 10);
        if (target <= current || valid(current)) show(target, true);
      });
    });
    /* Enter inside a text field should advance, not post a half-filled form. */
    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || current === 4) return;
      var t = e.target; if (!t || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON') return;
      e.preventDefault(); if (valid(current)) show(current + 1, true);
    });
    show(1, false);
  }

  updateTally();
  summarize();
})();
