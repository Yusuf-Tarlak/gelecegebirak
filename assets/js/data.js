/* Geleceğe Mektup · içerik verileri (temalar, fontlar, örnekler) */
(function () {
  'use strict';
  const GM = (window.GM = window.GM || {});

  GM.THEMES = [
    { id: 'istanbul', name: 'İstanbul Akşamı', mood: 'Nostalji' },
    { id: 'kapadokya', name: 'Kapadokya Sabahı', mood: 'Umut' },
    { id: 'ege', name: 'Ege Rüzgârı', mood: 'Özgürlük' },
    { id: 'karadeniz', name: 'Yayla Sisi', mood: 'Huzur' },
    { id: 'lale', name: 'Lale Bahçesi', mood: 'Sevgi' },
    { id: 'gece', name: 'Yıldızlı Gece', mood: 'Hayal' },
    { id: 'sonbahar', name: 'Sonbahar Yolu', mood: 'Değişim' },
    { id: 'kahve', name: 'Kırk Yıllık Hatır', mood: 'Dostluk' },
  ];

  GM.FONTS = [
    { id: 'caveat', name: 'Günlük', family: 'GM Caveat', weight: 500, scale: 1.18, lh: 1.16 },
    { id: 'dancing', name: 'Zarif', family: 'GM Dancing', weight: 500, scale: 1.02, lh: 1.24 },
    { id: 'patrick', name: 'Düzgün', family: 'GM Patrick', weight: 400, scale: 1.0, lh: 1.22 },
  ];

  GM.INKS = [
    { id: 'lacivert', name: 'Lacivert', color: '#233163' },
    { id: 'sepya', name: 'Sepya', color: '#5b3420' },
    { id: 'bordo', name: 'Bordo', color: '#7d1f2b' },
    { id: 'siyah', name: 'Siyah', color: '#1f1a17' },
  ];

  GM.PRESETS = [
    { id: '3m', label: '3 ay', months: 3 },
    { id: '6m', label: '6 ay', months: 6 },
    { id: '1y', label: '1 yıl', months: 12 },
    { id: '2y', label: '2 yıl', months: 24 },
    { id: '5y', label: '5 yıl', months: 60 },
    { id: '10y', label: '10 yıl', months: 120 },
    { id: 'custom', label: 'Özel tarih' },
  ];

  GM.OCCASIONS = [
    {
      id: 'kendime', icon: 'moon', title: 'Gelecekteki sana', chip: '1 yıl sonra',
      text: 'Bugünkü hayallerini, korkularını, küçük sevinçlerini yaz. Bir yıl sonra kendinle yeniden tanış.',
      preset: '1y', recipientType: 'self', to: 'Gelecekteki Ben', theme: 'gece',
      starter: 'Sevgili gelecekteki ben,\n\n',
    },
    {
      id: 'cocuk', icon: 'heart', title: 'Çocuğuna', chip: '10 yıl sonra',
      text: 'İlk adımlarını, ilk kelimesini, bugünkü hâlini anlat. Büyüdüğünde okuyacağı en kıymetli mektup.',
      preset: '10y', recipientType: 'other', to: '', theme: 'kapadokya',
      starter: 'Canım yavrum,\n\n',
    },
    {
      id: 'sevgili', icon: 'rings', title: 'Sevdiğine', chip: 'Yıldönümünde',
      text: 'Bir sonraki yıldönümünüzde kapıdan süzülecek bir sürpriz. Hem de bugünden hazırlanmış.',
      preset: '1y', recipientType: 'other', to: '', theme: 'lale',
      starter: 'Sevgilim,\n\n',
    },
    {
      id: 'mezuniyet', icon: 'cap', title: 'Mezuniyetine', chip: '5 yıl sonra',
      text: 'Bugünkü hedeflerin beş yıl sonraki sana ne der? Kep atmadan önce yaz, sonra karşılaştırın.',
      preset: '5y', recipientType: 'self', to: 'Mezun olmuş ben', theme: 'istanbul',
      starter: 'Sevgili mezun,\n\n',
    },
    {
      id: 'yilsonu', icon: 'spark', title: 'Yılın son gününe', chip: 'Yıl sonunda',
      text: 'Kararlarını bugün yaz. Kartın yılın son haftasında kapında olsun, hesaplaşın.',
      preset: 'yearend', recipientType: 'self', to: 'Yıl sonundaki ben', theme: 'kahve',
      starter: 'Merhaba,\n\nBu yıl kendime söz verdiklerim:\n1. \n2. \n3. ',
    },
  ];

  GM.SAMPLES = [
    { to: 'Gelecekteki ben', from: '2026 sonbaharındaki sen', when: '1 yıl sonra',
      text: 'Bu kartı okurken hâlâ sabahları balkonda çay içiyor musun? Ben şu an biraz yorgunum ama umutluyum. Küçük şeylere sevinmeyi unutma.' },
    { to: 'Canım kızım', from: 'Annen', when: '10 yıl sonra',
      text: 'Bugün ilk kez “anne” dedin. Sen bunu okurken kendi cümlelerini kuruyor olacaksın. Ne olursan ol, seni hep bugünkü kadar seveceğim.' },
    { to: 'Sevgilim', from: 'Hep senin', when: '5. yıldönümü',
      text: 'Bugün yağmurda şemsiyesiz kaldık ve gülmekten eve zor vardık. Beş yıl sonra da aynı şemsiyeyi unutan iki kişi olalım mı?' },
    { to: 'Sevgili mezun', from: 'Kep atan sen', when: '5 yıl sonra',
      text: 'Şu an en büyük korkun iş bulamamak. Eminim bunu okurken gülümsüyorsun. Merakını kaybetme, gerisi geliyor.' },
    { to: 'Yıl sonundaki ben', from: 'Ocak ayındaki sen', when: 'Yılın son haftası',
      text: 'Söz vermiştin: her ay bir kitap, her gün on dakika yürüyüş, anneme daha sık telefon. Hesaplaşma zamanı!' },
    { to: 'Babacığım', from: 'Oğlun', when: 'Özel tarih',
      text: 'Emekliliğinin ilk sabahı bu kart kapında olsun istedim. Artık alarm yok; sadece kahve, gazete ve torunların.' },
  ];

  GM.PROMPTS = [
    'Şu an seni en çok ne heyecanlandırıyor?',
    'Bu yıl kendinle en çok neyle gurur duydun?',
    'Gelecekteki senden ne öğrenmek isterdin?',
    'Bugün seni güldüren küçük bir an neydi?',
    'Şu sıralar en çok hangi şarkıyı dinliyorsun?',
    'Hangi alışkanlığını bırakmış olmayı umuyorsun?',
    'Kime teşekkür etmek istersin, neden?',
    'Beş yıl sonra nerede uyanmak isterdin?',
    'Seni bugün endişelendiren şey o gün hâlâ önemli olacak mı?',
    'Bu satırları okurken yanında kim olsun isterdin?',
    'Bugünün sana hatırlatmak istediği tek cümle ne olurdu?',
    'Şu an hayatında hiç değişmesin istediğin bir şey var mı?',
  ];

  GM.PROVINCES = ['Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin',
    'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale',
    'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep',
    'Giresun', 'Gümüşhane', 'Hakkâri', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman',
    'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya',
    'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt',
    'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'];
})();
