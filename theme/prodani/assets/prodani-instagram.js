/* Instagram feed — fetches a Behold.so JSON feed (free; Behold holds the IG token) and
   renders the latest posts into our own markup. If no feed id is set, or the fetch fails,
   the curated image blocks already in the grid stay as the fallback. No token in the theme. */
(function () {
  document.querySelectorAll('[data-pd-ig-grid]').forEach(function (grid) {
    var feed = (grid.getAttribute('data-feed') || '').trim();
    var count = parseInt(grid.getAttribute('data-count'), 10) || 6;
    if (!feed) return; // keep the curated fallback

    var GLYPH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">' +
      '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/>' +
      '<circle cx="17.5" cy="6.5" r="1"/></svg>';
    var STACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
      '<rect x="7" y="7" width="13" height="13" rx="2.5"/><path d="M4 16V6.5A2.5 2.5 0 0 1 6.5 4H16"/></svg>';
    var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';

    fetch('https://feeds.behold.so/' + feed)
      .then(function (r) { if (!r.ok) throw new Error('feed ' + r.status); return r.json(); })
      .then(function (data) {
        var posts = Array.isArray(data) ? data : (data && data.posts) || [];
        if (!posts.length) return;
        var frag = document.createDocumentFragment();
        posts.slice(0, count).forEach(function (p) {
          var sz = p.sizes || {};
          var img = (sz.medium && sz.medium.mediaUrl) || (sz.small && sz.small.mediaUrl) ||
                    p.thumbnailUrl || p.mediaUrl;
          if (!img) return;
          var a = document.createElement('a');
          a.className = 'pd-ig__item';
          a.href = p.permalink || '#';
          a.target = '_blank'; a.rel = 'noopener';
          var im = document.createElement('img');
          im.className = 'pd-ig__img'; im.loading = 'lazy'; im.decoding = 'async'; im.src = img;
          im.width = 700; im.height = 700;
          // Behold serves square crops at 400/700/1000; let the browser pick for the tile width.
          var set = ['small', 'medium', 'large'].filter(function (k) { return sz[k] && sz[k].mediaUrl; })
            .map(function (k) { return sz[k].mediaUrl + ' ' + sz[k].width + 'w'; });
          if (set.length) { im.srcset = set.join(', '); im.sizes = '(min-width:1181px) 15vw, (min-width:641px) 23vw, 46vw'; }
          // First line of the caption (hashtags already stripped by Behold) is the alt text.
          var cap = (p.prunedCaption || p.caption || '').split('\n')[0].trim();
          im.alt = cap ? cap.slice(0, 120) : 'Prodani on Instagram';
          a.appendChild(im);
          if (p.mediaType === 'CAROUSEL_ALBUM' || p.mediaType === 'VIDEO') {
            var t = document.createElement('span');
            t.className = 'pd-ig__type'; t.setAttribute('aria-hidden', 'true');
            t.innerHTML = p.mediaType === 'VIDEO' ? PLAY : STACK;
            a.appendChild(t);
          }
          var g = document.createElement('span');
          g.className = 'pd-ig__glyph'; g.setAttribute('aria-hidden', 'true'); g.innerHTML = GLYPH;
          a.appendChild(g);
          frag.appendChild(a);
        });
        if (frag.childNodes.length) { grid.innerHTML = ''; grid.appendChild(frag); }
      })
      .catch(function () { /* leave the curated fallback in place */ });
  });
})();
