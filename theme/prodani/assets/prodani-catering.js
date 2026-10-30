/* Catering inquiry: browser-side help for the three things the brochure asks for.
   1. The exact quantity must be at least the minimum (data-min on the form).
   2. A running tally of flavor counts against that quantity. It never blocks the
      submit: extras and "leave the rest to us" are both fine, Dani sorts it out.
   3. "Recommend a mix" dims the flavor counts so the choice reads as either/or.
   No network, no dependencies. If this file fails to load the form still posts. */
(function () {
  var form = document.querySelector('[data-pd-catering]');
  if (!form) return;

  var min = parseInt(form.getAttribute('data-min'), 10) || 70;
  var qty = form.querySelector('[data-pd-qty]');
  var flavors = Array.prototype.slice.call(form.querySelectorAll('[data-pd-flavor]'));
  var tally = form.querySelector('[data-pd-tally]');
  var mix = form.querySelector('[data-pd-mix]');
  var wrap = form.querySelector('[data-pd-flavors]');

  /* 1. minimum: a readable message instead of the browser's "Value must be..." */
  function checkMin() {
    if (!qty) return;
    var v = parseInt(qty.value, 10);
    if (qty.value !== '' && (isNaN(v) || v < min)) {
      qty.setCustomValidity(qty.getAttribute('data-min-msg') || ('The minimum order is ' + min + ' cakes.'));
    } else {
      qty.setCustomValidity('');
    }
  }
  if (qty) {
    qty.addEventListener('input', function () { checkMin(); updateTally(); });
    qty.addEventListener('blur', function () { if (qty.value !== '' && !qty.checkValidity()) qty.reportValidity(); });
    checkMin();
  }

  /* 2. tally */
  function updateTally() {
    if (!tally || !flavors.length) return;
    var sum = 0, any = false;
    flavors.forEach(function (f) {
      var n = parseInt(f.value, 10);
      if (!isNaN(n) && n > 0) { sum += n; any = true; }
    });
    var total = qty ? parseInt(qty.value, 10) : NaN;
    if (!any) { tally.hidden = true; tally.removeAttribute('data-state'); return; }
    tally.hidden = false;
    if (isNaN(total)) {
      tally.textContent = sum + ' cakes chosen so far.';
      tally.removeAttribute('data-state');
    } else if (sum === total) {
      tally.textContent = 'All ' + total + ' cakes assigned.';
      tally.setAttribute('data-state', 'ok');
    } else if (sum < total) {
      tally.textContent = sum + ' of ' + total + ' assigned. ' + (total - sum) + ' still open, or leave the rest to us.';
      tally.setAttribute('data-state', 'under');
    } else {
      tally.textContent = sum + ' chosen, ' + (sum - total) + ' more than your total. Fine if you want extras.';
      tally.setAttribute('data-state', 'over');
    }
  }
  flavors.forEach(function (f) { f.addEventListener('input', updateTally); });

  /* 3. recommend a mix */
  if (mix && wrap) {
    var sync = function () { wrap.classList.toggle('is-mix', mix.checked); };
    mix.addEventListener('change', sync);
    sync();
  }

  updateTally();
})();
