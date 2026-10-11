/* Scrolls the ribbon text along its path. The prototype used GSAP; a themed
   storefront should not pay 70KB for one loop, so this is a plain rAF driver.
   Two textPaths offset by 100% keep the seam invisible. Honours reduced motion. */
(function () {
  if (window.__pdMarquee) return;
  window.__pdMarquee = true;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function start(el) {
    if (el.dataset.pdRunning) return;
    el.dataset.pdRunning = '1';
    var tracks = el.querySelectorAll('[data-pd-track]');
    if (!tracks.length || reduce) return;

    /* Fit the text to the path. Without this the string overruns the path length
       and the two copies collide into each other — which is exactly the doubled,
       overlapping lettering the first build showed.
       Fitted by shrinking the font, not with textLength + lengthAdjust: iOS Safari
       mis-places glyphs when it squeezes text on a textPath, and the ribbon read as
       scrambled letters on every iPhone (the bumped mobile font size is what made it
       overrun). The natural width is measured off-path, on a throwaway <text>, so it
       doesn't depend on how each engine counts glyphs that fall past the path's end. */
    var path = el.querySelector('defs path');
    var text = el.querySelector('text');
    function fit() {
      if (!path || !path.getTotalLength || !text) return;
      text.style.fontSize = '';
      var probe = text.cloneNode(false);
      probe.textContent = tracks[0].textContent;
      probe.setAttribute('visibility', 'hidden');
      text.parentNode.appendChild(probe);
      // Safari's getComputedTextLength leaves out letter-spacing (the ribbon's 0.08em
      // is ~4 letters' worth across the string); the bbox includes it. Take the larger,
      // plus 1% so the two copies meet with a hair of air instead of overlapping.
      var natural = Math.max(probe.getComputedTextLength(), probe.getBBox().width) * 1.01;
      var size = parseFloat(getComputedStyle(probe).fontSize);
      probe.parentNode.removeChild(probe);
      var pathLen = path.getTotalLength();
      if (natural > pathLen && size) {
        text.style.fontSize = (size * pathLen / natural).toFixed(2) + 'px';
      }
    }
    fit();
    // Konnect lands after first paint; refit against real metrics once it does.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit).catch(function () {});

    var seconds = parseFloat(el.dataset.speed) || 26;
    var last = null;
    var offset = 0;                       // 0 → 100 over `seconds`

    function frame(now) {
      if (last !== null) {
        offset += ((now - last) / 1000) * (100 / seconds);
        if (offset >= 100) offset -= 100;
        for (var i = 0; i < tracks.length; i++) {
          tracks[i].setAttribute('startOffset', (offset - i * 100) + '%');
        }
      }
      last = now;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function init() {
    document.querySelectorAll('[data-pd-marquee]').forEach(start);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
  // Theme editor re-renders sections without a page load.
  document.addEventListener('shopify:section:load', init);
})();
