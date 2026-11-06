/* ==========================================================================
   Landing background: a soft-focus poppy field swaying in the wind.
   Drawn small on a <canvas> and blurred with CSS, so it is cheap to run.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.querySelector('.field');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reduce = !!(window.TV && window.TV.reduce);
  var RES = 0.4;          // render scale — the CSS blur hides the low resolution
  var FRAME_MS = 1000 / 30;

  var W = 0, H = 0, items = [], raf = 0, last = 0, seed = 1;

  function rnd() {        // seeded, so the field looks the same on every visit
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  function pick(list) { return list[(rnd() * list.length) | 0]; }

  var GRASS_FAR  = ['#e6e8c0', '#dfe2b0', '#ebecc9', '#d9dda4'];
  var GRASS_NEAR = ['#c3cd7c', '#b6c36a', '#cdd58c', '#a9b95c', '#d3d995'];
  var POPPY      = ['#ff5a1f', '#ff6b2c', '#f2451a', '#ff7a36', '#ff8a45'];
  var POPPY_FAR  = ['#ff9a6a', '#ffab7e', '#ff8d5c'];

  function build() {
    var rect = canvas.getBoundingClientRect();
    W = canvas.width = Math.max(160, Math.round(rect.width * RES));
    H = canvas.height = Math.max(120, Math.round(rect.height * RES));
    seed = 20260;
    items = [];

    var horizon = H * 0.54;
    var depthSpan = H - horizon;
    var nBlades = Math.round(W * 0.75);
    var nPoppies = Math.round(W * 0.17);
    var nBuds = Math.round(W * 0.12);
    var i, depth;

    for (i = 0; i < nBlades; i++) {
      depth = rnd();
      items.push({
        type: 0,
        depth: depth,
        x: rnd() * W,
        base: H + 4,
        len: depthSpan * (0.12 + depth * 0.55) * (0.6 + rnd() * 0.55),
        w: 0.5 + depth * 1.3,
        color: depth < 0.45 ? pick(GRASS_FAR) : pick(GRASS_NEAR),
        phase: rnd() * Math.PI * 2,
        bend: (rnd() - 0.5) * 0.5
      });
    }

    for (i = 0; i < nPoppies; i++) {
      depth = Math.pow(rnd(), 0.9);
      items.push({
        type: 1,
        depth: depth + 0.02,
        x: rnd() * W,
        y: horizon + depthSpan * (0.0 + depth * 0.72) + (rnd() - 0.5) * 8,
        r: 1.1 + depth * depth * 7.5 + rnd() * 1.4,
        color: depth < 0.35 ? pick(POPPY_FAR) : pick(POPPY),
        stem: depth < 0.4 ? '#b9c47a' : '#7e9638',
        phase: rnd() * Math.PI * 2,
        tilt: (rnd() - 0.5) * 0.8
      });
    }

    for (i = 0; i < nBuds; i++) {       // little dark seed-heads dotted around
      depth = rnd();
      items.push({
        type: 2,
        depth: depth + 0.01,
        x: rnd() * W,
        y: horizon - 6 + depthSpan * (0.05 + depth * 0.7),
        r: 0.5 + depth * 1.6,
        phase: rnd() * Math.PI * 2
      });
    }

    items.sort(function (a, b) { return a.depth - b.depth; });
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    // meadow haze
    var g = ctx.createLinearGradient(0, H * 0.46, 0, H);
    g.addColorStop(0, 'rgba(232, 234, 186, 0)');
    g.addColorStop(0.35, 'rgba(222, 228, 160, .5)');
    g.addColorStop(1, 'rgba(196, 208, 108, .92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.46, W, H * 0.54);

    // slow gusts of wind
    var wind = Math.sin(t * 0.00033) * 0.55 + Math.sin(t * 0.00091 + 1.7) * 0.3 + 0.25;

    ctx.lineCap = 'round';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var sway = wind + Math.sin(t * 0.0017 + it.phase + it.x * 0.02) * 0.35;

      if (it.type === 0) {
        var dx = (sway + it.bend) * it.len * 0.22;
        ctx.strokeStyle = it.color;
        ctx.lineWidth = it.w;
        ctx.beginPath();
        ctx.moveTo(it.x, it.base);
        ctx.quadraticCurveTo(it.x + dx * 0.25, it.base - it.len * 0.55, it.x + dx, it.base - it.len);
        ctx.stroke();
      } else if (it.type === 1) {
        var h = H - it.y;
        var hx = it.x + (sway + it.tilt) * h * 0.12;
        ctx.strokeStyle = it.stem;
        ctx.lineWidth = Math.max(0.6, it.r * 0.22);
        ctx.beginPath();
        ctx.moveTo(it.x, H + 4);
        ctx.quadraticCurveTo(it.x + (hx - it.x) * 0.2, it.y + h * 0.5, hx, it.y);
        ctx.stroke();
        // petals: two overlapping blobs read as a cupped poppy once blurred
        ctx.fillStyle = it.color;
        ctx.beginPath();
        ctx.ellipse(hx, it.y, it.r * 1.15, it.r * 0.85, sway * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.ellipse(hx + it.r * 0.35, it.y - it.r * 0.25, it.r * 0.8, it.r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(70, 92, 40, .55)';
        ctx.beginPath();
        ctx.arc(it.x + sway * 3, it.y, it.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < FRAME_MS) return;
    last = t;
    draw(t);
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      build();
      draw(performance.now());
    }, 120);
  });

  build();
  draw(performance.now());
  if (!reduce) raf = requestAnimationFrame(loop);
})();
