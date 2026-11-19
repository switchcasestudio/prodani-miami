/* Phone checkout bar on the cart page (see snippets/prodani-cart-bar.liquid). */
(function () {
  var bar = document.querySelector('[data-pd-cart-bar]');
  if (!bar) return;
  document.body.appendChild(bar);   // no transformed ancestor may capture position:fixed

  var footer = document.getElementById('main-cart-footer');
  var totalEl = bar.querySelector('[data-pd-cart-bar-total]');
  var go = bar.querySelector('[data-pd-cart-bar-go]');
  function realBtn() { return document.getElementById('checkout'); }
  function empty() { return !footer || footer.classList.contains('is-empty'); }

  function syncTotal() {
    var v = footer && footer.querySelector('.totals__total-value');
    var t = v ? v.textContent.trim() : '';
    if (t && totalEl.textContent.trim() !== t) totalEl.textContent = t;
    var b = realBtn();
    var dis = !b || b.disabled;
    if (go.disabled !== dis) go.disabled = dis;
  }

  var siteFoot = document.querySelector('.pd-foot');
  function update() {
    var b = realBtn(), show = false;
    if (b && !empty()) {
      var r = b.getBoundingClientRect(), vh = window.innerHeight;
      var btnOn = r.bottom > 0 && r.top < vh;
      var footOn = siteFoot ? siteFoot.getBoundingClientRect().top < vh : false;
      show = !btnOn && !footOn && r.top > 0;   // only while the real button is still below
    }
    if (bar.classList.contains('is-visible') !== show) bar.classList.toggle('is-visible', show);
  }

  go.addEventListener('click', function () { var b = realBtn(); if (b && !b.disabled) b.click(); });

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  if (footer) new MutationObserver(function () { syncTotal(); onScroll(); })
    .observe(footer, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'disabled'] });
  syncTotal();
  update();
})();
