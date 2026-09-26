/* Geleceğe Mektup · ana sayfa etkileşimleri */
(function () {
  'use strict';
  const GM = window.GM;
  const { $, $$, esc } = GM;
  const icon = (id, cls) => `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#${id}"/></svg>`;

  /* ---------- başlıktaki dönen kelime ---------- */
  function rotator() {
    const box = $('#rotator');
    if (!box) return;
    const y = new Date().getFullYear() + 4;
    const words = ['yarına', 'sevdiğine', 'gelecekteki sana', 'çocuğuna', y + yearSuffix(y)];
    box.innerHTML = words.map((w, i) => `<span class="rotator__word${i === 0 ? ' is-current' : ''}">${esc(w)}</span>`).join('') +
      '<svg class="rotator__underline" viewBox="0 0 200 12" preserveAspectRatio="none"><path d="M2 8 C 40 2, 90 12, 130 6 S 180 4, 198 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" pathLength="1"/></svg>';
    const els = $$('.rotator__word', box);
    const setW = el => { box.style.width = el.getBoundingClientRect().width + 'px'; };
    const start = () => {
      setW(els[0]);
      requestAnimationFrame(() => box.classList.add('is-drawn'));
      if (GM.reducedMotion) return;
      let i = 0;
      setInterval(() => {
        if (document.hidden) return;
        const cur = els[i]; i = (i + 1) % els.length; const next = els[i];
        cur.classList.remove('is-current'); cur.classList.add('is-leaving');
        next.classList.remove('is-leaving'); next.classList.add('is-current');
        setW(next);
        box.classList.remove('is-drawn'); void box.offsetWidth; box.classList.add('is-drawn');
        setTimeout(() => cur.classList.remove('is-leaving'), 800);
      }, 2800);
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
    window.addEventListener('resize', () => { const c = $('.rotator__word.is-current', box); c && setW(c); });
  }
  // "2030'a", "2031'e", "2029'a", "2036'ya" gibi okunuşa göre ek
  function yearSuffix(y) {
    const last = { 0: 'a', 1: 'e', 2: 'ye', 3: 'e', 4: 'e', 5: 'e', 6: 'ya', 7: 'ye', 8: 'e', 9: 'a' };
    const tens = { 10: 'a', 20: 'ye', 30: 'a', 40: 'a', 50: 'ye', 60: 'a', 70: 'e', 80: 'e', 90: 'a' };
    const r = y % 100;
    const s = r % 10 === 0 ? (r === 0 ? 'e' : tens[r]) : last[r % 10];
    return '’' + s;
  }

  /* ---------- hero kartpostalı ---------- */
  function heroCard() {
    const cv = $('#heroCard');
    if (!cv) return;
    const futureYear = new Date().getFullYear() + 5;
    $$('[data-future-year]').forEach(el => { el.textContent = futureYear; });
    const today = GM.date.today();
    const future = GM.date.addMonths(today, 60);
    const draw = img => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(cv.getBoundingClientRect().width * dpr) || 740;
      cv.width = w; cv.height = Math.round(w * 105 / 148);
      GM.Card.drawBack(cv.getContext('2d'), {
        k: w / 148,
        data: {
          message: 'Sevgili gelecekteki ben,\n\nBu kartı okurken hâlâ sabahları balkonda çay içiyor musun? Bugün küçük bir söz verdim: merakımı hiç kaybetmeyeceğim.\n\nUmarım tuttun.',
          to: 'Gelecekteki Ben', from: 'Bugünkü sen', fontId: 'caveat', inkId: 'lacivert',
          writtenYMD: GM.date.toYMD(today), deliveryYMD: GM.date.toYMD(future), stampImg: img, postmark: false,
        },
      });
    };
    Promise.all([GM.Card.loadFonts('caveat'), GM.Card.loadImage('assets/themes/kapadokya.svg').catch(() => null)])
      .then(([, img]) => { draw(img); let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => draw(img), 200); }); });
  }

  /* ---------- hero parallaks ---------- */
  function parallax() {
    const stack = $('#stack');
    if (!stack || GM.reducedMotion || !matchMedia('(pointer:fine)').matches) return;
    const hero = stack.closest('.hero');
    let raf = 0;
    hero.addEventListener('pointermove', e => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = hero.getBoundingClientRect();
        stack.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        stack.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    });
    hero.addEventListener('pointerleave', () => { stack.style.setProperty('--mx', 0); stack.style.setProperty('--my', 0); });
  }

  function heroPlane() {
    const svg = $('.hero__route');
    if (svg && GM.reducedMotion && svg.pauseAnimations) svg.pauseAnimations();
  }

  /* ---------- süreç çizgisi kaydırmayla çizilir ---------- */
  function route() {
    const path = $('.route-draw');
    const sec = $('#nasil');
    if (!path || !sec) return;
    path.style.strokeDasharray = '1';
    if (GM.reducedMotion) { path.style.strokeDashoffset = '0'; return; }
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = sec.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height * 0.7)));
      path.style.strokeDashoffset = String(1 - p);
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- tasarım galerisi ---------- */
  function themes() {
    const grid = $('#themeGrid');
    if (!grid) return;
    grid.innerHTML = GM.THEMES.map(t => `
      <button type="button" class="tcard" data-theme="${t.id}" data-reveal aria-label="${esc(t.name)} tasarımıyla yaz">
        <div class="tcard__pc"><img src="assets/themes/${t.id}.svg" alt="${esc(t.name)} kartpostal illüstrasyonu" width="740" height="525" loading="lazy" decoding="async"></div>
        <div class="tcard__cap"><span class="tcard__name">${esc(t.name)}</span><span class="tcard__mood">${esc(t.mood)}</span></div>
        <span class="tcard__cta">Bu tasarımla yaz ${icon('i-arrow')}</span>
      </button>`).join('') + `
      <button type="button" class="tcard tcard--upload" data-upload data-reveal>
        <div class="tcard__pc"><div>${icon('i-camera')}<strong>Kendi fotoğrafın</strong><small>JPG, PNG · en az 1400 px önerilir</small></div></div>
        <div class="tcard__cap"><span class="tcard__name">Sana özel</span><span class="tcard__mood">Anı</span></div>
      </button>`;
    grid.addEventListener('click', e => {
      const b = e.target.closest('.tcard');
      if (!b || !GM.Builder) return;
      if (b.hasAttribute('data-upload')) GM.Builder.openUpload();
      else GM.Builder.selectTheme(b.dataset.theme, { scroll: true });
    });
    if (!GM.reducedMotion && matchMedia('(pointer:fine)').matches) {
      grid.addEventListener('pointermove', e => {
        const pc = e.target.closest('.tcard') && e.target.closest('.tcard').querySelector('.tcard__pc');
        if (!pc) return;
        const r = pc.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        pc.style.setProperty('--rx', ((x - 0.5) * 12).toFixed(2) + 'deg');
        pc.style.setProperty('--ry', ((0.5 - y) * 10).toFixed(2) + 'deg');
        pc.style.setProperty('--px', (x * 100).toFixed(1) + '%');
        pc.style.setProperty('--py', (y * 100).toFixed(1) + '%');
      });
      grid.addEventListener('pointerout', e => {
        const card = e.target.closest('.tcard');
        if (!card || card.contains(e.relatedTarget)) return;
        const pc = card.querySelector('.tcard__pc');
        pc.style.setProperty('--rx', '0deg'); pc.style.setProperty('--ry', '0deg');
      });
    }
  }

  /* ---------- kime yazılır ---------- */
  function occasions() {
    const grid = $('#occGrid');
    if (!grid) return;
    const iconMap = { moon: 'i-moon', heart: 'i-heart', rings: 'i-rings', cap: 'i-cap', spark: 'i-spark' };
    grid.innerHTML = GM.OCCASIONS.map(o => `
      <button type="button" class="occ" data-occ="${o.id}" data-reveal>
        <span class="occ__deco" aria-hidden="true"></span>
        <span class="occ__icon">${icon(iconMap[o.icon] || 'i-heart')}</span>
        <h3>${esc(o.title)}</h3>
        <p>${esc(o.text)}</p>
        <span class="occ__foot"><span class="occ__chip">${esc(o.chip)}</span><span class="occ__go">Bu mektubu başlat ${icon('i-arrow')}</span></span>
      </button>`).join('');
    grid.addEventListener('click', e => {
      const b = e.target.closest('.occ');
      if (!b || !GM.Builder) return;
      GM.Builder.applyOccasion(GM.OCCASIONS.find(o => o.id === b.dataset.occ));
    });
  }

  /* ---------- örnek mektuplar ---------- */
  function samples() {
    const track = $('#samplesTrack');
    if (!track) return;
    track.innerHTML = GM.SAMPLES.map(s => `
      <article class="note">
        <div class="note__meta"><span class="tag">Örnek</span><span>${esc(s.when)}</span></div>
        <p class="note__to">${esc(s.to)},</p>
        <p class="note__text">${esc(s.text)}</p>
        <p class="note__from">— ${esc(s.from)}</p>
      </article>`).join('');
    const prev = $('#samplesPrev'), next = $('#samplesNext');
    const step = () => { const n = $('.note', track); return n ? n.getBoundingClientRect().width + 28 : 320; };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    const sync = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
    // fareyle sürükleme
    let down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; });
    window.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add('is-dragging'); }
      track.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => { if (!down) return; down = false; track.classList.remove('is-dragging'); });
    track.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { track.scrollBy({ left: step(), behavior: 'smooth' }); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { track.scrollBy({ left: -step(), behavior: 'smooth' }); e.preventDefault(); }
    });
  }

  /* ---------- fiyat tablosu (config.js'ten) ---------- */
  function pricing() {
    const P = GM.cfg.pricing;
    if (!P) return;
    const base = $('#priceBase');
    if (base) base.textContent = GM.money(P.base);
    const rows = $('#tierRows');
    if (rows) {
      let prev = 0;
      rows.innerHTML = P.duration.map(t => {
        const from = prev; prev = t.maxYears;
        const label = from === 0 ? `${t.maxYears} yıla kadar` : `${from}–${t.maxYears} yıl`;
        return `<tr><td>${label}${t.extra ? ` <span class="field__hint">(+${GM.money(t.extra)} saklama)</span>` : ''}</td><td><strong>${GM.money(P.base + t.extra)}</strong></td></tr>`;
      }).join('');
    }
    const add = $('#addonList');
    if (add && P.addons && P.addons.length) {
      add.innerHTML = '<h3>İsteğe bağlı eklemeler</h3>' + P.addons.map(a =>
        `<div class="addon-line"><span>${esc(a.label)}<small>${esc(a.desc || '')}</small></span><strong>+${GM.money(a.price)}</strong></div>`).join('');
    }
  }

  /* ---------- SSS yumuşak açılma ---------- */
  function faq() {
    if (GM.reducedMotion) return;
    $$('.faq__item').forEach(d => {
      const sum = $('summary', d), body = $('.faq__body', d);
      sum.addEventListener('click', e => {
        e.preventDefault();
        if (d.dataset.anim) return;
        d.dataset.anim = '1';
        if (d.open) {
          const h = body.offsetHeight;
          body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' })
            .onfinish = () => { d.open = false; delete d.dataset.anim; };
        } else {
          d.open = true;
          const h = body.offsetHeight;
          body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' })
            .onfinish = () => { delete d.dataset.anim; };
        }
      });
    });
  }

  /* ---------- son bölümdeki zarf ---------- */
  function finalEnvelope() {
    const env = $('#finalEnv');
    if (!env || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { setTimeout(() => env.classList.add('is-open'), 400); io.disconnect(); }
    }), { threshold: 0.6 });
    io.observe(env);
  }

  /* ---------- menüde bulunulan bölüm ---------- */
  function scrollSpy() {
    const links = $$('.nav__links a');
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(es => es.forEach(e => {
      const a = map.get(e.target.id);
      if (!a) return;
      if (e.isIntersecting) { links.forEach(l => l.removeAttribute('aria-current')); a.setAttribute('aria-current', 'true'); }
    }), { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((a, id) => { const s = document.getElementById(id); s && io.observe(s); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    rotator();
    heroCard();
    parallax();
    heroPlane();
    route();
    themes();
    occasions();
    samples();
    pricing();
    faq();
    finalEnvelope();
    scrollSpy();
    GM.reveal();
  });
})();
