# Temalar — plan

Amaç: kullanıcı ayrı bir ekrandan tema seçer. Seçtiği tema sadece terminali değil, uygulamanın her yerini boyar: ana
ekran, terminaller, menü ve ayarlar, mesaj pencereleri, Source Control. Ortadaki **orbit.map hiç değişmez**.
Varsayılan tema bugünkü turuncu tema ("Atalay"). Uygulamadaki metinler İngilizce.

## 1. Kaç tema, hangileri

**Öneri: ilk partide 12 tema (varsayılan + 11), hepsi koyu.**
- Her tema 7 ekranda kontrol edilecek (ana ekran, terminal, Source Control, mesajlar, menü/ayarlar, kısayol çarkı ve
  klasör seçici, tema ekranı). 12 temada bu 84 kontrol eder, ekran görüntüsüyle otomatik yapılır.
- 12 kart, tema ekranında 4×3 olarak tek bakışta sığar.
- Mekanik kurulduktan sonra yeni tema eklemek tek bir palet dosyası demek.

Seçim iki kaynağa göre yapıldı (ikisi de 1 Kasım 2026'da ölçüldü):
- Editör tarafı: VS Code Marketplace "Themes" kategorisinin kurulum sayıları.
- Terminal tarafı: temanın GitHub yıldızları.
Listeye ikisinden birinde üstte olanlar girdi.

| # | Tema | Neden | Vurgu rengi |
|---|------|-------|-------------|
| 1 | Atalay (varsayılan) | bugünkü turuncu tema | `#f88008` |
| 2 | GitHub Dark | 20,5 M kurulum, en çok kurulan renk teması | `#2f81f7` |
| 3 | One Dark | One Dark Pro 12,9 M + Atom One Dark 7,4 M | `#61afef` |
| 4 | Dracula | 11,1 M kurulum, 23,6 k yıldız (ikisinde de en üstte) | `#bd93f9` |
| 5 | Monokai | Monokai Pro 4,2 M + One Monokai 3,0 M, VS Code'la hazır gelir | `#e6db74` |
| 6 | Ayu Dark | 4,2 M kurulum | `#e6b450` |
| 7 | Night Owl | 3,6 M kurulum | `#82aaff` |
| 8 | Tokyo Night | 3,0 M kurulum, 8,2 k yıldız | `#7aa2f7` |
| 9 | Catppuccin Mocha | 1,5 M kurulum, 19,9 k yıldız (terminalde en sevilenlerden) | `#cba6f7` |
| 10 | Gruvbox Dark | 1,1 M kurulum, 15,8 k yıldız | `#fabd2f` |
| 11 | Nord | 1,3 M kurulum, 6,9 k yıldız | `#88c0d0` |
| 12 | Solarized Dark | 16 k yıldız, VS Code'la hazır gelir | `#268bd2` |

Bu partiye girmeyenler:
- Winter is Coming (3,8 M) ve Palenight (2,7 M): terminal paletleri yok.
- SynthWave '84 ve Shades of Purple: neon, uygulamanın görünümüne uymuyor.
- Rosé Pine, Kanagawa, Everforest: sonraki parti için adaylar.

Açık temalar ilk partide yok. Cam, parlama, CRT efekti, alevler ve gölgeler koyu zemine göre tasarlandı. Açık tema
hepsine ayrı ayar ister, bu yüzden ayrı bir iş.

Vurgu rengi kırmızıya yakın seçilmedi. Çünkü "çalışıyor" durumu vurgu rengiyle, "seni bekliyor" durumu kırmızıyla
gösteriliyor ve ikisi karışmamalı.

Paletler her temanın kendi resmi reposundan alınır; hepsi MIT ya da benzeri açık lisanslı. Yedek kaynak
iTerm2-Color-Schemes (890 tema, MIT), ama oradaki bazı değerler resmi olandan farklı:
- One Dark arka planı orada `#21252b`, resmisi `#282c34`.
- Solarized "Patched" orada `#001e27`, resmisi `#002b36`.
Lisans metinleri `Resources/themes/LICENSES.txt` dosyasında durur.

## 2. Mekanik: tek kaynak, her yere dağıtım

Örnek aldığımız uygulama Warp. Warp'ın bütün arayüzü birkaç değerden türetilir:
- vurgu, arka plan ve yazı rengi,
- koyu ya da açık bilgisi,
- 16 ANSI rengi.
Biz de aynısını yapıyoruz.

### 2.1 Tema dosyası

`app/Resources/themes/<id>.json`:

```json
{ "id": "dracula", "name": "Dracula", "bg": "#282a36", "fg": "#f8f8f2", "cursor": "#f8f8f2",
  "selection": "#44475a", "accent": "#bd93f9", "ansi": ["#21222c", "…16 renk"], "ui": {} }
```

`ui` alanı elle düzeltmeler içindir ve boş olabilir. Varsayılan "atalay" teması bütün token'ları bugünkü
değerleriyle `ui` içinde tutar. Böylece varsayılan görünüm piksel piksel aynı kalır.

### 2.2 Token türetme

Türetme Swift'te, tek bir yerde (`ThemeStore`) yapılır. Tema dosyasından, bugün `style.css` `:root` ve
`Theme.swift` içinde duran token'lar çıkar:
- **Zemin:**
  - `--bg` (sayfa): temanın arka planının koyulaştırılmışı.
  - `--panel`: biraz daha az koyu. Cam saydamlığı aynı kalır (0.8).
- **Çizgiler:** `--line` vurgunun %32'si, `--line-soft` vurgunun %13'ü.
- **Vurgu:**
  - `--accent`
  - `--accent-soft`: vurguya beyaz karıştırılmış hâli.
  - `--accent-rgb`
- **Yazı:**
  - `--txt`: temanın yazı rengi.
  - `--hi`: yazı rengine beyaz karıştırılmış hâli.
  - `--dim` ve `--dim2`: yazı rengiyle arka plan arası.
  - `--ink`: vurgunun üstündeki koyu yazı.
- **Anlam renkleri** ANSI'den gelir:
  - `--red`: 9
  - `--green`: 10
  - `--amber`: 11
  - `--blue`: 12
  - `--violet`: 13
  - `--cyan`: 14
- **Durumlar:**
  - çalışıyor: vurgu
  - sıra sende: camgöbeği
  - seni bekliyor: kırmızı
  
  Vurgu camgöbeğine çok yakınsa (Nord), "sıra sende" yeşile geçer. Bunu ton farkı kontrolü otomatik yapar.
- **Araç kategorileri** (web, read, edit, bash…) ANSI tonlarına dağıtılır.
- **Terminal:** arka plan, yazı, imleç, seçim ve 16 ANSI rengi doğrudan tema dosyasından alınır.

Renkler OKLCH'de karıştırılır, böylece açıklık göze eşit görünür. Sonuç düz bir sözlüktür:
`{ "--accent": "#bd93f9", … }`. Bu sözlüğü hem web sayfaları hem native kod kullanır.

### 2.3 Dağıtım

- **Web sayfaları:** üç sayfa var (ana ekran, mesaj paneli, kısayol çarkı ve klasör seçici); hepsi `style.css`
  kullanıyor.
  - `ThemeStore`, token'ları sayfa yüklenmeden önce `WKUserScript` ile (document start) `:root`'a yazar. Böylece
    açılışta turuncu renk bir an görünüp kaybolmaz.
  - Source Control'ün kod alanı (`__terminalLook`) da aynı yoldan temadan beslenir.
  - Tema değişince üç sayfaya `evaluateJavaScript("__theme({…})")` gönderilir. CSS değişkenleri anında değişir,
    sayfa yeniden yüklenmez.
- **JS'in çizdiği renkler** (ticker kareleri, tool.mix, XP çubukları…) `getComputedStyle`'dan okunur ve
  `themechange` olayında yeniden çizilir.
- **Terminaller:** SwiftTerm renkleri çalışırken değiştirebiliyor. Kullanılan ayarlar: `installColors` (renk önbelleğini
  sıfırlar ve yeniden çizer), `nativeBackgroundColor`, `nativeForegroundColor`, `caretColor`,
  `selectedTextBackgroundColor`. Açık terminaller ve screen oturumları kapanmadan yeni renge geçer.
- **Native kısımlar** (pencere çerçeveleri, sekme çubuğu, kenar çubuğu, chat penceresi başlığı): `Theme`'deki sabitler,
  `ThemeStore.shared`'dan okunan değerlere dönüşür.
  - SwiftUI görünümleri ObservableObject ile yenilenir.
  - AppKit görünümleri `themeChanged` bildirimiyle yenilenir.
- **Logo:** tek renkli bir PNG. CSS mask ile `--accent` rengine boyanır.
- **Kayıt:** seçilen temanın id'si UserDefaults'ta `theme` olarak tutulur ve açılışta okunur.

### 2.4 orbit.map kilidi

- `orbit.js` kendi renklerini içinde taşıyor (60 sabit renk). Temadan etkilenmez.
- Orbit panelinin geri kalanı (etiketler, minimap, görünüm düğmeleri, çerçeve) `#mapwrap` altında duruyor.
  - `#mapwrap` üstünde varsayılan token'lar tek bir CSS kuralıyla yeniden tanımlanır.
  - CSS değişkenleri en yakın tanımdan miras alındığı için orbit alanı hep turuncu kalır, gerisi temaya geçer.
- Sol paneldeki oturum kartları temanın durum renklerini kullanır, orbit'teki altıgenler ise varsayılan renklerde
  kalır. İstenen de bu.

### 2.5 Temayla değişmeyenler

- orbit.map
- Dosya ikonlarının renkleri. VS Code'da da ikon teması renk temasından ayrıdır.
- "On fire" alevleri ateş renginde kalır. Bu benim önerim; istersen vurgu rengine boyanır.
- Mac'in kırmızı, sarı ve yeşil pencere düğmeleri.

## 3. Tema ekranı

- **Açılış:** dashboard'un sol kenarındaki çubukta palet ikonu (Source Control'ün altında). Dashboard'un ortasında
  açılır, Source Control gibi.
- **Kartlar:** 4×3 dizilir. Her kart temanın küçük bir önizlemesidir:
  - vurgu renginde üst çubuk ve panel çerçevesi,
  - ANSI renkleriyle `git status` çıktısı gösteren mini bir terminal,
  - altta 16 rengin şeridi ve temanın adı.
- **Önizleme:** kartın üzerine gelince ya da ok tuşlarıyla gezerken bütün uygulama o temaya anında geçer (VS Code'un
  ⌘K ⌘T'si gibi).
  - Tıklama ya da Enter temayı seçer ve kaydeder.
  - Esc ya da ekrandan çıkmak eski temaya döner.
- Aktif temanın kartında ACTIVE yazar.

## 4. İş sırası

1. **Token temizliği.** Görünmeyen ama en büyük adım.
   - Web'de temaya bağlı dosyalarda (orbit ve dosya ikonları hariç) yaklaşık 590 renk yazımı var:
     - yaklaşık 150'si zaten token,
     - yaklaşık 110'u siyah/beyaz gölge ve olduğu gibi kalabilir,
     - kalan yaklaşık 330'u değişecek.
   - Değişikliklerin çoğu script'le yapılır: `#f88008` → `var(--accent)`, `rgba(248, 128, 8, a)` →
     `rgba(var(--accent-rgb), a)`.
   - Native tarafta yaklaşık 115 renk referansı var: ChatWindow, Sidebar, ChatTerminal ve Panes.
   - Doğrulama: önceki ve sonraki ekran görüntüleri arasında piksel farkı 0 olmalı.
2. **Tema altyapısı:** `ThemeStore`, tema dosyaları, dağıtım, orbit kilidi ve kayıt.
3. **Tema ekranı ve 11 tema.** Her tema her ekranda ekran görüntüsüyle kontrol edilir; gerekirse `ui` ile düzeltilir.
4. **Staging uygulamasında sen denersin**, sonra staging branch'ine gider.

## 5. Sonra (bu işin dışında)

- Açık temalar.
- Saydamlık ayarı, Termius'taki gibi (kullanıcı geri bildirimi, CHANGELOG `## Next`).
- Kendi temanı içe aktarma: iTerm2 `.itermcolors`, Ghostty ve Warp YAML dosyaları. iTerm2-Color-Schemes'teki 890 tema
  böyle hazır olur.
- Source Control'de kod renkleri için temanın gerçek VS Code renkleri. Şimdilik ANSI'den türetiliyor.

## Kaynaklar

- VS Code Marketplace API: "Themes" kategorisi, kuruluma göre sıralı (1 Kasım 2026).
- GitHub yıldızları, `gh api` ile alındı (1 Kasım 2026).
- Warp özel temaları: https://docs.warp.dev/terminal/appearance/custom-themes
- iTerm2-Color-Schemes: https://github.com/mbadolato/iTerm2-Color-Schemes
