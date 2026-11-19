/* Rotates the announcement claims and flags the nav once the page is scrolled. */
(function () {
  if (window.__pdHeader) return;
  window.__pdHeader = true;

  function init() {
    var bar = document.querySelector('[data-pd-announce]');
    if (bar) {
      var items = bar.querySelectorAll('.pd-announce__track');
      if (items.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        var i = 0;
        setInterval(function () {
          items[i].hidden = true;
          i = (i + 1) % items.length;
          items[i].hidden = false;
        }, 4200);
      }
    }

    var nav = document.querySelector('[data-pd-nav]');
    if (nav) {
      var onScroll = function () {
        nav.dataset.stuck = window.scrollY > 8 ? 'true' : 'false';
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Phone/tablet menu panel. It opens just under the bar wherever the bar sits
    // (the announcement strip may still be on screen at the top of the page).
    var toggle = document.querySelector('[data-pd-menu-toggle]');
    var menu = document.querySelector('[data-pd-menu]');
    if (toggle && menu && !toggle.dataset.pdBound) {
      toggle.dataset.pdBound = '1';
      var setOpen = function (open) {
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.documentElement.classList.toggle('pd-menu-open', open);
        if (open) {
          var bar = nav || toggle;
          menu.style.top = Math.max(0, Math.round(bar.getBoundingClientRect().bottom)) + 'px';
          menu.hidden = false;
          requestAnimationFrame(function () { menu.classList.add('is-open'); });
        } else {
          menu.classList.remove('is-open');
          menu.hidden = true;
        }
      };
      toggle.addEventListener('click', function () {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
      });
      // Any link closes it, including same-page anchors like /#box.
      menu.addEventListener('click', function (e) {
        if (e.target.closest('a')) setOpen(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
          setOpen(false);
          toggle.focus();
        }
      });
      var wide = window.matchMedia('(min-width: 961px)');
      var onWide = function (e) { if (e.matches) setOpen(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide);
    }
  }

  /* The "Cart (n)" count is rendered by the server. When Safari brings a page back from
     its back/forward cache, or the tab is shown again, that number can be old: add to
     cart, press Back, and the product page still said Cart (1) with 2 in the cart
     (mobile audit 2026-11-18). Ask /cart.js for the real count in those cases only. */
  var refreshing = false;
  function refreshCount() {
    if (refreshing || !document.querySelector('.pd-nav__count')) return;
    refreshing = true;
    fetch((window.Shopify && Shopify.routes ? Shopify.routes.root : '/') + 'cart.js', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) {
        if (!c || typeof c.item_count !== 'number') return;
        document.querySelectorAll('.pd-nav__count').forEach(function (el) {
          if (el.textContent.trim() !== String(c.item_count)) el.textContent = c.item_count;
        });
        document.querySelectorAll('.pd-nav__cart').forEach(function (el) {
          el.setAttribute('aria-label', 'Open cart, ' + c.item_count + ' items');
        });
      })
      .catch(function () {})
      .then(function () { refreshing = false; });
  }
  function cameBack() {
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    return !!(nav && nav.type === 'back_forward');
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted || cameBack()) refreshCount(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') refreshCount(); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
  document.addEventListener('shopify:section:load', init);
})();
