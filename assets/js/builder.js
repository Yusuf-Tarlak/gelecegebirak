/* Geleceğe Mektup · atölye (kartpostal oluşturma sihirbazı) */
(function () {
  'use strict';
  const GM = window.GM;
  const { $, $$, esc } = GM;
  const CFG = GM.cfg;
  const DRAFT_KEY = 'gm-taslak-v1';
  const ORDERS_KEY = 'gm-siparislerim';
  const MAXLEN = CFG.messageMaxLength || 700;
  const PLACEHOLDER = 'Sevgili gelecekteki ben,\n\nMesajın, yazdıkça burada belirecek…';
  const today = GM.date.today();
  const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
  const themeSrc = id => `assets/themes/${id}.svg`;
  const themeName = id => (GM.THEMES.find(t => t.id === id) || {}).name || '';

  const fresh = () => ({
    step: 1, maxStep: 1,
    design: { type: 'theme', themeId: 'istanbul' }, lastTheme: 'istanbul',
    crop: { zoom: 1, x: 0.5, y: 0.5 },
    rtype: 'self', to: 'Gelecekteki Ben', message: '', from: '',
    fontId: 'caveat', inkId: 'lacivert',
    preset: '1y', date: GM.date.toYMD(GM.date.addMonths(today, 12)),
    sName: '', sEmail: '', sPhone: '',
    self: true, rName: '', city: '', district: '', address: '', postcode: '',
    surprise: false, note: '', addons: [], payment: 'havale', contract: false, marketing: false,
  });
  let S = fresh();
  let photo = null;        // yüklenen fotoğraf (taslağa kaydedilmez)
  let frontImg = null;     // ön yüz görseli
  let side = 'front';
  let lastFit = { fits: true };
  let sending = false;
  const E = {};

  /* ============ yardımcılar ============ */
  const save = debounce(() => {
    const copy = Object.assign({}, S, { contract: false });
    if (copy.design.type === 'photo') copy.design = { type: 'theme', themeId: S.lastTheme, hadPhoto: true };
    GM.store.set(DRAFT_KEY, copy);
  }, 400);
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  const digits = v => String(v || '').replace(/\D/g, '');
  const phoneOk = v => !v.trim() || (digits(v).length >= 10 && digits(v).length <= 13);

  function radios(container, sel, onPick) {
    container.addEventListener('click', e => { const b = e.target.closest(sel); if (b && container.contains(b)) onPick(b); });
    container.addEventListener('keydown', e => {
      if (!/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
      const items = $$(sel, container).filter(b => !b.disabled);
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const n = items[(i + (/Right|Down/.test(e.key) ? 1 : -1) + items.length) % items.length];
      n.focus(); onPick(n, true);
    });
  }
  function setChecked(container, sel, pred) {
    $$(sel, container).forEach(b => {
      const on = pred(b);
      b.setAttribute(b.getAttribute('role') === 'radio' ? 'aria-checked' : 'aria-pressed', String(on));
      if (b.getAttribute('role') === 'radio') b.tabIndex = on ? 0 : -1;
    });
  }

  /* ============ önizleme ============ */
  function sizeCanvases() {
    const w = E.flip.getBoundingClientRect().width;
    if (!w) return;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    [E.cvFront, E.cvBack].forEach(cv => { cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * 105 / 148); });
    drawAll();
  }
  function backData() {
    return {
      message: S.message, placeholder: PLACEHOLDER, to: S.to, from: S.from,
      fontId: S.fontId, inkId: S.inkId, writtenYMD: GM.date.toYMD(today), deliveryYMD: S.date,
      stampImg: frontImg,
    };
  }
  function drawFront(ctx) { GM.Card.drawFront(ctx || E.cvFront.getContext('2d'), frontImg, S.design.type === 'photo' ? S.crop : null); }
  function drawBack(ctx, k) {
    const cv = ctx ? ctx.canvas : E.cvBack;
    lastFit = GM.Card.drawBack(ctx || cv.getContext('2d'), { k: k || cv.width / 148, data: backData() });
    E.fitWarn.hidden = lastFit.fits || !S.message.trim();
  }
  let raf = 0;
  function drawAll() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; drawFront(); drawBack(); if (!E.peek.hidden) drawPeek(); });
  }
  async function loadFront() {
    if (S.design.type === 'photo' && photo) frontImg = photo.img;
    else frontImg = await GM.Card.loadImage(themeSrc(S.design.themeId)).catch(() => null);
    drawAll();
  }
  function setSide(s) {
    side = s;
    E.flip.classList.toggle('is-back', s === 'back');
    $$('[data-side]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.side === s)));
    updatePhotoTools();
  }
  function updatePhotoTools() {
    const isPhoto = S.design.type === 'photo' && !!photo;
    E.zoomCtl.hidden = !isPhoto || side !== 'front';
    E.faceFront.classList.toggle('is-photo', isPhoto);
    E.dragHint.hidden = !isPhoto || side !== 'front';
  }

  /* fotoğrafı sürükleyerek konumlandırma */
  function bindPan() {
    let drag = null;
    E.faceFront.addEventListener('pointerdown', e => {
      if (S.design.type !== 'photo' || !photo || side !== 'front') return;
      drag = { x: e.clientX, y: e.clientY, cx: S.crop.x, cy: S.crop.y };
      E.faceFront.setPointerCapture(e.pointerId);
      E.dragHint.style.opacity = '0';
    });
    E.faceFront.addEventListener('pointermove', e => {
      if (!drag) return;
      const cv = E.cvFront, dpr = cv.width / cv.getBoundingClientRect().width;
      const r = GM.Card.coverRect(photo.w, photo.h, cv.width, cv.height, S.crop);
      const spanX = cv.width - r.w, spanY = cv.height - r.h;
      if (spanX) S.crop.x = Math.min(1, Math.max(0, drag.cx + (e.clientX - drag.x) * dpr / spanX));
      if (spanY) S.crop.y = Math.min(1, Math.max(0, drag.cy + (e.clientY - drag.y) * dpr / spanY));
      drawAll();
    });
    const end = () => { if (drag) { drag = null; drawAll(); } };
    E.faceFront.addEventListener('pointerup', end);
    E.faceFront.addEventListener('pointercancel', end);
    E.zoom.addEventListener('input', () => { S.crop.zoom = +E.zoom.value; drawAll(); });
  }

  /* ============ 1. tasarım ============ */
  function buildThemes() {
    E.themePick.innerHTML = GM.THEMES.map(t =>
      `<button type="button" class="tpick__item" role="radio" aria-checked="false" data-theme="${t.id}" aria-label="${esc(t.name)}"><img src="${themeSrc(t.id)}" alt="" width="740" height="525" loading="lazy" decoding="async"><span>${esc(t.name)}</span></button>`
    ).join('') + `<button type="button" class="tpick__upload" role="radio" aria-checked="false" data-theme="photo">${icon('i-camera')}<span>Kendi fotoğrafın</span></button>`;
    radios(E.themePick, '[data-theme]', (b, fromKey) => {
      if (b.dataset.theme === 'photo') { if (photo) useDesign({ type: 'photo' }); else if (!fromKey) E.photoInput.click(); }
      else useDesign({ type: 'theme', themeId: b.dataset.theme });
    });
    E.photoInput.addEventListener('change', () => { const f = E.photoInput.files[0]; if (f) handlePhoto(f); E.photoInput.value = ''; });
  }
  function useDesign(d) {
    S.design = d;
    if (d.type === 'theme') S.lastTheme = d.themeId;
    syncDesign();
    loadFront();
    setSide('front');
    save();
  }
  function syncDesign() {
    setChecked(E.themePick, '[data-theme]', b => (S.design.type === 'photo' ? b.dataset.theme === 'photo' : b.dataset.theme === S.design.themeId));
    if (S.design.type === 'photo' && photo) {
      E.photoInfo.hidden = false;
      E.photoInfo.innerHTML = `<img src="${photo.thumb}" alt=""><div class="photo-info__txt"><strong>${esc(photo.name)}</strong>${photo.w} × ${photo.h} piksel${photo.low ? '<br><span class="warn">Bu fotoğraf baskıda biraz bulanık görünebilir; daha büyük bir fotoğraf önerilir.</span>' : '<br>Baskı kalitesi için uygun.'}</div><button type="button" class="btn-text" data-change-photo>Değiştir</button>`;
      $('[data-change-photo]', E.photoInfo).addEventListener('click', () => E.photoInput.click());
      E.zoom.value = S.crop.zoom;
    } else E.photoInfo.hidden = true;
    updatePhotoTools();
  }
  async function handlePhoto(file) {
    if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) { GM.toast('Lütfen bir fotoğraf dosyası seç.', 'error'); return; }
    if (file.size > 25 * 1024 * 1024) { GM.toast('Fotoğraf 25 MB’tan küçük olmalı.', 'error'); return; }
    const url = URL.createObjectURL(file);
    try {
      const src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
      const max = 2400, s = Math.min(1, max / Math.max(src.naturalWidth, src.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(src.naturalWidth * s); c.height = Math.round(src.naturalHeight * s);
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.9);
      const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = dataUrl; });
      const t = document.createElement('canvas'); t.width = 148; t.height = 105;
      GM.Card.drawFront(t.getContext('2d'), img, null);
      photo = { img, w: src.naturalWidth, h: src.naturalHeight, name: file.name.slice(0, 60), low: Math.max(src.naturalWidth, src.naturalHeight) < 1400, thumb: t.toDataURL('image/jpeg', 0.8) };
      S.crop = { zoom: 1, x: 0.5, y: 0.5 };
      useDesign({ type: 'photo' });
      GM.toast('Fotoğrafın yüklendi. Kartın üzerinde sürükleyerek konumlandırabilirsin.', 'ok');
    } catch (e) {
      GM.toast('Bu fotoğraf açılamadı. JPG ya da PNG biçiminde bir fotoğraf dene.', 'error');
    } finally { URL.revokeObjectURL(url); }
  }

  /* ============ 2. mesaj ============ */
  function buildMessage() {
    E.fontPick.innerHTML = GM.FONTS.map(f => `<button type="button" role="radio" aria-checked="false" data-font="${f.id}"><b style="font-family:'${f.family}',cursive;font-weight:${f.weight}">Yarın</b><span>${esc(f.name)}</span></button>`).join('');
    E.inkPick.innerHTML = GM.INKS.map(i => `<button type="button" role="radio" aria-checked="false" data-ink="${i.id}" style="--c:${i.color}" aria-label="${esc(i.name)}" title="${esc(i.name)}"></button>`).join('');
    radios(E.fontPick, '[data-font]', b => { S.fontId = b.dataset.font; syncMessage(); GM.Card.loadFonts(S.fontId).then(drawAll); save(); });
    radios(E.inkPick, '[data-ink]', b => { S.inkId = b.dataset.ink; syncMessage(); drawAll(); save(); });
    $$('[data-rtype]').forEach(b => b.addEventListener('click', () => setRtype(b.dataset.rtype)));
    E.msg.maxLength = MAXLEN;
    E.msg.addEventListener('input', () => { S.message = E.msg.value; counter(); clearErr('message'); drawAll(); save(); });
    E.msg.addEventListener('focus', () => setSide('back'));
    E.to.addEventListener('input', () => { S.to = E.to.value; clearErr('to'); drawAll(); save(); });
    E.to.addEventListener('focus', () => setSide('back'));
    E.from.addEventListener('input', () => { S.from = E.from.value; drawAll(); save(); });
    E.from.addEventListener('focus', () => setSide('back'));
    let last = -1;
    E.inspireBtn.addEventListener('click', () => {
      let i; do { i = Math.floor(Math.random() * GM.PROMPTS.length); } while (i === last && GM.PROMPTS.length > 1);
      last = i;
      E.inspireQ.hidden = false;
      E.inspireQ.textContent = GM.PROMPTS[i];
      E.inspireQ.style.animation = 'none'; void E.inspireQ.offsetWidth; E.inspireQ.style.animation = '';
    });
  }
  function setRtype(t) {
    S.rtype = t;
    if (t === 'other' && /^gelecekteki ben$/i.test(S.to.trim())) S.to = '';
    if (t === 'self' && !S.to.trim()) S.to = 'Gelecekteki Ben';
    S.self = t === 'self';
    syncMessage(); syncAddress(); drawAll(); save();
    if (t === 'other') E.to.focus();
  }
  function counter() {
    const n = S.message.length;
    E.msgCount.textContent = `${GM.num(n)} / ${GM.num(MAXLEN)}`;
    E.msgCount.classList.toggle('is-warn', n > MAXLEN * 0.9);
  }
  function syncMessage() {
    $$('[data-rtype]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rtype === S.rtype)));
    E.to.value = S.to; E.msg.value = S.message; E.from.value = S.from;
    setChecked(E.fontPick, '[data-font]', b => b.dataset.font === S.fontId);
    setChecked(E.inkPick, '[data-ink]', b => b.dataset.ink === S.inkId);
    counter();
  }

  /* ============ 3. tarih ============ */
  function buildDate() {
    const cfgD = CFG.delivery || {};
    E.dateSub.textContent = `En erken ${cfgD.minDays || 30} gün, en geç ${cfgD.maxYears || 10} yıl sonrası.`;
    E.presetPick.innerHTML = GM.PRESETS.filter(p => !p.months || p.months <= 12 * (cfgD.maxYears || 10))
      .map(p => `<button type="button" class="chip" role="radio" aria-checked="false" data-preset="${p.id}">${esc(p.label)}</button>`).join('');
    E.date.min = GM.date.toYMD(GM.date.min());
    E.date.max = GM.date.toYMD(GM.date.max());
    radios(E.presetPick, '[data-preset]', b => setPreset(b.dataset.preset));
    E.date.addEventListener('change', () => { S.date = E.date.value; clearErr('date'); syncDate(true); save(); });
    E.date.addEventListener('input', () => { if (GM.date.fromYMD(E.date.value)) { S.date = E.date.value; syncDate(true); } });
  }
  function setPreset(id) {
    S.preset = id;
    const p = GM.PRESETS.find(x => x.id === id);
    if (p && p.months) S.date = GM.date.toYMD(GM.date.addMonths(today, p.months));
    else if (!GM.date.inRange(GM.date.fromYMD(S.date))) S.date = GM.date.toYMD(GM.date.min());
    clearErr('date');
    syncDate(true); save();
    if (id === 'custom') E.date.focus();
  }
  function syncDate(bump) {
    setChecked(E.presetPick, '[data-preset]', b => b.dataset.preset === S.preset);
    E.customDateField.hidden = S.preset !== 'custom';
    E.date.value = S.date;
    const d = GM.date.fromYMD(S.date);
    const ok = GM.date.inRange(d);
    if (d) {
      E.calM.textContent = d.toLocaleDateString('tr-TR', { month: 'short' }).replace('.', '');
      E.calD.textContent = d.getDate();
      E.calY.textContent = d.getFullYear();
      E.dateLong.textContent = GM.date.full(d);
      const days = GM.date.diffDays(today, d);
      E.dateCount.textContent = ok ? `${GM.num(days)} gün sonra${days >= 365 ? ` · yaklaşık ${humanSpan(d)}` : ''}` : 'Bu tarih seçilebilir aralığın dışında.';
    }
    const pr = GM.price(S.date, S.addons);
    E.tierInfo.textContent = pr.extra
      ? `Bu tarih için fiyat ${GM.money(pr.base + pr.extra)}: standart ${GM.money(pr.base)} + ${GM.money(pr.extra)} uzun süreli saklama farkı.`
      : `Bu tarih için saklama farkı yok: ${GM.money(pr.base)}.`;
    if (bump && !GM.reducedMotion) { E.dateDisplay.classList.remove('is-bump'); void E.dateDisplay.offsetWidth; E.dateDisplay.classList.add('is-bump'); }
    updateTotal();
    drawAll();
  }
  function humanSpan(d) {
    let m = (d.getFullYear() - today.getFullYear()) * 12 + d.getMonth() - today.getMonth();
    if (d.getDate() < today.getDate()) m--;
    const y = Math.floor(m / 12), mm = m % 12;
    return [y ? `${y} yıl` : '', mm ? `${mm} ay` : ''].filter(Boolean).join(' ');
  }

  /* ============ 4. adres ============ */
  const addrFields = { sName: 'fSName', sEmail: 'fSEmail', sPhone: 'fSPhone', rName: 'fRName', city: 'fCity', district: 'fDistrict', address: 'fAddr', postcode: 'fZip', note: 'fNote' };
  function buildAddress() {
    E.city.innerHTML = '<option value="">Seç</option>' + GM.PROVINCES.slice().sort((a, b) => a.localeCompare(b, 'tr')).map(p => `<option>${esc(p)}</option>`).join('');
    Object.entries(addrFields).forEach(([k, id]) => {
      const el = document.getElementById(id);
      el.addEventListener('input', () => {
        if (k === 'postcode') el.value = digits(el.value).slice(0, 5);
        S[k] = el.value; clearErr(k);
        if (k === 'sName' && S.self) { E.rName.value = S.sName; clearErr('rName'); }
        save();
      });
      el.addEventListener('change', () => { S[k] = el.value; save(); });
    });
    E.self.addEventListener('change', () => { S.self = E.self.checked; syncAddress(); save(); });
    E.surprise.addEventListener('change', () => { S.surprise = E.surprise.checked; save(); });
  }
  function syncAddress() {
    Object.entries(addrFields).forEach(([k, id]) => { const el = document.getElementById(id); if (el.value !== S[k]) el.value = S[k] || ''; });
    E.self.checked = S.self;
    E.rName.disabled = S.self;
    if (S.self) E.rName.value = S.sName;
    E.surprise.checked = S.surprise;
  }

  /* ============ 5. onay ============ */
  function buildConfirm() {
    const P = CFG.pricing || { addons: [] };
    E.addonPick.innerHTML = (P.addons || []).map(a =>
      `<label class="addon"><input type="checkbox" class="check-input" data-addon="${esc(a.id)}"><span class="addon__txt"><strong>${esc(a.label)}</strong><span>${esc(a.desc || '')}</span></span><span class="addon__price">+${GM.money(a.price)}</span></label>`).join('');
    $$('[data-addon]', E.addonPick).forEach(cb => {
      cb.style.accentColor = 'var(--rust)';
      cb.addEventListener('change', () => {
        S.addons = $$('[data-addon]', E.addonPick).filter(x => x.checked).map(x => x.dataset.addon);
        renderBill(); updateTotal(); save();
      });
    });
    const pay = [{ id: 'havale', icon: 'i-bank', title: 'Havale / EFT', text: 'Açıklamaya sipariş numaranı yazman yeterli.' }];
    if (CFG.payment && CFG.payment.cardPaymentUrl) pay.push({ id: 'kart', icon: 'i-card', title: 'Kredi / banka kartı', text: 'Güvenli ödeme sayfasına yönlendirilirsin.' });
    if (!pay.find(p => p.id === S.payment)) S.payment = 'havale';
    E.payPick.innerHTML = pay.map(p => `<label><input type="radio" name="pay" value="${p.id}">${icon(p.icon)}<span><strong>${p.title}</strong><span>${p.text}</span></span></label>`).join('');
    $$('input[name=pay]', E.payPick).forEach(r => r.addEventListener('change', () => { S.payment = r.value; save(); }));
    E.contract.addEventListener('change', () => { S.contract = E.contract.checked; clearErr('contract'); });
    E.marketing.addEventListener('change', () => { S.marketing = E.marketing.checked; save(); });
    E.summary.addEventListener('click', e => { const b = e.target.closest('[data-edit]'); if (b) go(+b.dataset.edit); });
  }
  function syncConfirm() {
    $$('[data-addon]', E.addonPick).forEach(cb => { cb.checked = S.addons.includes(cb.dataset.addon); });
    $$('input[name=pay]', E.payPick).forEach(r => { r.checked = r.value === S.payment; });
    E.contract.checked = S.contract; E.marketing.checked = S.marketing;
  }
  function renderSummary() {
    const d = GM.date.fromYMD(S.date);
    const msg = S.message.trim().replace(/\s+/g, ' ');
    const rows = [
      ['Tasarım', S.design.type === 'photo' ? 'Kendi fotoğrafın' : themeName(S.design.themeId), 1],
      ['Mesaj', `“${msg.length > 70 ? msg.slice(0, 70) + '…' : msg}” (${GM.num(S.message.trim().length)} karakter)`, 2],
      ['Yola çıkış', d ? GM.date.full(d) : '', 3],
      ['Alıcı', `${S.self ? S.sName : S.rName} · ${S.district} / ${S.city}`, 4],
      ['Gönderen', `${S.sName} · ${S.sEmail}${S.surprise ? ' · sürpriz' : ''}`, 4],
    ];
    E.summary.innerHTML = rows.map(([k, v, st]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd><button type="button" class="edit" data-edit="${st}" aria-label="${k} bilgisini düzenle">Düzenle</button></div>`).join('');
    renderBill();
  }
  function renderBill() {
    const p = GM.price(S.date, S.addons);
    E.bill.innerHTML = `<div><span>Standart kartpostal</span><span>${GM.money(p.base)}</span></div>` +
      (p.extra ? `<div><span>Uzun süreli saklama (${p.tier.maxYears} yıla kadar)</span><span>+${GM.money(p.extra)}</span></div>` : '') +
      p.addons.map(a => `<div><span>${esc(a.label)}</span><span>+${GM.money(a.price)}</span></div>`).join('') +
      `<div class="bill__total"><span>Toplam (KDV dahil)</span><span>${GM.money(p.total)}</span></div>`;
  }
  function updateTotal() {
    const t = GM.price(S.date, S.addons).total;
    E.navTotal.textContent = GM.money(t);
    if (S.step === 5) E.next.innerHTML = `Siparişi tamamla · ${GM.money(t)}`;
  }

  /* ============ doğrulama ============ */
  function setErr(key, on) {
    const f = $(`[data-field="${key}"]`, E.form);
    if (f) f.classList.toggle('is-invalid', on);
  }
  function clearErr(key) { setErr(key, false); }
  function check(step) {
    const bad = [];
    if (step === 2) {
      if (!S.to.trim()) bad.push('to');
      if (S.message.trim().length < 3 || (lastFit && !lastFit.fits)) bad.push('message');
    }
    if (step === 3) {
      if (!GM.date.inRange(GM.date.fromYMD(S.date))) bad.push('date');
    }
    if (step === 4) {
      if (S.sName.trim().length < 3) bad.push('sName');
      if (!emailOk(S.sEmail)) bad.push('sEmail');
      if (!phoneOk(S.sPhone)) bad.push('sPhone');
      if (!S.self && S.rName.trim().length < 3) bad.push('rName');
      if (!S.city) bad.push('city');
      if (S.district.trim().length < 2) bad.push('district');
      if (S.address.trim().length < 10) bad.push('address');
      if (S.postcode && !/^\d{5}$/.test(S.postcode)) bad.push('postcode');
    }
    if (step === 5 && !S.contract) bad.push('contract');
    return bad;
  }
  function validate(step) {
    const bad = check(step);
    $$(`[data-step="${step}"] [data-field]`, E.form).forEach(f => f.classList.toggle('is-invalid', bad.includes(f.dataset.field)));
    if (bad.length) {
      const f = $(`[data-step="${step}"] [data-field="${bad[0]}"]`, E.form);
      const input = f && $('input, textarea, select', f);
      if (step === 2) setSide('back');
      if (input) input.focus({ preventScroll: false });
      E.panel.classList.remove('shake'); void E.panel.offsetWidth; E.panel.classList.add('shake');
      if (step === 2 && bad.includes('message') && !lastFit.fits) GM.toast('Mesajın karta sığmıyor, biraz kısaltman gerekiyor.', 'error');
      if (step === 5) GM.toast('Devam etmek için sözleşmeyi onaylaman gerekiyor.', 'error');
    }
    return !bad.length;
  }

  /* ============ adımlar ============ */
  function go(n, opts) {
    n = Math.max(1, Math.min(5, n));
    const back = n < S.step;
    S.step = n;
    S.maxStep = Math.max(S.maxStep, n);
    $$('.wstep', E.form).forEach(s => {
      const on = +s.dataset.step === n;
      s.classList.toggle('is-active', on);
      s.classList.toggle('from-left', on && back);
    });
    $$('[data-goto]', E.stepper).forEach(b => {
      const i = +b.dataset.goto;
      b.disabled = i > S.maxStep;
      b.classList.toggle('is-done', i < n || (i <= S.maxStep && i !== n && !check(i).length));
      if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    E.prev.hidden = n === 1;
    E.next.innerHTML = n === 5 ? `Siparişi tamamla · ${GM.money(GM.price(S.date, S.addons).total)}` : `Devam ${icon('i-arrow').replace('class="icon"', 'class="icon icon--arrow"')}`;
    if (n === 1) setSide('front');
    if (n === 2) setSide('back');
    if (n === 3) { syncDate(false); setSide('back'); }
    if (n === 5) { renderSummary(); syncConfirm(); }
    save();
    if (!(opts && opts.noScroll)) {
      const top = E.panel.getBoundingClientRect().top;
      if (top < 0 || top > innerHeight * 0.6) E.panel.scrollIntoView({ behavior: GM.reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
    if (!(opts && opts.noFocus)) { const t = $(`.wstep[data-step="${n}"] .wstep__title`, E.form); if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); } }
  }
  function next() {
    if (!validate(S.step)) return;
    if (S.step < 5) go(S.step + 1); else submit();
  }

  /* ============ gönderim ============ */
  function orderPayload(files) {
    const p = GM.price(S.date, S.addons);
    return {
      v: 1,
      createdAt: new Date().toISOString(),
      writtenDate: GM.date.toYMD(today),
      design: S.design.type === 'photo' ? { type: 'photo', name: photo && photo.name, width: photo && photo.w, height: photo && photo.h, crop: S.crop } : { type: 'theme', id: S.design.themeId, name: themeName(S.design.themeId) },
      card: { to: S.to.trim(), message: S.message.trim(), from: S.from.trim(), font: S.fontId, ink: S.inkId },
      delivery: { date: S.date, preset: S.preset },
      recipient: { self: S.self, name: (S.self ? S.sName : S.rName).trim(), city: S.city, district: S.district.trim(), address: S.address.trim(), postcode: S.postcode },
      sender: { name: S.sName.trim(), email: S.sEmail.trim(), phone: S.sPhone.trim() },
      surprise: S.surprise, note: S.note.trim(),
      addons: S.addons.slice(), payment: S.payment,
      price: { base: p.base, extra: p.extra, addons: p.addons.map(a => ({ id: a.id, label: a.label, price: a.price })), total: p.total },
      consents: { contract: true, marketing: !!S.marketing, noticeShown: true, at: new Date().toISOString() },
      files: files ? { front: files.front, back: files.back } : null,
      website: E.hp.value,
    };
  }
  async function postOrder(payload) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      const r = await fetch(CFG.orderEndpoint, { method: 'POST', body: JSON.stringify(payload), signal: ctrl.signal, redirect: 'follow' });
      const data = await r.json();
      return data;
    } finally { clearTimeout(timer); }
  }
  async function submit() {
    if (sending) return;
    for (let s = 2; s <= 5; s++) { if (check(s).length) { go(s); validate(s); return; } }
    if (E.hp.value) return; // bot
    sending = true;
    E.next.disabled = true;
    E.next.textContent = 'Kartpostalın hazırlanıyor…';
    try {
      await GM.Card.loadFonts(S.fontId);
      let files = null;
      try { files = await GM.Card.renderPrint(frontImg, S.design.type === 'photo' ? S.crop : null, backData()); }
      catch (e) { files = null; }
      const payload = orderPayload(files);
      E.next.textContent = 'Gönderiliyor…';
      let res;
      if (GM.isDemo) {
        await wait(1100);
        res = { ok: true, orderId: 'GM-DEMO' + Math.random().toString(36).slice(2, 6).toUpperCase(), demo: true };
      } else {
        res = await postOrder(payload);
      }
      if (!res || !res.ok) throw new Error((res && res.error) || 'Sipariş kaydedilemedi');
      const list = GM.store.get(ORDERS_KEY, []);
      list.unshift({ id: res.orderId, email: payload.sender.email, date: payload.delivery.date, at: payload.createdAt });
      GM.store.set(ORDERS_KEY, list.slice(0, 20));
      GM.store.del(DRAFT_KEY);
      showSuccess(res, payload);
    } catch (e) {
      const msg = e && e.name === 'AbortError' ? 'Bağlantı zaman aşımına uğradı.' : (e && e.message) || 'Bir sorun oluştu.';
      GM.toast(`${msg} Lütfen tekrar dene; sorun sürerse bize yaz.`, 'error');
    } finally {
      sending = false;
      E.next.disabled = false;
      updateTotal();
      if (S.step === 5) E.next.innerHTML = `Siparişi tamamla · ${GM.money(GM.price(S.date, S.addons).total)}`;
    }
  }

  /* ============ başarı ekranı ============ */
  let lastFocus = null;
  function openModal(m) {
    lastFocus = document.activeElement;
    m.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add('is-open')));
    document.body.style.overflow = 'hidden';
    m._trap = e => {
      if (e.key === 'Escape') { closeModal(m); return; }
      if (e.key !== 'Tab') return;
      const f = $$('a[href], button:not([disabled]), input, [tabindex="0"]', m).filter(x => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', m._trap);
  }
  function closeModal(m) {
    m.classList.remove('is-open');
    document.removeEventListener('keydown', m._trap);
    document.body.style.overflow = '';
    setTimeout(() => { m.hidden = true; }, 380);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function showSuccess(res, order) {
    const d = GM.date.fromYMD(order.delivery.date);
    const days = GM.date.diffDays(today, d);
    const P = CFG.payment || {};
    const total = typeof res.total === 'number' ? res.total : order.price.total; // sunucunun hesapladığı tutar esas
    $('#orderCode').textContent = res.orderId;
    $('#successLead').textContent = `Kartpostalın ${GM.date.long(d)} tarihinde yola çıkacak. Şimdiden ${GM.num(days)} gün kaldı.`;
    let payHtml;
    if (order.payment === 'kart' && P.cardPaymentUrl) {
      payHtml = `<h3>Ödeme · Kart</h3><p>Ödeme sayfasında açıklama alanına <strong>${esc(res.orderId)}</strong> yaz. Tutar: <strong>${GM.money(total)}</strong></p><p style="margin-top:10px"><a class="btn btn--sm" href="${esc(P.cardPaymentUrl)}" target="_blank" rel="noopener">${icon('i-lock')}Kartla öde</a></p>`;
    } else {
      const iban = P.iban || '[IBAN config.js dosyasında tanımlanacak]';
      payHtml = `<h3>Ödeme · Havale / EFT</h3><p>Tutar: <strong>${GM.money(total)}</strong> · Açıklama: <strong>${esc(res.orderId)}</strong></p>
        <div class="iban"><span id="ibanText">${esc(iban)}</span>${P.iban ? `<button type="button" class="copy-btn" data-copy="#ibanText">${icon('i-copy')}Kopyala</button>` : ''}</div>
        <p>${P.ibanHolder ? 'Alıcı: ' + esc(P.ibanHolder) : ''}${P.bankName ? ' · ' + esc(P.bankName) : ''}</p>`;
    }
    $('#successDetails').innerHTML = `<div class="success__card">${payHtml}</div>
      <div class="success__card"><h3>Sırada ne var?</h3><p>${res.demo ? '<strong>Önizleme modu:</strong> bu sipariş kaydedilmedi. Sipariş sistemi bağlandığında müşterine burada onay bilgisi gösterilecek.' : `Onay e-postası <strong>${esc(order.sender.email)}</strong> adresine gönderildi. Ödemen ulaşınca kartpostalın basılıp arşive alınır ve sana haber veririz.`}</p></div>`;
    $('#trackLink').href = `takip.html?no=${encodeURIComponent(res.orderId)}`;
    const env = $('#env');
    env.classList.remove('is-go'); void env.offsetWidth; env.classList.add('is-go');
    openModal(E.success);
    setTimeout(() => $('#successTitle').focus({ preventScroll: true }), 60);
    lastOrder = order;
  }
  let lastOrder = null;

  async function storyImage() {
    if (!lastOrder) return;
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
    const x = c.getContext('2d');
    await Promise.all([document.fonts.load('400 80px "GM Fraunces"'), document.fonts.load('italic 400 80px "GM Fraunces"'), document.fonts.load('600 30px "GM Sans"')]).catch(() => {});
    const g = x.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, '#f7f0e4'); g.addColorStop(1, '#ecdcc2');
    x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
    // uçak postası şeritleri
    const stripes = y => { x.save(); x.beginPath(); x.rect(0, y, 1080, 26); x.clip(); for (let i = -2; i < 60; i++) { x.fillStyle = ['#b5451b', '#fbf6ec', '#2c4a6e', '#fbf6ec'][((i % 4) + 4) % 4]; x.beginPath(); x.moveTo(i * 24, y + 26); x.lineTo(i * 24 + 26, y); x.lineTo(i * 24 + 50, y); x.lineTo(i * 24 + 24, y + 26); x.fill(); } x.restore(); };
    stripes(0); stripes(1894);
    x.fillStyle = '#b5451b'; x.textAlign = 'center';
    x.font = '600 30px "GM Sans", sans-serif';
    x.fillText('G E L E C E Ğ E   M E K T U P', 540, 150);
    // kart
    x.save(); x.translate(540, 700); x.rotate(-0.06);
    x.shadowColor = 'rgba(44,26,14,.35)'; x.shadowBlur = 60; x.shadowOffsetY = 26;
    x.fillStyle = '#fffdf7'; x.fillRect(-430, -310, 860, 620);
    x.shadowColor = 'transparent';
    const inner = document.createElement('canvas'); inner.width = 820; inner.height = Math.round(820 * 105 / 148);
    GM.Card.drawFront(inner.getContext('2d'), frontImg, S.design.type === 'photo' ? S.crop : null);
    x.drawImage(inner, -410, -290, 820, 580);
    x.restore();
    // damga
    x.save(); x.translate(820, 1010); x.rotate(0.2);
    x.strokeStyle = 'rgba(38,50,88,.75)'; x.fillStyle = 'rgba(38,50,88,.75)'; x.lineWidth = 5;
    x.beginPath(); x.arc(0, 0, 118, 0, Math.PI * 2); x.stroke(); x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 80, 0, Math.PI * 2); x.stroke();
    x.font = '700 24px "GM Sans", sans-serif'; x.fillText('YOLA ÇIKIŞ', 0, -12);
    x.font = '400 54px "GM Fraunces", serif'; x.fillText(String(GM.date.fromYMD(lastOrder.delivery.date).getFullYear()), 0, 44);
    x.restore();
    const d = GM.date.fromYMD(lastOrder.delivery.date);
    x.fillStyle = '#2c1a0e';
    x.font = '350 86px "GM Fraunces", serif'; x.fillText('Geleceğe bir mektup', 540, 1270);
    x.font = 'italic 350 86px "GM Fraunces", serif'; x.fillStyle = '#b5451b'; x.fillText('bıraktım.', 540, 1370);
    x.fillStyle = '#5c3d2e'; x.font = '500 40px "GM Sans", sans-serif';
    x.fillText(`Yola çıkış: ${GM.date.long(d)}`, 540, 1500);
    x.font = '400 150px "GM Fraunces", serif'; x.fillStyle = '#2c1a0e';
    x.fillText(GM.num(GM.date.diffDays(today, d)), 540, 1680);
    x.font = '600 30px "GM Sans", sans-serif'; x.fillStyle = '#74594a';
    x.fillText('GÜN SONRA', 540, 1735);
    x.fillText((CFG.siteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, ''), 540, 1840);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const file = new File([blob], 'gelecege-mektup.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Geleceğe Mektup' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'gelecege-mektup.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function copy(sel, btn) {
    const txt = ($(sel) || {}).textContent || '';
    const done = () => { const o = btn.innerHTML; btn.textContent = 'Kopyalandı!'; setTimeout(() => { btn.innerHTML = o; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt.replace(/\s+/g, ' ').trim()).then(done, () => GM.toast('Kopyalanamadı, elle seçebilirsin.'));
    else GM.toast('Kopyalanamadı, elle seçebilirsin.');
  }

  /* ============ mobil önizleme ============ */
  let peekSide = 'back';
  function drawPeek() {
    const cv = E.peekCanvas;
    const w = cv.getBoundingClientRect().width || 600;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * 105 / 148);
    const ctx = cv.getContext('2d');
    if (peekSide === 'front') drawFront(ctx); else GM.Card.drawBack(ctx, { k: cv.width / 148, data: backData() });
    $$('[data-peek]', E.peek).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.peek === peekSide)));
  }

  /* ============ dışarıdan çağrılanlar ============ */
  function scrollToStudio() { $('#atolye').scrollIntoView({ behavior: GM.reducedMotion ? 'auto' : 'smooth', block: 'start' }); }
  const Builder = GM.Builder = {
    selectTheme(id, opts) {
      useDesign({ type: 'theme', themeId: id });
      if (S.step !== 1) go(1, { noScroll: true, noFocus: true });
      if (opts && opts.scroll) scrollToStudio();
      GM.toast(`“${themeName(id)}” seçildi.`);
    },
    openUpload() { E.photoInput.click(); scrollToStudio(); if (S.step !== 1) go(1, { noScroll: true, noFocus: true }); },
    applyOccasion(o) {
      if (!o) return;
      S.rtype = o.recipientType; S.self = o.recipientType === 'self';
      S.to = o.to || '';
      const starters = GM.OCCASIONS.map(x => x.starter.trim());
      if (!S.message.trim() || starters.includes(S.message.trim())) S.message = o.starter;
      if (o.preset === 'yearend') {
        let d = new Date(today.getFullYear(), 11, 24);
        if (d < GM.date.min()) d = new Date(today.getFullYear() + 1, 11, 24);
        S.preset = 'custom'; S.date = GM.date.toYMD(d);
      } else setPreset(o.preset);
      S.design = { type: 'theme', themeId: o.theme }; S.lastTheme = o.theme;
      syncAll(); loadFront();
      S.maxStep = Math.max(S.maxStep, 2);
      go(2, { noScroll: true, noFocus: true });
      scrollToStudio();
      setTimeout(() => { E.msg.focus({ preventScroll: true }); E.msg.setSelectionRange(E.msg.value.length, E.msg.value.length); }, 700);
      GM.toast(`“${o.title}” için atölye hazır. Yazmaya başlayabilirsin.`);
      save();
    },
  };

  function syncAll() { syncDesign(); syncMessage(); syncDate(false); syncAddress(); syncConfirm(); updateTotal(); }

  function restore() {
    const d = GM.store.get(DRAFT_KEY, null);
    if (!d || typeof d !== 'object') return;
    const base = fresh();
    Object.keys(base).forEach(k => { if (d[k] !== undefined && typeof d[k] === typeof base[k]) S[k] = d[k]; });
    if (!S.design || S.design.type !== 'theme' || !GM.THEMES.find(t => t.id === S.design.themeId)) S.design = { type: 'theme', themeId: S.lastTheme || 'istanbul' };
    if (!GM.date.inRange(GM.date.fromYMD(S.date))) { S.preset = '1y'; S.date = base.date; }
    const hadContent = S.message.trim() || S.sName;
    S.step = 1;
    if (hadContent) setTimeout(() => GM.toast(d.design && d.design.hadPhoto ? 'Taslağın geri yüklendi. Fotoğrafını yeniden yüklemen gerekiyor.' : 'Kaldığın yerden devam edebilirsin: taslağın geri yüklendi.'), 900);
  }

  function init() {
    E.form = $('#orderForm');
    if (!E.form) return;
    ['flip', 'faceFront', 'cvFront', 'cvBack', 'dragHint', 'zoomCtl', 'zoom', 'themePick', 'photoInput', 'photoInfo', 'fontPick', 'inkPick', 'msgCount', 'fitWarn', 'inspireBtn', 'inspireQ', 'presetPick', 'customDateField', 'dateDisplay', 'calM', 'calD', 'calY', 'dateLong', 'dateCount', 'tierInfo', 'dateSub', 'summary', 'addonPick', 'bill', 'payPick', 'stepper', 'navTotal', 'peekCanvas']
      .forEach(id => { E[id] = document.getElementById(id); });
    Object.assign(E, {
      panel: $('.panel'), prev: $('#prevBtn'), next: $('#nextBtn'),
      msg: $('#fMsg'), to: $('#fTo'), from: $('#fFrom'), date: $('#fDate'),
      city: $('#fCity'), rName: $('#fRName'), self: $('#fSelf'), surprise: $('#fSurprise'),
      contract: $('#fContract'), marketing: $('#fMarketing'), hp: $('#fWebsite'),
      success: $('#successModal'), peek: $('#peekModal'),
    });
    $('#demoBanner').hidden = !GM.isDemo;

    restore();
    buildThemes(); buildMessage(); buildDate(); buildAddress(); buildConfirm();
    syncAll();
    bindPan();
    go(1, { noScroll: true, noFocus: true });

    E.next.addEventListener('click', next);
    E.prev.addEventListener('click', () => go(S.step - 1));
    E.stepper.addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (b && !b.disabled) go(+b.dataset.goto); });
    E.form.addEventListener('submit', e => { e.preventDefault(); next(); });
    E.form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); next(); } });
    $$('[data-side]').forEach(b => b.addEventListener('click', () => setSide(b.dataset.side)));

    // önizleme penceresi
    $('#peekBtn').addEventListener('click', () => { peekSide = 'back'; openModal(E.peek); requestAnimationFrame(drawPeek); });
    E.peek.addEventListener('click', e => {
      if (e.target === E.peek || e.target.closest('[data-close]')) closeModal(E.peek);
      const b = e.target.closest('[data-peek]'); if (b) { peekSide = b.dataset.peek; drawPeek(); }
    });
    // başarı penceresi
    E.success.addEventListener('click', e => {
      const c = e.target.closest('[data-copy]'); if (c) copy(c.dataset.copy, c);
      if (e.target === E.success) closeModal(E.success);
    });
    $('#shareBtn').addEventListener('click', () => storyImage().catch(() => GM.toast('Görsel oluşturulamadı.', 'error')));
    $('#newCardBtn').addEventListener('click', () => {
      const keep = { sName: S.sName, sEmail: S.sEmail, sPhone: S.sPhone };
      S = Object.assign(fresh(), keep);
      photo = null;
      syncAll(); loadFront(); go(1, { noFocus: true });
      closeModal(E.success);
      scrollToStudio();
    });

    if ('ResizeObserver' in window) new ResizeObserver(debounce(sizeCanvases, 60)).observe(E.flip);
    else window.addEventListener('resize', debounce(sizeCanvases, 120));
    sizeCanvases();
    GM.Card.loadFonts(S.fontId).then(drawAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);
    loadFront();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
