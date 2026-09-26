# Geleceğe Mektup

Bugünden yarına bir kartpostal bırakın: kullanıcı kartpostalını tasarlar, mesajını yazar, bir tarih seçer; kartpostal o gün pullu zarfıyla yola çıkar.

Site; derleme gerektirmeyen, doğrudan GitHub Pages'te çalışan statik HTML/CSS/JS'ten oluşur. Siparişler ücretsiz bir Google E-Tablosuna kaydedilir (bkz. [`backend/KURULUM.md`](backend/KURULUM.md)).

## Neler var?

- **Ana sayfa:** animasyonlu kartpostal yığını, dönen başlık, uçak postası şeridi, süreç, tasarım galerisi, “Kime yazılır?” kısayolları, örnek mektuplar, güvenceler, fiyat tablosu, toplu sipariş, SSS.
- **Atölye (5 adım):** tasarım veya fotoğraf yükleme (sürükle/yakınlaştır), el yazısı fontlarıyla mesaj, mürekkep rengi, “İlham ver” soruları, tarih seçimi, adres, özet ve onay. Önizleme kartı döner; arka yüz, **baskıya gidecek dosyayla birebir aynı** kodla çizilir.
- **Baskı dosyaları:** sipariş anında ön ve arka yüz, A6 + 3 mm taşma payı, 300 DPI JPEG olarak üretilip siparişle birlikte gönderilir.
- **Başarı ekranı:** zarf kapanma animasyonu, sipariş numarası, ödeme bilgileri ve Instagram hikâyesi için paylaşılabilir görsel.
- **Sipariş takip** sayfası, **404** sayfası.
- **Yasal metinler:** KVKK Aydınlatma Metni, Gizlilik ve Çerez Politikası, Mesafeli Satış Sözleşmesi, Ön Bilgilendirme Formu, İptal ve İade, Kullanım Koşulları.
- **Gizlilik:** izleme çerezi, analiz aracı, dış font ya da görsel isteği yok. Fontlar ve görseller sitenin içinde.
- **Erişilebilirlik:** klavye ile kullanım, ekran okuyucu etiketleri, “hareketi azalt” tercihine uyum.
- **8 özgün illüstrasyon** (`assets/themes/*.svg`). Stok fotoğraf kullanılmadı; Unsplash gibi ücretsiz lisanslar fotoğrafların baskılı ürün olarak satılmasına izin vermediği için tasarımlar bu site için çizildi.

## Klasör yapısı

```
index.html                  Ana sayfa + atölye
takip.html                  Sipariş takip
kvkk.html, gizlilik.html, mesafeli-satis-sozlesmesi.html,
on-bilgilendirme-formu.html, iptal-iade.html, kullanim-kosullari.html
404.html
assets/
  js/config.js              ← TÜM AYARLAR BURADA (şirket, iletişim, IBAN, fiyat)
  js/data.js                Tema adları, örnek mektuplar, ilham soruları, iller
  js/core.js                Ortak yardımcılar, menü, animasyonlar
  js/card.js                Kartpostal çizimi (önizleme + baskı dosyası)
  js/builder.js             Atölye
  js/landing.js             Ana sayfa etkileşimleri
  js/track.js, js/legal.js  Takip ve yasal sayfalar
  css/main.css              Bütün stiller
  themes/*.svg              Kartpostal illüstrasyonları
  fonts/                    Fontlar (SIL OFL lisanslı)
  img/                      Favicon, paylaşım görseli
backend/                    Google Apps Script sipariş sistemi + kurulum rehberi
```

## Yayına alma kontrol listesi

1. **Ayarları doldurun:** `assets/js/config.js` dosyasında şirket unvanı, adres, vergi bilgileri, telefon, e-posta, IBAN ve fiyatları girin. Eksikleri görmek için siteyi adresin sonuna `?kontrol` ekleyerek açın (ör. `https://…/?kontrol`). Yasal sayfalarda doldurulmamış alanlar sarıyla işaretlenir.
2. **Sipariş sistemini kurun:** [`backend/KURULUM.md`](backend/KURULUM.md) adımlarını izleyin ve verilen adresi `config.js` içindeki `orderEndpoint`'e yazın. Bu yapılana kadar site **önizleme modunda** çalışır; siparişler kaydedilmez ve bu durum sitede açıkça belirtilir.
3. **Yasal metinleri bir hukukçuya okutun.** Metinler kapsamlı şablonlardır ama işletmenize göre kontrol edilmelidir. Özellikle şunlara baktırın:
   - İleri tarihli teslimatın Mesafeli Sözleşmeler Yönetmeliği'ndeki teslim süresi ve cayma hakkı hükümleri karşısındaki durumu,
   - Google sunucularına (yurt dışı) veri aktarımı (KVKK m. 9),
   - İptal-iade oranları, “işletme kapanırsa erken gönderim veya iade” taahhüdü, kayıp kart için ücretsiz yeniden basım sözü.
4. **Fiyatları gözden geçirin:** `config.js` → `pricing`. Uzun süreli teslimatlar için saklama farkı önerilir; ileride artacak posta ücretlerini karşılar. İstemezseniz `extra` değerlerini `0` yapın. `backend/Code.gs` içindeki `FIYAT` ile aynı tutun.
5. **E-posta adresini doğrulayın:** `config.js` → `contact.email` şu an eski sitedeki `merhaba@gelecektemektup.com`. Bu alan adının size ait olduğundan emin olun; marka “Geleceğe Mektup”, repo adı “gelecegebirak”. Hangisini kullanacağınıza karar verin.
6. **GitHub Pages'i açın:** Repo → **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)`** → Save. Birkaç dakika sonra site `https://yusuf-tarlak.github.io/gelecegebirak/` adresinde yayında olur.
7. **Kendi alan adınız varsa:** Settings → Pages → *Custom domain* alanına yazın, DNS kayıtlarını GitHub'ın gösterdiği şekilde girin, **Enforce HTTPS**'i işaretleyin. Ardından şunları yeni adresle güncelleyin: `config.js` → `siteUrl`, `index.html` başındaki `canonical`, `og:url`, `og:image` satırları ve `backend/Code.gs` → `SITE_ADRESI`.
8. **Test siparişi verin** (masaüstü ve telefondan), onay e-postasını ve takip sayfasını kontrol edin.

## Kartla ödeme

Şu an iki yöntem destekleniyor:

- **Havale/EFT:** her zaman açık. Müşteri açıklamaya sipariş numarasını yazar.
- **Kartla ödeme bağlantısı:** iyzico, PayTR veya Shopier gibi bir ödeme kuruluşundan alacağınız “link ile ödeme” adresini `config.js` → `payment.cardPaymentUrl` alanına yazarsanız ödeme adımında “Kredi / banka kartı” seçeneği görünür.

Tutarın otomatik çekildiği tam entegrasyon (ör. iyzico Checkout Form) için üye iş yeri hesabı ve sunucu tarafında gizli anahtar gerekir; hesabınız açıldığında `backend/Code.gs`'e eklenebilir.

## Siteyi kendi bilgisayarınızda açmak

Fontlar ve baskı dosyası üretimi güvenlik nedeniyle doğrudan dosyaya çift tıklayınca (`file://`) tam çalışmaz. Klasörde bir terminal açıp:

```
python3 -m http.server 8000
```

çalıştırın ve tarayıcıda `http://localhost:8000` adresini açın.

## Özelleştirme

- **Metinler:** `index.html` içinde doğrudan düzenlenebilir. Örnek mektuplar, ilham soruları ve “Kime yazılır?” kartları `assets/js/data.js` dosyasındadır.
- **Yeni tasarım eklemek:** 740 × 525 boyutunda bir SVG'yi `assets/themes/` klasörüne koyun ve `assets/js/data.js` → `GM.THEMES` listesine ekleyin. Fotoğraf yerine çizim kullanın ya da baskılı üründe satış hakkı olan görseller seçin.
- **Renkler ve yazı tipleri:** `assets/css/main.css` başındaki değişkenler.

## Lisanslar

- Fontlar: Fraunces, DM Sans, Caveat, Dancing Script, Patrick Hand. SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
- Kartpostal illüstrasyonları, logo ve arayüz: bu proje için hazırlandı.
