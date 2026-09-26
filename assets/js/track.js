/* Geleceğe Mektup · sipariş takip */
(function () {
  'use strict';
  const GM = window.GM;
  const { $, esc } = GM;
  const STEPS = [
    ['Sipariş alındı', 'Siparişin bize ulaştı.'],
    ['Ödeme onaylandı', 'Ödemen alındı, kartpostalın sıraya girdi.'],
    ['Basıldı ve arşivde', 'Kartpostalın basıldı, zarflandı ve arşivde bekliyor.'],
    ['Yola çıktı', 'Kartpostalın postaya verildi.'],
    ['Teslim edildi', 'Kartpostalın sahibine ulaştı.'],
  ];

  function span(from, to) {
    let y = to.getFullYear() - from.getFullYear();
    let m = to.getMonth() - from.getMonth();
    let d = to.getDate() - from.getDate();
    if (d < 0) { m--; d += new Date(to.getFullYear(), to.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    return { y: Math.max(0, y), m: Math.max(0, m), d: Math.max(0, d) };
  }

  function render(id, r) {
    const out = $('#tResult');
    if (r.cancelled || r.status === 'İptal') {
      out.innerHTML = `<h2 class="subhead" style="margin-top:30px">${esc(id)}</h2><p>Bu sipariş iptal edilmiş. Bir yanlışlık olduğunu düşünüyorsan bize yaz.</p>`;
      return;
    }
    const idx = Math.max(0, Math.min(STEPS.length - 1, r.statusIndex == null ? STEPS.findIndex(s => s[0] === r.status) : r.statusIndex));
    const d = GM.date.fromYMD(r.deliveryDate);
    const today = GM.date.today();
    let count = '';
    if (d && d > today && idx < 3) {
      const s = span(today, d);
      count = `<div class="countdown" aria-label="Yola çıkışa kalan süre"><div><b>${s.y}</b><span>Yıl</span></div><div><b>${s.m}</b><span>Ay</span></div><div><b>${s.d}</b><span>Gün</span></div></div>`;
    }
    out.innerHTML = `
      <h2 class="subhead" style="margin-top:34px">${esc(id)}</h2>
      ${d ? `<p>Yola çıkış tarihi: <strong>${esc(GM.date.full(d))}</strong></p>` : ''}
      ${count}
      <ol class="timeline">${STEPS.map((s, i) => `<li class="${i < idx ? 'is-done' : i === idx ? 'is-now' : ''}">${esc(s[0])}<small>${esc(s[1])}</small></li>`).join('')}</ol>
      <p class="field__hint">Adres ya da tarih değişikliği için sipariş numaranla bize <a data-contact="email" data-keep-text href="#">e-posta</a> gönderebilirsin.</p>`;
    GM.fillConfig(out);
  }

  async function query(id, email) {
    if (GM.isDemo) {
      await new Promise(r => setTimeout(r, 600));
      if (!/^GM-DEMO/i.test(id)) return { ok: false, error: 'Önizleme modunda yalnızca GM-DEMO ile başlayan numaralar sorgulanabilir.' };
      const mine = (GM.store.get('gm-siparislerim', []) || []).find(o => o.id.toUpperCase() === id.toUpperCase());
      return { ok: true, statusIndex: 2, deliveryDate: mine ? mine.date : GM.date.toYMD(GM.date.addMonths(GM.date.today(), 12)) };
    }
    const url = `${GM.cfg.orderEndpoint}?action=status&id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { redirect: 'follow' });
    return res.json();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = $('#trackForm');
    if (!form) return;
    $('#demoBanner').hidden = !GM.isDemo;
    const idEl = $('#tId'), emEl = $('#tEmail');
    const params = new URLSearchParams(location.search);
    const mine = GM.store.get('gm-siparislerim', []) || [];
    const pre = params.get('no') || (mine[0] && mine[0].id) || '';
    idEl.value = pre;
    const match = mine.find(o => o.id === pre);
    if (match) emEl.value = match.email;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const id = idEl.value.trim().toUpperCase();
      const email = emEl.value.trim();
      const badId = id.length < 4, badEm = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      form.querySelector('[data-field=id]').classList.toggle('is-invalid', badId);
      form.querySelector('[data-field=email]').classList.toggle('is-invalid', badEm);
      if (badId || badEm) return;
      const btn = $('#tBtn');
      btn.disabled = true;
      $('#tResult').innerHTML = '<p style="margin-top:24px">Sorgulanıyor…</p>';
      try {
        const r = await query(id, email);
        if (!r || !r.ok) throw new Error((r && r.error) || 'Bu bilgilerle eşleşen bir sipariş bulunamadı.');
        render(id, r);
      } catch (err) {
        const msg = err instanceof TypeError ? 'Sipariş sistemine bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.' : (err.message || 'Bir sorun oluştu, lütfen tekrar dene.');
        $('#tResult').innerHTML = `<p class="fit-warn" style="margin-top:24px">${esc(msg)}</p>`;
      } finally { btn.disabled = false; }
    });
    if (pre && emEl.value) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit'));
  });
})();
