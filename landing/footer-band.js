// Footer band: Numen's things in a row (the mark, a parabola, an abacus, dividers, pi, Durer's solid), cut like a line
// engraving in plain 2D canvas. Faint rules run across the band; inside the glyphs they thicken, and thicken again on
// the edge facing away from the light, so the glyphs look cut into the page. Drawn once per size and theme.
// ponytail: was a WebGL shader with a drifting light; it rendered as a black box on iPhone, so it is static now.
(function () {
  var band = document.querySelector('.word-band'), canvas = band && band.querySelector('canvas');
  if (!canvas) return;

  var mark = new Image(), tints = {};
  mark.src = 'mark.svg';

  // Each glyph is drawn white on a 100 unit square.
  var GLYPHS = [
    function (c) { // the mark itself: plus, times, equals
      if (!mark.complete || !mark.naturalWidth) return;
      var key = c.fillStyle;
      if (!tints[key]) {
        var t = document.createElement('canvas'); t.width = t.height = 400;
        var tc = t.getContext('2d'); tc.drawImage(mark, 0, 0, 400, 400);
        tc.globalCompositeOperation = 'source-in'; tc.fillStyle = key; tc.fillRect(0, 0, 400, 400);
        tints[key] = t;
      }
      c.drawImage(tints[key], -6, -6, 112, 112);
    },
    function (c) { // a parabola on its axes
      c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(14, 78); c.lineTo(86, 78); c.moveTo(50, 14); c.lineTo(50, 86); c.stroke();
      c.lineWidth = 8; c.beginPath();
      for (var x = -1; x <= 1.001; x += 0.05) { var px = 50 + x * 32, py = 76 - (1 - x * x) * 54; x === -1 ? c.moveTo(px, py) : c.lineTo(px, py); }
      c.stroke();
    },
    function (c) { // abacus
      c.lineWidth = 6; c.strokeRect(16, 18, 68, 64);
      c.lineWidth = 3; for (var r = 0; r < 4; r++) { c.beginPath(); c.moveTo(19, 32 + r * 12); c.lineTo(81, 32 + r * 12); c.stroke(); }
      [[2, 3], [1, 4], [3, 1], [2, 2]].forEach(function (row, r) {
        for (var i = 0; i < row[0]; i++) { c.beginPath(); c.ellipse(26 + i * 9, 32 + r * 12, 4.5, 5, 0, 0, 7); c.fill(); }
        for (var j = 0; j < row[1]; j++) { c.beginPath(); c.ellipse(74 - j * 9, 32 + r * 12, 4.5, 5, 0, 0, 7); c.fill(); }
      });
    },
    function (c) { // dividers, Euclid's compass
      c.lineWidth = 7; c.lineCap = 'round';
      c.beginPath(); c.moveTo(50, 22); c.lineTo(26, 86); c.moveTo(50, 22); c.lineTo(74, 86); c.stroke();
      c.beginPath(); c.arc(50, 18, 8, 0, 7); c.fill();
      c.lineWidth = 4; c.beginPath(); c.arc(50, 22, 44, 1.2, 1.94); c.stroke();
    },
    function (c) { // pi
      c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(18, 30); c.quadraticCurveTo(24, 22, 36, 24); c.lineTo(84, 24); c.stroke();
      c.beginPath(); c.moveTo(40, 26); c.quadraticCurveTo(38, 60, 26, 82); c.stroke();
      c.beginPath(); c.moveTo(66, 26); c.lineTo(66, 72); c.quadraticCurveTo(66, 84, 80, 80); c.stroke();
    },
    function (c) { // Durer's solid from Melencolia I, as a cut polyhedron
      c.beginPath(); c.moveTo(50, 12); c.lineTo(82, 30); c.lineTo(82, 66); c.lineTo(50, 88); c.lineTo(18, 66); c.lineTo(18, 30); c.closePath(); c.fill();
      c.globalCompositeOperation = 'destination-out'; c.lineWidth = 3.5; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(18, 30); c.lineTo(50, 46); c.lineTo(82, 30); c.moveTo(50, 46); c.lineTo(50, 88); c.stroke();
      c.globalCompositeOperation = 'source-over';
    }
  ];
  // Lays the glyphs out evenly across a w by h 2D context, in the given colour: one row, or two on a narrow band.
  function grid(w, h) {
    var n = GLYPHS.length, rows = w < h * 3 ? 2 : 1, per = Math.ceil(n / rows);
    return { rows: rows, per: per, cell: Math.min(h / rows * 0.86, w / per) };
  }
  function paint(c, w, h, colour) {
    var g = grid(w, h), gap = (w - g.cell * g.per) / g.per, rowH = h / g.rows;
    GLYPHS.forEach(function (draw, i) {
      var col = i % g.per, row = Math.floor(i / g.per);
      c.save(); c.translate(gap / 2 + col * (g.cell + gap), row * rowH + (rowH - g.cell) / 2 + rowH * 0.04); c.scale(g.cell / 100, g.cell / 100);
      c.fillStyle = c.strokeStyle = colour; draw(c); c.restore();
    });
  }

  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  function layer(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // Horizontal rules `t` px thick, one every `pitch` px, kept only where `mask` is drawn (everywhere when null).
  function rules(w, h, pitch, t, colour, mask) {
    var c = layer(w, h), x = c.getContext('2d');
    x.fillStyle = colour;
    for (var y = 0; y < h; y += pitch) x.fillRect(0, Math.round(y + (pitch - t) / 2), w, Math.max(1, Math.round(t)));
    if (mask) { x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0); }
    return c;
  }
  var drawnW = 0;
  function draw() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    drawnW = w; canvas.width = w; canvas.height = h;
    var colour = getComputedStyle(band).color, pitch = Math.min(5 * dpr, Math.max(3 * dpr, grid(w, h).cell / 22)), s = Math.max(2, h * 0.014);
    var glyphs = layer(w, h); paint(glyphs.getContext('2d'), w, h, '#fff');
    // the shadow side: glyph pixels whose neighbour down and right is outside the glyph (light from the top left)
    var shade = layer(w, h), sc = shade.getContext('2d');
    sc.drawImage(glyphs, 0, 0); sc.globalCompositeOperation = 'destination-out'; sc.drawImage(glyphs, -s, -s);
    ctx.globalAlpha = 0.28; ctx.drawImage(rules(w, h, pitch, dpr * 0.75, colour, null), 0, 0);
    ctx.globalAlpha = 1; ctx.drawImage(rules(w, h, pitch, pitch * 0.32, colour, glyphs), 0, 0);
    ctx.drawImage(rules(w, h, pitch, pitch * 0.6, colour, shade), 0, 0);
    // fade out toward the legal line
    var g = ctx.createLinearGradient(0, h * 0.88, 0, h);
    g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
  band.classList.add('live');
  draw();
  mark.addEventListener('load', draw);
  // iOS fires resize as the toolbar slides; only a width change needs a redraw
  window.addEventListener('resize', function () { if (Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)) !== drawnW) draw(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
})();
