/* Shared mockup helpers: inline the wordmark, reveal-on-scroll, counters. */
(function () {
  /* The still renderer calls this so every reveal/counter is in its final state. */
  var observers = []
  window.__revealAll = function () {
    observers.forEach(function (o) { o.disconnect() })   /* no count-up may start after this */
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in') })
    document.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || '') })
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-wordmark]').forEach(function (el) { el.innerHTML = window.PD_WORDMARK })

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })
    document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el) })

    /* data-count="150" counts up once visible; keeps suffix text in data-suffix */
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return
        co.unobserve(e.target)
        var el = e.target, to = parseFloat(el.getAttribute('data-count')), dec = (String(to).split('.')[1] || '').length
        var suf = el.getAttribute('data-suffix') || '', t0 = performance.now(), dur = 900
        function tick (t) {
          var p = Math.min(1, (t - t0) / dur); p = 1 - Math.pow(1 - p, 3)
          el.textContent = (to * p).toFixed(dec) + suf
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
    }, { threshold: 0.4 })
    document.querySelectorAll('[data-count]').forEach(function (el) { co.observe(el) })
    observers.push(io, co)
  })
})()
