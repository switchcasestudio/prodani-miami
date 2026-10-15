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
    var svg = el.querySelector('svg');
    var phrase = tracks[0].textContent;
    var SEP = ' · ';        // the snippet's no-break " · "
    var desktop = window.matchMedia('(min-width: 750px)');
    /* Desktop cap (Moses 2026-10-14: the hero ribbon read too big on wide screens).
       One copy of the phrase always spans one path, and the path spans the screen,
       so the type grows with the window: ~29px at 1440, ~41px at 2000. A smaller
       font alone would leave a gap at the seam, so above the cap the list of
       claims continues until the type is back at the cap. Phones keep the
       1.8x ribbon from prodani-marquee.css untouched. */
    var CAP_PX = 26;
    function measure(str) {
      var probe = text.cloneNode(false);
      probe.textContent = str;
      probe.setAttribute('visibility', 'hidden');
      text.parentNode.appendChild(probe);
      // Safari's getComputedTextLength leaves out letter-spacing (the ribbon's 0.08em
      // is ~4 letters' worth across the string); the bbox includes it. Take the larger,
      // plus 1% so the two copies meet with a hair of air instead of overlapping.
      var natural = Math.max(probe.getComputedTextLength(), probe.getBBox().width) * 1.01;
      var size = parseFloat(getComputedStyle(probe).fontSize);
      probe.parentNode.removeChild(probe);
      return { natural: natural, size: size };
    }
    function setText(str) {
      for (var i = 0; i < tracks.length; i++) tracks[i].textContent = str;
    }
    function fit() {
      if (!path || !path.getTotalLength || !text) return;
      text.style.fontSize = '';
      setText(phrase);
      var m = measure(phrase);
      var pathLen = path.getTotalLength();
      if (!m.size) return;
      var fitted = m.natural > pathLen ? m.size * pathLen / m.natural : m.size;
      var vb = svg && svg.viewBox && svg.viewBox.baseVal;
      var shown = svg ? svg.getBoundingClientRect().width : 0;
      var cap = (desktop.matches && vb && vb.width && shown) ? CAP_PX * vb.width / shown : Infinity;
      // Keep adding claims until the fitted size is at or
      // just under the cap (4% grace keeps a near miss from losing a whole size
      // step to one extra claim). Separators stay
      // the snippet's own, so it reads like the flavours ribbon; widening them
      // instead left big holes between claims (Moses: "spacing is weird").
      var items = phrase.split(SEP).filter(function (s) { return s.trim(); });
      // Extras go in a stride-2 order (B D A C E for five claims), not A B C …:
      // continuing the list put "high protein · no sugar added" twice in a row
      // either side of the seam. Under three claims, whole copies only.
      var n = items.length, order = [];
      for (var o = 1; o < n; o += 2) order.push(o);
      for (o = 0; o < n; o += 2) order.push(o);
      if (n < 3) order = items.map(function (_, k) { return k; });
      // A run is usable only if, read round the loop, no claim comes back within
      // two places ("no sugar added · high protein · no sugar added" read as a
      // stutter); with fewer than five claims that is impossible, so only
      // adjacency is checked there.
      function spaced(seq) {
        var L = seq.length, need = n >= 5 ? 3 : 2;
        for (var a = 0; a < L; a++)
          for (var d = 1; d < need; d++)
            if (seq[a] === seq[(a + d) % L]) return false;
        return true;
      }
      var limit = cap * 1.04;
      var best = { str: phrase, font: fitted }, str = phrase, seq = items.map(function (_, k) { return k; });
      for (var i = 0; best.font > limit && n > 1 && i < 60; i++) {
        var idx = order[i % n];
        str += items[idx] + SEP;
        seq.push(idx);
        if (n < 3 ? (i + 1) % n : !spaced(seq)) continue;
        best = { str: str, font: m.size * pathLen / measure(str).natural };
      }
      setText(best.str);
      if (best.font < m.size) text.style.fontSize = best.font.toFixed(2) + 'px';
    }
    fit();
    // Konnect lands after first paint; refit against real metrics once it does.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit).catch(function () {});
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fit, 150);
    });

    var seconds = parseFloat(el.dataset.speed) || 26;
    // Phones draw the ribbon 1.8x wide (prodani-marquee.css); slow it to match.
    if (window.matchMedia('(max-width: 749px)').matches) seconds *= 1.8;
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
