/* =====================================================================
   GELECEĞE MEKTUP · SİTE AYARLARI
   ---------------------------------------------------------------------
   Sitedeki bütün şirket, iletişim, ödeme ve fiyat bilgileri buradan
   okunur. Yayına almadan önce boş ('') alanları doldurun.
   Eksikleri görmek için siteyi adresin sonuna ?kontrol ekleyerek açın:
   örn. https://alanadiniz.com/?kontrol
   ===================================================================== */
window.SITE_CONFIG = {
  brand: 'Geleceğe Mektup',

  // Sitenin yayındaki adresi (sonunda / olacak şekilde)
  siteUrl: 'https://yusuf-tarlak.github.io/gelecegebirak/',

  // Sipariş sistemi: Google Apps Script "Web uygulaması" adresi.
  // Kurulum: backend/KURULUM.md
  // Boş bırakılırsa site ÖNİZLEME MODUNDA çalışır: siparişler kaydedilmez.
  orderEndpoint: '',

  // Satıcı ve veri sorumlusu bilgileri (yasal metinlerde otomatik kullanılır)
  company: {
    legalName: '',   // Ticari unvan. Örn: "Geleceğe Mektup Hediyelik Eşya Ltd. Şti." ya da şahıs şirketinde "Ad Soyad"
    address: '',     // Açık adres
    taxOffice: '',   // Vergi dairesi
    taxNumber: '',   // Vergi / T.C. kimlik numarası
    mersis: '',      // MERSİS numarası (varsa)
    kep: '',         // KEP adresi (varsa)
    phone: '',       // Müşteri hizmetleri telefonu. Örn: "0 (212) 000 00 00"
  },

  contact: {
    email: 'merhaba@gelecektemektup.com', // Bu adresin gerçekten size ait olduğundan emin olun
    whatsapp: '',    // Sadece rakam, ülke koduyla: "905XXXXXXXXX"
    instagram: '',   // Kullanıcı adı, @ olmadan
  },

  payment: {
    iban: '',        // "TR00 0000 0000 0000 0000 0000 00"
    ibanHolder: '',  // Hesap sahibi (unvanla aynı olmalı)
    bankName: '',
    // İsteğe bağlı: iyzico / PayTR / Shopier vb. "link ile ödeme" adresi.
    // Doluysa ödeme adımında "Kartla öde" seçeneği görünür.
    cardPaymentUrl: '',
  },

  pricing: {
    base: 149,       // Standart kartpostal (TL, KDV dahil)
    // Teslim süresine göre ek ücret. Uzun süreli saklama ve ileride artacak
    // posta ücretleri için. İstemezseniz extra değerlerini 0 yapın.
    duration: [
      { maxYears: 1, extra: 0 },
      { maxYears: 3, extra: 30 },
      { maxYears: 5, extra: 50 },
      { maxYears: 10, extra: 100 },
    ],
    addons: [
      { id: 'muhur', label: 'Balmumu mühürlü zarf', desc: 'Zarfın elle, balmumuyla mühürlenir.', price: 39 },
    ],
  },

  delivery: {
    minDays: 30,     // En erken teslim: bugünden kaç gün sonra
    maxYears: 10,    // En geç teslim: kaç yıl sonra
  },

  messageMaxLength: 700,
};
