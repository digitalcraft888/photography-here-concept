(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const body = document.body;

  /* ---------- Loader ---------- */
  const num = $('#loaderNum'), bar = $('#loaderBar');
  let loadedDone = false;
  const finishLoad = () => { if (loadedDone) return; loadedDone = true; body.classList.add('loaded'); };
  setTimeout(finishLoad, 4500); // safety net independent of rAF (background tabs throttle it)
  (function loader() {
    const heroImg = $('#heroCut');
    const imgReady = new Promise(r => { if (heroImg.complete) r(); else { heroImg.onload = r; heroImg.onerror = r; } });
    const fontReady = (document.fonts && document.fonts.ready) || Promise.resolve();
    let p = 0, t0 = performance.now(), ready = false;
    Promise.all([imgReady, fontReady]).then(() => ready = true);
    const dur = reduce ? 200 : 1500;
    (function tick(now) {
      const el = now - t0;
      const target = Math.min(1, el / dur);
      p += ((ready ? target : Math.min(target, .86)) - p) * .2;
      const v = Math.round(p * 100);
      num.textContent = String(v).padStart(3, '0');
      bar.style.width = v + '%';
      if (v >= 100 && ready) { setTimeout(finishLoad, 120); return; }
      if (el > 6000) { finishLoad(); return; }
      requestAnimationFrame(tick);
    })(t0);
  })();

  /* ---------- Cursor ---------- */
  const cursor = $('#cursor'), label = $('#cursorLabel');
  if (fine && !reduce) {
    body.classList.add('has-cursor');
    const dot = $('.cursor__dot'), ring = $('.cursor__ring');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`; }, { passive: true });
    (function loop() { rx += (mx - rx) * .16; ry += (my - ry) * .16; ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
    // adapt cursor colour to the surface underneath
    const TONES = '.card--feature,.card--end,.card__media,.post__img,.path__img,.about__imgs,.prod__book,.surface-ivory,.surface-dark,.surface-charcoal,.hero,.footer,.nav,.menu,.finale,.marquee,.sticky-cta';
    const LIGHT = '.prod__book,.surface-ivory';
    let toneTick = 0;
    const readTone = () => {
      const el = document.elementFromPoint(mx, my); if (!el) return;
      const host = el.closest(TONES);
      cursor.classList.toggle('on-light', !!(host && host.matches(LIGHT)));
    };
    addEventListener('mousemove', () => { if (++toneTick % 4 === 0) readTone(); }, { passive: true });
    addEventListener('scroll', () => requestAnimationFrame(readTone), { passive: true });
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor]');
      if (t) { label.textContent = t.dataset.cursor; cursor.classList.add('is-label'); } else cursor.classList.remove('is-label');
    });
  }

  /* ---------- Nav ---------- */
  const nav = $('#nav'); let lastY = scrollY;
  const burger = $('#burger'), menu = $('#menu');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  if (/[?&]menu=1/.test(location.search)) setTimeout(() => setMenu(true), 2600);

  /* ---------- Hero light + parallax ---------- */
  const hero = $('#top'), stage = $('#heroStage'), word = $('#heroWord');
  let tx = .5, ty = .3, cx = .5, cy = .3, hovering = false, t = 0;
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; hovering = true;
  });
  hero.addEventListener('pointerleave', () => hovering = false);
  hero.addEventListener('touchmove', e => {
    const r = hero.getBoundingClientRect(), p = e.touches[0];
    tx = (p.clientX - r.left) / r.width; ty = (p.clientY - r.top) / r.height; hovering = true;
  }, { passive: true });
  let heroVisible = true;
  new IntersectionObserver(([e]) => heroVisible = e.isIntersecting).observe(hero);

  function frame(now) {
    t = now / 1000;
    if (heroVisible) {
      if (!hovering) { // idle sweep, like a light being moved around the set
        tx = .5 + Math.sin(t * .5) * .3; ty = .28 + Math.cos(t * .38) * .1;
      }
      cx += (tx - cx) * .07; cy += (ty - cy) * .07;
      hero.style.setProperty('--lx', (cx * 100).toFixed(1) + '%');
      hero.style.setProperty('--ly', (cy * 100).toFixed(1) + '%');
      const sy = Math.min(scrollY, innerHeight * 1.2);
      const mxp = reduce ? 0 : (cx - .5), myp = reduce ? 0 : (cy - .3);
      stage.style.transform = `translate(calc(-50% + ${-mxp * 26}px), ${sy * .16 - myp * 10}px)`;
      word.style.transform = loadedDone ? `translate(${mxp * 36}px, ${-sy * .26 + myp * 8}px)` : '';
      if (loadedDone && word.style.transition !== 'none' && now > 3500) word.style.transition = 'none';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- Nav scroll state ---------- */
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('is-solid', y > 40);
    if (!body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > lastY && y > 500);
    lastY = y;
  }, { passive: true });

  /* ---------- Sticky mobile CTA ---------- */
  const sticky = $('#stickyCta'), fin = $('.finale'), com = $('#community');
  const stickyCheck = () => {
    const past = scrollY > innerHeight * .8;
    const fr = fin.getBoundingClientRect(), cr = com.getBoundingClientRect();
    const hide = (fr.top < innerHeight * .6) || (cr.top < innerHeight * .5 && cr.bottom > innerHeight * .3);
    const on = past && !hide && !body.classList.contains('menu-open');
    sticky.classList.toggle('show', on); sticky.setAttribute('aria-hidden', !on);
    $$('a', sticky).forEach(a => a.tabIndex = on ? 0 : -1);
  };
  addEventListener('scroll', stickyCheck, { passive: true }); stickyCheck();

  /* ---------- Reveal on scroll ---------- */
  const revealSel = '[data-reveal], .path, .outcomes li, .faq__item, .sec-head, .about__copy > *, .about__imgs img, .post, .prod, .schedule, .workshops__lead > *, .finale__inner > *, .community__cta, .card';
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      const sibs = el.parentElement ? [...el.parentElement.children].filter(c => c.matches(revealSel)) : [el];
      el.style.transitionDelay = (Math.max(0, sibs.indexOf(el)) * 0.07) + 's';
      el.classList.add('in', 'in-view'); io.unobserve(el);
    }
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$(revealSel).forEach(el => io.observe(el));

  /* ---------- Manifesto scroll-fill ---------- */
  const mt = $('#manifestoText');
  const walk = n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(tok => {
        if (!tok.trim()) { frag.append(tok); return; }
        const s = document.createElement('span'); s.className = 'w'; s.textContent = tok; frag.append(s);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && !n.classList.contains('pill-img')) [...n.childNodes].forEach(walk);
  };
  [...mt.childNodes].forEach(walk);
  const words = $$('.w', mt);
  function fillWords() {
    const r = mt.getBoundingClientRect();
    const start = innerHeight * .85, end = innerHeight * .25;
    const prog = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height * .8)));
    const n = Math.round(prog * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  }
  addEventListener('scroll', fillWords, { passive: true }); fillWords();

  /* ---------- Chapters ---------- */
  const chStage = $('#chStage'), imgs = $$('.ch-img'), items = $$('#chList li'), chNum = $('#chNum');
  const DUR = 6000; let cur = 0, timer = null, chVisible = false, paused = false;
  function go(i) {
    if (i === cur && items[i].classList.contains('is-active')) return;
    const prev = cur; cur = i;
    imgs.forEach((im, k) => { im.classList.remove('is-prev'); if (k === prev) im.classList.add('is-prev'); im.classList.toggle('is-active', k === i); });
    setTimeout(() => imgs[prev] && imgs[prev].classList.remove('is-prev'), 1100);
    items.forEach((li, k) => { li.classList.remove('is-active'); li.style.removeProperty('--dur'); });
    void items[i].offsetWidth;
    items[i].style.setProperty('--dur', DUR + 'ms');
    items[i].classList.add('is-active');
    chNum.textContent = String(i + 1).padStart(2, '0');
    schedule();
  }
  const mobileMQ = matchMedia('(max-width:860px), (hover:none)');
  function schedule() { clearTimeout(timer); if (reduce || paused || !chVisible || mobileMQ.matches) return; timer = setTimeout(() => go((cur + 1) % items.length), DUR); }
  items.forEach((li, i) => {
    li.addEventListener('click', () => {
      paused = false; go(i);
      if (mobileMQ.matches) { const r = chStage.getBoundingClientRect(); if (r.top < 60 || r.bottom > innerHeight) chStage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    });
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(i); } });
    li.addEventListener('mouseenter', () => { if (fine) { paused = true; clearTimeout(timer); go(i); } });
    li.addEventListener('mouseleave', () => { paused = false; schedule(); });
  });
  new IntersectionObserver(([e]) => {
    chVisible = e.isIntersecting;
    if (chVisible) { items[cur].style.setProperty('--dur', DUR + 'ms'); schedule(); } else clearTimeout(timer);
  }, { threshold: .35 }).observe($('.chapters__grid'));
  items[0].style.setProperty('--dur', DUR + 'ms');
  const step = d => { paused = false; go((cur + d + items.length) % items.length); };
  $('#chPrev').addEventListener('click', () => step(-1));
  $('#chNext').addEventListener('click', () => step(1));
  let tx0 = 0, ty0 = 0;
  chStage.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
  chStage.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', schedule);

  /* ---------- Course rail: drag + progress ---------- */
  const rail = $('#rail'), track = $('#railTrack'), prog = $('#railProg');
  const updProg = () => {
    const max = track.scrollWidth - track.clientWidth;
    const w = Math.max(.12, track.clientWidth / track.scrollWidth);
    prog.style.width = (w * 100) + '%';
    prog.style.left = (max ? (track.scrollLeft / max) * (1 - w) * 100 : 0) + '%';
  };
  track.addEventListener('scroll', updProg, { passive: true }); addEventListener('resize', updProg); updProg();
  if (fine) {
    let down = false, sx = 0, sl = 0, moved = 0;
    track.addEventListener('pointerdown', e => { down = true; moved = 0; sx = e.clientX; sl = track.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); if (moved > 4) rail.classList.add('is-drag'); track.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { down = false; setTimeout(() => rail.classList.remove('is-drag'), 0); });
    track.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    track.addEventListener('dragstart', e => e.preventDefault());
  }

  /* ---------- Community wall: endless vertical drift ---------- */
  (function wallLoop() {
    const wallEl = $('.wall'); if (!wallEl) return;
    const built = $$('.wall__col', wallEl).map(col => {
      const track = document.createElement('div'); track.className = 'wall__track';
      const set = document.createElement('div'); set.className = 'wall__set';
      while (col.firstChild) set.appendChild(col.firstChild);
      track.appendChild(set); col.appendChild(track);
      return { track, set };
    });
    const build = () => {
      const wh = wallEl.clientHeight;
      built.forEach(({ track, set }, i) => {
        $$('.wall__set[data-clone]', track).forEach(n => n.parentNode.removeChild(n));
        const gap = parseFloat(getComputedStyle(set).paddingBottom) || 0;
        const h = set.getBoundingClientRect().height;
        if (!h) return;
        const copies = Math.ceil(wh / h) + 1;
        for (let k = 0; k < copies; k++) {
          const c = set.cloneNode(true); c.dataset.clone = '1'; c.setAttribute('aria-hidden', 'true');
          $$('img', c).forEach(im => { im.alt = ''; im.loading = 'eager'; });
          track.appendChild(c);
        }
        const speed = [26, 34, 22, 38, 28][i % 5];
        track.style.setProperty('--shift', h + 'px');
        track.style.setProperty('--dur', (h / speed).toFixed(1) + 's');
        track.classList.toggle('is-down', i % 2 === 1);
      });
    };
    const ready = () => setTimeout(build, 60);
    ready();
    addEventListener('load', ready);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
  })();

  /* ---------- Parallax (workshop bg) ---------- */
  const wall = $('.wall'), wbg = $('[data-parallax]');
  function par() {
    const r = wall.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) {
      const c = (r.top + r.height / 2 - innerHeight / 2);
    }
    if (wbg) { const b = wbg.parentElement.getBoundingClientRect(); if (b.bottom > 0 && b.top < innerHeight) wbg.style.transform = `translateY(${(b.top + b.height / 2 - innerHeight / 2) * -.08}px)`; }
  }
  addEventListener('scroll', par, { passive: true }); par();

  /* ---------- Magnetic buttons ---------- */
  if (fine && !reduce) $$('.magnetic').forEach(b => {
    b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; });
    b.addEventListener('mouseleave', () => b.style.transform = '');
  });

  /* ---------- Demo forms (front-end only) ---------- */
  const wire = (form, note, msg) => form.addEventListener('submit', e => {
    e.preventDefault();
    const inp = form.querySelector('input');
    if (!inp.validity.valid || !inp.value) { note.textContent = 'Please enter a valid email address.'; note.classList.remove('ok'); inp.focus(); return; }
    note.textContent = msg; note.classList.add('ok'); form.reset();
  });
  wire($('#waitlist'), $('#wNote'), 'Thank you. You’re on the list for first access to new workshop dates. (Demo form)');
  wire($('#news'), $('#nNote'), 'Thank you. Your first tutorial is on its way. (Demo form)');

  /* ---------- Smooth anchors offset ---------- */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const el = $(id); if (!el) return; e.preventDefault();
    const y = id === '#top' ? 0 : el.getBoundingClientRect().top + scrollY - 10;
    scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }));
})();
