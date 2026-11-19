/* Build Your Box — interactive logic. Vanilla JS, no framework.

   Flow: Choose Box -> Choose Flavors -> One-Time or Subscribe -> Checkout.

   Curated boxes are PRESETS over the same state, not a second cart path: choosing one
   sets the size and fills the flavor quantities, then hands you to step 2 with every
   quantity still editable. One add-to-cart path means one place for bugs to live.

   Subscriptions use Shopify's native selling plans. When "Subscribe & save" is chosen
   and a real plan id is selected, every line item carries `selling_plan`, so Shopify's
   own subscription logic runs at checkout. The preview shell (no plans attached yet,
   ticket T12) is disabled in Liquid and can never reach this path. */
(function () {
  var root = document.querySelector('[data-pd-box]');
  if (!root) return;

  var sizeBtns = Array.prototype.slice.call(root.querySelectorAll('.pd-box__size'));
  var flavorEls = Array.prototype.slice.call(root.querySelectorAll('.pd-box__flavor'));
  var modeBtns = Array.prototype.slice.call(root.querySelectorAll('[data-pd-mode]'));
  var panels = Array.prototype.slice.call(root.querySelectorAll('[data-pd-panel]'));
  var curatedCards = Array.prototype.slice.call(root.querySelectorAll('[data-pd-curated]'));
  var elSelected = root.querySelector('[data-pd-selected]');
  var elTotal = root.querySelector('[data-pd-total]');
  var elBar = root.querySelector('[data-pd-bar]');
  var elUpsell = root.querySelector('[data-pd-upsell]');
  var elCtaTotal = root.querySelector('[data-pd-cta-total]');
  var elCtaPer = root.querySelector('[data-pd-cta-per]');
  var elAdd = root.querySelector('[data-pd-add]');
  var elNote = root.querySelector('[data-pd-note]');

  var subOnetime = root.querySelector('[data-pd-box-onetime]');
  var subSubscribe = root.querySelector('[data-pd-box-subscribe]');
  var subFreq = root.querySelector('[data-pd-box-freq]');
  var subPlan = root.querySelector('[data-pd-box-plan]');

  // seq is the order the cakes went in, one flavor id per slot of the tray.
  var state = { size: 0, price: 0, sel: {}, curated: null, seq: [] };
  var elTray = root.querySelector('[data-pd-tray]');
  var slots = [], traySlots = [], byId = {};
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Desktop (Moses 2026-11-18): the box is drawn inside each size card and the builder is
  // open from the start. Phones keep the fold and the tray in step 2.
  var desk = window.matchMedia ? window.matchMedia('(min-width: 750px)') : { matches: true };
  function miniSlots(btn) {
    var m = btn && btn.querySelector('[data-pd-mini]');
    return m ? Array.prototype.slice.call(m.children) : [];
  }
  function chosenBtn() { return sizeBtns.filter(function (b) { return b.getAttribute('aria-checked') === 'true'; })[0]; }

  /* ---- fold: steps 2–4 stay closed until the shopper engages ---- */
  var more = root.querySelector('[data-pd-more]');
  var expand = root.querySelector('[data-pd-expand]');
  function openMore() {
    if (!more || more.classList.contains('is-open')) return;
    more.classList.add('is-open');
    more.removeAttribute('inert');
    if (expand) expand.setAttribute('aria-expanded', 'true');
    // Scroll-triggered reveals measured the page with the panel folded; re-measure
    // once it has opened or the progress bar and anything below stay hidden.
    setTimeout(function () { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, 650);
  }
  if (expand) expand.addEventListener('click', function () {
    openMore();
    var flavors = root.querySelector('.pd-box__flavors');
    if (flavors && flavors.scrollIntoView) setTimeout(function () { flavors.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 250);
  });

  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, ''); }
  function totalQty() { return Object.keys(state.sel).reduce(function (s, k) { return s + state.sel[k]; }, 0); }

  /* ---- step 1a: sizes ---- */

  function selectSize(btn, keepCurated) {
    sizeBtns.forEach(function (b) { b.setAttribute('aria-checked', b === btn ? 'true' : 'false'); });
    state.size = parseInt(btn.getAttribute('data-size'), 10) || 0;
    state.price = parseFloat(btn.getAttribute('data-price')) || 0;
    if (!keepCurated) clearCurated();
    buildTray();
    refresh();
  }

  sizeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { openMore(); selectSize(btn); });
  });

  /* ---- step 1b: curated presets ---- */

  function clearCurated() {
    state.curated = null;
    curatedCards.forEach(function (c) { c.classList.remove('is-active'); });
  }

  // "Chocolate Fudge:4, Vanilla Bean:4" -> fills state.sel by flavor NAME.
  // Blank mix = even spread across every in-stock flavor, remainder handed out one
  // at a time from the top so the box always totals exactly the chosen size.
  function applyCurated(card) {
    var size = parseInt(card.getAttribute('data-size'), 10) || 0;
    var price = parseFloat(card.getAttribute('data-price')) || 0;
    var mix = (card.getAttribute('data-mix') || '').trim();

    Object.keys(state.sel).forEach(function (k) { state.sel[k] = 0; });

    var available = flavorEls.filter(function (el) { return el.getAttribute('data-soldout') !== 'true'; });

    if (mix) {
      mix.split(',').forEach(function (part) {
        var bits = part.split(':');
        var name = (bits[0] || '').trim().toLowerCase();
        var qty = parseInt(bits[1], 10) || 0;
        if (!name || qty <= 0) return;
        var match = available.filter(function (el) {
          return (el.getAttribute('data-name') || '').trim().toLowerCase() === name;
        })[0];
        if (match) state.sel[match.getAttribute('data-flavor')] = qty;
      });
    } else if (available.length) {
      var base = Math.floor(size / available.length);
      var extra = size % available.length;
      available.forEach(function (el, i) {
        state.sel[el.getAttribute('data-flavor')] = base + (i < extra ? 1 : 0);
      });
    }

    state.size = size;
    state.price = price;
    state.curated = card;
    state.seq = [];
    flavorEls.forEach(function (el) {
      var fid = el.getAttribute('data-flavor');
      for (var q = 0; q < (state.sel[fid] || 0); q++) state.seq.push(fid);
    });
    buildTray();

    // Reflect the curated size on the size buttons so step 1 and step 2 agree.
    sizeBtns.forEach(function (b) {
      b.setAttribute('aria-checked', (parseInt(b.getAttribute('data-size'), 10) === size) ? 'true' : 'false');
    });
    curatedCards.forEach(function (c) { c.classList.toggle('is-active', c === card); });

    refresh();

    // A curated box that doesn't total its own size is a content error (a mix that
    // names a sold-out or renamed flavor). Say so rather than silently under-filling.
    var total = totalQty();
    if (total !== size) {
      elNote.textContent = 'This box is ' + total + ' of ' + size + ' cakes — top it up below.';
    } else {
      elNote.textContent = '';
    }

    var flavors = root.querySelector('.pd-box__flavors');
    // Wait for the fold to open, or the scroll target is measured at zero height.
    if (flavors && flavors.scrollIntoView) setTimeout(function () { flavors.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 350);
  }

  curatedCards.forEach(function (card) {
    card.addEventListener('click', function () { openMore(); applyCurated(card); });
  });

  /* ---- step 1: mode tabs ---- */

  modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.getAttribute('data-pd-mode');
      modeBtns.forEach(function (b) { b.setAttribute('aria-selected', b === btn ? 'true' : 'false'); });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-pd-panel') !== mode; });
    });
  });

  /* ---- step 2: flavors ---- */

  flavorEls.forEach(function (el) {
    var id = el.getAttribute('data-flavor');
    var soldout = el.getAttribute('data-soldout') === 'true';
    var qtyEl = el.querySelector('[data-qty]');
    var minus = el.querySelector('[data-minus]');
    var plus = el.querySelector('[data-plus]');
    state.sel[id] = 0;
    byId[id] = el;
    var thumb = el.querySelector('[data-pd-thumb] img');
    el._thumbEl = thumb;
    el._thumb = thumb ? (thumb.currentSrc || thumb.src) : '';
    el._tint = el.style.getPropertyValue('--tint');
    el._ink = el.style.getPropertyValue('--fc');

    minus.addEventListener('click', function () { bump(id, -1); });
    plus.addEventListener('click', function () { bump(id, 1); });

    el._sync = function () {
      var q = state.sel[id];
      qtyEl.textContent = q;
      el.classList.toggle('is-active', q > 0);
      minus.disabled = q === 0;
      plus.disabled = soldout || totalQty() >= state.size || state.size === 0;
    };
  });

  function bump(id, delta) {
    if (delta > 0 && (totalQty() >= state.size || state.size === 0)) return false;
    if (delta < 0 && !state.sel[id]) return false;
    state.sel[id] = Math.max(0, (state.sel[id] || 0) + delta);
    var landing = -1;
    if (delta > 0) { state.seq.push(id); landing = state.seq.length - 1; }
    else { var at = state.seq.lastIndexOf(id); if (at > -1) state.seq.splice(at, 1); }
    // Hand-editing a curated box makes it yours — drop the preset highlight, keep the
    // quantities. The size and price stay put so the deal doesn't silently change.
    if (state.curated) clearCurated();
    refresh(landing);
    if (landing > -1) fly(byId[id], slots[landing]);
    return true;
  }

  /* ---- the tray: one slot per cake ---- */

  function buildTray() {
    if (!elTray) return;
    if (traySlots.length !== state.size) {
      elTray.innerHTML = '';
      traySlots = [];
      for (var i = 0; i < state.size; i++) {
        var slot = document.createElement('span');
        slot.className = 'pd-box__slot';
        slot.appendChild(document.createElement('img')).alt = '';
        elTray.appendChild(slot);
        traySlots.push(slot);
      }
      elTray.style.setProperty('--slots', state.size || 1);
    }
  }

  // landing: the slot a cake is flying to right now. It stays empty until the cake arrives.
  function renderTray(landing) {
    var mine = desk.matches ? miniSlots(chosenBtn()) : traySlots;
    // Every other box on show goes back to empty outlines.
    sizeBtns.forEach(function (b) { miniSlots(b).forEach(function (sl) { if (mine.indexOf(sl) < 0) empty(sl); }); });
    traySlots.forEach(function (sl) { if (mine.indexOf(sl) < 0) empty(sl); });
    slots = mine;
    slots.forEach(function (slot, i) {
      var id = state.seq[i], el = id ? byId[id] : null, img = slot.firstChild;
      if (!el) { slot.classList.remove('is-full', 'is-landing'); slot._f = null; return; }
      if (slot._f !== id) {
        slot._f = id;
        if (el._thumb) img.src = el._thumb; else img.removeAttribute('src');
        slot.style.setProperty('--tint', el._tint || '');
        slot.style.setProperty('--fc', el._ink || '');
        slot.classList.toggle('is-plain', !el._thumb);
      }
      slot.classList.add('is-full');
      slot.classList.toggle('is-landing', i === landing && canFly(el));
    });
  }

  function empty(slot) { slot.classList.remove('is-full', 'is-landing'); slot._f = null; }

  function canFly(tile) { return !calm && tile && tile._thumbEl && typeof tile._thumbEl.animate === 'function'; }

  // The cake leaves its tile and drops into the next free slot. The count has already
  // changed by the time it lands; this only shows where the cake went.
  function fly(tile, slot) {
    if (!slot) return;
    if (!canFly(tile)) { slot.classList.remove('is-landing'); return; }
    var a = tile._thumbEl.getBoundingClientRect(), b = slot.getBoundingClientRect();
    if (!a.width || !b.width) { slot.classList.remove('is-landing'); return; }
    var g = document.createElement('img');
    g.src = tile._thumb; g.alt = ''; g.className = 'pd-box__ghost';
    g.style.cssText = 'left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px;';
    document.body.appendChild(g);
    var dx = (b.left + b.width / 2) - (a.left + a.width / 2);
    var dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    var sc = Math.min(1, (b.height * 0.84) / a.height);
    var lift = Math.min(60, 24 + Math.abs(dx) * 0.08);
    var anim = g.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)' },
      { transform: 'translate(' + (dx * 0.5) + 'px,' + (dy * 0.5 - lift) + 'px) scale(' + ((1 + sc) / 2) + ') rotate(-7deg)', offset: 0.5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ') rotate(0deg)' }
    ], { duration: 460, easing: 'cubic-bezier(.6,0,.3,1)' });
    var land = function () { if (g.parentNode) g.parentNode.removeChild(g); slot.classList.remove('is-landing'); };
    anim.onfinish = land; anim.oncancel = land;
  }

  // A flavor picked somewhere else on the page (the flavor spotlight's "Add to a box").
  document.addEventListener('pd:box:add', function (e) {
    var key = e.detail && e.detail.key;
    var el = flavorEls.filter(function (f) { return key && f.getAttribute('data-key') === key && f.getAttribute('data-soldout') !== 'true'; })[0];
    openMore();
    if (!state.size && sizeBtns[0]) selectSize(sizeBtns[0]);
    var target = (desk.matches ? root.querySelector('.pd-box__sizes') : root.querySelector('.pd-box__yours')) || root;
    var top = target.getBoundingClientRect().top + window.pageYOffset - (window.innerHeight * 0.22);
    window.scrollTo({ top: Math.max(0, Math.round(top)), behavior: calm ? 'auto' : 'smooth' });
    if (!el) return;
    // Wait for the fold to open and the scroll to settle, so the cake is seen going in.
    setTimeout(function () {
      if (!bump(el.getAttribute('data-flavor'), 1)) elNote.textContent = 'Your box is full. Remove a cake or pick a bigger box to add ' + el.getAttribute('data-name') + '.';
      else elNote.textContent = '';
    }, calm ? 60 : 900);
  });

  /* ---- step 3: purchase options ---- */

  function subscribing() {
    return !!(subSubscribe && subSubscribe.checked && !subSubscribe.disabled);
  }

  function planId() {
    if (!subscribing() || !subPlan) return null;
    var v = subPlan.value;
    return /^\d+$/.test(v) ? v : null;
  }

  function syncSub() {
    if (subFreq) subFreq.hidden = !subscribing();
    refresh();
  }

  if (subOnetime) subOnetime.addEventListener('change', syncSub);
  if (subSubscribe) subSubscribe.addEventListener('change', syncSub);
  if (subPlan) subPlan.addEventListener('change', syncSub);

  /* ---- upsell ---- */

  function upsell() {
    if (!elUpsell) return;
    // Data-driven: nudge toward the next size up in the rendered tier ladder
    // (6 -> 12 "Most Popular" -> 18 "Best Value"), whatever the tiers are set to.
    var target = null, msg = '';
    sizeBtns.forEach(function (b) {
      var s = parseInt(b.getAttribute('data-size'), 10) || 0;
      if (s > state.size && (!target || s < parseInt(target.getAttribute('data-size'), 10))) target = b;
    });
    if (target && state.size > 0) {
      var nextSize = parseInt(target.getAttribute('data-size'), 10);
      var isLast = sizeBtns.every(function (b) { return (parseInt(b.getAttribute('data-size'), 10) || 0) <= nextSize; });
      msg = isLast
        ? 'Upgrade to ' + nextSize + ' cakes for the best value.'
        : 'Add ' + (nextSize - state.size) + ' more and save — switch to a ' + nextSize + '-cake box.';
    } else {
      target = null;
    }
    if (target) {
      elUpsell.hidden = false;
      elUpsell.innerHTML = '<span></span><button type="button"></button>';
      elUpsell.querySelector('span').textContent = msg;
      elUpsell.querySelector('button').textContent = 'Switch to ' + nextSize;
      elUpsell.querySelector('button').onclick = function () { selectSize(target); };
    } else {
      elUpsell.hidden = true;
    }
  }

  /* ---- render ---- */

  function refresh(landing) {
    var total = totalQty();
    renderTray(typeof landing === 'number' ? landing : -1);
    flavorEls.forEach(function (el) { el._sync(); });
    if (elSelected) elSelected.textContent = total;
    if (elTotal) elTotal.textContent = state.size || 0;
    if (elBar) elBar.style.width = (state.size ? Math.min(100, (total / state.size) * 100) : 0) + '%';

    if (elCtaTotal) elCtaTotal.textContent = state.size ? money(state.price) : '';
    if (elCtaPer) {
      var per = state.size ? money(state.price / state.size) + '/cake' : '';
      // The subscription discount lives on the selling plan, so the real total is
      // computed by Shopify at checkout. Don't state a discounted number we'd be
      // guessing at — say where the saving comes from instead.
      elCtaPer.textContent = subscribing() && per ? per + ' · subscription savings applied at checkout' : per;
    }

    var ready = state.size > 0 && total === state.size;
    elAdd.disabled = !ready;
    if (state.size === 0) { elAdd.textContent = 'Choose a box to start'; }
    else if (total < state.size) { var left = state.size - total; elAdd.textContent = 'Pick ' + left + ' more cake' + (left === 1 ? '' : 's'); }
    else if (total > state.size) { elAdd.textContent = 'Remove ' + (total - state.size); }
    else { elAdd.textContent = subscribing() ? 'Subscribe — add box to cart' : 'Add box to cart'; }

    upsell();
  }

  /* ---- step 4: cart ---- */

  elAdd.addEventListener('click', addToCart);

  // Box-product mode: the variant for the current size, set in Liquid on the size
  // buttons (curated boxes resolve through the same buttons by size).
  function boxVariant() {
    var btn = sizeBtns.filter(function (b) { return (parseInt(b.getAttribute('data-size'), 10) || 0) === state.size; })[0];
    var v = btn ? btn.getAttribute('data-box-variant') : '';
    return /^\d+$/.test(v || '') ? v : null;
  }

  function addToCart() {
    if (elAdd.disabled) return;
    var items = [], missing = false, boxId = 'box-' + Date.now();
    var plan = planId();

    if (root.hasAttribute('data-pd-box-product')) {
      var bv = boxVariant();
      if (!bv) {
        elNote.textContent = 'The ' + state.size + '-cake box is not available right now.';
        return;
      }
      var mix = flavorEls.filter(function (el) { return state.sel[el.getAttribute('data-flavor')] > 0; })
        .map(function (el) { return el.getAttribute('data-name') + ' \u00d7 ' + state.sel[el.getAttribute('data-flavor')]; });
      var boxItem = { id: parseInt(bv, 10), quantity: 1, properties: { 'Flavors': mix.join(', '), _box_id: boxId } };
      if (plan) boxItem.selling_plan = parseInt(plan, 10);
      return post([boxItem]);
    }

    flavorEls.forEach(function (el) {
      var q = state.sel[el.getAttribute('data-flavor')];
      if (!q) return;
      var vid = el.getAttribute('data-variant');
      if (!vid || vid === '') { missing = true; return; }
      var item = {
        id: parseInt(vid, 10),
        quantity: q,
        properties: { _box_id: boxId, 'Box': state.size + '-cake box' }
      };
      if (plan) item.selling_plan = parseInt(plan, 10);
      items.push(item);
    });

    if (missing || !items.length) {
      elNote.textContent = 'Preview mode: connect each flavor to a product (ticket T3) and set box pricing to enable checkout. Your ' + state.size + '-cake selection is valid.';
      return;
    }

    post(items);
  }

  function post(items) {
    var label = elAdd.textContent;
    elAdd.disabled = true; elAdd.textContent = 'Adding…';
    fetch((window.routes && window.routes.cart_add_url ? window.routes.cart_add_url : '/cart/add') + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: items })
    }).then(function (r) { if (!r.ok) throw r; return r.json(); }).then(function () {
      window.location.href = (window.routes && window.routes.cart_url) ? window.routes.cart_url : '/cart';
    }).catch(function () {
      elAdd.disabled = false; elAdd.textContent = label;
      elNote.textContent = 'Something went wrong adding to cart. Please try again.';
    });
  }

  if (desk.matches) openMore();
  var onDesk = function () { if (desk.matches) openMore(); refresh(); };
  if (desk.addEventListener) desk.addEventListener('change', onDesk); else if (desk.addListener) desk.addListener(onDesk);

  // Initialise from the size marked selected in Liquid (if any).
  var preselected = sizeBtns.filter(function (b) { return b.getAttribute('aria-checked') === 'true'; })[0];
  if (preselected) selectSize(preselected); else refresh();
})();
