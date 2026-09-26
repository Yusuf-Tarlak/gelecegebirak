# Sipariş sistemi kurulumu (Google E-Tablolar + Apps Script)

Site statik olduğu için siparişleri kaydedecek küçük bir arka uca ihtiyaç var. Bu klasördeki kod, **ücretsiz** bir Google hesabıyla çalışır:

- Her sipariş, bir Google E-Tablosuna satır olarak yazılır.
- Kartpostalın baskıya hazır ön ve arka yüz dosyaları (A6 + 3 mm taşma payı, 300 DPI) Google Drive'da siparişe özel bir klasöre kaydedilir.
- Müşteriye onay e-postası (ödeme bilgileriyle), size yeni sipariş bildirimi gider.
- Her sabah otomatik olarak:
  - teslimata 45 gün kala müşteriden adres teyidi istenir,
  - sipariş yıldönümlerinde “mektubun güvende” e-postası gönderilir,
  - bu hafta postaya verilecekleri ve ödemesi gecikenleri size özetler,
  - teslimattan 6 ay sonra mesaj ve baskı dosyaları silinir (KVKK).
- Takip sayfası, siparişin durumunu tablodaki **Durum** sütunundan okur.

Kurulum yaklaşık 10 dakika sürer.

## 1. Tabloyu ve betiği oluşturun

1. Siparişleri tutacağınız Google hesabıyla <https://sheets.new> adresine gidin. Tabloya bir ad verin, örneğin **Geleceğe Mektup Siparişler**.
2. Menüden **Uzantılar → Apps Script**'i açın.
3. Soldaki `Kod.gs` (veya `Code.gs`) dosyasının içindekileri silin ve bu klasördeki [`Code.gs`](Code.gs) dosyasının tamamını yapıştırın.
4. Sol menüde **Proje Ayarları** (dişli simgesi) → **"appsscript.json" manifest dosyasını düzenleyicide göster** kutusunu işaretleyin. Düzenleyiciye dönün, `appsscript.json` dosyasının içeriğini bu klasördeki [`appsscript.json`](appsscript.json) ile değiştirin. Bu, saat dilimini İstanbul yapar.
5. `Code.gs` dosyasının başındaki **AYARLAR** bölümünü doldurun:
   - `SAHIP_EPOSTA`: yeni siparişlerin bildirileceği e-posta adresiniz.
   - `IBAN`, `IBAN_SAHIBI`, `BANKA`: müşteriye e-postada gösterilecek ödeme bilgileri.
   - `FIYAT`: sitedeki `assets/js/config.js` dosyasındaki fiyatlarla **aynı** olmalı. Tutarı sunucu kendisi hesaplar; tarayıcıdan gelen fiyata güvenmez.
   - `SITE_ADRESI`: sitenizin yayındaki adresi (sonunda `/` olacak).
6. Kaydedin (Ctrl+S).

## 2. Kurulum fonksiyonunu bir kez çalıştırın

1. Üst çubuktaki fonksiyon listesinden **`kurulum`**'u seçip **Çalıştır**'a basın.
2. Google izin isteyecek: tabloya yazma, Drive'da dosya oluşturma, sizin adınıza e-posta gönderme ve günlük tetikleyici kurma. **İzinleri incele** deyip hesabınızı seçin.
3. “Google bu uygulamayı doğrulamadı” uyarısı çıkarsa: **Gelişmiş → (güvenli değil) sayfasına git → İzin ver**. Bu uyarı, kodu kendiniz yazdığınız/yapıştırdığınız için çıkar; normaldir.
4. Tablonuzda **Siparişler** sayfası, başlık satırı ve Drive'da **Geleceğe Mektup · Baskı Dosyaları** klasörü oluşur. Her sabah 09.00'da çalışan günlük görev de kurulmuş olur.

## 3. Web uygulaması olarak yayınlayın

1. Sağ üstten **Dağıt → Yeni dağıtım**.
2. Tür olarak **Web uygulaması**'nı seçin.
3. **Şu kullanıcı olarak yürüt:** *Ben*. **Erişimi olanlar:** *Herkes*.
4. **Dağıt**'a basın ve verilen **Web uygulaması URL'sini** kopyalayın (sonu `/exec` ile biter).
5. Sitedeki `assets/js/config.js` dosyasını açın ve bu adresi yapıştırın:

   ```js
   orderEndpoint: 'https://script.google.com/macros/s/..../exec',
   ```

6. Değişikliği GitHub'a gönderin. Sitenin atölye bölümündeki sarı **“Önizleme modu”** uyarısı kaybolur; siparişler artık tabloya düşer.

> Tarayıcıda bu URL'yi açtığınızda “Geleceğe Mektup sipariş sistemi çalışıyor.” yazısını görmelisiniz.

## 4. Test siparişi verin

Sitede kendinize bir kartpostal hazırlayıp siparişi tamamlayın ve şunları kontrol edin:

- Tabloya yeni bir satır geldi mi?
- Drive'da sipariş numarasıyla bir klasör ve içinde `-on-yuz.jpg`, `-arka-yuz.jpg` dosyaları oluştu mu?
- Size ve müşteri adresine e-posta geldi mi? (Spam klasörünü de kontrol edin.)
- `takip.html` sayfasında sipariş numarası ve e-postayla sorgulayınca durum görünüyor mu?

Sonra test satırını silebilir ya da **Durum**'unu *İptal* yapabilirsiniz.

## Günlük kullanım

- **Durum** sütunundaki açılır listeden siparişin aşamasını güncelleyin: *Sipariş alındı → Ödeme onaylandı → Basıldı ve arşivde → Yola çıktı → Teslim edildi* (veya *İptal*). Takip sayfası bunu anında gösterir.
- Ödeme hesabınıza geldiğinde (açıklamadaki sipariş numarasından eşleştirin) durumu **Ödeme onaylandı** yapın.
- Baskı için Drive klasöründeki iki dosyayı A6 (14,8 × 10,5 cm) çift taraflı basın; dosyalarda her kenarda 3 mm kesim payı vardır.
- Sürpriz siparişlerde (Sürpriz: *Evet*) zarfa gönderen adı yazmayın.
- Günlük özet e-postası, o hafta postaya vermeniz gerekenleri listeler.

## Kodu güncellediğinizde

`Code.gs`'de değişiklik yaptıktan sonra **Dağıt → Dağıtımları yönet → (kalem simgesi) → Sürüm: Yeni sürüm → Dağıt** yapın. Böylece URL aynı kalır, `config.js`'i değiştirmeniz gerekmez.

## Sınırlar ve notlar

- Ücretsiz Gmail hesaplarında Apps Script ile günde yaklaşık **100 e-posta** gönderilebilir (Google Workspace'te 1.500). Küçük bir işletme için yeterlidir; büyürseniz Workspace'e geçin.
- Veriler Google sunucularında (yurt dışı olabilir) tutulur. Bu durum KVKK Aydınlatma Metni'nde belirtilmiştir; hukukçunuzla yurt dışı aktarım şartlarını (KVKK m. 9) değerlendirin.
- Tablo ve Drive klasörü yalnızca sizin hesabınızda durur; kimseyle paylaşmayın.
