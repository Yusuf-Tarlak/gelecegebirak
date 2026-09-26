/**
 * GELECEĞE MEKTUP · Sipariş sistemi (Google Apps Script)
 * ---------------------------------------------------------------
 * Siparişleri Google E-Tablolar'a yazar, baskı dosyalarını Google
 * Drive'a kaydeder, onay e-postalarını gönderir ve her gün
 * hatırlatmaları yapar. Kurulum adımları: backend/KURULUM.md
 */

// ====== AYARLAR (kurulumda doldurun) ======
const AYARLAR = {
  MARKA: 'Geleceğe Mektup',
  SAHIP_EPOSTA: '',                 // Yeni sipariş bildirimleri bu adrese gelir
  SITE_ADRESI: 'https://yusuf-tarlak.github.io/gelecegebirak/',
  IBAN: '',
  IBAN_SAHIBI: '',
  BANKA: '',
  KART_ODEME_LINKI: '',            // config.js'teki cardPaymentUrl ile aynı

  // Fiyatlar: assets/js/config.js ile AYNI olmalı (sunucu tutarı kendisi hesaplar)
  FIYAT: {
    base: 149,
    duration: [
      { maxYears: 1, extra: 0 },
      { maxYears: 3, extra: 30 },
      { maxYears: 5, extra: 50 },
      { maxYears: 10, extra: 100 },
    ],
    addons: [{ id: 'muhur', label: 'Balmumu mühürlü zarf', price: 39 }],
  },
  MIN_GUN: 30,                      // en erken teslim (gün)
  MAX_YIL: 10,                      // en geç teslim (yıl)
  MESAJ_MAKS: 700,

  ADRES_TEYIT_GUN: 45,              // teslimattan kaç gün önce adres teyidi istensin
  SAHIP_HATIRLATMA_GUN: 7,          // teslimattan kaç gün önce size hatırlatılsın
  ODEME_BEKLEME_GUN: 7,             // ödemesi bu kadar gün gecikenler size bildirilir
  ICERIK_SILME_GUN: 180,            // teslimattan kaç gün sonra mesaj ve dosyalar silinsin (KVKK)

  SAYFA: 'Siparişler',
  KLASOR: 'Geleceğe Mektup · Baskı Dosyaları',
};

const DURUMLAR = ['Sipariş alındı', 'Ödeme onaylandı', 'Basıldı ve arşivde', 'Yola çıktı', 'Teslim edildi', 'İptal'];
const SUTUNLAR = [
  'Sipariş No', 'Sipariş Zamanı', 'Durum', 'Ödeme', 'Tutar', 'Yola Çıkış',
  'Alıcı', 'İl', 'İlçe', 'Adres', 'Posta Kodu',
  'Kime (kart)', 'Mesaj', 'İmza', 'Tasarım', 'Yazı Stili', 'Mürekkep', 'Baskı Klasörü',
  'Gönderen', 'E-posta', 'Telefon', 'Sürpriz', 'Ekler', 'Not',
  'Pazarlama İzni', 'Sözleşme Onayı',
  'Adres Teyidi Gönderildi', 'Son Yıllık Bildirim', 'Sahip Hatırlatması', 'İçerik Silindi',
];
const S = {};
SUTUNLAR.forEach((ad, i) => { S[ad] = i; });

// ====== WEB UYGULAMASI ======
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.website) return json({ ok: true, orderId: 'GM-' + rastgele(6) }); // bot tuzağı
    const hata = dogrula(body);
    if (hata) return json({ ok: false, error: hata });

    lock.waitLock(20000);
    const sayfa = sayfaAl();
    const no = yeniNo(sayfa);
    const fiyat = fiyatHesapla(body.delivery.date, body.addons);

    let klasorUrl = '';
    if (body.files && body.files.front && body.files.back) {
      const k = anaKlasor().createFolder(no);
      dosyaKaydet(k, body.files.front, no + '-on-yuz.jpg');
      dosyaKaydet(k, body.files.back, no + '-arka-yuz.jpg');
      klasorUrl = k.getUrl();
    }

    const r = body.recipient, g = body.sender, c = body.card;
    const satir = [];
    satir[S['Sipariş No']] = no;
    satir[S['Sipariş Zamanı']] = new Date();
    satir[S['Durum']] = DURUMLAR[0];
    satir[S['Ödeme']] = body.payment === 'kart' ? 'Kart' : 'Havale/EFT';
    satir[S['Tutar']] = fiyat.total;
    satir[S['Yola Çıkış']] = ymdTarih(body.delivery.date);
    satir[S['Alıcı']] = r.name;
    satir[S['İl']] = r.city;
    satir[S['İlçe']] = r.district;
    satir[S['Adres']] = r.address;
    satir[S['Posta Kodu']] = r.postcode || '';
    satir[S['Kime (kart)']] = c.to;
    satir[S['Mesaj']] = c.message;
    satir[S['İmza']] = c.from || '';
    satir[S['Tasarım']] = body.design.type === 'photo' ? 'Kendi fotoğrafı' : (body.design.name || body.design.id);
    satir[S['Yazı Stili']] = c.font;
    satir[S['Mürekkep']] = c.ink;
    satir[S['Baskı Klasörü']] = klasorUrl || 'Dosya yok, siteden yeniden oluşturulmalı';
    satir[S['Gönderen']] = g.name;
    satir[S['E-posta']] = g.email;
    satir[S['Telefon']] = g.phone || '';
    satir[S['Sürpriz']] = body.surprise ? 'Evet' : 'Hayır';
    satir[S['Ekler']] = fiyat.addons.map(a => a.label).join(', ');
    satir[S['Not']] = body.note || '';
    satir[S['Pazarlama İzni']] = body.consents && body.consents.marketing ? 'Evet' : 'Hayır';
    satir[S['Sözleşme Onayı']] = body.consents && body.consents.at ? body.consents.at : new Date().toISOString();
    for (let i = 0; i < SUTUNLAR.length; i++) if (satir[i] === undefined) satir[i] = '';
    sayfa.appendRow(satir.map(guvenli));
    lock.releaseLock();

    try { musteriOnayi(no, body, fiyat); } catch (err) { console.error('Müşteri e-postası', err); }
    try { sahipBildirimi(no, body, fiyat, klasorUrl); } catch (err) { console.error('Sahip e-postası', err); }
    return json({ ok: true, orderId: no, total: fiyat.total });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'Sipariş kaydedilemedi. Lütfen biraz sonra tekrar deneyin.' });
  } finally {
    try { lock.releaseLock(); } catch (e) { /* zaten bırakıldı */ }
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action !== 'status') return ContentService.createTextOutput(AYARLAR.MARKA + ' sipariş sistemi çalışıyor.');
  const no = String(p.id || '').trim().toUpperCase();
  const eposta = String(p.email || '').trim().toLowerCase();
  if (!no || !eposta) return json({ ok: false, error: 'Sipariş numarası ve e-posta gerekli.' });
  const sayfa = sayfaAl();
  const bul = sayfa.getRange(2, 1, Math.max(1, sayfa.getLastRow() - 1), 1).createTextFinder(no).matchEntireCell(true).findNext();
  if (!bul) return json({ ok: false, error: 'Bu bilgilerle eşleşen bir sipariş bulunamadı.' });
  const satir = sayfa.getRange(bul.getRow(), 1, 1, SUTUNLAR.length).getValues()[0];
  if (String(satir[S['E-posta']]).trim().toLowerCase() !== eposta) return json({ ok: false, error: 'Bu bilgilerle eşleşen bir sipariş bulunamadı.' });
  const durum = String(satir[S['Durum']]);
  return json({
    ok: true,
    status: durum,
    statusIndex: Math.max(0, DURUMLAR.indexOf(durum)),
    cancelled: durum === 'İptal',
    deliveryDate: ymd(tarihOku(satir[S['Yola Çıkış']])),
  });
}

// ====== GÜNLÜK İŞ (kurulum() tarafından her sabah çalışacak şekilde ayarlanır) ======
function gunlukIs() {
  const sayfa = sayfaAl();
  const son = sayfa.getLastRow();
  if (son < 2) return;
  const aralik = sayfa.getRange(2, 1, son - 1, SUTUNLAR.length);
  const veri = aralik.getValues();
  const bugun = gunBasi(new Date());
  const yaklasan = [], gecikenOdeme = [];
  let degisti = false;

  veri.forEach((row, i) => {
    const durum = String(row[S['Durum']]);
    const di = DURUMLAR.indexOf(durum);
    const teslim = tarihOku(row[S['Yola Çıkış']]);
    const olusma = tarihOku(row[S['Sipariş Zamanı']]);
    if (!teslim) return;
    const kalan = gunFarki(bugun, teslim);
    const rNo = row[S['Sipariş No']];

    if (durum === 'İptal') {
      if (olusma && gunFarki(olusma, bugun) > 30 && !row[S['İçerik Silindi']]) { icerikSil(row, rNo); row[S['İçerik Silindi']] = bugun; degisti = true; }
      return;
    }
    // Ödeme bekleyenler
    if (di === 0 && olusma && gunFarki(olusma, bugun) >= AYARLAR.ODEME_BEKLEME_GUN) gecikenOdeme.push(row);

    // Adres teyidi
    if ((di === 1 || di === 2) && kalan > 0 && kalan <= AYARLAR.ADRES_TEYIT_GUN && !row[S['Adres Teyidi Gönderildi']]) {
      try { adresTeyidi(row, teslim); row[S['Adres Teyidi Gönderildi']] = bugun; degisti = true; } catch (err) { console.error(err); }
    }
    // Size hatırlatma
    if (di >= 0 && di < 3 && kalan >= 0 && kalan <= AYARLAR.SAHIP_HATIRLATMA_GUN && !row[S['Sahip Hatırlatması']]) {
      yaklasan.push(row); row[S['Sahip Hatırlatması']] = bugun; degisti = true;
    }
    // Yıllık "mektubun güvende" bildirimi
    if ((di === 1 || di === 2) && olusma && kalan > 60 && olusma.getMonth() === bugun.getMonth() && olusma.getDate() === bugun.getDate() &&
        bugun.getFullYear() > olusma.getFullYear() && Number(row[S['Son Yıllık Bildirim']]) !== bugun.getFullYear()) {
      try { yillikBildirim(row, teslim, bugun.getFullYear() - olusma.getFullYear()); row[S['Son Yıllık Bildirim']] = bugun.getFullYear(); degisti = true; } catch (err) { console.error(err); }
    }
    // KVKK: teslimattan sonra içerik silme
    if (di >= 3 && kalan < -AYARLAR.ICERIK_SILME_GUN && !row[S['İçerik Silindi']]) {
      icerikSil(row, rNo); row[S['İçerik Silindi']] = bugun; degisti = true;
    }
  });

  if (degisti) aralik.setValues(veri.map(r => r.map(guvenli)));
  if ((yaklasan.length || gecikenOdeme.length) && AYARLAR.SAHIP_EPOSTA) {
    const liste = rows => rows.map(r => `<li><b>${esc(r[S['Sipariş No']])}</b> · ${esc(r[S['Alıcı']])} · ${esc(r[S['İlçe']])}/${esc(r[S['İl']])} · yola çıkış ${tarihYaz(tarihOku(r[S['Yola Çıkış']]))} · <i>${esc(r[S['Durum']])}</i></li>`).join('');
    let html = '';
    if (yaklasan.length) html += `<h3>Bu hafta postaya verilecekler</h3><ul>${liste(yaklasan)}</ul>`;
    if (gecikenOdeme.length) html += `<h3>Ödemesi ${AYARLAR.ODEME_BEKLEME_GUN} günü geçen siparişler</h3><p>Ödeme geldiyse “Durum” sütununu güncelleyin; gelmediyse “İptal” yapabilirsiniz.</p><ul>${liste(gecikenOdeme)}</ul>`;
    MailApp.sendEmail({ to: AYARLAR.SAHIP_EPOSTA, subject: `${AYARLAR.MARKA} · günlük özet`, htmlBody: sablon('Günlük özet', html + `<p><a href="${SpreadsheetApp.getActiveSpreadsheet().getUrl()}">Sipariş tablosunu aç</a></p>`) });
  }
}

// ====== KURULUM (bir kez çalıştırın) ======
function kurulum() {
  const sayfa = sayfaAl();
  sayfa.getRange(1, 1, 1, SUTUNLAR.length).setValues([SUTUNLAR]).setFontWeight('bold').setBackground('#2c1a0e').setFontColor('#f5ede0');
  sayfa.setFrozenRows(1);
  sayfa.setColumnWidth(S['Mesaj'] + 1, 360);
  const kural = SpreadsheetApp.newDataValidation().requireValueInList(DURUMLAR, true).setAllowInvalid(false).build();
  sayfa.getRange(2, S['Durum'] + 1, sayfa.getMaxRows() - 1, 1).setDataValidation(kural);
  sayfa.getRange(2, S['Yola Çıkış'] + 1, sayfa.getMaxRows() - 1, 1).setNumberFormat('dd.mm.yyyy');
  sayfa.getRange(2, S['Sipariş Zamanı'] + 1, sayfa.getMaxRows() - 1, 1).setNumberFormat('dd.mm.yyyy hh:mm');
  anaKlasor();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'gunlukIs').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('gunlukIs').timeBased().everyDays(1).atHour(9).create();
  console.log('Kurulum tamam. Şimdi Dağıt > Yeni dağıtım > Web uygulaması ile yayınlayın.');
}

// ====== E-POSTALAR ======
function musteriOnayi(no, b, fiyat) {
  const teslim = ymdTarih(b.delivery.date);
  let odeme;
  if (b.payment === 'kart' && AYARLAR.KART_ODEME_LINKI) {
    odeme = `<p><b>Ödeme:</b> <a href="${AYARLAR.KART_ODEME_LINKI}">Kartla ödeme sayfası</a> · açıklamaya <b>${no}</b> yazın · Tutar <b>₺${fiyat.total}</b></p>`;
  } else {
    odeme = `<p><b>Ödeme (Havale/EFT)</b><br>IBAN: <b>${esc(AYARLAR.IBAN)}</b><br>Alıcı: ${esc(AYARLAR.IBAN_SAHIBI)}${AYARLAR.BANKA ? ' · ' + esc(AYARLAR.BANKA) : ''}<br>Tutar: <b>₺${fiyat.total}</b> · Açıklama: <b>${no}</b></p><p>Ödemeniz ${AYARLAR.ODEME_BEKLEME_GUN} gün içinde bize ulaşmazsa sipariş iptal edilir.</p>`;
  }
  const html = `
    <p>Merhaba ${esc(b.sender.name)},</p>
    <p>Kartpostalın bize ulaştı. <b>${tarihYaz(teslim)}</b> tarihinde yola çıkacak.</p>
    <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
      <tr><td style="color:#74594a">Sipariş no</td><td><b>${no}</b></td></tr>
      <tr><td style="color:#74594a">Alıcı</td><td>${esc(b.recipient.name)} · ${esc(b.recipient.district)}/${esc(b.recipient.city)}</td></tr>
      <tr><td style="color:#74594a">Tasarım</td><td>${esc(b.design.type === 'photo' ? 'Kendi fotoğrafın' : (b.design.name || b.design.id))}</td></tr>
      <tr><td style="color:#74594a">Tutar</td><td>₺${fiyat.total} (KDV dahil)</td></tr>
    </table>
    ${odeme}
    <p>Siparişinin durumunu <a href="${AYARLAR.SITE_ADRESI}takip.html?no=${no}">takip sayfasından</a> görebilirsin. Teslimattan ${AYARLAR.ADRES_TEYIT_GUN} gün önce adresini teyit etmek için sana yeniden yazacağız.</p>
    <p style="font-size:12px;color:#74594a">Kabul ettiğin <a href="${AYARLAR.SITE_ADRESI}mesafeli-satis-sozlesmesi.html">Mesafeli Satış Sözleşmesi</a>, <a href="${AYARLAR.SITE_ADRESI}on-bilgilendirme-formu.html">Ön Bilgilendirme Formu</a> ve <a href="${AYARLAR.SITE_ADRESI}iptal-iade.html">İptal ve İade Koşulları</a> sipariş tarihindeki hâliyle geçerlidir. Kişisel verilerin <a href="${AYARLAR.SITE_ADRESI}kvkk.html">KVKK Aydınlatma Metni</a> kapsamında işlenir.</p>`;
  gonder({ to: b.sender.email, subject: `Kartpostalın zamana bırakıldı · ${no}`, htmlBody: sablon('Mektubun zamana bırakıldı', html) });
}

function sahipBildirimi(no, b, fiyat, klasorUrl) {
  if (!AYARLAR.SAHIP_EPOSTA) return;
  const html = `
    <p><b>${no}</b> · ₺${fiyat.total} · ${b.payment === 'kart' ? 'Kart' : 'Havale/EFT'}</p>
    <p>Yola çıkış: <b>${tarihYaz(ymdTarih(b.delivery.date))}</b></p>
    <p>Alıcı: ${esc(b.recipient.name)}<br>${esc(b.recipient.address)}<br>${esc(b.recipient.district)} / ${esc(b.recipient.city)} ${esc(b.recipient.postcode || '')}</p>
    <p>Gönderen: ${esc(b.sender.name)} · ${esc(b.sender.email)} ${esc(b.sender.phone || '')}${b.surprise ? ' · <b>sürpriz (zarfa gönderen yazılmayacak)</b>' : ''}</p>
    ${fiyat.addons.length ? `<p>Ekler: ${esc(fiyat.addons.map(a => a.label).join(', '))}</p>` : ''}
    ${b.note ? `<p>Not: ${esc(b.note)}</p>` : ''}
    <p>${klasorUrl ? `<a href="${klasorUrl}">Baskı dosyaları (Drive)</a>` : '<b>Baskı dosyası gelmedi.</b>'} · <a href="${SpreadsheetApp.getActiveSpreadsheet().getUrl()}">Sipariş tablosu</a></p>`;
  MailApp.sendEmail({ to: AYARLAR.SAHIP_EPOSTA, subject: `Yeni sipariş ${no} · ₺${fiyat.total}`, htmlBody: sablon('Yeni sipariş', html) });
}

function adresTeyidi(row, teslim) {
  const no = row[S['Sipariş No']];
  const html = `<p>Merhaba ${esc(row[S['Gönderen']])},</p>
    <p><b>${no}</b> numaralı kartpostalın <b>${tarihYaz(teslim)}</b> tarihinde yola çıkacak. Adresin hâlâ doğru mu?</p>
    <p style="background:#f5ede0;padding:12px 14px">${esc(row[S['Alıcı']])}<br>${esc(row[S['Adres']])}<br>${esc(row[S['İlçe']])} / ${esc(row[S['İl']])} ${esc(row[S['Posta Kodu']])}</p>
    <p>Değişiklik gerekiyorsa bu e-postayı yanıtlayarak yeni adresi yazman yeterli. Teslimattan 30 gün öncesine kadar değişiklik ücretsizdir.</p>`;
  gonder({ to: row[S['E-posta']], subject: `Adres teyidi · ${no}`, htmlBody: sablon('Mektubun yola çıkmak üzere', html) });
}

function yillikBildirim(row, teslim, yil) {
  const no = row[S['Sipariş No']];
  const kalan = gunFarki(gunBasi(new Date()), teslim);
  const html = `<p>Merhaba ${esc(row[S['Gönderen']])},</p>
    <p>${yil} yıl önce bugün geleceğe bir mektup bırakmıştın. Kartpostalın arşivimizde güvende ve sırasını bekliyor.</p>
    <p style="font-size:22px;font-family:Georgia,serif;color:#b5451b">Yola çıkmasına ${kalan} gün var.</p>
    <p>Adresin değiştiyse bu e-postayı yanıtlaman yeterli. <a href="${AYARLAR.SITE_ADRESI}takip.html?no=${no}">Siparişini takip et</a></p>`;
  gonder({ to: row[S['E-posta']], subject: `Mektubun güvende · ${no}`, htmlBody: sablon('Mektubun güvende', html) });
}

// Müşteriye giden e-postalar: gönderen adı marka, yanıtlar size gelir
function gonder(o) {
  o.name = AYARLAR.MARKA;
  if (AYARLAR.SAHIP_EPOSTA) o.replyTo = AYARLAR.SAHIP_EPOSTA;
  MailApp.sendEmail(o);
}

function sablon(baslik, icerik) {
  return `<div style="background:#f5ede0;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#2c1a0e">
    <div style="max-width:560px;margin:0 auto;background:#fffdf7;border-radius:8px;overflow:hidden">
      <div style="height:6px;background:repeating-linear-gradient(135deg,#b5451b 0 14px,#fffdf7 14px 24px,#2c4a6e 24px 38px,#fffdf7 38px 48px)"></div>
      <div style="padding:24px 26px;font-size:15px;line-height:1.6">
        <div style="font-family:Georgia,serif;font-size:13px;letter-spacing:3px;color:#b5451b;text-transform:uppercase">${AYARLAR.MARKA}</div>
        <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:26px;margin:8px 0 18px">${baslik}</h1>
        ${icerik}
      </div>
    </div>
  </div>`;
}

// ====== YARDIMCILAR ======
function dogrula(b) {
  if (!b || !b.card || !b.delivery || !b.recipient || !b.sender || !b.design) return 'Eksik sipariş bilgisi.';
  const m = String(b.card.message || '').trim();
  if (m.length < 3 || m.length > AYARLAR.MESAJ_MAKS) return 'Mesaj uzunluğu uygun değil.';
  if (!String(b.card.to || '').trim() || String(b.card.to).length > 40 || String(b.card.from || '').length > 40) return 'Hitap veya imza uygun değil.';
  const t = ymdTarih(b.delivery.date);
  const bugun = gunBasi(new Date());
  const enErken = new Date(bugun); enErken.setDate(enErken.getDate() + AYARLAR.MIN_GUN - 1);
  const enGec = new Date(bugun); enGec.setFullYear(enGec.getFullYear() + AYARLAR.MAX_YIL); enGec.setDate(enGec.getDate() + 1);
  if (!t || t < enErken || t > enGec) return 'Teslim tarihi seçilebilir aralığın dışında.';
  const r = b.recipient, g = b.sender;
  if (String(r.name || '').trim().length < 3 || !r.city || String(r.district || '').trim().length < 2 || String(r.address || '').trim().length < 10) return 'Teslimat adresi eksik.';
  if (String(g.name || '').trim().length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(g.email || ''))) return 'Gönderen bilgileri eksik.';
  if (!b.consents || b.consents.contract !== true) return 'Sözleşme onayı gerekli.';
  if (['havale', 'kart'].indexOf(b.payment) < 0) return 'Ödeme yöntemi geçersiz.';
  if (b.files && (String(b.files.front || '').length > 12e6 || String(b.files.back || '').length > 12e6)) return 'Baskı dosyası çok büyük.';
  return null;
}

function fiyatHesapla(ymdStr, addonIds) {
  const P = AYARLAR.FIYAT;
  const t = ymdTarih(ymdStr), bugun = gunBasi(new Date());
  const kademeler = P.duration.slice().sort((a, b) => a.maxYears - b.maxYears);
  let kademe = kademeler[kademeler.length - 1];
  for (let i = 0; i < kademeler.length; i++) {
    const sinir = new Date(bugun); sinir.setMonth(sinir.getMonth() + 12 * kademeler[i].maxYears);
    if (t <= sinir) { kademe = kademeler[i]; break; }
  }
  const ekler = P.addons.filter(a => (addonIds || []).indexOf(a.id) >= 0);
  return { base: P.base, extra: kademe.extra, addons: ekler, total: P.base + kademe.extra + ekler.reduce((s, a) => s + a.price, 0) };
}

function sayfaAl() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(AYARLAR.SAYFA) || ss.insertSheet(AYARLAR.SAYFA);
}
function anaKlasor() {
  const it = DriveApp.getFoldersByName(AYARLAR.KLASOR);
  return it.hasNext() ? it.next() : DriveApp.createFolder(AYARLAR.KLASOR);
}
function dosyaKaydet(klasor, dataUrl, ad) {
  const m = /^data:(image\/(?:jpeg|png));base64,(.+)$/.exec(String(dataUrl));
  if (!m) return null;
  return klasor.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], ad));
}
function icerikSil(row, no) {
  row[S['Mesaj']] = '(silindi)';
  row[S['Kime (kart)']] = '';
  row[S['İmza']] = '';
  row[S['Not']] = '';
  const it = anaKlasor().getFoldersByName(String(no));
  while (it.hasNext()) it.next().setTrashed(true);
  row[S['Baskı Klasörü']] = '(silindi)';
}
function yeniNo(sayfa) {
  for (let i = 0; i < 20; i++) {
    const no = 'GM-' + rastgele(6);
    const son = sayfa.getLastRow();
    if (son < 2 || !sayfa.getRange(2, 1, son - 1, 1).createTextFinder(no).matchEntireCell(true).findNext()) return no;
  }
  throw new Error('Sipariş numarası üretilemedi');
}
function rastgele(n) {
  const harf = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += harf.charAt(Math.floor(Math.random() * harf.length));
  return s;
}
// Tabloya yazılan metnin formül olarak çalışmasını engeller
function guvenli(v) {
  return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function ymdTarih(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function tarihOku(v) {
  if (v instanceof Date) return gunBasi(v);
  if (typeof v === 'string') { const t = ymdTarih(v.slice(0, 10)); if (t) return t; const d = new Date(v); return isNaN(d) ? null : gunBasi(d); }
  return null;
}
function gunBasi(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function gunFarki(a, b) { return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5); }
function ymd(d) { return d ? Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') : ''; }
function tarihYaz(d) {
  if (!d) return '';
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return d.getDate() + ' ' + aylar[d.getMonth()] + ' ' + d.getFullYear();
}
