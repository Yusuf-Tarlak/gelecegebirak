/* Geleceğe Mektup · ortak yardımcılar (tüm sayfalar) */
(function () {
  'use strict';
  const GM = (window.GM = window.GM || {});
  const CFG = (GM.cfg = window.SITE_CONFIG || {});

  GM.isDemo = !CFG.orderEndpoint;
  GM.$ = (s, r) => (r || document).querySelector(s);
  GM.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  GM.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  GM.reducedMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  GM.get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

  /* ---------- localStorage (her zaman try/catch) ---------- */
  GM.store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* yok say */ } },
  };

  /* ---------- tarih (yerel saat, 'YYYY-MM-DD') ---------- */
  const pad = n => String(n).padStart(2, '0');
  const D = (GM.date = {
    today() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); },
    toYMD(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
    fromYMD(s) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
      if (!m) return null;
      const d = new Date(+m[1], +m[2] - 1, +m[3]);
      return d.getMonth() === +m[2] - 1 ? d : null;
    },
    addMonths(d, n) {
      const y = d.getFullYear(), m = d.getMonth() + n;
      const last = new Date(y, m + 1, 0).getDate();
      return new Date(y, m, Math.min(d.getDate(), last));
    },
    addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); },
    diffDays(a, b) { return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5); },
    long(d) { return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); },
    full(d) { return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }); },
    short(d) { return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; },
    min() { return D.addDays(D.today(), (CFG.delivery && CFG.delivery.minDays) || 30); },
    max() { return D.addMonths(D.today(), 12 * ((CFG.delivery && CFG.delivery.maxYears) || 10)); },
    inRange(d) { return !!d && d >= D.min() && d <= D.max(); },
  });

  GM.num = n => Number(n).toLocaleString('tr-TR');
  GM.money = n => '₺' + GM.num(n);

  /* ---------- fiyat ---------- */
  GM.price = function (deliveryYMD, addonIds) {
    const P = CFG.pricing || { base: 0, duration: [], addons: [] };
    const date = D.fromYMD(deliveryYMD);
    const today = D.today();
    const tiers = (P.duration || []).slice().sort((a, b) => a.maxYears - b.maxYears);
    let tier = tiers[tiers.length - 1] || { maxYears: 10, extra: 0 };
    if (date) for (const t of tiers) { if (date <= D.addMonths(today, 12 * t.maxYears)) { tier = t; break; } }
    const addons = (P.addons || []).filter(a => (addonIds || []).includes(a.id));
    const total = P.base + (tier.extra || 0) + addons.reduce((s, a) => s + a.price, 0);
    return { base: P.base, extra: tier.extra || 0, tier, addons, total };
  };

  /* ---------- yapılandırma değerlerini sayfaya yerleştir ---------- */
  GM.fillConfig = function (root) {
    GM.$$('[data-config]', root).forEach(el => {
      const v = GM.get(CFG, el.dataset.config);
      if (v) { el.textContent = v; el.classList.remove('cfg-missing'); }
      else { el.textContent = el.dataset.placeholder || '[doldurulacak]'; el.classList.add('cfg-missing'); }
    });
    const c = CFG.contact || {};
    const links = {
      email: c.email && { href: 'mailto:' + c.email, text: c.email },
      whatsapp: c.whatsapp && { href: 'https://wa.me/' + String(c.whatsapp).replace(/\D/g, ''), text: 'WhatsApp' },
      instagram: c.instagram && { href: 'https://instagram.com/' + String(c.instagram).replace(/^@/, ''), text: '@' + String(c.instagram).replace(/^@/, '') },
      phone: CFG.company && CFG.company.phone && { href: 'tel:' + CFG.company.phone.replace(/[^\d+]/g, ''), text: CFG.company.phone },
    };
    GM.$$('[data-contact]').forEach(el => {
      const l = links[el.dataset.contact];
      const holder = el.closest('[data-contact-item]') || el;
      if (!l) { holder.hidden = true; return; }
      holder.hidden = false;
      if (el.tagName === 'A') {
        el.href = l.href;
        if (el.dataset.contact !== 'email' && el.dataset.contact !== 'phone') { el.target = '_blank'; el.rel = 'noopener'; }
      }
      if (!el.hasAttribute('data-keep-text')) el.textContent = l.text;
    });
    GM.$$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
    GM.$$('[data-brand]').forEach(el => { el.textContent = CFG.brand || 'Geleceğe Mektup'; });
  };

  /* ---------- ?kontrol: yayın öncesi eksik listesi ---------- */
  function readinessPanel() {
    if (!/[?&]kontrol\b/.test(location.search)) return;
    const checks = [
      ['orderEndpoint', 'Sipariş sistemi adresi (orderEndpoint)'],
      ['company.legalName', 'Ticari unvan'], ['company.address', 'Açık adres'],
      ['company.taxOffice', 'Vergi dairesi'], ['company.taxNumber', 'Vergi no'],
      ['company.phone', 'Telefon'], ['contact.email', 'E-posta'],
      ['payment.iban', 'IBAN'], ['payment.ibanHolder', 'Hesap sahibi'],
    ];
    const rows = checks.map(([k, label]) => {
      const ok = !!GM.get(CFG, k);
      return `<li class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${GM.esc(label)} <code>${k}</code></li>`;
    }).join('');
    const box = document.createElement('aside');
    box.className = 'readiness';
    box.setAttribute('aria-label', 'Yayın öncesi kontrol listesi');
    box.innerHTML = `<strong>Yayın kontrolü</strong><p>assets/js/config.js dosyasındaki alanlar:</p><ul>${rows}</ul><button type="button">Kapat</button>`;
    box.querySelector('button').addEventListener('click', () => box.remove());
    document.body.appendChild(box);
  }

  /* ---------- bildirim ---------- */
  GM.toast = function (msg, type) {
    let wrap = GM.$('.toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toasts'; wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' toast--' + type : '');
    t.textContent = msg;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-in'));
    setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 400); }, 3800);
  };

  /* ---------- menü ---------- */
  function initNav() {
    const nav = GM.$('.nav');
    if (!nav) return;
    const btn = GM.$('.nav__toggle');
    const menu = GM.$('#mobil-menu');
    let lastY = window.scrollY, ticking = false;
    const bar = GM.$('.scroll-progress');
    function onScroll() {
      const y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 12);
      const open = document.body.classList.contains('menu-open');
      if (!open) nav.classList.toggle('is-hidden', y > 480 && y > lastY + 4);
      if (y < lastY - 4) nav.classList.remove('is-hidden');
      lastY = y;
      if (bar) {
        const h = document.documentElement.scrollHeight - innerHeight;
        bar.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
      }
      ticking = false;
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    if (!btn || !menu) return;
    function setOpen(open) {
      document.body.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
      menu.hidden = false;
      menu.classList.toggle('is-open', open);
      if (open) { nav.classList.remove('is-hidden'); const first = menu.querySelector('a'); first && first.focus({ preventScroll: true }); }
      else setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 450);
    }
    btn.addEventListener('click', () => setOpen(!document.body.classList.contains('menu-open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setOpen(false); btn.focus(); }
    });
    window.addEventListener('resize', () => { if (innerWidth > 980 && document.body.classList.contains('menu-open')) setOpen(false); });
  }

  /* ---------- kaydırınca beliren öğeler ---------- */
  GM.reveal = function (root) {
    const els = GM.$$('[data-reveal]:not(.is-in)', root);
    if (GM.reducedMotion || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(el => {
      const group = el.closest('[data-reveal-group]');
      if (group && !el.style.getPropertyValue('--d')) {
        const i = GM.$$('[data-reveal]', group).indexOf(el);
        el.style.setProperty('--d', (i * 90) + 'ms');
      }
      io.observe(el);
    });
  };

  document.documentElement.classList.add('js');
  document.addEventListener('DOMContentLoaded', () => {
    GM.fillConfig();
    initNav();
    GM.reveal();
    readinessPanel();
  });
})();
