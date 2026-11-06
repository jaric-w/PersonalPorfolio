/* ==========================================================================
   TV core — shared by every page
   - StaticNoise: draws animated TV static onto a <canvas>
   - Channel switching: links with [data-tune] flash static, then navigate
   - OSD: the green "CH 02" readout in the corner
   - Remote: number keys 0–4 change channel, "m" opens the channel guide
   ========================================================================== */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* Channel lineup — rename / add channels here (keep `href` = the file name). */
  var CHANNELS = [
    { num: '00', key: '0', name: 'Welcome',       href: 'index.html' },
    { num: '01', key: '1', name: 'Achievements',  href: 'achievements.html' },
    { num: '02', key: '2', name: 'Projects',      href: 'projects.html' },
    { num: '03', key: '3', name: 'Experience',    href: 'experience.html' },
    { num: '04', key: '4', name: 'Story',         href: 'story.html' },
    { num: 'MENU', key: 'm', name: 'Channel guide', href: 'menu.html' }
  ];

  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    remove: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };

  function fileOf(href) {
    var a = document.createElement('a');
    a.href = href;
    return a.pathname.split('/').pop() || 'index.html';
  }

  function channelFor(href) {
    var file = fileOf(href);
    for (var i = 0; i < CHANNELS.length; i++) {
      if (CHANNELS[i].href === file) return CHANNELS[i];
    }
    return null;
  }

  function currentChannel() { return channelFor(location.href); }

  /* ------------------------------------------------------------------ */
  /* Static noise                                                        */
  /* ------------------------------------------------------------------ */

  function StaticNoise(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = opts.scale || 0.5;   // render resolution vs. CSS pixels
    this.frameMs = 1000 / (opts.fps || 30);
    this.running = false;
    this.seed = ((Math.random() * 0xffffffff) | 0) || 1;
    this.raf = 0;
    this.last = 0;
    this.tick = this.tick.bind(this);
    this.resize = this.resize.bind(this);
  }

  StaticNoise.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    var w = Math.max(64, Math.round(r.width * this.scale));
    var h = Math.max(48, Math.round(r.height * this.scale));
    if (w === this.w && h === this.h) return;
    this.w = this.canvas.width = w;
    this.h = this.canvas.height = h;
    this.img = this.ctx.createImageData(w, h);
    this.buf = new Uint32Array(this.img.data.buffer);
  };

  StaticNoise.prototype.draw = function (t) {
    var w = this.w, h = this.h, buf = this.buf, s = this.seed;
    // a darker band that slowly rolls down the picture
    var bandH = h * 0.16;
    var bandY = ((t * 0.11) % (h + bandH * 2)) - bandH;

    for (var y = 0, i = 0; y < h; y++) {
      var d = Math.abs(y - bandY);
      var k = d < bandH ? 0.5 + 0.5 * (d / bandH) : 1;
      k *= 0.78 + Math.random() * 0.36;               // per-line shimmer
      var lift = Math.random() < 0.015 ? 70 : 0;       // occasional bright streak
      for (var x = 0; x < w; x++) {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;      // xorshift32
        var v = ((s & 255) * k + lift) | 0;
        if (v > 255) v = 255;
        buf[i++] = 0xff000000 | (v << 16) | (v << 8) | v;
      }
    }
    this.seed = s;
    this.ctx.putImageData(this.img, 0, 0);
  };

  StaticNoise.prototype.tick = function (t) {
    if (!this.running) return;
    if (t - this.last >= this.frameMs) {
      this.last = t;
      this.draw(t);
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  StaticNoise.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this.resize();
    this.draw(performance.now());
    window.addEventListener('resize', this.resize);
    this.raf = requestAnimationFrame(this.tick);
  };

  StaticNoise.prototype.stop = function () {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
  };

  /* ------------------------------------------------------------------ */
  /* On-screen display                                                   */
  /* ------------------------------------------------------------------ */

  var osdTimer = 0;

  function showOSD(ch, ms) {
    var el = document.querySelector('.osd');
    if (!el || !ch) return;
    el.textContent = '';
    var num = document.createElement('span');
    num.className = 'osd__num';
    num.textContent = ch.num === 'MENU' ? 'MENU' : 'CH ' + ch.num;
    var name = document.createElement('span');
    name.className = 'osd__name';
    name.textContent = ch.name;
    el.appendChild(num);
    el.appendChild(name);
    el.classList.add('is-visible');
    html.classList.add('osd-on');
    clearTimeout(osdTimer);
    if (ms !== Infinity) osdTimer = setTimeout(hideOSD, ms || 2600);
  }

  function hideOSD() {
    var el = document.querySelector('.osd');
    if (el) el.classList.remove('is-visible');
    html.classList.remove('osd-on');
  }

  /* ------------------------------------------------------------------ */
  /* Switching channels                                                  */
  /* ------------------------------------------------------------------ */

  var switchNoise = null;
  var tuning = false;

  function getSwitchNoise() {
    if (!switchNoise) {
      var c = document.querySelector('.tv-static');
      if (c) switchNoise = new StaticNoise(c, { scale: 0.5 });
    }
    return switchNoise;
  }

  function turnOn() {
    if (html.classList.contains('is-on')) return;
    html.classList.add('is-on');
    document.dispatchEvent(new CustomEvent('tv:on'));
  }

  function tuneTo(href) {
    if (tuning) return;
    var cur = currentChannel();
    var next = channelFor(href);
    if (cur && next && cur === next) { showOSD(cur); return; }
    tuning = true;
    store.set('tv:switch', '1');
    if (next) showOSD(next, Infinity);
    var noise = getSwitchNoise();
    if (noise && !reduce) noise.start();
    html.classList.add('tv-leaving');
    setTimeout(function () { location.href = href; }, reduce ? 180 : 460);
  }

  /* A page that was reached by changing channel (or any non-home page)
     starts covered in static, then the picture comes in. */
  function arrive() {
    store.remove('tv:switch');
    var noise = getSwitchNoise();
    if (noise && !reduce) noise.start();
    setTimeout(function () {
      html.classList.remove('tv-incoming');
      turnOn();
      showOSD(currentChannel());
      setTimeout(function () { if (noise) noise.stop(); }, 650);
    }, reduce ? 60 : 420);
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[data-tune]') : null;
    if (!a || (a.target && a.target !== '_self')) return;
    e.preventDefault();
    tuneTo(a.getAttribute('href'));
  });

  /* The remote: 0–4 change channel, m = menu */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (html.classList.contains('tv-booting')) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var key = (e.key || '').toLowerCase();
    for (var i = 0; i < CHANNELS.length; i++) {
      if (CHANNELS[i].key === key) { tuneTo(CHANNELS[i].href); return; }
    }
  });

  /* Coming back with the browser's Back button can restore a frozen page
     that is still showing static — tune it back in. */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    tuning = false;
    html.classList.remove('tv-leaving');
    html.classList.add('tv-incoming');
    hideOSD();
    arrive();
  });

  function init() {
    if (html.classList.contains('tv-incoming')) arrive();
    else if (!html.classList.contains('tv-booting')) turnOn();
    // .tv-booting pages (home) are switched on by boot.js when the intro ends
  }

  window.TV = {
    reduce: reduce,
    CHANNELS: CHANNELS,
    StaticNoise: StaticNoise,
    showOSD: showOSD,
    hideOSD: hideOSD,
    tuneTo: tuneTo,
    turnOn: turnOn,
    store: store,
    channelFor: channelFor,
    currentChannel: currentChannel
  };

  init();
})();
