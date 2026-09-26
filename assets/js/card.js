/* Geleceğe Mektup · kartpostal çizimi
   Önizleme ve baskı dosyası AYNI çizim kodunu kullanır; ekranda ne
   görülüyorsa baskıya o gider. Ölçüler milimetre (A6: 148 x 105 mm). */
(function () {
  'use strict';
  const GM = (window.GM = window.GM || {});
  const MM = { W: 148, H: 105, BLEED: 3, DPI: 300 };
  const PAPER = '#fbf6ec';
  const LABEL = '#8c7663';
  const POSTMARK = 'rgba(38,50,88,.62)';

  const fontOf = id => GM.FONTS.find(f => f.id === id) || GM.FONTS[0];
  const inkOf = id => GM.INKS.find(i => i.id === id) || GM.INKS[0];
  const upper = s => s.toLocaleUpperCase('tr-TR');

  const fontJobs = {};
  function loadFonts(fontId) {
    const f = fontOf(fontId);
    if (!fontJobs[f.id]) {
      fontJobs[f.id] = !document.fonts ? Promise.resolve() : Promise.all([
        document.fonts.load(`${f.weight} 40px "${f.family}"`, 'AaĞğŞşİıÇçÖöÜü'),
        document.fonts.load('600 20px "GM Sans"', 'KİME YAZILDI'),
      ]).catch(() => {});
    }
    return fontJobs[f.id];
  }

  const imgCache = new Map();
  function loadImage(src) {
    if (!src) return Promise.resolve(null);
    if (!imgCache.has(src)) {
      imgCache.set(src, new Promise((res, rej) => {
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => res(im);
        im.onerror = () => { imgCache.delete(src); rej(new Error('Görsel yüklenemedi')); };
        im.src = src;
      }));
    }
    return imgCache.get(src);
  }

  /* metni satırlara böl (uzun kelimeleri de böler) */
  function wrap(ctx, text, maxW) {
    const out = [];
    String(text).replace(/\r/g, '').split('\n').forEach(par => {
      if (!par.trim()) { out.push(''); return; }
      let line = '';
      par.split(/ +/).forEach(word => {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width <= maxW) { line = test; return; }
        if (line) out.push(line);
        if (ctx.measureText(word).width <= maxW) { line = word; return; }
        let part = '';
        for (const ch of word) {
          if (ctx.measureText(part + ch).width > maxW && part) { out.push(part); part = ch; } else part += ch;
        }
        line = part;
      });
      out.push(line);
    });
    while (out.length && out[out.length - 1] === '') out.pop();
    return out;
  }

  /* kutuya sığan en büyük yazı boyu */
  function fit(ctx, text, font, boxW, boxH, maxMm, minMm, k) {
    const setFont = mm => { ctx.font = `${font.weight} ${mm * font.scale * k}px "${font.family}", cursive`; };
    const linesAt = mm => { setFont(mm); return wrap(ctx, text, boxW); };
    const heightOf = (mm, n) => n * mm * font.scale * k * font.lh;
    let lo = minMm, hi = maxMm, best = null;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      const lines = linesAt(mid);
      if (heightOf(mid, lines.length) <= boxH) { best = { mm: mid, lines }; lo = mid; } else hi = mid;
    }
    if (!best) {
      const lines = linesAt(minMm);
      const maxLines = Math.max(1, Math.floor(boxH / (minMm * font.scale * k * font.lh)));
      return { mm: minMm, lines: lines.slice(0, maxLines), fits: lines.length <= maxLines, px: minMm * font.scale * k };
    }
    setFont(best.mm);
    return { mm: best.mm, lines: best.lines, fits: true, px: best.mm * font.scale * k };
  }

  function spaced(ctx, text, x, y, spacing, align) {
    const chars = Array.from(text);
    const w = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
    let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    const prev = ctx.textAlign;
    ctx.textAlign = 'left';
    chars.forEach(c => { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + spacing; });
    ctx.textAlign = prev;
  }

  function arcText(ctx, text, cx, cy, r, centerAngle, outside, spacingRad) {
    const chars = Array.from(text);
    const widths = chars.map(c => ctx.measureText(c).width / r + spacingRad);
    const total = widths.reduce((a, b) => a + b, 0) - spacingRad;
    let a = centerAngle - (outside ? total / 2 : -total / 2);
    chars.forEach((c, i) => {
      const w = widths[i] - spacingRad;
      const mid = outside ? a + w / 2 : a - w / 2;
      ctx.save();
      ctx.translate(cx + Math.cos(mid) * r, cy + Math.sin(mid) * r);
      ctx.rotate(outside ? mid + Math.PI / 2 : mid - Math.PI / 2);
      ctx.fillText(c, 0, 0);
      ctx.restore();
      a = outside ? a + widths[i] : a - widths[i];
    });
  }

  function coverRect(iw, ih, W, H, crop) {
    const c = crop || {};
    const zoom = c.zoom || 1;
    const s = Math.max(W / iw, H / ih) * zoom;
    const dw = iw * s, dh = ih * s;
    const px = c.x == null ? 0.5 : c.x, py = c.y == null ? 0.5 : c.y;
    return { x: (W - dw) * px, y: (H - dh) * py, w: dw, h: dh };
  }

  function drawStamp(ctx, x, y, w, h, img, k) {
    ctx.save();
    ctx.shadowColor = 'rgba(60,35,20,.22)';
    ctx.shadowBlur = 0.9 * k;
    ctx.shadowOffsetY = 0.35 * k;
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    // tırtıklı kenar
    const r = 0.62 * k, step = 2.05 * k;
    ctx.fillStyle = PAPER;
    for (let px = x + step / 2; px < x + w; px += step) {
      ctx.beginPath(); ctx.arc(px, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px, y + h, r, 0, Math.PI * 2); ctx.fill();
    }
    for (let py = y + step / 2; py < y + h; py += step) {
      ctx.beginPath(); ctx.arc(x, py, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w, py, r, 0, Math.PI * 2); ctx.fill();
    }
    const ix = x + 2.1 * k, iy = y + 2.1 * k, iw = w - 4.2 * k, ih = h - 4.2 * k;
    ctx.save();
    ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    if (img) {
      const c = coverRect(img.naturalWidth || img.width, img.naturalHeight || img.height, iw, ih);
      ctx.drawImage(img, ix + c.x, iy + c.y, c.w, c.h);
    } else {
      ctx.fillStyle = '#e8d5b7'; ctx.fillRect(ix, iy, iw, ih);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(60,40,25,.25)';
    ctx.lineWidth = Math.max(1, 0.18 * k);
    ctx.strokeRect(ix, iy, iw, ih);
  }

  function drawPostmark(ctx, cx, cy, r, writtenYMD, k) {
    ctx.save();
    ctx.strokeStyle = POSTMARK;
    ctx.fillStyle = POSTMARK;
    ctx.lineWidth = 0.42 * k;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 0.3 * k;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.64, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `700 ${1.75 * k}px "GM Sans", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    arcText(ctx, 'GELECEĞE MEKTUP', cx, cy, r * 0.82, -Math.PI / 2, true, 0.045);
    arcText(ctx, 'ZAMANA BIRAKILDI', cx, cy, r * 0.82, Math.PI / 2, false, 0.04);
    const d = GM.date.fromYMD(writtenYMD) || GM.date.today();
    ctx.font = `700 ${1.9 * k}px "GM Sans", sans-serif`;
    ctx.fillText(GM.date.short(d), cx, cy + 0.1 * k);
    ctx.font = `700 ${1.5 * k}px "GM Sans", sans-serif`;
    ctx.fillText('★', cx - r * 0.82, cy);
    ctx.fillText('★', cx + r * 0.82, cy);
    // dalgalı iptal çizgileri
    ctx.lineWidth = 0.34 * k;
    for (let i = 0; i < 4; i++) {
      const yy = cy + (i - 1.5) * 2.4 * k;
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.02) {
        const xx = cx + r + 1.2 * k + t * 20 * k;
        const w = Math.sin(t * Math.PI * 4) * 0.9 * k;
        t === 0 ? ctx.moveTo(xx, yy + w) : ctx.lineTo(xx, yy + w);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Arka yüz. o = { k: px/mm, ox, oy: kırpma payı ofseti (px), data }
   * data = { message, placeholder, to, from, fontId, inkId, writtenYMD, deliveryYMD, stampImg, postmark }
   */
  function drawBack(ctx, o) {
    const k = o.k, d = o.data || {};
    const X = mm => mm * k;
    const f = fontOf(d.fontId), ink = inkOf(d.inkId).color;
    ctx.save();
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.translate(o.ox || 0, o.oy || 0);
    ctx.textBaseline = 'alphabetic';

    // orta çizgi ve dikey marka yazısı
    ctx.strokeStyle = 'rgba(60,40,25,.22)';
    ctx.lineWidth = Math.max(1, X(0.28));
    ctx.beginPath(); ctx.moveTo(X(91), X(12)); ctx.lineTo(X(91), X(93)); ctx.stroke();
    ctx.save();
    ctx.translate(X(93.2), X(52.5));
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(140,118,99,.8)';
    ctx.font = `600 ${X(1.55)}px "GM Sans", sans-serif`;
    spaced(ctx, 'GELECEĞE MEKTUP  ·  ZAMANA BIRAK, YARIN BULSUN', 0, 0, X(0.28), 'center');
    ctx.restore();

    // mesaj
    const hasMsg = !!(d.message && d.message.trim());
    const text = hasMsg ? d.message.trim() : (d.placeholder || '');
    const box = { x: 9, y: 10, w: 77, h: 75 };
    const fitted = fit(ctx, text, f, X(box.w), X(box.h), 6.6, 3.1, k);
    ctx.fillStyle = hasMsg ? ink : 'rgba(92,61,46,.38)';
    let y = X(box.y) + fitted.px * 0.92;
    fitted.lines.forEach(line => { ctx.fillText(line, X(box.x), y); y += fitted.px * f.lh; });

    // imza
    if (d.from && d.from.trim()) {
      const sMm = Math.min(Math.max(fitted.mm * 1.05, 4.2), 6);
      ctx.font = `${f.weight} ${X(sMm * f.scale)}px "${f.family}", cursive`;
      let sig = '— ' + d.from.trim();
      while (ctx.measureText(sig).width > X(74) && sig.length > 4) sig = sig.slice(0, -2) + '…';
      ctx.textAlign = 'right';
      ctx.fillStyle = hasMsg ? ink : 'rgba(92,61,46,.38)';
      ctx.fillText(sig, X(86), X(94));
      ctx.textAlign = 'left';
    }

    // pul ve damga
    drawStamp(ctx, X(115.5), X(9), X(24.5), X(29.5), d.stampImg, k);
    if (d.postmark !== false) drawPostmark(ctx, X(110.5), X(37.5), X(10.5), d.writtenYMD, k);

    // adres alanı
    const rows = [
      { label: 'KİME', value: d.to || '', y: 50 },
      { label: 'YAZILDI', value: GM.date.long(GM.date.fromYMD(d.writtenYMD) || GM.date.today()), y: 67 },
      { label: 'YOLA ÇIKIŞ', value: d.deliveryYMD && GM.date.fromYMD(d.deliveryYMD) ? GM.date.long(GM.date.fromYMD(d.deliveryYMD)) : '', y: 84 },
    ];
    rows.forEach(row => {
      ctx.fillStyle = LABEL;
      ctx.font = `600 ${X(1.9)}px "GM Sans", sans-serif`;
      spaced(ctx, row.label, X(97), X(row.y), X(0.35), 'left');
      ctx.strokeStyle = 'rgba(60,40,25,.3)';
      ctx.lineWidth = Math.max(1, X(0.22));
      ctx.beginPath(); ctx.moveTo(X(97), X(row.y + 9.5)); ctx.lineTo(X(141), X(row.y + 9.5)); ctx.stroke();
      if (row.value) {
        let mm = 6.2;
        ctx.font = `${f.weight} ${X(mm * f.scale)}px "${f.family}", cursive`;
        while (ctx.measureText(row.value).width > X(44) && mm > 3) { mm -= 0.2; ctx.font = `${f.weight} ${X(mm * f.scale)}px "${f.family}", cursive`; }
        ctx.fillStyle = ink;
        ctx.fillText(row.value, X(97.5), X(row.y + 8.2));
      }
    });
    ctx.restore();
    return fitted;
  }

  /** Ön yüz: görseli (tema ya da fotoğraf) tüm alana yay. */
  function drawFront(ctx, img, crop) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = '#e8d5b7';
    ctx.fillRect(0, 0, W, H);
    if (!img) return;
    const c = coverRect(img.naturalWidth || img.width, img.naturalHeight || img.height, W, H, crop);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, c.x, c.y, c.w, c.h);
  }

  /** 300 DPI, 3 mm kırpma paylı baskı dosyaları (JPEG data URL) */
  async function renderPrint(frontImg, crop, data) {
    await loadFonts(data.fontId);
    const k = MM.DPI / 25.4;
    const W = Math.round((MM.W + MM.BLEED * 2) * k), H = Math.round((MM.H + MM.BLEED * 2) * k);
    const cf = document.createElement('canvas'); cf.width = W; cf.height = H;
    drawFront(cf.getContext('2d'), frontImg, crop);
    const cb = document.createElement('canvas'); cb.width = W; cb.height = H;
    const fitted = drawBack(cb.getContext('2d'), { k, ox: MM.BLEED * k, oy: MM.BLEED * k, data });
    return { front: cf.toDataURL('image/jpeg', 0.92), back: cb.toDataURL('image/jpeg', 0.92), fits: fitted.fits, size: `${W}x${H}` };
  }

  GM.Card = { MM, PAPER, loadFonts, loadImage, drawBack, drawFront, renderPrint, coverRect, wrap, fit };
})();
