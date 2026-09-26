/* Geleceğe Mektup · yasal sayfalar */
(function () {
  'use strict';
  const GM = window.GM;

  document.addEventListener('DOMContentLoaded', () => {
    const clear = document.getElementById('clearLocal');
    if (clear) {
      clear.addEventListener('click', () => {
        GM.store.del('gm-taslak-v1');
        GM.store.del('gm-siparislerim');
        GM.toast('Bu cihazdaki taslak ve sipariş kayıtları silindi.', 'ok');
      });
    }

    const box = document.getElementById('priceTable');
    const P = GM.cfg.pricing;
    if (box && P) {
      let prev = 0;
      const rows = P.duration.map(t => {
        const label = prev === 0 ? `Teslim ${t.maxYears} yıla kadar` : `Teslim ${prev}–${t.maxYears} yıl arası`;
        prev = t.maxYears;
        return `<tr><td>Kişiye özel kartpostal · ${label}</td><td>${GM.money(P.base + t.extra)}</td></tr>`;
      });
      (P.addons || []).forEach(a => rows.push(`<tr><td>İsteğe bağlı: ${GM.esc(a.label)}</td><td>+${GM.money(a.price)}</td></tr>`));
      box.innerHTML = `<table><thead><tr><th scope="col">Hizmet</th><th scope="col">Fiyat (KDV dahil)</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
    }
  });
})();
