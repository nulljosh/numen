// Hero wall: Numen sheets on the real parser (parse.js). Each sheet types its three linked cells, then changes the
// first number and the chain recomputes, the way the app does.
(function () {
  var wall = document.getElementById('nwall'); if (!wall || typeof parse !== 'function') return;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var n = innerWidth <= 560 ? 3 : innerWidth <= 900 ? 6 : 9;
  var SHEETS = [
    [['rent', '1200 * 12', '1450 * 12'], ['what I could save', '@1 * 0.3'], ['left over each month', '@2 / 12']],
    [['pizza', '18.50', '24'], ['tip', '@1 * 0.18'], ['each of three', '(@1 + @2) / 3']],
    [['km this week', '42', '57'], ['litres', '@1 * 7.8 / 100'], ['fuel cost', '@2 * 1.89']],
    [['hours', '37.5', '44'], ['pay', '@1 * 28'], ['after tax', '@2 * (1 - 0.24)']],
    [['circle radius', '3', '5'], ['area', 'pi * @1 ^ 2'], ['circumference', '2 * pi * @1']],
    [['loan', '25000', '18000'], ['interest', '@1 * 0.065'], ['per month', '(@1 + @2) / 60']],
    [['flour g', '500', '750'], ['water g', '@1 * 0.7'], ['salt g', '@1 * 0.02']],
    [['coffee a day', '4.75', '6.25'], ['a year', '@1 * 365'], ['in ten years', '@2 * 10']],
    [['angle', '30', '45'], ['radians', '@1 * pi / 180'], ['sine', 'sin(@2)']]
  ];
  var el = function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, still ? 0 : ms); }); };
  var fmt = function (v) { return Number.isFinite(v) ? String(+v.toFixed(4)) : ''; };
  for (var i = 0; i < n; i++) (function (i) {
    var sh = SHEETS[i % SHEETS.length], box = wall.appendChild(el('div', 'ns'));
    var cells = sh.map(function (c, j) {
      var chip = box.appendChild(el('div', 'chip' + (j ? ' dep' : ''))), l = chip.appendChild(el('span'));
      l.appendChild(el('span', 'lbl', c[0])); var ex = l.appendChild(el('span', 'ex')); var v = chip.appendChild(el('span', 'val'));
      return { ex: ex, v: v, src: c[1], alt: c[2] };
    });
    function compute(flash) {
      var vals = {};
      cells.forEach(function (c, j) {
        var out = '';
        try { vals[j + 1] = evalAst(parse(c.ex.textContent), function (id) { return vals[id]; }); out = fmt(vals[j + 1]); } catch (e) {}
        if (out !== c.v.textContent) { c.v.textContent = out; if (flash && out) { c.v.classList.remove('hit'); void c.v.offsetWidth; c.v.classList.add('hit'); } }
      });
    }
    function type(c, s) { // character by character; the value appears once the line parses
      return s.split('').reduce(function (q, ch, k) { return q.then(function () { c.ex.textContent = s.slice(0, k + 1); compute(false); return wait(55); }); }, Promise.resolve());
    }
    function run() {
      cells.forEach(function (c) { c.ex.textContent = ''; c.v.textContent = ''; });
      if (still) { cells.forEach(function (c) { c.ex.textContent = c.src; }); compute(false); return Promise.resolve(); }
      return cells.reduce(function (q, c) { return q.then(function () { return type(c, c.src).then(function () { return wait(350); }); }); }, wait(200))
        .then(function () { return wait(1800); })
        .then(function () { cells[0].ex.textContent = cells[0].alt; compute(true); return wait(4200); });
    }
    if (still) run(); else wait(i * 300).then(function loop() { return run().then(loop); });
  })(i);
})();

// Hero parallax: the wall drifts at 0.45, the copy lifts at 0.2 and fades. Off under reduced motion.
(function () {
  var bg = document.querySelector('.hero-bg'), copy = document.querySelector('.hero-copy');
  if (!bg || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var t = 0;
  addEventListener('scroll', function () {
    if (t) return;
    t = requestAnimationFrame(function () {
      t = 0; var y = scrollY, h = innerHeight; if (y > h * 1.2) return;
      bg.style.setProperty('--py', (y * .45) + 'px');
      copy.style.transform = 'translate3d(0,' + (y * .2) + 'px,0)'; copy.style.opacity = Math.max(0, 1 - y / (h * .7));
    });
  }, { passive: true });
})();
