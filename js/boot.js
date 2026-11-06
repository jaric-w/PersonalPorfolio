/* ==========================================================================
   Boot sequence (home page). Runs when the visitor opens the link fresh;
   arriving here by changing channel skips straight to the picture.
   Click, tap or press any key to skip.
   ========================================================================== */
(function () {
  'use strict';

  var html = document.documentElement;
  var boot = document.getElementById('boot');
  var TV = window.TV;
  if (!boot) return;
  if (!html.classList.contains('tv-booting') || !TV) { boot.remove(); return; }

  var noise = new TV.StaticNoise(boot.querySelector('.boot__static'), { scale: 0.5 });
  var fill = boot.querySelector('.standby__fill');
  var pct = boot.querySelector('.standby__pct');
  var timers = [];
  var raf = 0;
  var finished = false;

  function stage(name) { boot.setAttribute('data-stage', name); }
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }

  /* Signal meter: eases to 100% but moves in uneven jumps, like a tuner */
  function load(duration) {
    var start = performance.now();
    var shown = 0;
    function tick(now) {
      var p = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - p, 2.1);
      if (eased - shown > 0.035 + Math.random() * 0.09 || p === 1) shown = eased;
      fill.style.width = (shown * 100).toFixed(1) + '%';
      pct.textContent = 'SIGNAL ' + ('00' + Math.round(shown * 100)).slice(-3) + '%';
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey, true);
    stage('done');
    html.classList.remove('tv-booting');
    TV.turnOn();
    TV.showOSD(TV.currentChannel());
    setTimeout(function () { noise.stop(); boot.remove(); }, 600);
  }

  function onKey(e) {
    if (e.key === 'Tab' || e.key === 'Shift' || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    finish();
  }

  boot.addEventListener('click', finish);
  document.addEventListener('keydown', onKey, true);

  if (TV.reduce) {
    // no flashing / static — just the stand-by card, briefly
    stage('bars');
    load(1400);
    at(1700, finish);
    return;
  }

  stage('off');
  at(350,  function () { stage('power'); });
  at(850,  function () { stage('static'); noise.start(); });
  at(2650, function () { stage('bars'); load(2300); });
  at(5050, function () { stage('glitch'); });
  at(5450, finish);
})();
