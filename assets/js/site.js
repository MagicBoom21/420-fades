/* 420 Fades Barber Co. — site behaviour. Vanilla, no dependencies. */
(function () {
  'use strict';
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  var lockCount = 0;
  function lock()   { if (++lockCount === 1) document.body.classList.add('is-locked'); }
  function unlock() { if (--lockCount <= 0) { lockCount = 0; document.body.classList.remove('is-locked'); } }

  /* ── focus trap ─────────────────────────────────────── */
  var SEL = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  function trap(box) {
    return function (e) {
      if (e.key !== 'Tab') return;
      var f = $$(SEL, box).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
  }

  /* ── nav: stuck state, scrollspy, drawer ────────────── */
  var nav = $('#nav'), burger = $('#burger'), drawer = $('#drawer');
  var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 24); };
  onScroll(); addEventListener('scroll', onScroll, { passive: true });

  var spy = $$('.nav__links a');
  if ('IntersectionObserver' in window && spy.length) {
    var secs = spy.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        spy.forEach(function (a) { a.classList.toggle('is-here', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }

  var drawerTrap = trap(drawer);
  function setDrawer(on) {
    burger.setAttribute('aria-expanded', String(on));
    burger.setAttribute('aria-label', on ? 'Close menu' : 'Open menu');
    if (on) {
      drawer.hidden = false; lock();
      requestAnimationFrame(function () { drawer.classList.add('is-on'); });
      document.addEventListener('keydown', drawerTrap);
      var f = $(SEL, drawer); if (f) f.focus();
    } else {
      drawer.classList.remove('is-on');
      document.removeEventListener('keydown', drawerTrap);
      setTimeout(function () { drawer.hidden = true; }, 300);
      unlock(); burger.focus();
    }
  }
  burger.addEventListener('click', function () { setDrawer(burger.getAttribute('aria-expanded') !== 'true'); });
  $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });

  /* ── hero video: only where it earns its bandwidth ──── */
  (function () {
    var v = $('#herovid'); if (!v) return;
    var conn = navigator.connection || {};
    if (REDUCED.matches || conn.saveData || /2g/.test(conn.effectiveType || '')) return;
    // Pick by CSS viewport width, not device pixels: the video is a scrimmed
    // background, so a phone gains nothing from the desktop file but pays for it.
    var res = innerWidth >= 900 ? '720' : '480';
    // VP9 where it is supported (smaller and higher fidelity here), H.264 for Safari.
    var vp9 = v.canPlayType('video/webm; codecs="vp9"') === 'probably';
    var start = function () {
      v.src = 'assets/img/hero-' + res + (vp9 ? '.webm' : '.mp4');
      v.addEventListener('canplay', function () {
        var p = v.play();
        if (p && p.then) p.then(function () { v.classList.add('is-on'); }).catch(function () {});
        else v.classList.add('is-on');
      }, { once: true });
      v.load();
    };
    if (document.readyState === 'complete') start();
    else addEventListener('load', start, { once: true });
  })();

  /* ── lazy-play the animated logo videos when in view ── */
  function lazyVid(el, loop) {
    if (!el || REDUCED.matches) return;
    var go = function () {
      el.src = 'assets/img/logovideo.mp4'; el.loop = !!loop;
      el.load(); var p = el.play(); if (p && p.catch) p.catch(function () {});
    };
    if ('IntersectionObserver' in window) {
      var o = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { go(); o.disconnect(); } });
      }, { rootMargin: '160px' });
      o.observe(el);
    } else go();
  }
  lazyVid($('#footlogo'), true);

  /* ── reveal on scroll ───────────────────────────────── */
  (function () {
    var els = $$('.reveal');
    if (REDUCED.matches || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('is-in'); }); return;
    }
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e, i) {
        if (!e.isIntersecting) return;
        var d = Math.min(i * 70, 280);
        setTimeout(function () { e.target.classList.add('is-in'); }, d);
        o.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach(function (e) { o.observe(e); });
  })();

  /* ── slideshow ──────────────────────────────────────── */
  (function () {
    var root = $('[data-slides]'); if (!root) return;
    var slides = $$('[data-slide]', root), dots = $('.slides__dots', root), live = $('[data-live]', root);
    var i = 0, timer = null, paused = REDUCED.matches, DUR = 5200;

    slides.forEach(function (s, n) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Slide ' + (n + 1) + ' of ' + slides.length);
      b.addEventListener('click', function () { go(n); restart(); });
      dots.appendChild(b);
    });
    var dotEls = $$('button', dots);

    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      dotEls.forEach(function (d, k) { d.setAttribute('aria-selected', String(k === i)); });
      if (live) live.textContent = 'Slide ' + (i + 1) + ' of ' + slides.length;
    }
    function tick()    { if (!paused) go(i + 1); }
    function restart() { clearInterval(timer); if (!paused) timer = setInterval(tick, DUR); }

    $('[data-next]', root).addEventListener('click', function () { go(i + 1); restart(); });
    $('[data-prev]', root).addEventListener('click', function () { go(i - 1); restart(); });
    var pb = $('[data-pause]', root);
    pb.addEventListener('click', function () {
      paused = !paused;
      pb.setAttribute('aria-pressed', String(paused));
      pb.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      restart();
    });
    root.addEventListener('mouseenter', function () { clearInterval(timer); });
    root.addEventListener('mouseleave', restart);
    root.addEventListener('focusin',  function () { clearInterval(timer); });
    root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) restart(); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(i + 1); restart(); }
      if (e.key === 'ArrowLeft')  { go(i - 1); restart(); }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearInterval(timer); else restart();
    });
    go(0); restart();
  })();

  /* ── lightbox ───────────────────────────────────────── */
  (function () {
    var lb = $('#lb'); if (!lb) return;
    var cells = $$('.cell'), img = $('#lbImg'), cap = $('#lbCap'), box = $('.lb__box', lb);
    var at = 0, opener = null, tp = trap(box);
    var items = cells.map(function (c) {
      var im = $('img', c);
      return { src: im.getAttribute('src').replace(/-900\.webp$/, '.webp'), alt: im.alt, cap: $('.cell__cap', c).textContent };
    });
    function show(n) {
      at = (n + items.length) % items.length;
      img.src = items[at].src; img.alt = items[at].alt;
      cap.textContent = items[at].cap + '  ·  ' + (at + 1) + '/' + items.length;
    }
    function open(n) {
      opener = document.activeElement; show(n);
      lb.hidden = false; lock();
      requestAnimationFrame(function () { lb.classList.add('is-on'); });
      document.addEventListener('keydown', keys); document.addEventListener('keydown', tp);
      $('.lb__x', lb).focus();
    }
    function close() {
      lb.classList.remove('is-on');
      document.removeEventListener('keydown', keys); document.removeEventListener('keydown', tp);
      setTimeout(function () { lb.hidden = true; img.removeAttribute('src'); }, 300);
      unlock(); if (opener) opener.focus();
    }
    function keys(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(at + 1);
      if (e.key === 'ArrowLeft')  show(at - 1);
    }
    cells.forEach(function (c, n) { c.addEventListener('click', function () { open(n); }); });
    $$('[data-lbclose]', lb).forEach(function (b) { b.addEventListener('click', close); });
    $('[data-lbnext]', lb).addEventListener('click', function () { show(at + 1); });
    $('[data-lbprev]', lb).addEventListener('click', function () { show(at - 1); });
    // swipe
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 48) show(dx < 0 ? at + 1 : at - 1);
      x0 = null;
    }, { passive: true });
  })();

  /* ── booking flow ───────────────────────────────────── */
  (function () {
    var m = $('#book'); if (!m) return;
    var box = $('.modal__box', m), form = $('#bookForm'), foot = $('#modalFoot');
    var stepEls = $$('.step', form), done = $('.done', form);
    var back = $('#back'), next = $('#next'), prog = $('#prog'), stepLis = $$('#steps li');
    var opener = null, step = 0, tp = trap(box);

    var SERVICES = [
      { n: '01', t: 'Signature Fade',        d: '45 min',  p: '$45' },
      { n: '02', t: 'Skin Fade & Design',    d: '60 min',  p: '$60' },
      { n: '03', t: 'Beard Sculpt & Line-Up',d: '30 min',  p: '$35' },
      { n: '04', t: 'Hot Towel Shave',       d: '45 min',  p: '$50' },
      { n: '05', t: 'The Full Send',         d: '90 min',  p: '$95' },
      { n: '06', t: 'Kids Cut',              d: '30 min',  p: '$30' }
    ];
    var BARBERS = [
      { n: '—',  t: 'First available',        d: 'Whoever suits the cut' },
      { n: '01', t: 'Marcus "Ghost" Delgado', d: 'Skin fades, tape-ups' },
      { n: '02', t: 'Rosa Villanueva',        d: 'Textured crops, scissor work' },
      { n: '03', t: 'Danny Pham',             d: 'Hard parts, freehand design' },
      { n: '04', t: 'Kev Oyelaran',           d: 'Beard sculpting, hot towel' },
      { n: '05', t: 'Tony Ruiz',              d: 'Classic taper, pompadour' },
      { n: '06', t: 'Sam Mercado',            d: 'Kids cuts, line-ups' }
    ];
    var pick = { svc: null, barber: null, day: null, time: null };

    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

    // services + barbers
    SERVICES.forEach(function (s) {
      var b = el('button', 'opt', '<span class="opt__n">' + s.n + '</span><span class="opt__m"><b>' + s.t + '</b><span>' + s.d + '</span></span><span class="opt__p">' + s.p + '</span>');
      b.type = 'button';
      b.addEventListener('click', function () {
        pick.svc = s; $$('.opt', $('#optService')).forEach(function (o) { o.classList.remove('is-sel'); });
        b.classList.add('is-sel'); gate();
      });
      $('#optService').appendChild(b);
    });
    BARBERS.forEach(function (s) {
      var b = el('button', 'opt', '<span class="opt__n">' + s.n + '</span><span class="opt__m"><b>' + s.t + '</b><span>' + s.d + '</span></span>');
      b.type = 'button';
      b.addEventListener('click', function () {
        pick.barber = s; $$('.opt', $('#optBarber')).forEach(function (o) { o.classList.remove('is-sel'); });
        b.classList.add('is-sel'); gate();
      });
      $('#optBarber').appendChild(b);
    });

    // Opening hours, keyed by getDay(). Must match the Visit section exactly:
    // Mon closed, Tue-Fri 10-20, Sat 09-20, Sun 10-17.
    var DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var HOURS = { 0: [10, 17], 2: [10, 20], 3: [10, 20], 4: [10, 20], 5: [10, 20], 6: [9, 20] };
    var LEAD = 60;   // minutes of notice required before a slot can be booked

    function slotsFor(dt) {
      var h = HOURS[dt.getDay()];
      if (!h) return [];
      var now = new Date(), today = dt.toDateString() === now.toDateString();
      var cutoff = today ? now.getHours() * 60 + now.getMinutes() + LEAD : -1;
      var out = [];
      for (var hr = h[0]; hr < h[1]; hr++) {
        for (var mm = 0; mm < 60; mm += 30) {
          if (hr * 60 + mm <= cutoff) continue;   // never offer a time that has passed
          out.push([hr, mm]);
        }
      }
      return out;
    }

    // Next 7 bookable days: closed days are skipped, and today is skipped once
    // its last slot has passed.
    var days = [], d = new Date(), guard = 0;
    while (days.length < 7 && guard++ < 30) {
      if (guard > 1) d.setDate(d.getDate() + 1);
      if (slotsFor(d).length) days.push(new Date(d));
    }
    days.forEach(function (dt, k) {
      var b = el('button', 'day', '<b>' + dt.getDate() + '</b><span>' + DAYN[dt.getDay()] + '</span>');
      b.type = 'button';
      b.addEventListener('click', function () {
        pick.day = dt; pick.time = null;
        $$('.day').forEach(function (o) { o.classList.remove('is-sel'); });
        b.classList.add('is-sel'); times(k); gate();
      });
      $('#optDay').appendChild(b);
    });

    function times(seed) {
      var host = $('#optTime'); host.innerHTML = '';
      var slots = slotsFor(pick.day), any = false;
      slots.forEach(function (s) {
        var h = s[0], mm = s[1];
        var label = String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
        var b = el('button', 'time', label); b.type = 'button';
        // deterministic pseudo-availability so it behaves the same on every render
        var taken = ((h * 7 + mm + seed * 13) % 10) < 4;
        if (taken) { b.disabled = true; b.title = 'Booked'; }
        else {
          any = true;
          b.addEventListener('click', function () {
            pick.time = label;
            $$('.time').forEach(function (o) { o.classList.remove('is-sel'); });
            b.classList.add('is-sel'); gate();
          });
        }
        host.appendChild(b);
      });
      if (!any) host.appendChild(el('p', 'step__sub', 'Fully booked — try another day, or call the shop.'));
    }

    function gate() {
      var ok = (step === 0 && pick.svc) || (step === 1 && pick.barber) || (step === 2 && pick.day && pick.time) || step === 3;
      next.disabled = !ok;
    }
    function paint() {
      stepEls.forEach(function (s, k) { s.classList.toggle('is-on', k === step); });
      stepLis.forEach(function (li, k) {
        li.classList.toggle('is-on', k === step);
        li.classList.toggle('is-done', k < step);
      });
      prog.style.width = ((step + 1) / 4 * 100) + '%';
      back.disabled = step === 0;
      next.textContent = step === 3 ? 'Confirm booking' : 'Continue';
      gate();
      var q = $('.step.is-on .step__q'); if (q) q.setAttribute('tabindex', '-1'), q.focus({ preventScroll: true });
      $('.modal__body').scrollTop = 0;
    }
    function recap() {
      var f = pick.day ? DAYN[pick.day.getDay()] + ' ' + pick.day.getDate() + '/' + (pick.day.getMonth() + 1) : '';
      $('#recap').innerHTML =
        '<span><b>' + pick.svc.t + '</b> · ' + pick.svc.d + ' · ' + pick.svc.p + '</span>' +
        '<span>With <b>' + pick.barber.t + '</b></span>' +
        '<span><b>' + f + '</b> at <b>' + pick.time + '</b></span>';
    }

    function validate() {
      var good = true;
      [['name', 'We need a name for the chair.'], ['phone', 'A mobile number, so we can text if anything moves.'], ['email', 'An email for the confirmation.']].forEach(function (pair) {
        var input = form.elements[pair[0]], wrap = input.closest('.field'), err = $('.err', wrap), v = input.value.trim(), msg = '';
        if (!v) msg = pair[1];
        else if (pair[0] === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'That email doesn’t look right.';
        else if (pair[0] === 'phone' && v.replace(/\D/g, '').length < 7) msg = 'That number looks too short.';
        wrap.classList.toggle('is-bad', !!msg);
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
        err.textContent = msg;
        if (msg && good) { input.focus(); good = false; }
        else if (msg) good = false;
      });
      return good;
    }

    next.addEventListener('click', function () {
      if (step < 3) { step++; if (step === 3) recap(); paint(); return; }
      if (!validate()) return;
      stepEls.forEach(function (s) { s.classList.remove('is-on'); });
      foot.style.display = 'none';
      done.classList.add('is-on');
      var f = DAYN[pick.day.getDay()] + ' ' + pick.day.getDate() + '/' + (pick.day.getMonth() + 1);
      $('#doneLine').innerHTML = pick.svc.t + ' with ' + pick.barber.t.replace('First available', 'first available') +
        ', <b>' + f + ' at ' + pick.time + '</b>. We’ll text ' + form.elements.name.value.trim().split(' ')[0] + ' a reminder the day before.';
      lazyVid($('#donelogo'), false);
      $('.done .btn').focus();
    });
    back.addEventListener('click', function () { if (step > 0) { step--; paint(); } });

    function open() {
      opener = document.activeElement;
      step = 0; foot.style.display = ''; done.classList.remove('is-on');
      m.hidden = false; lock();
      requestAnimationFrame(function () { m.classList.add('is-on'); });
      document.addEventListener('keydown', esc); document.addEventListener('keydown', tp);
      paint();
      setTimeout(function () { var f = $('.opt', $('#optService')); if (f) f.focus(); }, 60);
    }
    function close() {
      m.classList.remove('is-on');
      document.removeEventListener('keydown', esc); document.removeEventListener('keydown', tp);
      setTimeout(function () { m.hidden = true; }, 320);
      unlock(); if (opener) opener.focus();
    }
    function esc(e) { if (e.key === 'Escape') close(); }

    $$('[data-book]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        // service rows preselect their service
        var row = e.currentTarget.closest ? e.currentTarget : null;
        open();
        var n = b.querySelector && b.querySelector('.svc__n');
        if (n) {
          var idx = parseInt(n.textContent, 10) - 1;
          var btn = $$('.opt', $('#optService'))[idx];
          if (btn) btn.click();
        }
      });
    });
    $$('[data-close]', m).forEach(function (b) { b.addEventListener('click', close); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    $$('input, textarea', form).forEach(function (inp) {
      inp.addEventListener('input', function () {
        var w = inp.closest('.field'); if (w) w.classList.remove('is-bad');
      });
    });
  })();

  /* ── stop the placeholder Instagram link jumping the page ── */
  $$('[data-noop]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); }); });
})();
